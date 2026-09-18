/**
 * Shared types for the Puerto Rico Economic Dashboard data layer.
 *
 * The whole layer speaks one normalized vocabulary:
 *
 * - Indicator   (registry entry, see lib/economy/indicators.js)
 * - Observation (one data point in time, normalized across providers)
 * - Snapshot    (the durable per-indicator cache document stored in R2/local)
 *
 * Provider adapters never leak their raw response shapes past
 * lib/economy/normalize.js; API routes and (later) UI components only ever
 * see the shapes below.
 *
 * @typedef {"daily"|"weekly"|"monthly"|"quarterly"|"annual"} Frequency
 *
 * @typedef {"economy"|"jobs"|"consumer"|"business"|"energy"|"tourism"|"trade"|"demographics"} IndicatorCategory
 *
 * @typedef {"positive"|"negative"|"neutral"} HigherIs
 *
 * @typedef {"ok"|"pending"|"error"} SnapshotStatus
 *   - "ok"      — last ingestion succeeded, observations are real data.
 *   - "pending" — indicator is wired in the registry but its source has no
 *                 usable API yet; adapter is a documented stub. NEVER carries
 *                 fabricated values.
 *   - "error"   — last ingestion attempt failed (missing API key, provider
 *                 down, ...). Any previously stored observations are kept and
 *                 served with the stale flag.
 *
 * @typedef {Object} Indicator
 * @property {string} id               Stable slug, e.g. "unemployment-rate".
 * @property {string} name
 * @property {string} shortName
 * @property {string} description
 * @property {IndicatorCategory} category
 * @property {string} unit             Display unit, e.g. "percent", "thousands of people".
 * @property {Frequency} frequency
 * @property {string} geography        e.g. "Puerto Rico".
 * @property {string} source           Publisher name, e.g. "U.S. Bureau of Labor Statistics".
 * @property {string} sourceUrl        Link to the original government source.
 * @property {string} [methodology]    What the number actually represents.
 * @property {HigherIs} [higherIs]     Whether up is good news.
 * @property {boolean} [seasonallyAdjusted]
 * @property {number} stalenessDays    Observation older than this => stale flag in API.
 * @property {number} refreshDays      Re-ingest when last success is older than this.
 * @property {string} provider         Key into lib/economy/providers/index.js.
 * @property {Object} [providerConfig] Provider-specific wiring (series ids, tables...).
 * @property {boolean} [mvp]           false for supplemental indicators (e.g. Census ACS).
 *
 * @typedef {Object} SeriesPoint
 * @property {string} date              ISO date (period start), e.g. "2026-07-01".
 * @property {number} value             Raw value as reported (never display-formatted).
 * @property {string} [series]          Series dimension for multi-series indicators
 *                                      (e.g. "manufacturing", "exports"); absent for
 *                                      single-series indicators.
 * @property {number} [previousValue]
 * @property {number} [momChange]       Absolute change vs previous period (pp for rates).
 * @property {number} [momChangePct]    Percent change vs previous period.
 * @property {number} [yoyChange]       Absolute change vs same period one year earlier.
 * @property {number} [yoyChangePct]    Percent change vs same period one year earlier.
 * @property {boolean} [preliminary]    Provider flagged the point as preliminary.
 *
 * @typedef {Object} EconomicObservation
 * @property {string} indicatorId
 * @property {string} name
 * @property {string} date
 * @property {number} value
 * @property {string} unit
 * @property {Frequency} frequency
 * @property {string} geography
 * @property {string} source
 * @property {string} [sourceUrl]
 * @property {boolean} [seasonallyAdjusted]
 * @property {number} [previousValue]
 * @property {number} [momChange]
 * @property {number} [momChangePct]
 * @property {number} [yoyChange]
 * @property {number} [yoyChangePct]
 * @property {string} updatedAt         When the source data was retrieved by us (ISO).
 *
 * @typedef {Object} IndicatorSnapshot
 * @property {number} version           Snapshot schema version (1).
 * @property {string} indicatorId
 * @property {SnapshotStatus} status
 * @property {string|null} error        Last error message when status === "error".
 * @property {string|null} retrievedAt  Last successful provider fetch (ISO).
 * @property {string} lastAttemptAt     Last ingestion attempt (ISO).
 * @property {Object} metadata          Copy of the registry entry at ingest time.
 * @property {SeriesPoint[]} observations  Full historical series, ascending by date.
 * @property {EconomicObservation|null} latest
 */

export const SNAPSHOT_VERSION = 1;

export const STATUS = Object.freeze({
  OK: "ok",
  PENDING: "pending",
  ERROR: "error",
});
