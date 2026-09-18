import { listIndicators, getIndicator } from "./indicators.js";
import { getProvider } from "./providers/index.js";
import {
  buildSnapshot,
  buildPendingSnapshot,
  buildErrorSnapshot,
} from "./normalize.js";
import { writeSnapshot, readSnapshot } from "./snapshotStore.js";
import { STATUS } from "./types.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Scheduled ingestion pipeline for the economic dashboard.
 *
 * Flow per indicator: provider fetch → normalize → snapshot store. Failures
 * are isolated: one dead source degrades its own indicator (last-good data
 * keeps being served) and never breaks the rest of the run.
 *
 * Frequency handling: each indicator declares `refreshDays` matching its
 * source's publication cadence (monthly for BLS/EIA, longer for BEA/Census).
 * A scheduled job can therefore run frequently; indicators are only re-fetched
 * when due, unless `force` is set.
 *
 * @param {{force?: boolean, only?: string[]|null, dryRun?: boolean}} options
 * @returns {Promise<{startedAt: string, finishedAt: string, results: Array}>}
 */
export async function runIngestion({
  force = false,
  only = null,
  dryRun = false,
} = {}) {
  const startedAt = new Date();
  const targets = only?.length
    ? only.map((id) => getIndicator(id)).filter(Boolean)
    : listIndicators();

  const results = [];

  for (const indicator of targets) {
    const provider = getProvider(indicator.provider);
    const result = {
      id: indicator.id,
      provider: indicator.provider,
      status: null,
      points: 0,
      stored: null,
      error: null,
      skipped: false,
    };
    results.push(result);

    try {
      if (!provider) {
        throw new Error(`No provider registered for "${indicator.provider}"`);
      }

      const previous = await readSnapshot(indicator.id).catch(() => null);

      if (provider.pending) {
        // Documented stub: mark pending, but never clobber a snapshot that
        // somehow already holds real data.
        if (!previous || previous.observations.length === 0) {
          if (!dryRun) {
            await writeSnapshot(indicator.id, buildPendingSnapshot(indicator));
          }
          result.stored = dryRun ? "dry-run" : "written";
        } else {
          result.stored = "kept-existing";
        }
        result.status = STATUS.PENDING;
        result.points = previous ? previous.observations.length : 0;
        continue;
      }

      if (!force && previous?.retrievedAt) {
        const ageDays =
          (startedAt.getTime() - Date.parse(previous.retrievedAt)) / DAY_MS;
        if (Number.isFinite(ageDays) && ageDays < indicator.refreshDays) {
          result.skipped = true;
          result.status = previous.status;
          result.points = previous.observations.length;
          result.error = `fresh enough (${Math.round(ageDays)}d < ${indicator.refreshDays}d)`;
          continue;
        }
      }

      const { observations } = await provider.getSeries(indicator);
      // Merge into the stored history: providers answer with rolling windows
      // (BLS 10–20y, Census latest vintage), so fresh data must extend the
      // accumulated series, not replace it.
      const snapshot = buildSnapshot(indicator, observations, { previous });
      result.status = snapshot.status;
      result.points = snapshot.observations.length;
      result.error = snapshot.error;

      if (!dryRun) {
        result.stored = await writeSnapshot(indicator.id, snapshot);
      } else {
        result.stored = "dry-run";
      }
    } catch (err) {
      // Degrade this indicator only: keep last-good observations, record the
      // failure, and move on to the next source.
      const previous = await readSnapshot(indicator.id).catch(() => null);
      result.status = STATUS.ERROR;
      result.error = err.message;
      result.points = previous ? previous.observations.length : 0;
      if (!dryRun) {
        await writeSnapshot(
          indicator.id,
          buildErrorSnapshot(indicator, previous, err.message),
        ).catch((writeErr) => {
          result.error += ` (snapshot write also failed: ${writeErr.message})`;
        });
      }
      result.stored = dryRun ? "dry-run" : "error-recorded";
    }
  }

  return {
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    results,
  };
}

/** Compact one-line-per-indicator log output for the CLI / API response. */
export function summarizeReport(report) {
  const counts = { ok: 0, pending: 0, error: 0, skipped: 0 };
  for (const result of report.results) {
    if (result.skipped) counts.skipped += 1;
    else if (result.status === STATUS.OK) counts.ok += 1;
    else if (result.status === STATUS.PENDING) counts.pending += 1;
    else counts.error += 1;
  }
  return counts;
}
