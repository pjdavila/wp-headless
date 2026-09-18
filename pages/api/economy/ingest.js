import { runIngestion, summarizeReport } from "../../../lib/economy/ingest";

/**
 * GET|POST /api/economy/ingest[?force=1][&only=id1,id2]
 *
 * Token-protected backup trigger for the scheduled ingestion (the primary
 * path is the npm script `npm run ingest-economy` via a Replit Scheduled
 * Deployment, same pattern as the daily newsletter). Mirrors
 * pages/api/send-daily-newsletter.js: ECONOMY_CRON_TOKEN as Bearer,
 * ?token=, or x-cron-token.
 *
 * This route is for operators, not users — it authenticates with the cron
 * token, not a Firebase ID token.
 */

function isAuthorized(req) {
  const expected = process.env.ECONOMY_CRON_TOKEN;
  if (!expected) return false;
  const header = req.headers["authorization"] || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const provided =
    bearer || req.query.token || req.headers["x-cron-token"] || "";
  return provided === expected;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");

  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const force = req.query.force === "1" || req.query.force === "true";
  const only =
    typeof req.query.only === "string"
      ? req.query.only
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      : null;

  try {
    const report = await runIngestion({ force, only });
    const summary = summarizeReport(report);
    console.info(
      `[economy-ingest] ok=${summary.ok} pending=${summary.pending} error=${summary.error} skipped=${summary.skipped}`,
    );
    return res.status(200).json({ ok: true, summary, ...report });
  } catch (err) {
    console.error("[economy-ingest] run failed:", err);
    return res.status(502).json({ ok: false, error: err.message });
  }
}
