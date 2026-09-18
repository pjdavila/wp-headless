/**
 * CB Economic Pulse — EXPERIMENTAL composite score (0–100, 50 = neutral)
 * summarizing the short-term direction of Puerto Rico's economy.
 *
 * METHODOLOGY (this comment is the canonical documentation; the dashboard
 * hero summarizes it for readers):
 *
 * 1. CONTRIBUTORS & WEIGHTS — configured below in PULSE_CONFIG, not in code
 *    logic. Each contributor declares a base weight and the direction that
 *    means "expansion" for that series. Contributors whose source is
 *    pending/stale simply drop out and the weights of the remaining live
 *    contributors are renormalized to 1 — the score NEVER uses fabricated
 *    or stale data.
 * 2. PERIOD MEASURE — for each contributor we take the year-over-year
 *    movement at each period: absolute change (percentage points) for
 *    percent-unit series, percent change otherwise. YoY (not MoM) keeps
 *    the score from whipsawing on one noisy month.
 * 3. NORMALIZATION — each measure is converted to a z-score against the
 *    contributor's OWN recent history (up to `baselineWindow` periods), so
 *    a 0.4 pp unemployment drop and a 2% employment rise are comparable.
 *    Z is clamped to ±2 and scaled to [-1, 1]; contributors configured
 *    with direction "down" (e.g. unemployment) are sign-flipped.
 * 4. SCORE — weighted average of the signed component scores, rescaled:
 *    score = 50 + 50 × weighted average. Computed for every period in the
 *    last `historyMonths` months where at least `minContributors` live
 *    contributors have a measure, producing the hero sparkline.
 * 5. LABELS — 0–39 Contracting, 40–46 Softening, 47–52 Steady,
 *    53–59 Improving, 60–100 Expanding.
 *
 * This is an editorial experiment, not an official statistic — hence the
 * permanent "Experimental" badge in the UI.
 */

export const PULSE_CONFIG = {
  /** Minimum live contributors required to publish a score at all. */
  minContributors: 3,
  /** How many months of pulse history the hero sparkline shows. */
  historyMonths: 24,
  /** Periods of an indicator's own history used for z-score normalization. */
  baselineWindow: 60,
  /**
   * Base weights (renormalized over whichever contributors are live).
   * direction: "up" = rising is expansionary, "down" = falling is
   * expansionary. Labor-market indicators dominate because they are the
   * timeliest hard data for Puerto Rico (monthly BLS releases).
   */
  contributors: [
    { id: "unemployment-rate", weight: 0.3, direction: "down" },
    { id: "total-employment", weight: 0.25, direction: "up" },
    { id: "employment-by-industry", weight: 0.15, direction: "up" },
    { id: "labor-force", weight: 0.1, direction: "up" },
    { id: "electricity-consumption", weight: 0.1, direction: "up" },
    { id: "airport-passengers", weight: 0.1, direction: "up" },
  ],
};

const SCORE_LABELS = [
  { min: 60, label: "Expanding" },
  { min: 53, label: "Improving" },
  { min: 47, label: "Steady" },
  { min: 40, label: "Softening" },
  { min: 0, label: "Contracting" },
];

export function pulseLabel(score) {
  for (const band of SCORE_LABELS) {
    if (score >= band.min) return band.label;
  }
  return SCORE_LABELS[SCORE_LABELS.length - 1].label;
}

