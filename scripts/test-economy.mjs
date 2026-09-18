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
import { computePulse } from "../lib/economy/pulse.js";
import { computeInsights } from "../lib/economy/insights.js";
import {
  parseCsv,
  parseSourceDate,
  normalizeHeader,
  findColumns,
  observationsFromCsv,
} from "../lib/economy/providers/csv.js";
import {
  parseManualCsv,
  createManualProvider,
} from "../lib/economy/providers/manual-file.js";
import {
  isPendingSourceError,
  PendingSourceError,
} from "../lib/economy/providers/pending.js";

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

// --- pulse -----------------------------------------------------------------

{
  // Entry shape mirrors what /api/economy/overview passes to computePulse.
  const makeEntry = (id, points, overrides = {}) => ({
    id,
    shortName: id,
    unit: "people",
    higherIs: "positive",
    status: "ok",
    stale: false,
    points: withCalculations(points, "monthly"),
    ...overrides,
  });

  // Fewer than minContributors live → no score, honest reason
  {
    const sparse = computePulse({
      "unemployment-rate": makeEntry(
        "unemployment-rate",
        monthlyPoints(2024, 1, 30),
      ),
    });
    assert.equal(sparse.ok, false);
    assert.equal(sparse.reason, "insufficient-contributors");
    assert.equal(sparse.contributorsLive, 1);
  }

  // Four live contributors → score, renormalized weights summing to 1,
  // stale contributors excluded from the calc entirely.
  // Unemployment starts flat then falls (a constant-rate linear series has
  // constant YoY → z≈0, which would make the direction assertion noise).
  const flatThen = (rest) =>
    monthlyPoints(2024, 1, 30, 6).map((p, i) => ({
      ...p,
      value: i < 24 ? 6 : rest[i - 24],
    }));
  const liveSet = () => ({
    "unemployment-rate": makeEntry(
      "unemployment-rate",
      flatThen([5.6, 5.2, 4.8, 4.4, 4.0, 3.6]),
      { unit: "percent", higherIs: "negative" },
    ),
    "total-employment": makeEntry(
      "total-employment",
      monthlyPoints(2024, 1, 30, 1000),
    ),
    "employment-by-industry": makeEntry(
      "employment-by-industry",
      monthlyPoints(2024, 1, 30, 900),
    ),
    "labor-force": makeEntry("labor-force", monthlyPoints(2024, 1, 30, 1200)),
    "airport-passengers": makeEntry("airport-passengers", [], {
      status: "pending",
      stale: true,
    }),
  });

  const pulse = computePulse(liveSet());
  assert.equal(pulse.ok, true);
  assert.ok(pulse.score >= 0 && pulse.score <= 100);
  assert.ok(pulse.history.length > 12);
  assert.equal(pulse.contributors.length, 4); // pending one dropped
  const weightSum = pulse.contributors.reduce((sum, c) => sum + c.weight, 0);
  assert.ok(
    Math.abs(weightSum - 1) < 0.01,
    `weights renormalize, got ${weightSum}`,
  );

  // Direction "down": rising unemployment drags the score vs. falling
  const worsening = computePulse({
    ...liveSet(),
    "unemployment-rate": makeEntry(
      "unemployment-rate",
      flatThen([6.4, 6.8, 7.2, 7.6, 8.0, 8.4]),
      { unit: "percent", higherIs: "negative" },
    ),
  });
  assert.ok(worsening.score < pulse.score, "rising unemployment lowers pulse");

  // Lagged releases: a contributor whose series ends before the latest
  // period did NOT produce the displayed score, so it must not appear in
  // the contributor metadata — and the listed weights must still sum to 1.
  {
    const lagged = computePulse({
      ...liveSet(),
      // labor-force stops 3 months before the other series
      "labor-force": makeEntry("labor-force", monthlyPoints(2024, 1, 27, 1200)),
    });
    assert.equal(lagged.ok, true);
    assert.ok(
      !lagged.contributors.some((c) => c.id === "labor-force"),
      "lagged contributor must be excluded from the metadata",
    );
    const sum = lagged.contributors.reduce((s, c) => s + c.weight, 0);
    assert.ok(
      Math.abs(sum - 1) < 0.01,
      `listed weights renormalize, got ${sum}`,
    );
  }
}

// --- insights ---------------------------------------------------------------

