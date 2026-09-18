/**
 * "What's Moving Puerto Rico" — deterministic insight rules over the stored
 * observations. No LLM, no randomness: the same data always produces the
 * same insights, and every insight cites its indicator and period.
 *
 * Rules (evaluated per single-series indicator, on points that already carry
 * MoM/YoY calculations):
 *
 *  1. yoy-mover    — largest absolute YoY movements among fresh indicators.
 *  2. period-high/low — latest reading is the max/min of a trailing window
 *                       sized to the indicator's frequency (12 months, 5
 *                       years, 8 quarters), so annual series are never
 *                       described as "12 months".
 *  3. reversal     — the last 3 MoM changes ALL move one way and the 3
 *                    before them ALL move the opposite way, so the rendered
 *                    "three consecutive moves" copy is literally true.
 *
 * Selection: up to 2 YoY movers, then 12-month extremes, then reversals,
 * at most one insight per indicator, capped at 5 total. Stale, pending and
 * error snapshots never generate insights — they are flagged in the UI
 * instead of posing as current.
 */

const MAX_INSIGHTS = 5;
const REVERSAL_LEG = 3;

/** Trailing window for high/low detection, per indicator frequency. */
const EXTREME_WINDOWS = { annual: 5, quarterly: 8, monthly: 12 };

function extremeWindow(frequency) {
  return EXTREME_WINDOWS[frequency] || 12;
}

function mean(values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function signOf(value) {
  if (value > 0) return 1;
  if (value < 0) return -1;
  return 0;
}

/** Common sign of a leg, or 0 unless EVERY move shares one direction. */
function legSign(values) {
  const first = signOf(values[0]);
  if (first === 0) return 0;
  return values.every((v) => signOf(v) === first) ? first : 0;
}

/** YoY magnitude in the unit that makes sense for the series. */
function yoyMagnitude(entry, point) {
  if (entry.unit === "percent") {
    return point.yoyChange === undefined ? null : Math.abs(point.yoyChange);
  }
  return point.yoyChangePct === undefined ? null : Math.abs(point.yoyChangePct);
}

function sentiment(entry, direction) {
  if (entry.higherIs === "neutral" || !entry.higherIs) return "neutral";
  const upIsGood = entry.higherIs === "positive";
  const isGood = direction === "up" ? upIsGood : !upIsGood;
  return isGood ? "positive" : "negative";
}

function movers(entries) {
  const candidates = [];
  for (const entry of entries) {
    const latest = entry.points[entry.points.length - 1];
    if (!latest) continue;
    const magnitude = yoyMagnitude(entry, latest);
    if (magnitude === null || magnitude === 0) continue;
    const direction = latest.yoyChange > 0 ? "up" : "down";
    candidates.push({
      type: "yoy-mover",
      indicatorId: entry.id,
      indicatorName: entry.shortName,
      period: latest.date,
      frequency: entry.frequency,
      direction,
      sentiment: sentiment(entry, direction),
      magnitude,
      yoyChange: latest.yoyChange,
      yoyChangePct: latest.yoyChangePct,
      unit: entry.unit,
    });
  }
  return candidates.sort((a, b) => b.magnitude - a.magnitude);
}

function extremes(entries) {
  const candidates = [];
  for (const entry of entries) {
    const windowSize = extremeWindow(entry.frequency);
    const windowPoints = entry.points.slice(-windowSize);
    if (windowPoints.length < Math.min(windowSize, 6)) continue;
    const latest = windowPoints[windowPoints.length - 1];
    const values = windowPoints.map((p) => p.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    // Strictly greater/lower than every OTHER point in the window, so a
    // flat series doesn't emit a permanent "period high".
    const others = values.slice(0, -1);
    let kind = null;
    if (latest.value > Math.max(...others)) kind = "12m-high";
    else if (latest.value < Math.min(...others)) kind = "12m-low";
    if (!kind) continue;
    candidates.push({
      type: kind,
      indicatorId: entry.id,
      indicatorName: entry.shortName,
      period: latest.date,
      frequency: entry.frequency,
      windowSize,
      direction: kind === "12m-high" ? "up" : "down",
      sentiment: sentiment(entry, kind === "12m-high" ? "up" : "down"),
      value: latest.value,
      unit: entry.unit,
      // Rank by how far the reading stands from the rest of the window.
      magnitude:
        Math.abs(latest.value - mean(others)) / (Math.abs(mean(others)) || 1),
    });
  }
  return candidates.sort((a, b) => b.magnitude - a.magnitude);
}

function reversals(entries) {
  const candidates = [];
  for (const entry of entries) {
    const changes = entry.points
      .map((p) => p.momChange)
      .filter((c) => c !== undefined && c !== null);
    if (changes.length < REVERSAL_LEG * 2) continue;
    const recent = changes.slice(-REVERSAL_LEG);
    const prior = changes.slice(-REVERSAL_LEG * 2, -REVERSAL_LEG);
    const recentSign = legSign(recent);
    const priorSign = legSign(prior);
    if (recentSign === 0 || priorSign === 0 || recentSign === priorSign)
      continue;
    const latest = entry.points[entry.points.length - 1];
    candidates.push({
      type: "reversal",
      indicatorId: entry.id,
      indicatorName: entry.shortName,
      period: latest.date,
      frequency: entry.frequency,
      direction: recentSign > 0 ? "up" : "down",
      sentiment: sentiment(entry, recentSign > 0 ? "up" : "down"),
      unit: entry.unit,
      magnitude: Math.abs(mean(recent) - mean(prior)),
    });
  }
  return candidates.sort((a, b) => b.magnitude - a.magnitude);
}

/**
 * @param {Array<{id: string, shortName: string, unit: string,
 *   higherIs?: string, status: string, stale: boolean,
 *   points: Array}>} entries  Overview entries (fresh single-series points
 *   with calculations applied).
 * @returns {Array} up to MAX_INSIGHTS insights, deterministic order.
 */
export function computeInsights(entries) {
  const fresh = entries.filter(
    (entry) => entry.status === "ok" && !entry.stale && entry.points.length > 0,
  );

  const ranked = [
    ...movers(fresh).slice(0, 2),
    ...extremes(fresh),
    ...reversals(fresh),
  ];

  const seen = new Set();
  const selected = [];
  for (const insight of ranked) {
    if (seen.has(insight.indicatorId)) continue;
    seen.add(insight.indicatorId);
    selected.push(insight);
    if (selected.length >= MAX_INSIGHTS) break;
  }
  return selected;
}
