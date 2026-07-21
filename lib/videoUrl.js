const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function slugifyTitle(title) {
  return (title || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export function videoPath(video) {
  if (!video?.mediaid) return "/videos";
  const slug = slugifyTitle(video.title);
  return slug ? `/video/${slug}-${video.mediaid}` : `/video/${video.mediaid}`;
}

export function extractMediaId(param) {
  if (!param) return null;
  const value = Array.isArray(param) ? param[0] : param;
  const match = value.match(UUID_RE);
  if (match) return match[0].toLowerCase();
  // Legacy/non-UUID media ids: treat the whole segment as the id.
  return value.toLowerCase();
}

export function hasSlug(param, mediaid) {
  if (!param || !mediaid) return false;
  const value = Array.isArray(param) ? param[0] : param;
  return value.toLowerCase() !== mediaid.toLowerCase();
}
