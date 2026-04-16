const HLS_URL =
  "https://pvqyb68gdz24-hls-live.5centscdn.com/vnm/033977cd45e8d7a87c4fc453d18e20c3.sdp/playlist.m3u8";

export default async function handler(req, res) {
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=15, stale-while-revalidate=30"
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const r = await fetch(HLS_URL, {
      cache: "no-store",
      signal: controller.signal,
      headers: { "User-Agent": "CaribbeanBusiness-LiveStatus/1.0" },
    });
    clearTimeout(timer);

    if (!r.ok) {
      return res.status(200).json({ live: false, reason: `http_${r.status}` });
    }

    const text = await r.text();
    const hasSegments = /#EXTINF:/i.test(text);
    if (!hasSegments) {
      return res.status(200).json({ live: false, reason: "no_segments" });
    }

    const dateMatches = [...text.matchAll(/#EXT-X-PROGRAM-DATE-TIME:(\S+)/gi)];
    if (dateMatches.length > 0) {
      const last = dateMatches[dateMatches.length - 1][1];
      const ts = Date.parse(last);
      if (!Number.isNaN(ts)) {
        const ageSec = Math.floor((Date.now() - ts) / 1000);
        if (ageSec > 60) {
          return res
            .status(200)
            .json({ live: false, reason: "stale", lastSegmentAgeSec: ageSec });
        }
        return res.status(200).json({ live: true, lastSegmentAgeSec: ageSec });
      }
    }

    return res.status(200).json({ live: true });
  } catch (e) {
    clearTimeout(timer);
    return res
      .status(200)
      .json({ live: false, reason: e.name === "AbortError" ? "timeout" : "error" });
  }
}
