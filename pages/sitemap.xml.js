import { getSitemapProps } from "@faustwp/core";

export default function Sitemap() {}

export function getServerSideProps(ctx) {
  return getSitemapProps(ctx, {
    frontendUrl: process.env.NEXT_PUBLIC_SITE_URL,
    // Author URLs are published through /author-sitemap.xml (declared in
    // robots.txt), which keeps the canonical trailing slash.
  });
}
