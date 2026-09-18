import { STATUS } from "./types.js";
import { snapshotMetadata } from "./normalize.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function ageDays(isoDate, now) {
  const time = Date.parse(isoDate);
  if (!Number.isFinite(time)) return null;
  return Math.max(0, (now.getTime() - time) / DAY_MS);
}

/**
 * Read-side freshness view of a snapshot. The API NEVER implies currency:
 * when the newest observation or the last successful retrieval exceeds the
 * indicator's staleness threshold, consumers get an explicit flag + reason.
 *
 * @param {import("./types").IndicatorSnapshot|null} snapshot
 * @param {import("./types").Indicator} indicator
 * @param {Date} [now]
 */
export function computeFreshness(snapshot, indicator, now = new Date()) {
  const threshold = indicator.stalenessDays;

  if (!snapshot || snapshot.status === STATUS.PENDING) {
    return { stale: true, staleReason: "pending-source", ageDays: null };
  }

  // A failed refresh must never pose as healthy: last-good data is still
  // served, but flagged so consumers show the source error instead of
  // implying currency.
  if (snapshot.status === STATUS.ERROR) {
    const latestDate = snapshot.latest ? snapshot.latest.date : null;
    const age = latestDate ? ageDays(latestDate, now) : null;
    return {
      stale: true,
      staleReason: "refresh-failed",
      ageDays: age !== null ? Math.round(age) : null,
    };
  }

  const latestDate = snapshot.latest ? snapshot.latest.date : null;
  if (!latestDate) {
    return { stale: true, staleReason: "no-data", ageDays: null };
  }

  const observationAge = ageDays(latestDate, now);
  if (observationAge !== null && observationAge > threshold) {
    return {
      stale: true,
      staleReason: "observation-expired",
      ageDays: Math.round(observationAge),
    };
  }

  // Ingestion itself may have stopped: the newest observation can look fresh
  // while the pipeline silently failed months ago.
  const retrievalAge = snapshot.retrievedAt
    ? ageDays(snapshot.retrievedAt, now)
    : null;
  if (retrievalAge !== null && retrievalAge > threshold) {
    return {
      stale: true,
      staleReason: "ingestion-lapsed",
      ageDays: Math.round(retrievalAge),
    };
  }

  return {
    stale: false,
    staleReason: null,
    ageDays: Math.round(observationAge ?? 0),
  };
}

/**
 * The summary shape the API serves per indicator: registry metadata merged
 * with snapshot status and freshness flags.
 */
export function summarizeSnapshot(snapshot, indicator, now = new Date()) {
  const freshness = computeFreshness(snapshot, indicator, now);
  const stored = snapshot?.metadata;
  return {
    ...snapshotMetadata(indicator),
    ...(stored && Object.keys(stored).length > 0 ? stored : {}),
    id: indicator.id,
    mvp: Boolean(indicator.mvp),
    status: snapshot ? snapshot.status : STATUS.PENDING,
    error: snapshot ? snapshot.error : null,
    retrievedAt: snapshot ? snapshot.retrievedAt : null,
    lastAttemptAt: snapshot ? snapshot.lastAttemptAt : null,
    latest: snapshot ? snapshot.latest : null,
    observationCount: snapshot ? snapshot.observations.length : 0,
    ...freshness,
  };
}
