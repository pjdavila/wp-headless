import { getIndicator } from "../../../../lib/economy/indicators";
import { readSnapshot } from "../../../../lib/economy/snapshotStore";
import { summarizeSnapshot } from "../../../../lib/economy/status";
import {
  verifyEconomyRequest,
  sendPrivateJson,
} from "../../../../lib/firebaseAdmin";

/**
 * GET /api/economy/series/<indicatorId>
 *
 * Full historical series for one indicator from the snapshot cache (never
 * from the government API at request time): metadata, every observation with
 * previous value and MoM/YoY changes, plus source/updated/retrieved
 * timestamps and stale flags. Restricted to logged-in users.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return sendPrivateJson(res, 405, { error: "Method not allowed" });
  }

  const auth = await verifyEconomyRequest(req);
  if (!auth.ok) {
    return sendPrivateJson(res, auth.status, { error: auth.error });
  }

  const indicatorId = Array.isArray(req.query.indicator)
    ? req.query.indicator[0]
    : req.query.indicator;
  const indicator = getIndicator(indicatorId);
  if (!indicator) {
    return sendPrivateJson(res, 404, {
      error: `Unknown indicator "${indicatorId}"`,
    });
  }

  const snapshot = await readSnapshot(indicator.id).catch(() => null);
  const summary = summarizeSnapshot(snapshot, indicator);

  return sendPrivateJson(res, 200, {
    asOf: new Date().toISOString(),
    ...summary,
    observations: snapshot ? snapshot.observations : [],
  });
}
