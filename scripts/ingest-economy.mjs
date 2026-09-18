import { runIngestion, summarizeReport } from "../lib/economy/ingest.js";

/**
 * Scheduled ingestion for the Puerto Rico Economic Dashboard.
 *
 * Primary trigger: a Replit Scheduled Deployment running
 * `npm run ingest-economy` (same pattern as the daily newsletter — see
 * replit.md). Backup trigger: GET/POST /api/economy/ingest with the cron token.
 *
 * Flags:
 *   --force            ignore per-indicator freshness and re-fetch everything
 *   --only=a,b         ingest just these indicator ids
 *   --dry-run          fetch and normalize but write nothing
 *
 * Exit codes: 1 on a total pipeline failure (crash, or every due live
 * indicator failed — e.g. all keys revoked), 0 otherwise. Individual source
 * failures are expected operations (missing key, provider outage) and are
 * surfaced through the report + snapshot statuses instead of failing the job.
 */

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isForce = args.includes("--force");
const onlyArg = args.find((arg) => arg.startsWith("--only="));
const only = onlyArg ? onlyArg.split("=")[1].split(",").filter(Boolean) : null;

async function main() {
  console.info(
    `[economy-ingest] starting (force=${isForce} dryRun=${isDryRun} only=${only ? only.join(",") : "all"})`,
  );

  const report = await runIngestion({ force: isForce, only, dryRun: isDryRun });

  for (const result of report.results) {
    const detail = result.error ? ` — ${result.error}` : "";
    console.info(
      `[economy-ingest] ${result.id}: ${result.skipped ? "skipped" : result.status} (${result.points} pts, stored=${result.stored ?? "no"})${detail}`,
    );
  }

  const summary = summarizeReport(report);
  console.info(
    `[economy-ingest] done: ok=${summary.ok} pending=${summary.pending} error=${summary.error} skipped=${summary.skipped}`,
  );

  const attempted = report.results.filter(
    (r) => !r.skipped && r.status !== "pending",
  );
  const succeeded = attempted.filter((r) => r.status === "ok");
  if (attempted.length > 0 && succeeded.length === 0 && !isDryRun) {
    console.error(
      "[economy-ingest] every due live source failed — flagging the run",
    );
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("[economy-ingest] unexpected error:", err);
  process.exit(1);
});
