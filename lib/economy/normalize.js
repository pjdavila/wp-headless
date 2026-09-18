import { SNAPSHOT_VERSION, STATUS } from "./types.js";
import { withCalculations } from "./calculations.js";

/**
 * Provider-agnostic normalization. Adapters return raw-ish points
 * ({date, value, series?, preliminary?}); this module turns them into the
 * shared observation model and the durable snapshot document.
 */

function dimensionKey(point) {
  return `${point.series ?? ""}|${point.date}`;
}

function stripComputed(point) {
  return {
    date: point.date,
    value: point.value,
    ...(point.series ? { series: point.series } : {}),
    ...(point.preliminary ? { preliminary: true } : {}),
  };
}

function sortPoints(points) {
  return points.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      String(a.series ?? "").localeCompare(String(b.series ?? "")),
  );
}

/**
 * Cleans a provider series: coerces values to finite numbers, drops junk,
 * dedupes by series+date (later write wins) and sorts ascending.
 *
 * @param {Array<{date: string, value: any, series?: string, preliminary?: boolean}>} rawPoints
 */
export function normalizeSeries(rawPoints) {
  const byKey = new Map();
  for (const point of rawPoints || []) {
    if (!point || typeof point.date !== "string") continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(point.date)) continue;
    const value = Number(point.value);
    if (!Number.isFinite(value)) continue;
    byKey.set(dimensionKey(point), stripComputed({ ...point, value }));
  }
  return sortPoints([...byKey.values()]);
}

/**
 * Merges newly fetched points into the stored history. Providers answer with
 * rolling windows (BLS: 10–20 years, Census ACS: latest vintage only), so a
 * successful refresh must EXTEND history, not replace it — new points win on
 * a series+date conflict, previously stored periods are preserved.
 *
 * Points whose series dimension is no longer part of the indicator's current
 * configuration are dropped, which also self-cleans snapshots stored under an
 * older single-series shape.
 */
export function mergeObservations(indicator, previousPoints, newPoints) {
  const allowedSeries = indicator.providerConfig?.series?.length
    ? new Set(indicator.providerConfig.series.map((s) => s.key))
    : null;
  const byKey = new Map();
  for (const point of previousPoints || []) {
    if (!point || typeof point.date !== "string") continue;
    if (allowedSeries && !allowedSeries.has(point.series)) continue;
    byKey.set(dimensionKey(point), stripComputed(point));
  }
  for (const point of newPoints || []) {
    if (!point || typeof point.date !== "string") continue;
    byKey.set(dimensionKey(point), stripComputed(point));
  }
  return [...byKey.values()];
}

/**
 * Builds the "latest" observation object described in the product brief.
 * Multi-series indicators report the latest of their configured
 * primarySeries (e.g. total nonfarm for the industry breakdown).
 */
export function buildLatestObservation(indicator, points, retrievedAt) {
  const primary = indicator.providerConfig?.primarySeries;
  const pool = primary ? points.filter((p) => p.series === primary) : points;
  const effective = pool.length > 0 ? pool : points;
  const latestPoint =
    effective.length > 0 ? effective[effective.length - 1] : null;
  if (!latestPoint) return null;
  return {
    indicatorId: indicator.id,
    name: indicator.name,
    date: latestPoint.date,
    value: latestPoint.value,
    unit: indicator.unit,
    frequency: indicator.frequency,
    geography: indicator.geography,
    source: indicator.source,
    sourceUrl: indicator.sourceUrl,
    seasonallyAdjusted: indicator.seasonallyAdjusted,
    ...(latestPoint.series ? { series: latestPoint.series } : {}),
    previousValue: latestPoint.previousValue,
    momChange: latestPoint.momChange,
    momChangePct: latestPoint.momChangePct,
    yoyChange: latestPoint.yoyChange,
    yoyChangePct: latestPoint.yoyChangePct,
    ...(latestPoint.preliminary ? { preliminary: true } : {}),
    updatedAt: retrievedAt,
  };
}

/**
 * Registry metadata is copied into every snapshot so the API can serve a
 * self-contained document even if the registry entry later changes.
 */
export function snapshotMetadata(indicator) {
  return {
    id: indicator.id,
    name: indicator.name,
    shortName: indicator.shortName,
    description: indicator.description,
    category: indicator.category,
    unit: indicator.unit,
    frequency: indicator.frequency,
    geography: indicator.geography,
    source: indicator.source,
    sourceUrl: indicator.sourceUrl,
    methodology: indicator.methodology,
    higherIs: indicator.higherIs,
    seasonallyAdjusted: indicator.seasonallyAdjusted,
    stalenessDays: indicator.stalenessDays,
    ...(indicator.providerConfig?.series?.length
      ? {
          seriesBreakdown: indicator.providerConfig.series.map(
            ({ key, label }) => ({ key, label }),
          ),
        }
      : {}),
  };
}

/**
 * Full snapshot for a successful ingestion run. When a previous snapshot is
 * supplied, its stored observations are merged with the fresh window so
 * history accumulates instead of being replaced.
 */
export function buildSnapshot(
  indicator,
  rawPoints,
  { previous = null, retrievedAt = new Date().toISOString() } = {},
) {
  const merged = mergeObservations(
    indicator,
    previous?.observations,
    rawPoints,
  );
  const series = withCalculations(normalizeSeries(merged), indicator.frequency);
  return {
    version: SNAPSHOT_VERSION,
    indicatorId: indicator.id,
    status: series.length > 0 ? STATUS.OK : STATUS.ERROR,
    error:
      series.length > 0 ? null : "Provider returned no usable observations",
    retrievedAt: series.length > 0 ? retrievedAt : null,
    lastAttemptAt: retrievedAt,
    metadata: snapshotMetadata(indicator),
    observations: series,
    latest: buildLatestObservation(indicator, series, retrievedAt),
  };
}

/**
 * Snapshot for a source with no automated ingestion yet. observations is
 * always empty — a pending indicator NEVER carries fabricated values.
 */
export function buildPendingSnapshot(
  indicator,
  now = new Date().toISOString(),
) {
  return {
    version: SNAPSHOT_VERSION,
    indicatorId: indicator.id,
    status: STATUS.PENDING,
    error: null,
    retrievedAt: null,
    lastAttemptAt: now,
    metadata: snapshotMetadata(indicator),
    observations: [],
    latest: null,
  };
}

/**
 * On failure the indicator must not pose as healthy: status becomes "error"
 * and the message is recorded, while the last-good observations, latest
 * value and retrievedAt (last SUCCESSFUL fetch) are preserved so the
 * dashboard degrades to flagged-but-real data instead of breaking.
 */
export function buildErrorSnapshot(
  indicator,
  previous,
  error,
  now = new Date().toISOString(),
) {
  const base =
    previous && previous.indicatorId === indicator.id
      ? previous
      : buildPendingSnapshot(indicator, now);
  return {
    ...base,
    metadata: snapshotMetadata(indicator),
    status: STATUS.ERROR,
    error,
    lastAttemptAt: now,
  };
}
