const COVER_API_URL =
  process.env.MAGAZINE_COVER_API_URL ||
  "https://portal.vnmedia.co/api/public/caribbean-cover";

export default async function handler(req, res) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const upstream = await fetch(COVER_API_URL, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!upstream.ok) {
      return res.status(502).json({ error: "Cover API unavailable" });
    }
    const data = await upstream.json();
    if (!data || (!data.flipbookUrl && !data.thumbnailUrl)) {
      return res.status(502).json({ error: "Cover API returned no data" });
    }

    // Cache at the CDN/edge for 5 min, allow stale for 1 h while revalidating.
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
    return res.status(200).json({
      flipbookUrl: data.flipbookUrl || null,
      thumbnailUrl: data.thumbnailUrl || null,
      title: data.title || "",
      updatedAt: data.updatedAt || null,
    });
  } catch {
    return res.status(502).json({ error: "Cover API request failed" });
  } finally {
    clearTimeout(timeout);
  }
}
