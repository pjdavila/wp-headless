import { verifyEconomyRequest } from "./firebaseAdmin.js";

/**
 * Staff-only authorization for internal admin routes (e.g. the subscriptions
 * panel at /admin/suscripciones/).
 *
 * A caller is an admin when:
 *  1. they send a valid Firebase ID token (verified against Google's public
 *     certs in lib/firebaseAdmin.js — no service account needed),
 *  2. the token's email is verified by Firebase, and
 *  3. that email is on the ADMIN_EMAILS allowlist (comma-separated).
 *
 * The email must be verified because the site lets anyone create an
 * email/password account for any address without proving they own it; an
 * unverified token claiming a staff address proves nothing. Google sign-in
 * always yields a verified email.
 *
 * Missing/invalid token → 401. Valid token but not allowed → 403. An empty or
 * missing allowlist lets nobody in (403 with a configuration message).
 *
 * This module is imported ONLY from API routes and tests.
 */

export const ADMIN_ALLOWLIST_ENV = "ADMIN_EMAILS";

export function parseAdminAllowlist(raw) {
  return new Set(
    String(raw || "")
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@")),
  );
}

/**
 * Pure decision for an already-verified token payload.
 * @returns {{ ok: true, email: string } | { ok: false, status: number, code: string, error: string }}
 */
export function checkAdminAccess(payload, allowlist) {
  if (!allowlist || allowlist.size === 0) {
    return {
      ok: false,
      status: 403,
      code: "not_configured",
      error: `El panel de administración no está configurado: falta la lista de correos autorizados (${ADMIN_ALLOWLIST_ENV}). Nadie puede entrar hasta que se configure.`,
    };
  }
  const email = String(payload?.email || "")
    .trim()
    .toLowerCase();
  if (!email || !allowlist.has(email)) {
    return {
      ok: false,
      status: 403,
      code: "not_allowed",
      error: "No autorizado: esta cuenta no tiene acceso al panel.",
    };
  }
  if (payload.email_verified !== true) {
    return {
      ok: false,
      status: 403,
      code: "email_unverified",
      error:
        "No autorizado: el correo de esta cuenta no está verificado. Entra con Google usando tu cuenta de trabajo.",
    };
  }
  return { ok: true, email };
}

/**
 * Verifies the request's Bearer token and the admin allowlist.
 * @returns {Promise<
 *   | { ok: true, email: string, user: object }
 *   | { ok: false, status: number, code: string, error: string }
 * >}
 */
export async function verifyAdminRequest(req) {
  const auth = await verifyEconomyRequest(req);
  if (!auth.ok) {
    return {
      ok: false,
      status: auth.status,
      code: auth.status === 401 ? "unauthenticated" : "auth_unavailable",
      error:
        auth.status === 401
          ? "Inicia sesión para ver el panel."
          : "No pudimos verificar tu sesión. Intenta de nuevo.",
    };
  }
  const decision = checkAdminAccess(
    auth.user,
    parseAdminAllowlist(process.env[ADMIN_ALLOWLIST_ENV]),
  );
  if (!decision.ok) return decision;
  return { ok: true, email: decision.email, user: auth.user };
}