{
  const makeEntry = (id, points, overrides = {}) => ({
    id,
    shortName: id,
    unit: "people",
    higherIs: "positive",
    status: "ok",
    stale: false,
    points: withCalculations(points, "monthly"),
    ...overrides,
  });

  // YoY movers: ranked by magnitude; percent units compare in pp, not %
  {
    const big = makeEntry("big-mover", monthlyPoints(2024, 1, 20, 100));
    const small = makeEntry("small-mover", [
      ...monthlyPoints(2024, 1, 19, 100),
      { date: "2025-08-01", value: 100.5 }, // +0.5% YoY vs big's +19%
    ]);
    const insights = computeInsights([small, big]);
    const movers = insights.filter((i) => i.type === "yoy-mover");
    assert.ok(movers.length >= 2);
    assert.equal(movers[0].indicatorId, "big-mover");
  }

  // 12-month extremes: strict — a flat series never claims a high.
  // NOTE: computeInsights keeps at most one insight per indicator and ranks
  // YoY movers first, so the "high" entry must have zero YoY change (flat
  // year-ago value) for its extreme to be the surviving insight.
  {
    // 14 flat points at 5, with BOTH the latest point and its year-ago
    // twin at 7: YoY change is exactly 0 (so no yoy-mover fires and steals
    // the indicator's one-insight slot), and 7 is strictly above the other
    // 11 points in the trailing-12 window → 12m-high must fire.
    const spikePoints = monthlyPoints(2024, 1, 14, 5).map((p) => ({
      ...p,
      value: 5,
    }));
    spikePoints[1].value = 7; // 2024-02-01, year-ago twin, outside the window
    spikePoints[13].value = 7; // 2025-02-01, latest
    const spiked = makeEntry("spiked", spikePoints);
    const flat = makeEntry(
      "flat",
      monthlyPoints(2024, 1, 14, 10).map((p) => ({ ...p, value: 5 })),
    );
    const insights = computeInsights([spiked, flat]);
    assert.ok(
      insights.some((i) => i.type === "12m-high" && i.indicatorId === "spiked"),
    );
    assert.ok(!insights.some((i) => i.indicatorId === "flat"));
  }

  // Reversals: strict consecutive signs — a mixed leg is never reported
  // as "tres alzas/bajas consecutivas"
  {
    // 3 consecutive declines then 3 consecutive rises; the latest value is
    // NOT a 12-month extreme, so the reversal rule is what fires (extremes
    // rank before reversals and each indicator yields at most one insight).
    const strictUp = makeEntry("strict-reversal", [
      ...[
        "2026-01-01|10",
        "2026-02-01|9",
        "2026-03-01|8",
        "2026-04-01|7",
        "2026-05-01|8",
        "2026-06-01|9",
        "2026-07-01|9.5",
      ].map((s) => {
        const [date, v] = s.split("|");
        return { date, value: Number(v) };
      }),
    ]);
    const mixed = makeEntry("mixed-reversal", [
      ...[
        "2026-01-01|9",
        "2026-02-01|8",
        "2026-03-01|7",
        "2026-04-01|6",
        "2026-05-01|16",
        "2026-06-01|15",
        "2026-07-01|25",
      ].map((s) => {
        const [date, v] = s.split("|");
        return { date, value: Number(v) };
      }),
    ]);
    const insights = computeInsights([strictUp, mixed]);
    assert.ok(
      insights.some(
        (i) =>
          i.type === "reversal" &&
          i.indicatorId === "strict-reversal" &&
          i.direction === "up",
      ),
      "strict 3-vs-3 reversal detected",
    );
    assert.ok(
      !insights.some(
        (i) => i.type === "reversal" && i.indicatorId === "mixed-reversal",
      ),
      "mixed-sign leg must not produce a reversal claim",
    );
  }

  // Sentiment respects higherIs; stale entries never generate insights
  {
    const badWhenUp = makeEntry("price-like", monthlyPoints(2024, 1, 14, 10), {
      higherIs: "negative",
    });
    const insights = computeInsights([badWhenUp]);
    // Whatever rule fires for a rising "higher is bad" series (mover or
    // 12m-high — movers rank first), its sentiment must be negative.
    assert.ok(insights.length > 0);
    assert.ok(insights.every((i) => i.sentiment === "negative"));

    const goodWhenUp = makeEntry("jobs-like", monthlyPoints(2024, 1, 14, 10), {
      higherIs: "positive",
    });
    assert.ok(
      computeInsights([goodWhenUp]).every((i) => i.sentiment === "positive"),
    );

    const staleEntry = makeEntry("stale-one", monthlyPoints(2024, 1, 14, 10), {
      stale: true,
    });
    assert.equal(
      computeInsights([staleEntry]).filter((i) => i.indicatorId === "stale-one")
        .length,
      0,
    );
  }

  // Frequency awareness: an annual series uses a 5-YEAR window, and the
  // insight carries frequency/windowSize so the UI never calls it "12
  // meses". Its small YoY is crowded out of the top-2 movers by two bigger
  // movers, letting the extreme survive as that indicator's one insight.
  {
    const bigA = makeEntry("big-a", monthlyPoints(2024, 1, 20, 100));
    const bigB = makeEntry("big-b", monthlyPoints(2024, 1, 20, 50));
    const annual = makeEntry(
      "annual-one",
      [100, 101, 99, 98, 102, 103].map((value, i) => ({
        date: `${2021 + i}-01-01`,
        value,
      })),
      { frequency: "annual" },
    );
    const insights = computeInsights([bigA, bigB, annual]);
    const annualInsight = insights.find((i) => i.indicatorId === "annual-one");
    assert.equal(annualInsight.type, "12m-high");
    assert.equal(annualInsight.windowSize, 5);
    assert.equal(annualInsight.frequency, "annual");
  }
}

// --- CSV/date helpers (government-report providers) ------------------------

