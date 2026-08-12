/**
 * Single source of truth for the remote hosts `next/image` is allowed to
 * optimize. `next.config.js` consumes REMOTE_IMAGE_PATTERNS directly, and app
 * code can call isOptimizableImageUrl() to find out — before rendering — whether
 * a URL would be accepted.
 *
 * This matters for URLs an editor can type in by hand (e.g. the author profile
 * photo from the cb-author-profiles WordPress plugin, which accepts any
 * external URL, not just Media Library attachments). Handing `next/image` a
 * host that is not listed here throws an "Invalid src prop" error and takes
 * down the whole page, so such URLs must be rendered with a plain <img>
 * instead.
 *
 * CommonJS on purpose: next.config.js is CJS and must be able to require it.
 */

const REMOTE_IMAGE_PATTERNS = [
  { protocol: "https", hostname: "cms.vnmedia.co" },
  { protocol: "https", hostname: "vnmcms.wpenginepowered.com" },
  { protocol: "https", hostname: "img.caribbean.business" },
  { protocol: "https", hostname: "img.vnmedia.co" },
  { protocol: "https", hostname: "**.b-cdn.net" },
  { protocol: "https", hostname: "astrovms.com" },
];

/**
 * Mirrors Next.js wildcard semantics: `**.` matches any number of leading
 * subdomains, `*.` matches exactly one.
 */
function hostnameMatches(pattern, hostname) {
  if (pattern.startsWith("**.")) {
    const suffix = pattern.slice(3);
    return hostname === suffix || hostname.endsWith(`.${suffix}`);
  }

  if (pattern.startsWith("*.")) {
    const suffix = pattern.slice(2);
    if (!hostname.endsWith(`.${suffix}`)) return false;
    const label = hostname.slice(0, -(suffix.length + 1));
    return label.length > 0 && !label.includes(".");
  }

  return hostname === pattern;
}

/**
 * True only when `next/image` can safely optimize this URL. Relative URLs are
 * served from our own origin and are always fine.
 */
function isOptimizableImageUrl(url) {
  if (!url || typeof url !== "string") return false;

  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;

  let parsed;
  try {
    parsed = new URL(trimmed.startsWith("//") ? `https:${trimmed}` : trimmed);
  } catch {
    return false;
  }

  return REMOTE_IMAGE_PATTERNS.some(
    (pattern) =>
      `${pattern.protocol}:` === parsed.protocol &&
      hostnameMatches(pattern.hostname, parsed.hostname),
  );
}

/**
 * Returns the URL only when it is a safe thing to put in an <img src>, i.e. a
 * relative path or an http(s) URL. Anything else (javascript:, data:, garbage)
 * returns null so the caller can fall back to a placeholder.
 */
function safeImageUrl(url) {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;

  const withProtocol = trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;

  let parsed;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

  return withProtocol;
}

module.exports = {
  REMOTE_IMAGE_PATTERNS,
  isOptimizableImageUrl,
  safeImageUrl,
};
