const { withFaust } = require("@faustwp/core");

/**
 * @type {import('next').NextConfig}
 **/
module.exports = withFaust({
  images: {
    domains: ["vnmcms.wpenginepowered.com"],
  },
  trailingSlash: true,
});
