import { getStripe, getSiteOrigin } from "../../lib/stripePrint";
import { createPortalToken } from "../../lib/portalToken";
import {
  createRateLimiter,
  escapeHtml,
  getClientIp,
  isValidEmail,
  sanitize,
} from "../../lib/apiGuards";

const checkRateLimit = createRateLimiter({ max: 5 });

// Same response whether or not the email has a subscription: knowing an email
// address must not be enough to learn who subscribes, and must never be
// enough to open someone's billing portal. The portal link only goes to the
// inbox of the address on file.
const GENERIC_OK =
  "If we find a subscription under that email, we've sent you a link to manage it. Check your inbox.";

async function sendPortalLinkEmail({ email, portalUrl }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Resend: Missing RESEND_API_KEY — cannot send portal link");
    return;
  }

  const html = `
<!DOCTYPE html><html lang="en"><body style="font-family:Helvetica,Arial,sans-serif;background:#0d0e12;color:#e6e7eb;padding:24px;">
  <h2 style="color:#fff;margin:0 0 12px;">Manage your print subscription</h2>
  <p style="font-size:15px;line-height:1.6;color:#b0b3bf;">
    We received a request to manage the Caribbean Business print edition subscription
    associated with ${escapeHtml(email)}.
  </p>
  <p style="font-size:15px;line-height:1.6;color:#b0b3bf;">
    <a href="${escapeHtml(portalUrl)}" style="color:#2a9d6a;">Open the subscription portal</a>
    — this link expires in 15 minutes.
  </p>
  <p style="font-size:13px;line-height:1.6;color:#6b6e7a;">
    If this wasn't you, ignore this email: nobody can access your subscription without access to your inbox.
  </p>
</body></html>`.trim();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Caribbean Business <noreply@caribbean.business>",
      to: [email],
      subject: "Your link to manage your print subscription",
      html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("Portal link email failed:", res.status, body.slice(0, 300));
    // Throw so the endpoint returns an error and the subscriber can retry,
    // instead of silently never receiving the link.
    throw new Error(`Portal link email failed: ${res.status}`);
  }
}

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

  const email = sanitize(req.body?.email, 200).toLowerCase();
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email." });
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    console.error("Customer portal misconfigured:", err.message);
    return res.status(500).json({ error: err.message });
  }

  try {
    const customers = await stripe.customers.list({ email, limit: 10 });

    // Find the customer that has a print-edition subscription. The strict
    // source check matters in a shared Stripe account: opening the portal
    // for a customer whose subscriptions are unrelated would leave the
    // print subscription unmanageable.
    let subscriberId = null;
    for (const customer of customers.data) {
      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        status: "all",
        limit: 10,
      });
      if (
        subs.data.some((sub) => sub.metadata?.source === "suscripcion-impresa")
      ) {
        subscriberId = customer.id;
        break;
      }
    }

    if (subscriberId) {
      const token = createPortalToken(subscriberId, email);
      const origin = getSiteOrigin(req);
      await sendPortalLinkEmail({
        email,
        portalUrl: `${origin}/api/stripe-portal-redirect/?token=${encodeURIComponent(token)}`,
      });
    }

    return res.status(200).json({ ok: true, message: GENERIC_OK });
  } catch (err) {
    console.error("Stripe customer portal request failed:", err.message);
    return res
      .status(502)
      .json({ error: "We couldn't process your request. Please try again." });
  }
}
