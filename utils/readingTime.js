export function estimateReadingTime(htmlContent) {
  if (!htmlContent) return 1;
  const text = htmlContent.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  const words = text.split(" ").filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
