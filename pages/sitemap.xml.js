import { getSitemapProps } from "@faustwp/core";

export default function Sitemap() {}

export function getServerSideProps(ctx) {
  return getSitemapProps(ctx, {
    frontendUrl: process.env.NEXT_PUBLIC_SITE_URL,
    sitemapPathsToIgnore: ["/wp-sitemap-users-*"],
  });
}
