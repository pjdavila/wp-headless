// Article metadata stored on Recombee items, so the recommendations API
// (pages/api/recombee-recommend.js) can render cards straight from Recombee
// without asking WordPress. Unit-tested in scripts/test-recombee-items.mjs.
//
// Two writers share the Recombee catalog:
// - The RSS catalog feed configured in Recombee creates items with hashed ids
//   (and title/link/description/pubDate/categories, sometimes media:content).
// - View tracking (pages/api/recombee-track.js) creates items whose id is the
//   post slug, with no properties at all.
// Our writers (the track-time filler below and scripts/sync-recombee-items.mjs)
// only ever fill properties that are empty, so they never overwrite what the
// feed set, and the feed never touches slug-id items.

import { rewriteWpImageSrc } from "./rewriteWpContentImageUrls.js";

export const SITE_ORIGIN = "https://caribbean.business";

// Properties we fill. All but categoryUri are the ones the RSS feed defines;
// categoryUri lets cards link the category badge without WordPress.
export const ITEM_PROPERTIES = [
  { name: "title", type: "string" },
  { name: "link", type: "string" },
  { name: "media:content", type: "image" },
  { name: "pubDate", type: "timestamp" },
  { name: "categories", type: "string" },
  { name: "categoryUri", type: "string" },
  { name: "description", type: "string" },
];

const DESCRIPTION_MAX = 400;

export const POSTS_BY_SLUGS_QUERY = `query RecombeePostsBySlugs($slugs: [String], $first: Int) {
  posts(first: $first, where: { nameIn: $slugs }) {
    nodes {
      slug
      title
      excerpt
      uri
      dateGmt
      featuredImage { node { sourceUrl } }
      categories { nodes { name slug uri } }
    }
  }
}`;

