import Stripe from "stripe";

let client = null;

// Lazily create the Stripe client and fail loudly when the owner has not
// configured the keys yet — the subscription flow must never fail silently.
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Stripe no está configurado: falta STRIPE_SECRET_KEY en las variables de entorno.",
    );
  }
  if (!client) {
    client = new Stripe(key);
  }
  return client;
}

export function getMonthlyPriceId() {
  const priceId = process.env.STRIPE_PRICE_ID_MONTHLY;
  if (!priceId) {
    throw new Error(
      "Stripe no está configurado: falta STRIPE_PRICE_ID_MONTHLY (el precio mensual de $4.99 creado en el dashboard de Stripe).",
    );
  }
  return priceId;
}

export function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      "Stripe no está configurado: falta STRIPE_WEBHOOK_SECRET en las variables de entorno.",
    );
  }
  return secret;
}

const FALLBACK_ORIGIN = "https://caribbean.business";

function isAllowedHostname(hostname) {
  if (!hostname) return false;
  const allowed = new Set([
    "caribbean.business",
    "www.caribbean.business",
    "localhost",
    "127.0.0.1",
  ]);
  if (allowed.has(hostname)) return true;
  // Replit dev/preview domains (comma-separated in REPLIT_DOMAINS).
  const replitDomains = (
    process.env.REPLIT_DOMAINS ||
    process.env.REPLIT_DEV_DOMAIN ||
    ""
  )
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
  return replitDomains.includes(hostname);
}

function parseOrigin(value) {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

// Resolve the frontend origin used in Stripe return URLs. Never trust the
// caller's Origin/Referer headers — an attacker could point the Stripe-hosted
// checkout return URL at their own site. Prefer the configured frontend URL
// (NEXT_PUBLIC_APP_URL); otherwise accept the request host only when it is on
// the allowlist. Note: NEXT_PUBLIC_SITE_URL is the WordPress CMS and must NOT
// be used here.
export function getSiteOrigin(req) {
  const configured = parseOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (configured && isAllowedHostname(new URL(configured).hostname)) {
    return configured;
  }

  const host = req?.headers?.["x-forwarded-host"] || req?.headers?.host;
  if (host) {
    const proto = req.headers["x-forwarded-proto"] || "https";
    const candidate = parseOrigin(`${proto}://${host}`);
    if (candidate && isAllowedHostname(new URL(candidate).hostname)) {
      return candidate;
    }
  }

  return FALLBACK_ORIGIN;
}
