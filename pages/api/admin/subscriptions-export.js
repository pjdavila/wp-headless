import { verifyAdminRequest } from "../../../lib/adminAuth";
import { sendPrivateJson } from "../../../lib/firebaseAdmin";
import { readSubscriptionsForAdmin } from "../../../lib/adminSubscriptionsApi";
import { applyView, rowsToCsv } from "../../../lib/subscriptionAdminModel";

// GET /api/admin/subscriptions-export/?q=&status=&trial=&product=&sort=&dir=
// CSV of the panel's current filtered view. Same admin check and same
// (cached) Stripe read as /api/admin/subscriptions/, and the same filter and
// sort code as the page, so the file matches what staff see on screen.
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

  const result = await readSubscriptionsForAdmin({ force: false });
  if (!result.ok) {
    return sendPrivateJson(res, result.status, { error: result.error });
  }

  const rows = applyView(result.snapshot.rows, req.query);
  const stamp = result.snapshot.fetchedAt.slice(0, 10);
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="suscripciones-${stamp}.csv"`,
  );
  return res.status(200).send(rowsToCsv(rows));
}
