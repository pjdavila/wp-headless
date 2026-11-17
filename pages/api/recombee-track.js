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

// On Cloudflare Workers (OpenNext) work left running after the response is
// cancelled unless it is handed to `ctx.waitUntil`. OpenNext exposes the
// request context on this global symbol; on Node hosts it is undefined.
function getWaitUntil() {
  try {
    const ctx = globalThis[Symbol.for("__cloudflare-context__")]?.ctx;
    return typeof ctx?.waitUntil === "function" ? ctx.waitUntil.bind(ctx) : null;
  } catch {
    return null;
  }
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

  // Awaited so the view is recorded before the response on every host.
  try {
    await client.send(
      new rqs.AddDetailView(userId, itemId, {
        cascadeCreate: true,
      })
    );
  } catch (err) {
    console.error("Recombee track error:", err.message);
  }

  const itemFiller = getFiller(client);
  itemFiller.track(itemId);
  const waitUntil = getWaitUntil();
  if (waitUntil) waitUntil(itemFiller.settled());

  return res.status(200).json({ ok: true });
}
