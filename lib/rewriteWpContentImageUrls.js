const CDN_BASE = "https://img.caribbean.business/uploads/";
const PATTERNS = [
  /https?:\/\/cms\.vnmedia\.co\/cbusiness\/wp-content\/uploads\/sites\/2\//g,
  /\/\/cms\.vnmedia\.co\/cbusiness\/wp-content\/uploads\/sites\/2\//g,
];

export function rewriteWpContentImageUrls(html) {
  if (!html || typeof html !== "string") return html;
  let out = html;
  for (const re of PATTERNS) {
    out = out.replace(re, CDN_BASE);
  }
  return out;
}

export function rewriteWpImageSrc(url) {
  if (!url || typeof url !== "string") return url;
  let out = url;
  for (const re of PATTERNS) {
    out = out.replace(re, CDN_BASE);
  }
  return out;
}
