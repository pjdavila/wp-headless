import { createItemFiller, fetchPostsBySlugs } from "../../lib/recombeeItems";
import { createItemStore } from "../../lib/recombeeItemStore";

const { getClient, rqs } = require("../../lib/recombee");

const MAX_LEN = 256;
const ID_RE = /^[a-zA-Z0-9_\-/.]+$/;

function isValidId(val) {
  return typeof val === "string" && val.length > 0 && val.length <= MAX_LEN && ID_RE.test(val);
}

// One per server process: makes sure a viewed article's Recombee item carries
// its title, image, link, date, category and excerpt, so recommendations can
// be rendered without WordPress. Each item is checked about once per process.
let filler = null;
function getFiller(client) {
  if (!filler) {
    const store = createItemStore(client, rqs);
    filler = createItemFiller({
      getValuesMany: store.getValuesMany,
      setValuesMany: store.setValuesMany,
      fetchBySlugs: (slugs) => fetchPostsBySlugs(slugs),
    });
  }
  return filler;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, itemId } = req.body || {};
  if (!isValidId(userId) || !isValidId(itemId)) {
    return res.status(400).json({ error: "Invalid userId or itemId" });
  }

  const client = getClient();
  if (!client) {
    return res.status(200).json({ ok: true, skipped: true });
  }

  client.send(
    new rqs.AddDetailView(userId, itemId, {
      cascadeCreate: true,
    })
  ).catch((err) => {
    console.error("Recombee track error:", err.message);
  });

  getFiller(client).track(itemId);

  return res.status(200).json({ ok: true });
}
