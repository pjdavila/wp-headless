// Shapes the single homepage WordPress response (queries/HomepageQuery.js)
// into the props the homepage renders. Pure functions, unit-tested in
// scripts/test-homepage-data.mjs.

// The homepage is rebuilt at most this often (ISR). Faust's default, which
// the homepage has always used; kept explicit so it is not changed by
// accident. New articles reach the homepage within this window.
export const HOMEPAGE_REVALIDATE_SECONDS = 15 * 60;

/**
 * Groups the flat list of newest Special Reports articles by edition (a
 * direct subcategory of "special-reports"), newest article first, in the
 * `{ id, name, uri, posts: { nodes } }` shape the sidebar widget expects.
 * Articles filed only under the parent category belong to no edition and
 * are skipped. An article in two editions is listed under both.
 */
export function buildSpecialReportEditions(posts, specialReportsId) {
  if (!specialReportsId || !Array.isArray(posts)) return [];
  const byId = new Map();
  for (const post of posts) {
    if (!post) continue;
    const { categories, ...rest } = post;
    for (const cat of categories?.nodes || []) {
      if (!cat || cat.parentId !== specialReportsId) continue;
      if (!byId.has(cat.id)) {
        byId.set(cat.id, {
          id: cat.id,
          name: cat.name,
          uri: cat.uri,
          posts: { nodes: [] },
        });
      }
      byId.get(cat.id).posts.nodes.push(rest);
    }
  }
  return [...byId.values()];
}

/**
 * Newest edition = the subcategory that holds the most recently published
 * article. Names are month-based ("August: Hospitals"), so neither alphabetical
 * order nor term creation order can be trusted; the edition is never hardcoded
 * so a new one published in WordPress simply wins on the next revalidation.
 */
export function pickLatestEdition(editions = []) {
  let best = null;
  let bestTime = -Infinity;

  for (const edition of editions) {
    const posts = (edition?.posts?.nodes || []).filter(Boolean);
    if (posts.length === 0) continue;

    const latest = posts.reduce((max, post) => {
      const time = post?.date ? new Date(post.date).getTime() : NaN;
      return Number.isFinite(time) && time > max ? time : max;
    }, -Infinity);

    if (latest > bestTime) {
      bestTime = latest;
      best = edition;
    }
  }

  return best;
}

/**
 * Turns the raw response into homepage props. Throws when the response is
 * unusable (no latest posts, or no categories for the nav). In ISR, a thrown
 * error during a background rebuild keeps the last good homepage in place,
 * so visitors never get an empty one cached for 15 minutes.
 */
export function buildHomepageProps(data) {
  const posts = data?.posts?.nodes;
  if (!Array.isArray(posts) || posts.length === 0) {
    throw new Error("Homepage query returned no posts");
  }
  const categories = data?.categories?.nodes;
  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error("Homepage query returned no categories");
  }

  const nodes = (key) => data?.[key]?.nodes || [];
  return {
    siteTitle: data?.generalSettings?.title || null,
    categories,
    posts,
    featuredPosts: nodes("featured"),
    leadPosts: nodes("leadPosts"),
    queMiImportaPosts: nodes("queMiImporta"),
    sectionPosts: {
      business: nodes("business"),
      economy: nodes("economy"),
      energyOil: nodes("energyOil"),
      jobsLabor: nodes("jobsLabor"),
      crypto: nodes("crypto"),
      mediaEntertainment: nodes("mediaEntertainment"),
      techAi: nodes("techAi"),
    },
    specialReportEditions: buildSpecialReportEditions(
      nodes("specialReportPosts"),
      data?.specialReports?.id,
    ),
  };
}
