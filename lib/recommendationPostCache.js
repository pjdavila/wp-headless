// Server-side cache of WordPress post cards for the recommendations API
// (pages/api/recombee-recommend.js). Most Recombee items carry no title or
// image, so without this cache every article view sent a GraphQL request to
// the (slow, under-resourced) WordPress server. Unit-tested in
// scripts/test-recommendation-cache.mjs.
//
// - Found posts are kept for POST_TTL_MS; slugs WordPress doesn't know are
//   remembered for MISS_TTL_MS so they aren't asked about on every view.
// - Concurrent requests for the same slug share one WordPress request.
// - When WordPress fails, expired entries keep being served and no further
//   WordPress request is made for ERROR_BACKOFF_MS.

export const POST_TTL_MS = 60 * 60 * 1000;
export const MISS_TTL_MS = 10 * 60 * 1000;
export const ERROR_BACKOFF_MS = 60 * 1000;
export const MAX_ENTRIES = 2000;

export function createPostCardCache({
  fetchBySlugs,
  now = () => Date.now(),
  postTtlMs = POST_TTL_MS,
  missTtlMs = MISS_TTL_MS,
  errorBackoffMs = ERROR_BACKOFF_MS,
  maxEntries = MAX_ENTRIES,
}) {
  // slug -> { post: object|null, expires: number }
  const entries = new Map();
  // slug -> Promise<void> for a WordPress request already on its way
  const pending = new Map();
  let backoffUntil = 0;

  function store(slug, post) {
    entries.delete(slug);
    entries.set(slug, {
      post,
      expires: now() + (post ? postTtlMs : missTtlMs),
    });
    while (entries.size > maxEntries) {
      entries.delete(entries.keys().next().value);
    }
  }

  async function load(slugs) {
    let posts;
    try {
      posts = await fetchBySlugs(slugs);
    } catch (err) {
      backoffUntil = now() + errorBackoffMs;
      console.error("WP fetch for recommendations error:", err.message);
      return;
    }
    const bySlug = new Map();
    for (const p of posts || []) {
      if (p?.slug) bySlug.set(p.slug, p);
    }
    for (const slug of slugs) store(slug, bySlug.get(slug) || null);
  }

  async function getMany(slugs) {
    const unique = [...new Set(slugs.filter(Boolean))];
    const t = now();
    const toFetch = [];
    const waits = new Set();
    for (const slug of unique) {
      const entry = entries.get(slug);
      if (entry && entry.expires > t) continue;
      const inFlight = pending.get(slug);
      if (inFlight) {
        waits.add(inFlight);
        continue;
      }
      if (t < backoffUntil) continue;
      toFetch.push(slug);
    }

    if (toFetch.length) {
      const p = load(toFetch).finally(() => {
        for (const slug of toFetch) {
          if (pending.get(slug) === p) pending.delete(slug);
        }
      });
      for (const slug of toFetch) pending.set(slug, p);
      waits.add(p);
    }
    if (waits.size) await Promise.all(waits);

    const result = {};
    for (const slug of unique) {
      const post = entries.get(slug)?.post;
      if (post) result[slug] = post;
    }
    return result;
  }

  return { getMany, size: () => entries.size };
}
