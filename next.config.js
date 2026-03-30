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
      ],
    },
    trailingSlash: true,
  })
);
