const { getClient, rqs } = require("../../lib/recombee");

const MAX_LEN = 256;
const ID_RE = /^[a-zA-Z0-9_\-/.]+$/;

function isValidId(val) {
  return typeof val === "string" && val.length > 0 && val.length <= MAX_LEN && ID_RE.test(val);
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

  return res.status(200).json({ ok: true });
}
