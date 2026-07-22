const WP_URL =
  process.env.NEXT_PUBLIC_WORDPRESS_URL || "https://cms.vnmedia.co/cbusiness";
const PUBLICATION_NAME = "Caribbean Business";
const PUBLICATION_LANGUAGE = "es";

const QUERY = `
  query NewsSitemapPosts {
    posts(first: 100, where: { orderby: { field: DATE, order: DESC } }) {
      nodes {
        title
        uri
        dateGmt
      }
    }
  }
`;

function escapeXml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export default function NewsSitemap() {
  return null;
}

export async function getServerSideProps({ res }) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://caribbean.business").replace(/\/+$/, "");

  let posts = [];
  try {
    const resp = await fetch(`${WP_URL}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY }),
    });
    const json = await resp.json();
    posts = json?.data?.posts?.nodes || [];
  } catch (e) {
    console.error("[news-sitemap] WPGraphQL fetch failed", e);
  }

  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const recent = posts.filter((p) => {
    if (!p?.dateGmt || !p?.uri) return false;
    const ts = Date.parse(`${p.dateGmt}Z`);
    return Number.isFinite(ts) && ts >= cutoff;
  });

  const urls = recent
    .map((p) => {
      const loc = `${siteUrl}${p.uri}`;
      const pubDate = new Date(Date.parse(`${p.dateGmt}Z`)).toISOString();
      return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(PUBLICATION_NAME)}</news:name>
        <news:language>${PUBLICATION_LANGUAGE}</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${escapeXml(p.title)}</news:title>
    </news:news>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1800");
  res.write(xml);
  res.end();

  return { props: {} };
}
