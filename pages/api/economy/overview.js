import { listIndicators } from "../../../lib/economy/indicators";
import { readSnapshot } from "../../../lib/economy/snapshotStore";
import { summarizeSnapshot } from "../../../lib/economy/status";
import { withCalculations } from "../../../lib/economy/calculations";
import { computePulse } from "../../../lib/economy/pulse";
import { computeInsights } from "../../../lib/economy/insights";
import {
  verifyEconomyRequest,
  sendPrivateJson,
} from "../../../lib/firebaseAdmin";

/**
 * GET /api/economy/overview
 *
 * One-shot payload for the dashboard homepage (/dashboard/): per-indicator
 * summary + primary-series observations with MoM/YoY calculations applied,
 * the CB Economic Pulse score, and the deterministic insights list. Keeps
 * the client to a single authenticated request instead of one per
 * indicator. Restricted to logged-in users like every /api/economy route.
 *
 * Multi-series indicators are trimmed to their primary series (the full
 * breakdown stays available at /api/economy/series/<id>).
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return sendPrivateJson(res, 405, { error: "Method not allowed" });
  }

  const auth = await verifyEconomyRequest(req);
  if (!auth.ok) {
    return sendPrivateJson(res, auth.status, { error: auth.error });
  }

  const indicators = listIndicators({ mvpOnly: true });

  const entries = await Promise.all(
    indicators.map(async (indicator) => {
      const snapshot = await readSnapshot(indicator.id).catch(() => null);
      const summary = summarizeSnapshot(snapshot, indicator);

      let points = snapshot ? snapshot.observations : [];
      const primary = indicator.providerConfig?.primarySeries;
      if (primary) {
        const filtered = points.filter((point) => point.series === primary);
        if (filtered.length > 0) points = filtered;
      }
      const calculated = withCalculations(points, indicator.frequency);

      return { summary, points: calculated };
    }),
  );

  const byId = Object.fromEntries(
    entries.map(({ summary, points }) => [
      summary.id,
      {
        id: summary.id,
        shortName: summary.shortName,
        unit: summary.unit,
        frequency: summary.frequency,
        higherIs: summary.higherIs,
        status: summary.status,
        stale: summary.stale,
        points,
      },
    ]),
  );

  const pulse = computePulse(byId);
  const insights = computeInsights(Object.values(byId));

  const retrievedAts = entries
    .map(({ summary }) => summary.retrievedAt)
    .filter(Boolean)
    .sort();
  const lastUpdated =
    retrievedAts.length > 0 ? retrievedAts[retrievedAts.length - 1] : null;

  return sendPrivateJson(res, 200, {
    asOf: new Date().toISOString(),
    lastUpdated,
    pulse,
    insights,
    indicators: entries.map(({ summary, points }) => ({
      ...summary,
      observations: points,
    })),
  });
}
