// Shared Stripe lookup for the signed-in subscriber flows (status check and
// one-click billing portal). Access is bound to the Firebase UID recorded in
// the subscription metadata at checkout: only an exact uid match proves the
// caller is the account that subscribed.
//
// Matching by email alone is deliberately NOT accepted. Firebase accounts can
// be created for email addresses the registrant does not own, so an
// email-only match would hand a stranger the subscriber's billing portal
// (invoices, payment method, cancellation). Print subscriptions that predate
// the firebaseUid metadata therefore never appear here — their owners use
// the inbox-delivered magic link (pages/api/stripe-customer-portal.js), which
// proves mailbox ownership before opening the portal.
//
// This module is imported ONLY from API routes.

// Statuses where the subscriber still has (or is fighting to keep) access.
export const LIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

export function isAccountPrintSubscription(sub, uid) {
  if (!uid) return false;
  const meta = sub.metadata || {};
  if (meta.source !== "suscripcion-impresa") return false;
  return meta.firebaseUid === uid;
}

/**
 * Finds the account's most recent print-edition subscription, of any status.
 * Returns null when the account has no uid-bound subscription. The email is
 * only used to locate candidate Stripe customers (checkout sets the customer
 * email to the account email); it never authorizes on its own.
 */
export async function findAccountPrintSubscription(stripe, { uid, email }) {
  if (!uid || !email) return null;
  const customers = await stripe.customers.list({ email, limit: 10 });

  let best = null;
  for (const customer of customers.data) {
    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 10,
    });
    for (const sub of subs.data) {
      if (!isAccountPrintSubscription(sub, uid)) continue;
      if (!best || sub.created > best.created) best = sub;
    }
  }
  return best;
}

/**
 * Trial-eligibility lookup: the most recent print subscription (any status)
 * for any Stripe customer with this email, or bound to this account's uid.
 * Unlike findAccountPrintSubscription this matches by email on purpose: the
 * result only ever DENIES the free trial, it never grants access to anything.
 */
export async function findPreviousPrintSubscription(stripe, { uid, email }) {
  if (!email) return null;
  const customers = await stripe.customers.list({ email, limit: 100 });

  let best = null;
  for (const customer of customers.data) {
    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 100,
    });
    for (const sub of subs.data) {
      const meta = sub.metadata || {};
      const isPrint =
        meta.source === "suscripcion-impresa" ||
        (uid && isAccountPrintSubscription(sub, uid));
      if (!isPrint) continue;
      if (!best || sub.created > best.created) best = sub;
    }
  }
  return best;
}
