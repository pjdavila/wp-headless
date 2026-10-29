const { withFaust } = require("@faustwp/core");
const { withAtlasConfig } = require("@wpengine/atlas-next");
const { REMOTE_IMAGE_PATTERNS } = require("./lib/imageHosts");

/**
 * @type {import('next').NextConfig}
 **/
module.exports = withAtlasConfig(
  withFaust({
    env: {
      NEXT_PUBLIC_FIREBASE_API_KEY:
        process.env.FIREBASE_API_KEY ||
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
        "",
    },
    images: {
      // Shared with lib/imageHosts.js so app code can check, before rendering,
      // whether an editor-supplied URL is safe to pass to next/image.
      remotePatterns: REMOTE_IMAGE_PATTERNS,
    },
    // Faust's ISR HMR message can arrive before the Pages Router dev indicator
    // has initialized, causing a browser runtime exception in Next.js 15.
    devIndicators: false,
    trailingSlash: true,
    async redirects() {
      // Old /dashboard/<section>/ routes → closest tab of the rebuilt board.
      const dashboardSections = [
        ["overview", "/dashboard/"],
        ["jobs", "/dashboard/"],
        ["consumer", "/dashboard/"],
        ["business", "/dashboard/"],
        ["government", "/dashboard/"],
        ["tourism", "/dashboard/?tab=turismo"],
        ["energy", "/dashboard/?tab=energia"],
        ["trade", "/dashboard/?tab=ciencias-vivas"],
        ["construction", "/dashboard/?tab=bienes-raices"],
        ["housing", "/dashboard/?tab=bienes-raices"],
      ].flatMap(([slug, destination]) => [
        { source: `/dashboard/${slug}`, destination, permanent: true },
        { source: `/dashboard/${slug}/`, destination, permanent: true },
      ]);
      return [
        ...dashboardSections,
        {
          source: "/summit",
          destination: "https://summit.caribbean.business/",
          permanent: true,
        },
        {
          source: "/edicion-actual",
          destination: "/magazine",
          permanent: true,
        },
        {
          source: "/edicion-actual/",
          destination: "/magazine/",
          permanent: true,
        },
        {
          source: "/suscripcion-impresa",
          destination: "/subscription/",
          permanent: true,
        },
        {
          source: "/suscripcion-impresa/",
          destination: "/subscription/",
          permanent: true,
        },
      ];
    },
  }),
);
