// Shared guards for public form endpoints: per-process rate limiting,
// input sanitization and small validators. Mirrors the behavior of
// pages/api/print-edition-interest.js. Rate limiting is per-process only —
// it does not coordinate across serverless instances.

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) {
    return fwd.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

export function truncateIp(ip) {
  if (!ip || ip === "unknown") return "unknown";
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return parts.slice(0, 4).join(":") + "::";
  }
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  return "unknown";
}

export function createRateLimiter({ windowMs = 60_000, max = 5 } = {}) {
  const hits = new Map();
  return function check(ip) {
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || now - entry.start > windowMs) {
      hits.set(ip, { start: now, count: 1 });
      return true;
    }
    entry.count += 1;
    return entry.count <= max;
  };
}

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

export function sanitize(value, max = 200) {
  if (typeof value !== "string") return "";
  return value.replace(CONTROL_CHARS, "").trim().slice(0, max);
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Puerto Rico ZIP codes live in the 006xx–009xx ranges.
export function isValidPuertoRicoZip(value) {
  return /^00[6-9]\d{2}(-\d{4})?$/.test(value);
}
