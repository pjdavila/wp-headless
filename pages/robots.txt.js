export default function Robots() {
  return null;
}

export function getServerSideProps({ res }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://caribbean.business";

  const robotsTxt = `User-agent: *
Allow: /
Disallow: /api/

# AI / LLM crawlers — explicitly allowed
User-agent: GPTBot
Allow: /
Disallow: /api/

User-agent: OAI-SearchBot
Allow: /
Disallow: /api/

User-agent: ChatGPT-User
Allow: /
Disallow: /api/

User-agent: ClaudeBot
Allow: /
Disallow: /api/

User-agent: Claude-Web
Allow: /
Disallow: /api/

User-agent: anthropic-ai
Allow: /
Disallow: /api/

User-agent: PerplexityBot
Allow: /
Disallow: /api/

User-agent: Google-Extended
Allow: /
Disallow: /api/

User-agent: CCBot
Allow: /
Disallow: /api/

User-agent: Applebot-Extended
Allow: /
Disallow: /api/

User-agent: Bytespider
Allow: /
Disallow: /api/

User-agent: meta-externalagent
Allow: /
Disallow: /api/

Sitemap: ${siteUrl}/sitemap.xml
Sitemap: ${siteUrl}/news-sitemap.xml
Sitemap: ${siteUrl}/author-sitemap.xml
`;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
  res.write(robotsTxt);
  res.end();

  return { props: {} };
}
