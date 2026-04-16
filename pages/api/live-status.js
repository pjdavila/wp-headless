const HLS_URL =
  "https://pvqyb68gdz24-hls-live.5centscdn.com/vnm/033977cd45e8d7a87c4fc453d18e20c3.sdp/playlist.m3u8";

async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: { "User-Agent": "CaribbeanBusiness-LiveStatus/1.0" },
    });
  } finally {
    clearTimeout(timer);
  }
}

function evaluateMediaPlaylist(text) {
  if (!/#EXTINF:/i.test(text)) {
    return { live: false, reason: "no_segments" };
  }
  const dateMatches = [...text.matchAll(/#EXT-X-PROGRAM-DATE-TIME:(\S+)/gi)];
  if (dateMatches.length > 0) {
    const last = dateMatches[dateMatches.length - 1][1];
    const ts = Date.parse(last);
    if (!Number.isNaN(ts)) {
      const ageSec = Math.floor((Date.now() - ts) / 1000);
      if (ageSec > 60) {
        return { live: false, reason: "stale", lastSegmentAgeSec: ageSec };
      }
      return { live: true, lastSegmentAgeSec: ageSec };
    }
  }
  return { live: true };
}

function firstVariantUrl(text, baseUrl) {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (/^#EXT-X-STREAM-INF/i.test(lines[i])) {
      for (let j = i + 1; j < lines.length; j++) {
        const candidate = lines[j].trim();
        if (!candidate || candidate.startsWith("#")) continue;
        try {
          return new URL(candidate, baseUrl).toString();
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=15, stale-while-revalidate=30"
  );

  try {
    const masterRes = await fetchWithTimeout(HLS_URL, 4000);
    if (!masterRes.ok) {
      return res
        .status(200)
        .json({ live: false, reason: `http_${masterRes.status}` });
    }
    const masterText = await masterRes.text();

    if (/#EXTINF:/i.test(masterText)) {
      return res.status(200).json(evaluateMediaPlaylist(masterText));
    }

    if (/#EXT-X-STREAM-INF/i.test(masterText)) {
      const variantUrl = firstVariantUrl(masterText, HLS_URL);
      if (!variantUrl) {
        return res.status(200).json({ live: false, reason: "no_variant" });
      }
      const variantRes = await fetchWithTimeout(variantUrl, 4000);
      if (!variantRes.ok) {
        return res
          .status(200)
          .json({ live: false, reason: `http_${variantRes.status}` });
      }
      const variantText = await variantRes.text();
      return res.status(200).json(evaluateMediaPlaylist(variantText));
    }

    return res.status(200).json({ live: false, reason: "no_segments" });
  } catch (e) {
    return res
      .status(200)
      .json({ live: false, reason: e.name === "AbortError" ? "timeout" : "error" });
  }
}
