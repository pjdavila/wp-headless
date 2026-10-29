import { verifyAdminRequest } from "../../../lib/adminAuth";
import { sendPrivateJson } from "../../../lib/firebaseAdmin";
import { readSubscriptionsForAdmin } from "../../../lib/adminSubscriptionsApi";
import { listProducts } from "../../../lib/subscriptionAdminModel";

// GET /api/admin/subscriptions/[?refresh=1]
// Staff-only live view of every Stripe subscription for the internal panel
// (/admin/suscripciones/). Reads Stripe directly (about a minute of in-memory
// cache; ?refresh=1 bypasses it). Read-only: nothing is stored anywhere.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendPrivateJson(res, 405, { error: "Method not allowed" });
  }

  const auth = await verifyAdminRequest(req);
  if (!auth.ok) {
    return sendPrivateJson(res, auth.status, {
      error: auth.error,
      code: auth.code,
    });
  }

  const result = await readSubscriptionsForAdmin({
    force: req.query.refresh === "1",
  });
  if (!result.ok) {
    return sendPrivateJson(res, result.status, { error: result.error });
  }

  const { rows, summary, fetchedAt, cached } = result.snapshot;
  return sendPrivateJson(res, 200, {
    fetchedAt,
    cached,
    summary,
    products: listProducts(rows),
    rows,
  });
}
