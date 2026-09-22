import { getStripe, getSiteOrigin } from "../../lib/stripePrint";
import { verifyEconomyRequest, sendPrivateJson } from "../../lib/firebaseAdmin";
import { findAccountPrintSubscription } from "../../lib/printSubscriptionAccount";
import { createRateLimiter, getClientIp } from "../../lib/apiGuards";

const checkRateLimit = createRateLimiter({ max: 10 });

// One-click billing portal for the signed-in subscriber. Unlike the
// email-based magic link (stripe-customer-portal.js), the Firebase ID token
// already proves identity, so we can hand back the portal URL directly —
// the portal session only ever opens for the customer that owns this
// account's print-edition subscription.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      error: "Too many requests. Try again in a minute.",
    });
  }

  const authResult = await verifyEconomyRequest(req);
  if (!authResult.ok) {
    return sendPrivateJson(res, authResult.status, {
      error: "Please sign in to manage your subscription.",
    });
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    console.error("Print subscription portal misconfigured:", err.message);
    return sendPrivateJson(res, 500, { error: err.message });
  }

  try {
    const sub = await findAccountPrintSubscription(stripe, {
      uid: authResult.user.sub,
      email: (authResult.user.email || "").trim().toLowerCase(),
    });

    if (!sub || typeof sub.customer !== "string") {
      return sendPrivateJson(res, 404, {
        error: "We couldn't find a subscription under your account.",
      });
    }

    const origin = getSiteOrigin(req);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.customer,
      return_url: `${origin}/account/`,
    });

    return sendPrivateJson(res, 200, { url: portalSession.url });
  } catch (err) {
    console.error("Print subscription portal session failed:", err.message);
    return sendPrivateJson(res, 502, {
      error: "We couldn't open the subscription portal. Please try again.",
    });
  }
}