// parseCsv: quotes, escaped quotes, CRLF, trailing newline variants
{
  const rows = parseCsv('a,"b,1","c""x"\r\n1,2,3\nlast,row,');
  assert.deepEqual(rows[0], ["a", "b,1", 'c"x']);
  assert.deepEqual(rows[1], ["1", "2", "3"]);
  assert.deepEqual(rows[2], ["last", "row", ""]);
}

// parseSourceDate: every format the publishers use
{
  assert.equal(parseSourceDate("2026-04-01"), "2026-04-01");
  assert.equal(parseSourceDate("2026-04"), "2026-04-01");
  assert.equal(parseSourceDate("2026"), "2026-01-01");
  assert.equal(parseSourceDate("5/1/2010"), "2010-05-01");
  assert.equal(parseSourceDate("7/1/26"), "2026-07-01");
  assert.equal(parseSourceDate("12/1/84"), "1984-12-01");
  assert.equal(parseSourceDate("abril-26"), "2026-04-01");
  assert.equal(parseSourceDate("Diciembre-2015"), "2015-12-01");
  assert.equal(parseSourceDate("Código"), null);
  assert.equal(parseSourceDate(""), null);
  assert.equal(parseSourceDate("13/1/2026"), null); // month 13 is invalid
}

// header matching: exact by default, endsWith survives mojibake prefixes
{
  const header = ["Date", "Nm.pasajeros salientes", "Pasajeros salientes SJU"];
  assert.equal(
    normalizeHeader("Todos los artículos  y servicios"),
    "todos los articulos y servicios",
  );
  assert.deepEqual(findColumns(header, "Pasajeros salientes"), []);
  assert.deepEqual(
    findColumns(header, "pasajeros salientes", { mode: "endsWith" }),
    [1],
  );
}

// observationsFromCsv: header located by column name, junk rows skipped
{
  const csv = [
    "Puerto Rico Manufacturing - Purchasing Managers Index (PRM-PMI),,,",
    ",PMI,General,New Orders",
    "5/1/2010,55.1,45.7,61.7",
    "6/1/2010,53.8,57.9,50",
    "* footnote,1,2,3",
  ].join("\n");
  const out = observationsFromCsv(csv, { column: "PMI" });
  assert.equal(out.length, 2);
  assert.deepEqual(out[0], { date: "2010-05-01", value: 55.1 });
}

// multi-column sum with scale and series tagging (trade / passengers shape)
{
  const csv = "date,Total\n1/1/26,4513698017\n2/1/26,4407730357";
  const out = observationsFromCsv(csv, {
    column: "Total",
    series: "exports",
    valueScale: 0.000001,
  });
  assert.deepEqual(out[0], {
    date: "2026-01-01",
    value: 4513.698017,
    series: "exports",
  });
  const summed = observationsFromCsv("Date,A,B\n3/1/2026,10,5", {
    columns: ["A", "B"],
  });
  assert.equal(summed[0].value, 15);
  assert.throws(
    () => observationsFromCsv(csv, { column: "Nope" }),
    /not found/,
  );
}

// --- manual-upload providers ------------------------------------------------

// parseManualCsv: comments, header, ISO and spanish dates, optional series
{
  const rows = parseManualCsv(
    [
      "# source: somewhere",
      "date,value",
      "2025-07-01,305.826",
      "agosto-2025,325.873",
      ",9", // blank date is skipped, not an error
    ].join("\n"),
  );
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { date: "2025-07-01", value: 305.826 });
  assert.equal(rows[1].date, "2025-08-01");
  assert.throws(() => parseManualCsv("2025-07-01,abc"), /non-numeric value/);
}

// missing manual file → PendingSourceError (ingest reports "pending")
{
  const provider = createManualProvider({
    id: "test-manual",
    name: "Test Manual",
    publisherUrl: "https://example.com",
    sourceDocs: "some PDF",
  });
  await assert.rejects(
    () => provider.getSeries({ id: "no-such-indicator" }),
    (err) => isPendingSourceError(err) && err instanceof PendingSourceError,
  );
}

// --- provider registry smoke test --------------------------------------------

// Every registry indicator resolves to a provider implementing the interface;
// importing the registry also proves runtime assets (the bundled indicadores.pr
// CA certificate) are present in a clean checkout.
{
  const { getProvider } = await import("../lib/economy/providers/index.js");
  const { listIndicators } = await import("../lib/economy/indicators.js");
  for (const indicator of listIndicators()) {
    const provider = getProvider(indicator.provider);
    assert.ok(provider, `no provider registered for "${indicator.provider}"`);
    assert.equal(typeof provider.getSeries, "function");
    assert.equal(typeof provider.getMetadata, "function");
    assert.equal(typeof provider.getLatest, "function");
  }
  assert.ok(getProvider("estadisticas-pr"));
}

// seeded manual files parse and cover their indicators
{
  const ivu = parseManualCsv(
    (await import("node:fs")).readFileSync(
      new URL("../lib/economy/manual/ivu-collections.csv", import.meta.url),
      "utf8",
    ),
  );
  assert.ok(ivu.length >= 12);
  assert.ok(ivu.every((p) => p.value > 0 && p.value < 1000)); // millions
}

console.log("[test-economy] all assertions passed");
