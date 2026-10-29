import { isValidMunicipality } from "../../lib/puertoRicoMunicipalities";
import {
  getStripe,
  getMonthlyPriceId,
  getSiteOrigin,
} from "../../lib/stripePrint";
import { verifyEconomyRequest } from "../../lib/firebaseAdmin";
import { upsertPrintSubscriptionCustomer } from "../../lib/printSubscriptionCustomer";
import { findPreviousPrintSubscription } from "../../lib/printSubscriptionAccount";
import {
  isTrialEligible,
  printTrialEnd,
} from "../../lib/printSubscriptionTrial";
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

  // Subscribing does not require an account. When the visitor is signed in
  // the client sends a Firebase ID token: the subscription is then bound to
  // that account (uid in metadata) and the email comes from the token. A
  // token that is present but invalid is rejected instead of silently
  // falling back to a guest checkout. Without a token it is a guest
  // checkout and the email comes from the form.
  let uid = null;
  let email;
  const hasToken = (req.headers.authorization || "").startsWith("Bearer ");
  if (hasToken) {
    const authResult = await verifyEconomyRequest(req);
    if (!authResult.ok) {
      return res.status(authResult.status).json({
        error:
          authResult.status === 401
            ? "Your session expired. Please sign out and sign in again."
            : "We couldn't verify your account right now. Please try again.",
      });
    }
    email = (authResult.user.email || "").trim().toLowerCase();
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        error: "Your account has no verified email. Please sign in again.",
      });
    }
    uid = authResult.user.sub;
  } else {
    email = sanitize(body.email, 200).toLowerCase();
  }

  const fullName = sanitize(body.fullName, 120);
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
    ...(uid ? { firebaseUid: uid } : {}),
    fullName,
    email,
    phone,
    addressLine1,
    addressLine2,
    town,
    zip,
  };

  // Save the form details on the Stripe customer first. If Stripe rejects
  // them, stop here: never send the subscriber to a checkout whose customer
  // is missing the shipping address.
  let customer;
  try {
    customer = await upsertPrintSubscriptionCustomer(stripe, {
      uid,
      fullName,
      email,
      phone,
      addressLine1,
      addressLine2,
      town,
      zip,
    });
  } catch (err) {
    console.error("Stripe customer save failed:", err.message);
    return res.status(502).json({
      error:
        "We couldn't save your shipping details with Stripe. Please check them and try again.",
    });
  }

  // 3-month free trial, once per email/account: no trial if this email (or
  // this signed-in account) ever had a print subscription. Matching by email
  // is safe here because it can only deny the trial, never grant access.
  // Fail explicitly if the history check fails rather than guessing.
  let trialEnd = null;
  try {
    const previous = await findPreviousPrintSubscription(stripe, {
      uid,
      email,
    });
    if (isTrialEligible(previous)) trialEnd = printTrialEnd();
  } catch (err) {
    console.error("Print subscription history check failed:", err.message);
    return res.status(502).json({
      error: "We couldn't start the payment with Stripe. Please try again.",
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      locale: "en",
      line_items: [{ price: priceId, quantity: 1 }],
      // The customer already carries the form's name, phone and PR shipping
      // address, so Checkout only asks for payment and shows the email
      // read-only. No shipping/phone collection here on purpose: it
      // would ask twice and could override the validated address.
      customer: customer.id,
      metadata,
      // With a trial, Checkout still collects the card (the default
      // payment_method_collection "always") and charges when it ends.
      subscription_data: trialEnd
        ? { metadata, trial_end: trialEnd }
        : { metadata },
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
