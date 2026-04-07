const recombee = require("recombee-api-client");

let client = null;

function getClient() {
  if (client) return client;

  const dbId = process.env.RECOMBEE_DB_ID;
  const privateToken = process.env.RECOMBEE_PRIVATE_TOKEN;

  if (!dbId || !privateToken) {
    return null;
  }

  const opts = {};
  const region = process.env.RECOMBEE_REGION;
  if (region) {
    opts.region = region;
  }

  client = new recombee.ApiClient(dbId, privateToken, opts);

  return client;
}

module.exports = { getClient, rqs: recombee.requests };
