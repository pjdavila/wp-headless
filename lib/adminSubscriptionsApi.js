import { getSubscriptionsSnapshot } from "./stripeSubscriptionsAdmin.js";

/**
 * Shared Stripe read for the admin subscriptions routes. Maps failures to an
 * explicit HTTP error so the panel never mistakes an outage for an empty
 * list. Admin-only callers, so Stripe's own error text is safe to return.
 *
 * @returns {Promise<{ ok: true, snapshot: object } | { ok: false, status: number, error: string }>}
 */
export async function readSubscriptionsForAdmin({ force }) {
  try {
    const snapshot = await getSubscriptionsSnapshot({ force });
    return { ok: true, snapshot };
  } catch (err) {
    const message = err?.message || "Error desconocido";
    if (/no está configurado/i.test(message)) {
      console.error("Admin subscriptions misconfigured:", message);
      return { ok: false, status: 500, error: message };
    }
    console.error("Admin subscriptions Stripe read failed:", message);
    return {
      ok: false,
      status: 502,
      error: `No pudimos leer las suscripciones de Stripe: ${message}`,
    };
  }
}
