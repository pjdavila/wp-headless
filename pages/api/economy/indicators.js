import { listIndicators } from "../../../lib/economy/indicators";
import { readSnapshot } from "../../../lib/economy/snapshotStore";
import { summarizeSnapshot } from "../../../lib/economy/status";
import {
  verifyEconomyRequest,
  sendPrivateJson,
} from "../../../lib/firebaseAdmin";

/**
 * GET /api/economy/indicators
 *
 * Registry metadata for every indicator merged with its snapshot status,
 * latest observation, and freshness flags. Restricted: requires a Firebase
 * ID token (Authorization: Bearer …); anonymous callers get 401 and every
 * response is marked private/no-store.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return sendPrivateJson(res, 405, { error: "Method not allowed" });
  }

  const auth = await verifyEconomyRequest(req);
  if (!auth.ok) {
    return sendPrivateJson(res, auth.status, { error: auth.error });
  }

  const mvpOnly = req.query.mvp === "1" || req.query.mvp === "true";
  const indicators = listIndicators({ mvpOnly });

  const items = await Promise.all(
    indicators.map(async (indicator) => {
      const snapshot = await readSnapshot(indicator.id).catch(() => null);
      return summarizeSnapshot(snapshot, indicator);
    }),
  );

  return sendPrivateJson(res, 200, {
    asOf: new Date().toISOString(),
    count: items.length,
    indicators: items,
  });
}
