const HEYZINE_LIST_URL = "https://heyzine.com/api1/flipbook-list";

function getFlipbookKey(value) {
  if (!value || typeof value !== "string") return "";

  const match = value.match(/([a-f0-9]{10,})(?:\.pdf)?/i);
  return match?.[1]?.slice(0, 10).toLowerCase() || "";
}

function normalizeEdition(item) {
  if (!item || typeof item !== "object") return null;

  const url = item.links?.base || item.links?.custom;
  const thumbnailUrl = item.links?.thumbnail;
  const date = new Date(item.date);

  if (
    !item.id ||
    !url ||
    !thumbnailUrl ||
    Number.isNaN(date.getTime()) ||
    !url.startsWith("https://") ||
    !thumbnailUrl.startsWith("https://")
  ) {
    return null;
  }

  return {
    id: String(item.id),
    title: typeof item.title === "string" ? item.title.trim() : "",
    date: date.toISOString(),
    thumbnailUrl,
    url,
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.HEYZINE_API_KEY) {
    return res.status(503).json({ error: "Magazine archive unavailable" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const upstream = await fetch(HEYZINE_LIST_URL, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${process.env.HEYZINE_API_KEY}`,
      },
    });

    if (!upstream.ok) {
      return res.status(502).json({ error: "Magazine archive unavailable" });
    }

    const data = await upstream.json();
    if (!Array.isArray(data)) {
      return res
        .status(502)
        .json({ error: "Magazine archive returned invalid data" });
    }

    const currentKey = getFlipbookKey(
      Array.isArray(req.query.current)
        ? req.query.current[0]
        : req.query.current,
    );
    const editions = data
      .map(normalizeEdition)
      .filter(Boolean)
      .filter((edition) => {
        if (!currentKey) return true;
        return (
          getFlipbookKey(edition.id) !== currentKey &&
          getFlipbookKey(edition.url) !== currentKey
        );
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=3600",
    );
    return res.status(200).json({ editions });
  } catch {
    return res.status(502).json({ error: "Magazine archive request failed" });
  } finally {
    clearTimeout(timeout);
  }
}
