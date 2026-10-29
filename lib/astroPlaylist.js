/**
 * Astro VMS playlist helpers (server-side: API routes and getStaticProps).
 *
 * The playlist API is paginated: `page_offset` is a 1-based page number and
 * `page_limit` the page size (default 10). Without parameters only the first
 * 10 items come back, so archive pages and video lookups must use
 * `fetchFullPlaylist`.
 */
export const ASTRO_PLAYLISTS = {
  cbtv: "4f09e496-05a8-4600-acad-8ff9b7334189",
  shorts: "114eca46-0831-4b00-9c14-74a99e16951d",
};

const API_BASE = "https://astrovms.com/api/v2/playlists";
const FULL_PAGE_LIMIT = 100;
const MAX_PAGES = 20;

export function normalizePlaylistItem(item) {
  return {
    mediaid: item.mediaid,
    title: item.title,
    image: item.image,
    images: item.images || [],
    duration: item.duration || 0,
    link: item.link,
    tags: item.tags || "",
    pubDate: item.pubdate ? new Date(item.pubdate * 1000).toISOString() : null,
    description: item.description || "",
    sources: Array.isArray(item.sources) ? item.sources : [],
  };
}

async function fetchPage(playlistId, params = "") {
  const res = await fetch(`${API_BASE}/${playlistId}${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Astro VMS responded with ${res.status}`);
  return res.json();
}

/** First page only (the API default of 10 items), normalized. */
export async function fetchPlaylist(playlistId) {
  const data = await fetchPage(playlistId);
  return (data.playlist || []).map(normalizePlaylistItem);
}

/** Every item in the playlist, following its pages, normalized and de-duplicated. */
export async function fetchFullPlaylist(playlistId) {
  const items = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const data = await fetchPage(
      playlistId,
      `?page_offset=${page}&page_limit=${FULL_PAGE_LIMIT}`,
    );
    const batch = data.playlist || [];
    items.push(...batch);
    if (batch.length < FULL_PAGE_LIMIT || !data.links?.next) break;
  }
  const seen = new Set();
  return items
    .filter((item) => {
      if (!item.mediaid || seen.has(item.mediaid)) return false;
      seen.add(item.mediaid);
      return true;
    })
    .map(normalizePlaylistItem);
}

/** CB TV items tagged "short"/"shorts" belong to the shorts format. */
export function isShortVideo(video) {
  const tags = (video.tags || "")
    .toLowerCase()
    .split(",")
    .map((tag) => tag.trim());
  return tags.includes("short") || tags.includes("shorts");
}
