import snapshot from "../../../lib/economy/prototype/snapshot.json";
import copy from "../../../lib/economy/prototype/copy.json";
import { TILES } from "../../../lib/economy/prototype/tiles";
import { PAGES, LIVE_ONLY_CHARTS } from "../../../lib/economy/prototype/pages";
import {
  verifyEconomyRequest,
  sendPrivateJson,
} from "../../../lib/firebaseAdmin";

/**
 * GET /api/economy/fixed-snapshot/
 *
 * The fixed data snapshot and copy of "The Great Puerto Rico Dashboard"
 * prototype: series, breakdowns, facts and news collected by AI on the
 * snapshot's `built` date and NOT editorially validated, plus the chart
 * specs, KPI tiles, briefs, side panels and caveats that reference them.
 *
 * The /dashboard/ client merges this with the live data layer
 * (/api/economy/overview/ and /api/economy/series/<id>/): wherever
 * lib/economy/board/liveMap.js maps a series or tile to a live indicator
 * with usable data, the live value wins; everything else is shown with the
 * "Dato fijo" marker and this collection date.
 *
 * Members-only like every /api/economy route (Firebase ID token required,
 * no-store). The snapshot is imported only here so it never ships in page
 * JS or the served HTML.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return sendPrivateJson(res, 405, { error: "Method not allowed" });
  }

  const auth = await verifyEconomyRequest(req);
  if (!auth.ok) {
    return sendPrivateJson(res, auth.status, { error: auth.error });
  }

  return sendPrivateJson(res, 200, {
    version: "0.1",
    collectedOn: snapshot.built,
    data: {
      series: snapshot.s,
      breakdowns: snapshot.b,
      facts: snapshot.f,
      news: snapshot.news,
    },
    charts: { ...copy.charts, ...LIVE_ONLY_CHARTS },
    labels: copy.tr,
    briefs: copy.briefs,
    feed: copy.feed,
    pipeline: copy.pipeline,
    caveats: copy.caveats,
    tiles: TILES,
    pages: PAGES,
  });
}
