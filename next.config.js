const { withFaust } = require("@faustwp/core");
const { withAtlasConfig } = require("@wpengine/atlas-next");

/**
 * @type {import('next').NextConfig}
 **/
module.exports = withAtlasConfig(
  withFaust({
    images: {
      remotePatterns: [
        {
          protocol: "https",
          hostname: "vnmcms.wpenginepowered.com",
        },
        {
          protocol: "https",
          hostname: "img.caribbean.business",
        },
      ],
    },
    trailingSlash: true,
    async rewrites() {
      return [
        {
          source: "/firebase-messaging-sw.js",
          destination: "/api/firebase-messaging-sw",
        },
      ];
    },
    async redirects() {
      return [
        {
          source: "/summit",
          destination: "https://summit.caribbean.business/",
          permanent: true,
        },
      ];
    },
  })
);
