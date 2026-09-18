import crypto from "node:crypto";

/**
 * Server-side identity verification for the internal economic API
 * (pages/api/economy/*). The dashboard is restricted to logged-in users, so
 * every economic API route verifies the caller's Firebase ID token before
 * reading any data.
 *
 * Firebase ID tokens are RS256 JWTs signed by Google; the public keys are
 * published at a well-known URL, so verification needs no service-account
 * credential — only the project ID. This replaced the old firebase-admin
 * setup that required FIREBASE_SERVICE_ACCOUNT and answered 500 when that
 * variable was missing.
 *
 * This module is imported ONLY from API routes.
 */

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "caribbean-business";
const CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

// Google's cert endpoint rotates keys; Cache-Control max-age tells us for how
// long the response is authoritative. We keep the parsed certs in module scope
// (per server instance) and refetch only when the cache expires.
let certCache = { certs: null, expiresAt: 0 };

async function getPublicCerts() {
  if (certCache.certs && Date.now() < certCache.expiresAt) {
    return certCache.certs;
  }
  const res = await fetch(CERTS_URL);
  if (!res.ok) {
    throw new Error(`Google cert fetch failed with HTTP ${res.status}`);
  }
  const maxAgeMatch = /max-age=(\d+)/.exec(
    res.headers.get("cache-control") || "",
  );
  const maxAgeMs = (maxAgeMatch ? Number(maxAgeMatch[1]) : 3600) * 1000;
  certCache = {
    certs: await res.json(),
    expiresAt: Date.now() + maxAgeMs,
  };
  return certCache.certs;
}

function decodeSegment(segment) {
  const json = Buffer.from(segment, "base64url").toString("utf8");
  const value = JSON.parse(json);
  // JWT parts must be JSON objects — a bare string/number/null would crash
  // or misbehave downstream.
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value;
}

/**
 * Verifies a Firebase ID token (RS256 JWT) against Google's public certs.
 * Returns the decoded payload on success, null on any verification failure
 * (bad signature, wrong project, expired, malformed).
 */
async function verifyFirebaseIdToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  let header;
  let payload;
  try {
    header = decodeSegment(parts[0]);
    payload = decodeSegment(parts[1]);
  } catch {
    return null;
  }
  if (!header || !payload) return null;

  if (header.alg !== "RS256") return null;
  if (typeof header.kid !== "string" || header.kid.length === 0) return null;

  const certs = await getPublicCerts();
  // Own-property lookup: a kid like "constructor" or "__proto__" must not
  // resolve to an inherited Object property.
  const cert = Object.hasOwn(certs, header.kid) ? certs[header.kid] : null;
  if (typeof cert !== "string") return null;

  const signed = `${parts[0]}.${parts[1]}`;
  const signature = Buffer.from(parts[2], "base64url");
  const valid = crypto.verify(
    "RSA-SHA256",
    Buffer.from(signed),
    cert,
    signature,
  );
  if (!valid) return null;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const expectedIssuer = `https://securetoken.google.com/${PROJECT_ID}`;
  if (payload.iss !== expectedIssuer) return null;
  if (payload.aud !== PROJECT_ID) return null;
  if (typeof payload.exp !== "number" || payload.exp <= nowSeconds) {
    return null;
  }
  if (typeof payload.iat !== "number" || payload.iat > nowSeconds + 300) {
    return null;
  }
  // Firebase UIDs are non-empty and at most 128 characters.
  if (
    typeof payload.sub !== "string" ||
    payload.sub.length === 0 ||
    payload.sub.length > 128
  ) {
    return null;
  }

  return payload;
}

/**
 * Verifies the `Authorization: Bearer <Firebase ID token>` header.
 *
 * @returns {Promise<
 *   | { ok: true, user: object }
 *   | { ok: false, status: number, error: string }
 * >}
 */
export async function verifyEconomyRequest(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return { ok: false, status: 401, error: "Missing Firebase ID token" };
  }
  try {
    const user = await verifyFirebaseIdToken(token);
    if (!user) {
      return {
        ok: false,
        status: 401,
        error: "Invalid or expired Firebase ID token",
      };
    }
    return { ok: true, user };
  } catch {
    // Only reachable when Google's cert endpoint is unreachable — a problem
    // on our side, so 500, distinct from an unauthenticated caller (401).
    // The internal error text stays in the server log, not the response.
    return { ok: false, status: 500, error: "Token verification unavailable" };
  }
}

/**
 * Cache policy for the restricted economic API: authenticated, user-specific
 * responses must never sit in a shared/CDN cache.
 */
export function sendPrivateJson(res, status, body) {
  res.setHeader("Cache-Control", "private, no-store");
  return res.status(status).json(body);
}