/** YoY movement of a point, in the unit that makes sense for the series. */
function pointMeasure(point, unit) {
  if (unit === "percent") return point.yoyChange;
  return point.yoyChangePct;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Builds one contributor's measure series ({date, measure}) plus the
 * normalization stats from its own trailing history.
 */
function buildContributorSeries(entry) {
  const measures = [];
  for (const point of entry.points) {
    const measure = pointMeasure(point, entry.unit);
    if (measure === undefined || measure === null || !Number.isFinite(measure))
      continue;
    measures.push({ date: point.date, measure });
  }
  if (measures.length < 2) return null;

  const baseline = measures.slice(-PULSE_CONFIG.baselineWindow);
  const mean =
    baseline.reduce((sum, item) => sum + item.measure, 0) / baseline.length;
  const variance =
    baseline.reduce((sum, item) => sum + (item.measure - mean) ** 2, 0) /
    baseline.length;
  const std = Math.sqrt(variance);

  return { measures, mean, std };
}

/**
 * Computes the pulse from dashboard overview entries.
 *
 * @param {Object<string, {shortName: string, unit: string, status: string,
 *   stale: boolean, points: Array}>} entriesById  Map of indicator id to its
 *   overview entry (single-series points, calculations already applied).
 * @returns {{ok: true, score: number, change: number|null, label: string,
 *   asOf: string, contributors: Array, history: Array<{date: string,
 *   score: number}>} | {ok: false, reason: string, contributorsLive: number}}
 */
export function computePulse(entriesById) {
  const live = [];

  for (const config of PULSE_CONFIG.contributors) {
    const entry = entriesById[config.id];
    if (!entry || entry.status !== "ok" || entry.stale) continue;
    const series = buildContributorSeries(entry);
    if (!series) continue;
    live.push({ config, entry, ...series });
  }

  if (live.length < PULSE_CONFIG.minContributors) {
    return {
      ok: false,
      reason: "insufficient-contributors",
      contributorsLive: live.length,
    };
  }

  // Signed component score of a contributor at a given measure value.
  const componentScore = (contributor, measure) => {
    if (contributor.std === 0) return 0;
    const z = clamp((measure - contributor.mean) / contributor.std, -2, 2) / 2;
    return contributor.config.direction === "down" ? -z : z;
  };

  const byDate = live.map(
    (contributor) =>
      new Map(contributor.measures.map((m) => [m.date, m.measure])),
  );

  const allDates = [
    ...new Set(
      live.flatMap((contributor) => contributor.measures.map((m) => m.date)),
    ),
  ].sort();
  const windowDates = allDates.slice(-(PULSE_CONFIG.historyMonths + 1));

  const history = [];
  for (const date of windowDates) {
    const present = [];
    live.forEach((contributor, index) => {
      const measure = byDate[index].get(date);
      if (measure !== undefined) present.push({ contributor, measure });
    });
    if (present.length < PULSE_CONFIG.minContributors) continue;

    const weightTotal = present.reduce(
      (sum, p) => sum + p.contributor.config.weight,
      0,
    );
    const composite = present.reduce(
      (sum, p) =>
        sum +
        (p.contributor.config.weight / weightTotal) *
          componentScore(p.contributor, p.measure),
      0,
    );
    history.push({ date, score: clamp(round(50 + 50 * composite), 0, 100) });
  }

  if (history.length === 0) {
    return {
      ok: false,
      reason: "no-common-periods",
      contributorsLive: live.length,
    };
  }

  const latest = history[history.length - 1];
  const previous = history.length > 1 ? history[history.length - 2] : null;

  // Contributor detail for the methodology note. IMPORTANT: this must
  // reflect the exact set that produced the displayed score — contributors
  // with no measurement at the latest period (e.g. lagged releases) did not
  // contribute to it, so they are excluded and the weights shown are the
  // same renormalized weights used in the score itself.
  const presentAtLatest = live
    .map((contributor, index) => ({
      contributor,
      measure: byDate[index].get(latest.date),
    }))
    .filter((item) => item.measure !== undefined);
  const weightTotal = presentAtLatest.reduce(
    (sum, item) => sum + item.contributor.config.weight,
    0,
  );
  const contributors = presentAtLatest.map(({ contributor, measure }) => ({
    id: contributor.config.id,
    name: contributor.entry.shortName,
    weight: round(contributor.config.weight / weightTotal, 3),
    direction: contributor.config.direction,
    measure: round(measure, 2),
    score: round(componentScore(contributor, measure), 3),
  }));

  return {
    ok: true,
    score: latest.score,
    change: previous ? round(latest.score - previous.score) : null,
    label: pulseLabel(latest.score),
    asOf: latest.date,
    contributors,
    history,
  };
}
