import { getStripe, getSiteOrigin } from "../../lib/stripePrint";
import { verifyPortalToken } from "../../lib/portalToken";
import { createRateLimiter, getClientIp } from "../../lib/apiGuards";

const checkRateLimit = createRateLimiter({ max: 10 });

// Target of the "manage subscription" magic link. The signed, short-lived
// token proves inbox access; here we exchange it for a Stripe Billing Portal
// session and redirect there.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const origin = getSiteOrigin(req);
  const pageUrl = `${origin}/account/`;

  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return res.redirect(303, `${pageUrl}?portal=invalid`);
  }

  const parsed = verifyPortalToken(req.query.token);
  if (!parsed) {
    return res.redirect(303, `${pageUrl}?portal=invalid`);
  }

  try {
    const stripe = getStripe();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: parsed.customerId,
      return_url: pageUrl,
    });
    return res.redirect(303, portalSession.url);
  } catch (err) {
    console.error("Stripe portal session creation failed:", err.message);
    return res.redirect(303, `${pageUrl}?portal=invalido`);
  }
}