export async function fetchPostsBySlugs(
  slugs,
  { wpUrl, fetchImpl = fetch } = {},
) {
  const base =
    wpUrl ||
    process.env.NEXT_PUBLIC_WORDPRESS_URL ||
    "https://cms.vnmedia.co/cbusiness";
  const resp = await fetchImpl(`${base}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: POSTS_BY_SLUGS_QUERY,
      variables: { slugs, first: slugs.length },
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`WordPress responded ${resp.status}`);
  const json = await resp.json();
  const posts = json?.data?.posts?.nodes;
  if (!Array.isArray(posts)) {
    throw new Error(
      json?.errors?.[0]?.message || "No posts in WordPress response",
    );
  }
  return posts;
}

const NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

export function decodeEntities(str) {
  return String(str || "").replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (m, code) => {
      if (code[0] === "#") {
        const n =
          code[1] === "x" || code[1] === "X"
            ? parseInt(code.slice(2), 16)
            : parseInt(code.slice(1), 10);
        try {
          return Number.isFinite(n) ? String.fromCodePoint(n) : m;
        } catch {
          return m;
        }
      }
      const named = NAMED_ENTITIES[code.toLowerCase()];
      return named === undefined ? m : named;
    },
  );
}

export function htmlToText(html) {
  return decodeEntities(String(html || "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trim()}…`;
}

function primaryCategory(post) {
  const nodes = post?.categories?.nodes || [];
  return nodes.find((c) => c.slug !== "uncategorized") || nodes[0] || null;
}

function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

// WordPress post (POSTS_BY_SLUGS_QUERY shape) -> Recombee item values.
// Empty fields come back as null so callers can tell "unknown" from a value.
export function postToItemValues(post) {
  const cat = primaryCategory(post);
  let image = post?.featuredImage?.node?.sourceUrl || "";
  image = rewriteWpImageSrc(image.trim());
  if (image.startsWith("//")) image = `https:${image}`;
  const uri = post?.uri || (post?.slug ? `/${post.slug}/` : "");
  let pubDate = null;
  if (post?.dateGmt) {
    const ms = Date.parse(`${post.dateGmt.replace(/Z?$/, "")}Z`);
    if (Number.isFinite(ms)) pubDate = Math.floor(ms / 1000);
  }
  const description = truncate(htmlToText(post?.excerpt), DESCRIPTION_MAX);
  return {
    title: htmlToText(post?.title) || null,
    link: uri ? `${SITE_ORIGIN}${uri.startsWith("/") ? "" : "/"}${uri}` : null,
    "media:content": isHttpUrl(image) ? image : null,
    pubDate,
    categories: cat?.name ? decodeEntities(cat.name) : null,
    categoryUri: cat?.uri || null,
    description: description || null,
  };
}

function isEmpty(v) {
  return v === null || v === undefined || v === "";
}

// Only the properties that are empty on the item and that we have a value for.
// Never overwrites anything already stored (e.g. by the RSS feed).
export function valuesToFill(current, next) {
  const out = {};
  for (const { name } of ITEM_PROPERTIES) {
    if (isEmpty(current?.[name]) && !isEmpty(next?.[name])) {
      out[name] = next[name];
    }
  }
  return out;
}

// The WordPress slug behind a Recombee item: the path of its link when it has
// one (feed items have hashed ids), otherwise the id itself (tracked items).
export function slugForItem(id, values) {
  const link = values?.link;
  if (link) {
    try {
      const slug = new URL(link).pathname.replace(/^\/+|\/+$/g, "");
      if (slug) return slug;
    } catch {}
  }
  return id;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toIsoDate(value) {
  if (isEmpty(value)) return "";
  const ms =
    typeof value === "number"
      ? value < 1e12
        ? value * 1000
        : value
      : Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : "";
}

// Recombee recommendation -> card for the client (lib/useRecombee.js).
export function recommendationToCard(r) {
  const v = r?.values || {};
  const link = v.link || "";
  let uri = link;
  try {
    if (link.startsWith("http")) uri = new URL(link).pathname;
  } catch {}
  return {
    id: r.id,
    title: v.title || "",
    // Stored as plain text; cards render the excerpt as HTML.
    excerpt: v.description ? escapeHtml(v.description) : "",
    uri: uri || `/${r.id}/`,
    date: toIsoDate(v.pubDate),
    imageUrl: v["media:content"] || "",
    category: v.categories || "",
    categoryUri: v.categoryUri || "",
  };
}

// Batches view-tracked item ids, checks Recombee for which ones still lack a
// title, looks those up in WordPress with one request per batch and writes the
// missing properties. Bounded so a flood of views (or junk ids) cannot turn
// into a flood of WordPress requests: at most one WordPress request per flush,
// a capped queue, a memory of ids already handled, and a backoff on errors.
export function createItemFiller({
  getValuesMany, // (ids) => Promise<{ [id]: values|null }>
  fetchBySlugs, // (slugs) => Promise<post[]>
  setValuesMany, // ([{ id, values }]) => Promise<void>
  now = () => Date.now(),
  schedule = (fn, ms) => {
    const t = setTimeout(fn, ms);
    t.unref?.();
    return t;
  },
  flushDelayMs = 3000,
  batchSize = 20,
  maxQueue = 200,
  maxRemembered = 5000,
  missTtlMs = 60 * 60 * 1000,
  errorBackoffMs = 60 * 1000,
}) {
  const done = new Set();
  const missUntil = new Map();
  const queue = new Set();
  let timer = null;
  let running = null;
  let backoffUntil = 0;

  function remember(id) {
    done.delete(id);
    done.add(id);
    if (done.size > maxRemembered) done.delete(done.values().next().value);
  }

  function rememberMiss(id) {
    missUntil.delete(id);
    missUntil.set(id, now() + missTtlMs);
    if (missUntil.size > maxRemembered) {
      missUntil.delete(missUntil.keys().next().value);
    }
  }

  function track(id) {
    if (!id || done.has(id) || queue.has(id)) return;
    const miss = missUntil.get(id);
    if (miss && miss > now()) return;
    if (queue.size >= maxQueue) return;
    queue.add(id);
    if (!timer) timer = schedule(() => flush(), flushDelayMs);
  }

  async function processBatch(ids) {
    const current = await getValuesMany(ids);
    const needs = [];
    for (const id of ids) {
      const values = current?.[id];
      if (values && !isEmpty(values.title)) remember(id);
      else needs.push({ id, values: values || {} });
    }
    if (!needs.length) return;

    const slugs = [...new Set(needs.map((n) => slugForItem(n.id, n.values)))];
    let posts;
    try {
      posts = await fetchBySlugs(slugs);
    } catch (err) {
      backoffUntil = now() + errorBackoffMs;
      throw err;
    }
    const bySlug = new Map();
    for (const p of posts || []) if (p?.slug) bySlug.set(p.slug, p);

    const writes = [];
    for (const n of needs) {
      const post = bySlug.get(slugForItem(n.id, n.values));
      if (!post) {
        rememberMiss(n.id);
        continue;
      }
      const values = valuesToFill(n.values, postToItemValues(post));
      if (Object.keys(values).length) writes.push({ id: n.id, values });
    }
    if (writes.length) await setValuesMany(writes);
    for (const w of writes) remember(w.id);
    for (const n of needs)
      if (bySlug.has(slugForItem(n.id, n.values))) remember(n.id);
  }

  async function flush() {
    timer = null;
    if (running) return running;
    if (now() < backoffUntil) {
      if (queue.size) timer = schedule(() => flush(), backoffUntil - now());
      return;
    }
    const ids = [...queue].slice(0, batchSize);
    for (const id of ids) queue.delete(id);
    if (!ids.length) return;
    running = processBatch(ids)
      .catch((err) => {
        console.error("Recombee item fill error:", err.message);
      })
      .finally(() => {
        running = null;
        if (queue.size && !timer) {
          timer = schedule(() => flush(), flushDelayMs);
        }
      });
    return running;
  }

  return {
    track,
    flush,
    pending: () => queue.size,
  };
}
