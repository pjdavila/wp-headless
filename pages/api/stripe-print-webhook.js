import { getStripe, getWebhookSecret } from "../../lib/stripePrint";
import { sendPrintSubscriptionToOdoo } from "../../lib/odooPrintEdition";
import {
  appendEventStep,
  appendSubscriptionEvent,
  getProcessedSteps,
} from "../../lib/printSubscriptionStore";
import { sendWelcomeEmail } from "../../lib/welcomeEmail";
import { escapeHtml, sanitize } from "../../lib/apiGuards";

// Stripe needs the raw request body to verify the event signature.
export const config = {
  api: { bodyParser: false },
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

async function notifyTeamNewSubscriber({
  fullName,
  email,
  phone,
  town,
  zip,
  subscriptionId,
}) {
  const notifyEmail = process.env.PRINT_EDITION_NOTIFY_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  if (!notifyEmail || !apiKey) return;

  const html = `
<!DOCTYPE html><html><body style="font-family:Helvetica,Arial,sans-serif;background:#0d0e12;color:#e6e7eb;padding:24px;">
  <h2 style="color:#fff;margin:0 0 12px;">Nuevo suscriptor pago — edición impresa</h2>
  <table cellpadding="6" style="border-collapse:collapse;font-size:14px;">
    <tr><td><strong>Nombre:</strong></td><td>${escapeHtml(fullName)}</td></tr>
    <tr><td><strong>Email:</strong></td><td>${escapeHtml(email)}</td></tr>
    <tr><td><strong>Teléfono:</strong></td><td>${escapeHtml(phone)}</td></tr>
    <tr><td><strong>Pueblo:</strong></td><td>${escapeHtml(town)}</td></tr>
    <tr><td><strong>Código postal:</strong></td><td>${escapeHtml(zip)}</td></tr>
    <tr><td><strong>Suscripción Stripe:</strong></td><td>${escapeHtml(subscriptionId)}</td></tr>
  </table>
</body></html>`.trim();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Caribbean Business <noreply@caribbean.business>",
      to: [notifyEmail],
      subject: `Nuevo suscriptor pago: edición impresa — ${String(fullName).replace(/[\r\n]+/g, " ")}`,
      html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Team notify failed: ${res.status} ${body.slice(0, 300)}`);
  }
}

// Run each side effect exactly once per Stripe event. Stripe retries events
// that are not acknowledged with 2xx, so a failed step returns 500 and the
// retry skips steps that already completed (tracked in the JSONL event log).
async function runStepsOnce(eventId, steps) {
  const done = await getProcessedSteps(eventId);
  for (const [name, fn] of steps) {
    if (done.has(name)) continue;
    await fn();
    await appendEventStep(eventId, name);
  }
}

async function handleCheckoutCompleted(event) {
  const session = event.data.object;
  const meta = session.metadata || {};
  // Ignore checkout sessions that did not come from the print subscription page.
  if (meta.source !== "suscripcion-impresa") return;

  const record = {
    type: "activated",
    fullName: sanitize(meta.fullName, 120),
    email: sanitize(
      meta.email || session.customer_email || "",
      200,
    ).toLowerCase(),
    phone: sanitize(meta.phone, 40),
    addressLine1: sanitize(meta.addressLine1, 200),
    addressLine2: sanitize(meta.addressLine2, 200) || null,
    town: sanitize(meta.town, 60),
    zip: sanitize(meta.zip, 10),
    country: "PR",
    plan: "mensual-4.99",
    status: "active",
    stripeCheckoutSessionId: session.id,
    stripeCustomerId: session.customer || null,
    stripeSubscriptionId: session.subscription || null,
    createdAt: new Date().toISOString(),
  };

  await runStepsOnce(event.id, [
    // Primary persistent store: Odoo.
    ["odoo", () => sendPrintSubscriptionToOdoo(record)],
    // Best-effort local copy (ephemeral filesystem on WPE Atlas). A failure
    // here is logged but not retried: Odoo and the team email are the
    // durable records.
    [
      "record",
      () =>
        appendSubscriptionEvent(record).catch((err) =>
          console.error(
            "Local store write failed (printSubscription):",
            err.message,
          ),
        ),
    ],
    [
      "welcome-email",
      async () => {
        const result = await sendWelcomeEmail({
          email: record.email,
          name: record.fullName,
          variant: "print-subscription",
        });
        // sendWelcomeEmail resolves {ok:false} on Resend errors; surface that
        // as a failure so the step is not marked done and Stripe retries.
        // "skipped" means RESEND_API_KEY is intentionally not configured.
        if (!result?.ok && !result?.skipped) {
          throw new Error("Welcome email failed");
        }
      },
    ],
    ["team-notify", () => notifyTeamNewSubscriber(record)],
  ]);
}

async function handleSubscriptionDeleted(event) {
  const subscription = event.data.object;
  const meta = subscription.metadata || {};
  // Strict match: our checkout sets subscription_data.metadata.source, so
  // anything without it is not a print-edition subscription and must not be
  // recorded as a cancellation here.
  if (meta.source !== "suscripcion-impresa") return;

  await runStepsOnce(event.id, [
    [
      "record",
      () =>
        appendSubscriptionEvent({
          type: "canceled",
          email: sanitize(meta.email, 200).toLowerCase() || null,
          fullName: sanitize(meta.fullName, 120) || null,
          status: "canceled",
          stripeCustomerId: subscription.customer || null,
          stripeSubscriptionId: subscription.id,
          canceledAt: new Date().toISOString(),
        }).catch((err) =>
          console.error(
            "Local store write failed (printSubscription cancel):",
            err.message,
          ),
        ),
    ],
  ]);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let event;
  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers["stripe-signature"];
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      getWebhookSecret(),
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event);
        break;
      default:
        // Unhandled event types are acknowledged and ignored.
        break;
    }
  } catch (err) {
    // Return 500 so Stripe retries the event; completed steps are skipped
    // on retry, so side effects stay exactly-once per event.
    console.error(
      `Stripe webhook handler failed (${event.type}):`,
      err.message,
    );
    return res.status(500).json({ error: "Webhook handler failed" });
  }

  return res.status(200).json({ received: true });
}
