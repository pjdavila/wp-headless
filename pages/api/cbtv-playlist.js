const PLAYLIST_URL =
  "https://astrovms.com/api/v2/playlists/01f53f71-784b-4b3a-b8c0-5ca407cdb38d";

let cache = null;
let cacheTime = 0;
const TTL = 60_000;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const now = Date.now();
  if (cache && now - cacheTime < TTL) {
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json(cache);
  }

  try {
    const response = await fetch(PLAYLIST_URL, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Astro VMS responded with ${response.status}`);
    }

    const data = await response.json();
    const videos = (data.playlist || []).map((item) => ({
      mediaid: item.mediaid,
      title: item.title,
      image: item.image,
      images: item.images || [],
      duration: item.duration || 0,
      link: item.link,
      tags: item.tags || "",
      pubDate: item.pubdate ? new Date(item.pubdate * 1000).toISOString() : null,
      description: item.description || "",
    }));

    cache = { videos };
    cacheTime = now;

    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json({ videos });
  } catch (err) {
    console.error("CB TV playlist fetch error:", err.message);
    if (cache) {
      return res.status(200).json(cache);
    }
    return res.status(502).json({ error: "Failed to fetch playlist" });
  }
}
