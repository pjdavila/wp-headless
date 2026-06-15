import { NextResponse } from "next/server";

export function middleware() {
  const response = NextResponse.next();
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=60, must-revalidate"
  );
  return response;
}

export const config = {
  // Apply the ISR cache header to all content pages (homepage, articles,
  // categories served by pages/[...wordpressNode].js, etc.) while excluding
  // API routes, Next.js internals, and any static asset with a file extension
  // (favicon.ico, robots.txt, sitemap.xml, manifest.json, *.webp, *.png,
  // firebase-messaging-sw.js, ...). This avoids Edge serving stale content via
  // a long stale-while-revalidate default while preserving asset/CDN caching.
  matcher: ["/((?!api|_next|.*\\.[^/]+$).*)"],
};
