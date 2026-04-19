const { withFaust } = require("@faustwp/core");
const { withAtlasConfig } = require("@wpengine/atlas-next");

/**
 * @type {import('next').NextConfig}
 **/
module.exports = withAtlasConfig(
  withFaust({
    env: {
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    },
    images: {
      remotePatterns: [
        {
          protocol: "https",
          hostname: "cms.vnmedia.co",
        },
        {
          protocol: "https",
          hostname: "vnmcms.wpenginepowered.com",
        },
        {
          protocol: "https",
          hostname: "img.caribbean.business",
        },
        {
          protocol: "https",
          hostname: "**.b-cdn.net",
        },
        {
          protocol: "https",
          hostname: "astrovms.com",
        },
      ],
    },
    trailingSlash: true,
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
