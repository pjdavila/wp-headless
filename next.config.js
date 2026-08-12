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
    trailingSlash: true,
    async redirects() {
      return [
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
      ];
    },
  }),
);
