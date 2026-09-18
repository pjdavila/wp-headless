import assert from "node:assert/strict";
import {
  normalizeSeries,
  mergeObservations,
  buildSnapshot,
  buildErrorSnapshot,
  buildPendingSnapshot,
} from "../lib/economy/normalize.js";
import {
  withCalculations,
  previousPeriodDate,
  yearAgoDate,
} from "../lib/economy/calculations.js";
import { computeFreshness } from "../lib/economy/status.js";

/**
 * Targeted regression tests for the economic data layer (no framework —
 * plain node:assert, run with `npm run test:economy`).
 */

function makeIndicator(overrides = {}) {
  return {
    id: "test-indicator",
    name: "Test Indicator",
    shortName: "Test",
    description: "",
    category: "jobs",
    unit: "percent",
    frequency: "monthly",
    geography: "Puerto Rico",
    source: "Test Source",
    sourceUrl: "https://example.com",
    methodology: "",
    higherIs: "neutral",
    seasonallyAdjusted: false,
    stalenessDays: 90,
    refreshDays: 25,
    provider: "bls",
    mvp: true,
    ...overrides,
  };
}

function monthlyPoints(startYear, startMonth, count, base = 10) {
  const points = [];
  let year = startYear;
  let month = startMonth;
  for (let i = 0; i < count; i += 1) {
    points.push({
      date: `${year}-${String(month).padStart(2, "0")}-01`,
      value: base + i,
    });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return points;
}

// --- normalizeSeries -------------------------------------------------------

{
  const out = normalizeSeries([
    { date: "2026-02-01", value: "5.8" },
    { date: "2026-01-01", value: 6 },
    { date: "2026-02-01", value: 5.9 }, // duplicate date: last wins
    { date: "not-a-date", value: 1 },
    { date: "2026-03-01", value: "abc" },
  ]);
  assert.equal(out.length, 2);
  assert.deepEqual(
    out.map((p) => p.date),
    ["2026-01-01", "2026-02-01"],
  );
  assert.equal(out[1].value, 5.9);
}

// series dimension is part of the identity: same date, two series → two points
{
  const out = normalizeSeries([
    { date: "2026-01-01", value: 1, series: "exports" },
    { date: "2026-01-01", value: 2, series: "imports" },
  ]);
  assert.equal(out.length, 2);
  assert.deepEqual(
    out.map((p) => p.series),
    ["exports", "imports"],
  );
}

// --- period math -----------------------------------------------------------

assert.equal(previousPeriodDate("2026-01-01", "monthly"), "2025-12-01");
assert.equal(previousPeriodDate("2026-07-01", "monthly"), "2026-06-01");
assert.equal(previousPeriodDate("2026-01-01", "quarterly"), "2025-10-01");
assert.equal(previousPeriodDate("2026-04-01", "quarterly"), "2026-01-01");
assert.equal(previousPeriodDate("2026-01-01", "annual"), "2025-01-01");
assert.equal(previousPeriodDate("2026-01-08", "weekly"), "2026-01-01");
assert.equal(previousPeriodDate("2026-03-01", "daily"), "2026-02-28");
assert.equal(yearAgoDate("2026-07-01"), "2025-07-01");

// --- withCalculations: changes match actual period dates, not array offsets

{
  const withGap = monthlyPoints(2025, 1, 18).filter(
    (p) => p.date !== "2025-06-01" && p.date !== "2026-02-01",
  );
  const out = withCalculations(withGap, "monthly");
  const july = out.find((p) => p.date === "2025-07-01");
  // June 2025 is missing: MoM must be undefined, NOT a comparison against May.
  assert.equal(july.momChange, undefined);
  assert.equal(july.previousValue, undefined);
  // Series starts 2025-01, so July 2025 has no year-ago point either.
  assert.equal(july.yoyChange, undefined);
  const may26 = out.find((p) => p.date === "2026-05-01");
  // YoY matches the same month one year earlier (2025-05-01 → +12).
  assert.equal(may26.yoyChange, 12);
  const march26 = out.find((p) => p.date === "2026-03-01");
  assert.equal(march26.momChange, undefined); // Feb 2026 missing
  assert.equal(march26.yoyChange, 12);
  const jan26 = out.find((p) => p.date === "2026-01-01");
  assert.equal(jan26.momChange, 1); // Dec 2025 present
  assert.equal(jan26.yoyChange, 12);
}

// quarterly series use 3-month offsets
{
  const out = withCalculations(
    [
      { date: "2025-01-01", value: 100 },
      { date: "2025-04-01", value: 110 },
      { date: "2026-04-01", value: 121 },
    ],
    "quarterly",
  );
  assert.equal(out[1].momChange, 10);
  assert.equal(out[2].momChange, undefined); // Q1 2026 missing
  assert.equal(out[2].yoyChange, 11);
}

// multi-series indicators are calculated per series
{
  const out = withCalculations(
    [
      { date: "2026-01-01", value: 10, series: "exports" },
      { date: "2026-01-01", value: 20, series: "imports" },
      { date: "2026-02-01", value: 11, series: "exports" },
      { date: "2026-02-01", value: 18, series: "imports" },
    ],
    "monthly",
  );
  const febExports = out.find(
    (p) => p.date === "2026-02-01" && p.series === "exports",
  );
  const febImports = out.find(
    (p) => p.date === "2026-02-01" && p.series === "imports",
  );
  assert.equal(febExports.momChange, 1);
  assert.equal(febImports.momChange, -2);
}

// --- mergeObservations: refresh extends history, never replaces it ---------

{
  const indicator = makeIndicator();
  const previous = [
    { date: "2015-01-01", value: 7, previousValue: 6, momChange: 1 }, // computed fields stripped
    { date: "2026-01-01", value: 5 },
  ];
  const fresh = [
    { date: "2026-01-01", value: 5.5 }, // conflict: new wins
    { date: "2026-02-01", value: 5.6 },
  ];
  const merged = mergeObservations(indicator, previous, fresh);
  assert.equal(merged.length, 3);
  assert.equal(merged.find((p) => p.date === "2015-01-01").value, 7);
  assert.equal(merged.find((p) => p.date === "2026-01-01").value, 5.5);
  assert.equal(
    merged.find((p) => p.date === "2015-01-01").momChange,
    undefined,
  );
}

// points from dropped series dimensions are cleaned out on merge
{
  const indicator = makeIndicator({
    providerConfig: { series: [{ key: "exports" }, { key: "imports" }] },
  });
  const previous = [
    { date: "2026-01-01", value: 9 }, // legacy unlabeled point
    { date: "2026-01-01", value: 3, series: "exports" },
  ];
  const merged = mergeObservations(indicator, previous, [
    { date: "2026-02-01", value: 4, series: "exports" },
  ]);
  assert.equal(merged.length, 2);
  assert.ok(merged.every((p) => p.series === "exports"));
}

// --- snapshots -------------------------------------------------------------

{
  const indicator = makeIndicator();
  const previous = buildSnapshot(indicator, monthlyPoints(2015, 1, 12, 5), {
    retrievedAt: "2025-01-01T00:00:00.000Z",
  });
  const snapshot = buildSnapshot(indicator, monthlyPoints(2025, 1, 14, 10), {
    previous,
    retrievedAt: "2026-03-01T00:00:00.000Z",
  });
  assert.equal(snapshot.status, "ok");
  assert.equal(snapshot.observations.length, 26); // 2015 history preserved
  assert.equal(snapshot.observations[0].date, "2015-01-01");
  assert.equal(snapshot.latest.date, "2026-02-01");
  assert.equal(snapshot.latest.yoyChange, 12);
  assert.equal(snapshot.latest.updatedAt, "2026-03-01T00:00:00.000Z");
  assert.equal(snapshot.latest.source, "Test Source");
}

// multi-series snapshot: latest comes from primarySeries
{
  const indicator = makeIndicator({
    providerConfig: {
      primarySeries: "total",
      series: [{ key: "total" }, { key: "construction" }],
    },
  });
  const snapshot = buildSnapshot(indicator, [
    { date: "2026-01-01", value: 100, series: "total" },
    { date: "2026-01-01", value: 5, series: "construction" },
    { date: "2026-02-01", value: 5.2, series: "construction" },
  ]);
  assert.equal(snapshot.latest.value, 100); // total, not the newer construction point
  assert.equal(snapshot.latest.series, "total");
  assert.deepEqual(
    snapshot.metadata.seriesBreakdown.map((s) => s.key),
    ["total", "construction"],
  );
}

// error snapshot: last-good data kept, status honestly "error"
{
  const indicator = makeIndicator();
  const good = buildSnapshot(indicator, monthlyPoints(2026, 1, 3), {
    retrievedAt: "2026-03-01T00:00:00.000Z",
  });
  const failed = buildErrorSnapshot(
    indicator,
    good,
    "BLS: HTTP 500",
    "2026-04-01T00:00:00.000Z",
  );
  assert.equal(failed.status, "error");
  assert.equal(failed.error, "BLS: HTTP 500");
  assert.equal(failed.observations.length, 3);
  assert.equal(failed.retrievedAt, "2026-03-01T00:00:00.000Z"); // last success
  assert.equal(failed.lastAttemptAt, "2026-04-01T00:00:00.000Z");
}

// --- freshness -------------------------------------------------------------

{
  const indicator = makeIndicator();
  const now = new Date("2026-03-10T00:00:00.000Z");

  // recent data, healthy → not stale
  const fresh = buildSnapshot(indicator, monthlyPoints(2025, 1, 15), {
    retrievedAt: "2026-03-05T00:00:00.000Z",
  });
  assert.deepEqual(computeFreshness(fresh, indicator, now), {
    stale: false,
    staleReason: null,
    ageDays: 9,
  });

  // same data but the last refresh failed → flagged, never implied current
  const failed = buildErrorSnapshot(indicator, fresh, "boom");
  const failedView = computeFreshness(failed, indicator, now);
  assert.equal(failedView.stale, true);
  assert.equal(failedView.staleReason, "refresh-failed");

  // old data → observation-expired
  const old = buildSnapshot(indicator, monthlyPoints(2025, 1, 6), {
    retrievedAt: "2025-07-01T00:00:00.000Z",
  });
  assert.equal(
    computeFreshness(old, indicator, now).staleReason,
    "observation-expired",
  );

  // data fresh but retrieval lapsed → ingestion-lapsed
  const lapsed = {
    ...fresh,
    retrievedAt: "2025-01-01T00:00:00.000Z",
    observations: [{ date: "2026-03-01", value: 1 }],
    latest: { ...fresh.latest, date: "2026-03-01" },
  };
  assert.equal(
    computeFreshness(lapsed, indicator, now).staleReason,
    "ingestion-lapsed",
  );

  // pending sources are always flagged
  const pending = buildPendingSnapshot(indicator);
  assert.equal(
    computeFreshness(pending, indicator, now).staleReason,
    "pending-source",
  );
  assert.equal(pending.observations.length, 0);
  assert.equal(pending.latest, null);
}

console.log("[test-economy] all assertions passed");
