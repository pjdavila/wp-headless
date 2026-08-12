const WP_URL = (
  process.env.NEXT_PUBLIC_WORDPRESS_URL || "https://cms.vnmedia.co/cbusiness"
).replace(/\/+$/, "");

const QUERY = `
  query AuthorSitemap {
    users(first: 100, where: { hasPublishedPosts: POST }) {
      nodes {
        uri
        posts(first: 1, where: { orderby: { field: DATE, order: DESC } }) {
          nodes {
            modifiedGmt
          }
        }
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

export default function AuthorSitemap() {
  return null;
}

export async function getServerSideProps({ res }) {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://caribbean.business"
  ).replace(/\/+$/, "");

  let authors = [];
  try {
    const resp = await fetch(`${WP_URL}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY }),
    });
    const json = await resp.json();
    authors = json?.data?.users?.nodes || [];
  } catch (e) {
    console.error("[author-sitemap] WPGraphQL fetch failed", e);
  }

  const urls = authors
    .filter((a) => a?.uri)
    .map((a) => {
      const loc = `${siteUrl}${a.uri}`;
      const modified = a.posts?.nodes?.[0]?.modifiedGmt;
      const ts = modified ? Date.parse(`${modified}Z`) : NaN;
      const lastmod = Number.isFinite(ts)
        ? `\n    <lastmod>${new Date(ts).toISOString()}</lastmod>`
        : "";

      return `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmod}
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=3600, stale-while-revalidate=86400",
  );
  res.write(xml);
  res.end();

  return { props: {} };
}
