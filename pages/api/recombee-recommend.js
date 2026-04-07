const { getClient, rqs } = require("../../lib/recombee");

const MAX_LEN = 256;
const ID_RE = /^[a-zA-Z0-9_\-/.]+$/;

function isValidId(val) {
  return typeof val === "string" && val.length > 0 && val.length <= MAX_LEN && ID_RE.test(val);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { type, itemId, userId, count = "6" } = req.query;
  const n = Math.max(1, Math.min(parseInt(count, 10) || 6, 20));

  if (!isValidId(userId)) {
    return res.status(400).json({ error: "Invalid userId" });
  }

  if (type === "item-to-item" && !isValidId(itemId)) {
    return res.status(400).json({ error: "Invalid itemId" });
  }

  const client = getClient();
  if (!client) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ items: [] });
  }

  try {
    let request;
    if (type === "item-to-item" && itemId) {
      request = new rqs.RecommendItemsToItem(itemId, userId, n, {
        returnProperties: true,
        cascadeCreate: true,
      });
    } else {
      request = new rqs.RecommendItemsToUser(userId, n, {
        returnProperties: true,
        cascadeCreate: true,
      });
    }

    const response = await client.send(request);
    const items = (response.recomms || []).map((r) => {
      const link = r.values?.link || "";
      let uri = link;
      try {
        if (link && link.startsWith("http")) {
          uri = new URL(link).pathname;
        }
      } catch {}
      return {
        id: r.id,
        title: r.values?.title || "",
        excerpt: r.values?.description || "",
        uri,
        date: r.values?.pubDate || "",
        imageUrl: r.values?.["media:content"] || "",
        category: r.values?.categories || "",
        categoryUri: "",
      };
    });

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ items });
  } catch (err) {
    console.error("Recombee recommend error:", err.message);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ items: [] });
  }
}
