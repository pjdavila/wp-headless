import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/**
 * Firebase Admin SDK — server-side identity verification for the internal
 * economic API (pages/api/economy/*). The dashboard is restricted to
 * logged-in users, so every economic API route verifies the caller's
 * Firebase ID token before reading any data.
 *
 * The service account JSON comes from the FIREBASE_SERVICE_ACCOUNT
 * environment variable (the full JSON document as a single string). It is
 * server-only — never referenced from client code or NEXT_PUBLIC_* vars.
 *
 * This module is imported ONLY from API routes; importing it in client code
 * would bundle the Admin SDK (and fail loudly there).
 */

function getAdminAuth() {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT || "").trim();
  if (!raw) {
    // Configuration problem on our side — the caller maps this to 500,
    // distinct from an unauthenticated caller (401).
    throw new Error("FIREBASE_SERVICE_ACCOUNT not configured");
  }
  if (getApps().length === 0) {
    let credentials;
    try {
      credentials = JSON.parse(raw);
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON");
    }
    initializeApp({ credential: cert(credentials) });
  }
  return getAuth();
}

/**
 * Verifies the `Authorization: Bearer <Firebase ID token>` header.
 *
 * @returns {Promise<
 *   | { ok: true, user: import("firebase-admin/auth").DecodedIdToken }
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
    const user = await getAdminAuth().verifyIdToken(token);
    return { ok: true, user };
  } catch (err) {
    if (/FIREBASE_SERVICE_ACCOUNT/.test(err.message)) {
      return { ok: false, status: 500, error: err.message };
    }
    return {
      ok: false,
      status: 401,
      error: "Invalid or expired Firebase ID token",
    };
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
