/** Display helpers shared by the /videos page and the video archives. */
export function formatDuration(seconds) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Smallest rendition at least `minWidth` wide, else the default image. */
export function getThumb(video, minWidth) {
  return video.images?.find((img) => img.width >= minWidth)?.src || video.image;
}
