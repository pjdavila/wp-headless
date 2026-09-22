import { getStripe } from "../../lib/stripePrint";
import { verifyEconomyRequest, sendPrivateJson } from "../../lib/firebaseAdmin";
import {
  findAccountPrintSubscription,
  LIVE_SUBSCRIPTION_STATUSES,
} from "../../lib/printSubscriptionAccount";
import { createRateLimiter, getClientIp } from "../../lib/apiGuards";

const checkRateLimit = createRateLimiter({ max: 20 });

// Tells the signed-in visitor whether their account already holds a live
// print-edition subscription, so the page can show the plan status instead of
// a second subscribe form. Authenticated and user-specific: never cached.
export default async function handler(req, res) {
  if (req.method !== "GET") {
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
      error: "Please sign in to see your subscription.",
    });
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    console.error("Print subscription status misconfigured:", err.message);
    return sendPrivateJson(res, 500, { error: err.message });
  }

  try {
    const sub = await findAccountPrintSubscription(stripe, {
      uid: authResult.user.sub,
      email: (authResult.user.email || "").trim().toLowerCase(),
    });

    if (!sub || !LIVE_SUBSCRIPTION_STATUSES.has(sub.status)) {
      return sendPrivateJson(res, 200, { subscription: null });
    }

    const price = sub.items?.data?.[0]?.price || null;
    return sendPrivateJson(res, 200, {
      subscription: {
        status: sub.status,
        currentPeriodEnd:
          typeof sub.current_period_end === "number"
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end === true,
        plan: price
          ? {
              amount: price.unit_amount,
              currency: price.currency,
              interval: price.recurring?.interval || null,
            }
          : null,
      },
    });
  } catch (err) {
    console.error("Print subscription status lookup failed:", err.message);
    return sendPrivateJson(res, 502, {
      error: "We couldn't check your subscription. Please try again.",
    });
  }
}
