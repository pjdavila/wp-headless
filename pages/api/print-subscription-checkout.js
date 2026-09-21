import { isValidMunicipality } from "../../lib/puertoRicoMunicipalities";
import {
  getStripe,
  getMonthlyPriceId,
  getSiteOrigin,
} from "../../lib/stripePrint";
import { verifyEconomyRequest } from "../../lib/firebaseAdmin";
import {
  createRateLimiter,
  getClientIp,
  isValidEmail,
  isValidPuertoRicoZip,
  sanitize,
} from "../../lib/apiGuards";

const checkRateLimit = createRateLimiter();

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

  const body = req.body || {};

  // Honeypot: pretend success so bots learn nothing.
  if (typeof body.website === "string" && body.website.trim().length > 0) {
    return res.status(200).json({ ok: true });
  }

  // A subscription is tied to a verified account: the caller must present a
  // valid Firebase ID token, and its email is the one used for the checkout.
  const authResult = await verifyEconomyRequest(req);
  if (!authResult.ok) {
    return res
      .status(authResult.status)
      .json({ error: "Please sign in to subscribe." });
  }
  const tokenEmail = (authResult.user.email || "").trim().toLowerCase();
  if (!tokenEmail || !isValidEmail(tokenEmail)) {
    return res.status(400).json({
      error: "Your account has no verified email. Please sign in again.",
    });
  }

  const fullName = sanitize(body.fullName, 120);
  const email = tokenEmail;
  const phone = sanitize(body.phone, 40);
  const addressLine1 = sanitize(body.addressLine1, 200);
  const addressLine2 = sanitize(body.addressLine2, 200);
  const town = sanitize(body.town, 60);
  const zip = sanitize(body.zip, 10);
  const consent = body.consent === true;

  const errors = {};
  if (!fullName || fullName.length < 2) errors.fullName = "Name required";
  if (!email || !isValidEmail(email)) errors.email = "Invalid email";
  if (!phone || phone.length < 7) errors.phone = "Phone number required";
  if (!addressLine1) errors.addressLine1 = "Address required";
  if (!town || !isValidMunicipality(town)) errors.town = "Invalid town";
  if (!zip || !isValidPuertoRicoZip(zip)) {
    errors.zip = "Invalid Puerto Rico ZIP code (006xx–009xx)";
  }
  if (!consent) errors.consent = "You must accept the use of your data";

  if (Object.keys(errors).length > 0) {
    return res
      .status(400)
      .json({ error: "Please review the form fields.", fields: errors });
  }

  let stripe;
  let priceId;
  try {
    stripe = getStripe();
    priceId = getMonthlyPriceId();
  } catch (err) {
    // Missing configuration must surface clearly, never silently.
    console.error("Print subscription checkout misconfigured:", err.message);
    return res.status(500).json({ error: err.message });
  }

  const origin = getSiteOrigin(req);
  const metadata = {
    source: "suscripcion-impresa",
    firebaseUid: authResult.user.sub,
    fullName,
    email,
    phone,
    addressLine1,
    addressLine2,
    town,
    zip,
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      locale: "en",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      // Only Puerto Rico addresses are accepted for the print edition.
      shipping_address_collection: { allowed_countries: ["PR"] },
      phone_number_collection: { enabled: true },
      metadata,
      subscription_data: { metadata },
      success_url: `${origin}/subscription/?success=1`,
      cancel_url: `${origin}/subscription/?canceled=1`,
    });

    if (!session.url) {
      console.error("Stripe checkout session without URL:", session.id);
      return res.status(502).json({
        error: "Stripe did not return a payment URL. Please try again.",
      });
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout session failed:", err.message);
    return res.status(502).json({
      error: "We couldn't start the payment with Stripe. Please try again.",
    });
  }
}
