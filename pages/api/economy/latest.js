import { listIndicators, getIndicator } from "../../../lib/economy/indicators";
import { readSnapshot } from "../../../lib/economy/snapshotStore";
import { summarizeSnapshot } from "../../../lib/economy/status";
import {
  verifyEconomyRequest,
  sendPrivateJson,
} from "../../../lib/firebaseAdmin";

/**
 * GET /api/economy/latest[?ids=unemployment-rate,personal-income]
 *
 * Latest normalized observation per indicator (identity, raw value, MoM/YoY
 * changes, source/updated/retrieved timestamps, stale flags). Without `ids`
 * every registry indicator is included. Restricted to logged-in users.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return sendPrivateJson(res, 405, { error: "Method not allowed" });
  }

  const auth = await verifyEconomyRequest(req);
  if (!auth.ok) {
    return sendPrivateJson(res, auth.status, { error: auth.error });
  }

  const ids =
    typeof req.query.ids === "string"
      ? req.query.ids
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      : null;

  const indicators = ids
    ? ids.map((id) => getIndicator(id)).filter(Boolean)
    : listIndicators();

  const entries = await Promise.all(
    indicators.map(async (indicator) => {
      const snapshot = await readSnapshot(indicator.id).catch(() => null);
      return [indicator.id, summarizeSnapshot(snapshot, indicator)];
    }),
  );

  return sendPrivateJson(res, 200, {
    asOf: new Date().toISOString(),
    indicators: Object.fromEntries(entries),
  });
}
