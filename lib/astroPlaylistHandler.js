import { fetchFullPlaylist, fetchPlaylist } from "./astroPlaylist";

const TTL = 60_000;

/**
 * Public, CDN-cacheable API handler for one Astro VMS playlist.
 * Default: the playlist's first page (10 items) for homepage widgets.
 * `?all=1`: every item, for video lookups that must reach older videos.
 * On upstream failure it serves the last good response when it has one.
 */
export function createPlaylistHandler(playlistId, label) {
  const caches = { first: null, all: null };

  return async function handler(req, res) {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const key = req.query.all === "1" ? "all" : "first";
    const cached = caches[key];
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=120",
    );

    if (cached && Date.now() - cached.time < TTL) {
      return res.status(200).json(cached.body);
    }

    try {
      const videos =
        key === "all"
          ? await fetchFullPlaylist(playlistId)
          : await fetchPlaylist(playlistId);
      caches[key] = { body: { videos }, time: Date.now() };
      return res.status(200).json({ videos });
    } catch (err) {
      console.error(`${label} playlist fetch error:`, err.message);
      if (cached) return res.status(200).json(cached.body);
      return res.status(502).json({ error: "Failed to fetch playlist" });
    }
  };
}
