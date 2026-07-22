const WP_URL =
  process.env.NEXT_PUBLIC_WORDPRESS_URL || "https://cms.vnmedia.co/cbusiness";
const SITE_NAME = "Caribbean Business";
const SITE_DESCRIPTION =
  "Business, technology, marketing, and finance news from the Caribbean. Your premium source for business insights.";

const QUERY = `
  query FeedPosts {
    posts(first: 30, where: { orderby: { field: DATE, order: DESC } }) {
      nodes {
        title
        uri
        excerpt
        dateGmt
        author {
          node {
            name
          }
        }
        categories {
          nodes {
            name
            slug
          }
        }
        featuredImage {
          node {
            sourceUrl
            mimeType
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

function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function Feed() {
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
    console.error("[feed] WPGraphQL fetch failed", e);
  }

  const items = posts
    .filter((p) => p?.uri && p?.title)
    .map((p) => {
      const link = `${siteUrl}${p.uri}`;
      const pubDate = p.dateGmt
        ? new Date(Date.parse(`${p.dateGmt}Z`)).toUTCString()
        : "";
      const category = p.categories?.nodes?.find((c) => c.slug !== "uncategorized");
      const img = p.featuredImage?.node?.sourceUrl;
      const imgType = p.featuredImage?.node?.mimeType || "image/jpeg";
      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ""}
      <description>${escapeXml(stripHtml(p.excerpt))}</description>
      ${p.author?.node?.name ? `<dc:creator>${escapeXml(p.author.node.name)}</dc:creator>` : ""}
      ${category ? `<category>${escapeXml(category.name)}</category>` : ""}
      ${img ? `<enclosure url="${escapeXml(img)}" type="${escapeXml(imgType)}" length="0" />` : ""}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>es</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(`${siteUrl}/feed.xml`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1800");
  res.write(xml);
  res.end();

  return { props: {} };
}
