const { getClient, rqs } = require("../../lib/recombee");

const MAX_LEN = 256;
const ID_RE = /^[a-zA-Z0-9_\-/.]+$/;
const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || "https://cms.vnmedia.co/cbusiness";

function isValidId(val) {
  return typeof val === "string" && val.length > 0 && val.length <= MAX_LEN && ID_RE.test(val);
}

async function fetchPostsBySlug(slugs) {
  if (!slugs.length) return {};

  const slugIn = slugs.map((s) => `"${s}"`).join(", ");
  const query = `query GetPostsBySlugs {
    posts(first: ${slugs.length}, where: { nameIn: [${slugIn}] }) {
      nodes {
        slug
        title
        excerpt
        uri
        date
        featuredImage { node { sourceUrl altText } }
        categories { nodes { name slug uri } }
      }
    }
  }`;

  try {
    const resp = await fetch(`${WP_URL}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const json = await resp.json();
    const posts = json?.data?.posts?.nodes || [];
    const map = {};
    for (const p of posts) {
      map[p.slug] = p;
    }
    return map;
  } catch (err) {
    console.error("WP fetch for recommendations error:", err.message);
    return {};
  }
}

function mapRecombeeItem(r, wpPost) {
  if (wpPost) {
    const cat = wpPost.categories?.nodes?.find((c) => c.slug !== "uncategorized") || wpPost.categories?.nodes?.[0];
    return {
      id: r.id,
      title: wpPost.title || "",
      excerpt: wpPost.excerpt || "",
      uri: wpPost.uri || `/${r.id}/`,
      date: wpPost.date || "",
      imageUrl: wpPost.featuredImage?.node?.sourceUrl || "",
      category: cat?.name || "",
      categoryUri: cat?.uri || "",
    };
  }

  const link = r.values?.link || "";
  let uri = link;
  try {
    if (link && link.startsWith("http")) {
      uri = new URL(link).pathname;
    }
  } catch {}
  return {
    id: r.id,
    title: r.values?.title || "",
    excerpt: r.values?.description || "",
    uri: uri || `/${r.id}/`,
    date: r.values?.pubDate || "",
    imageUrl: r.values?.["media:content"] || "",
    category: r.values?.categories || "",
    categoryUri: "",
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { type, itemId, userId, count = "6" } = req.query;
  const n = Math.max(1, Math.min(parseInt(count, 10) || 6, 20));

  if (!isValidId(userId)) {
    return res.status(400).json({ error: "Invalid userId" });
  }

  if (type === "item-to-item" && !isValidId(itemId)) {
    return res.status(400).json({ error: "Invalid itemId" });
  }

  const client = getClient();
  if (!client) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ items: [] });
  }

  try {
    let request;
    if (type === "item-to-item" && itemId) {
      request = new rqs.RecommendItemsToItem(itemId, userId, n, {
        returnProperties: true,
        cascadeCreate: true,
        scenario: "related-articles",
      });
    } else {
      request = new rqs.RecommendItemsToUser(userId, n, {
        returnProperties: true,
        cascadeCreate: true,
        scenario: "homepage-recommended",
      });
    }

    const response = await client.send(request);
    const recomms = response.recomms || [];

    const slugsForWp = [];
    const idToSlug = {};
    for (const r of recomms) {
      let slug = r.id;
      if (!r.values?.title || !r.values?.["media:content"]) {
        const link = r.values?.link || "";
        if (link) {
          try {
            const pathname = new URL(link).pathname;
            slug = pathname.replace(/^\/|\/$/g, "");
          } catch {}
        }
        idToSlug[r.id] = slug;
        slugsForWp.push(slug);
      }
    }
    const wpMap = slugsForWp.length > 0 ? await fetchPostsBySlug(slugsForWp) : {};

    const items = recomms
      .map((r) => {
        const slug = idToSlug[r.id] || r.id;
        return mapRecombeeItem(r, wpMap[slug]);
      })
      .filter((item) => item.title);

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ items });
  } catch (err) {
    console.error("Recombee recommend error:", err.message);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ items: [] });
  }
}
