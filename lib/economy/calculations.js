/**
 * Derived-change math over a normalized series.
 *
 * Everything here operates on raw values (never display strings) and mutates
 * nothing: it returns new point objects with previousValue / MoM / YoY filled
 * in. Changes are computed by matching ACTUAL period dates — MoM compares
 * against the immediately preceding period of the indicator's frequency, YoY
 * against the same period one year earlier — so a gap in a provider's series
 * yields an undefined change instead of silently comparing the wrong periods.
 * Percent changes are undefined when the base value is 0 or missing.
 */

function pctChange(current, base) {
  if (base === 0 || base === undefined || base === null) return undefined;
  return ((current - base) / Math.abs(base)) * 100;
}

function round(value, digits = 4) {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return undefined;
  }
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** ISO date (yyyy-mm-dd) of the period immediately before `date`. */
export function previousPeriodDate(date, frequency) {
  const [year, month, day] = date.split("-").map(Number);
  switch (frequency) {
    case "annual":
      return `${year - 1}-01-01`;
    case "quarterly": {
      const m = month - 3;
      return m >= 1
        ? `${year}-${pad2(m)}-01`
        : `${year - 1}-${pad2(m + 12)}-01`;
    }
    case "weekly": {
      const d = new Date(Date.UTC(year, month - 1, day) - 7 * 86400000);
      return d.toISOString().slice(0, 10);
    }
    case "daily": {
      const d = new Date(Date.UTC(year, month - 1, day) - 86400000);
      return d.toISOString().slice(0, 10);
    }
    case "monthly":
    default: {
      const m = month - 1;
      return m >= 1 ? `${year}-${pad2(m)}-01` : `${year - 1}-12-01`;
    }
  }
}

/** ISO date of the same period one year earlier (e.g. 2026-07-01 → 2025-07-01). */
export function yearAgoDate(date) {
  const [year, ...rest] = date.split("-");
  return `${Number(year) - 1}-${rest.join("-")}`;
}

function sortPoints(points) {
  return [...points].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      String(a.series ?? "").localeCompare(String(b.series ?? "")),
  );
}

/**
 * Returns a new series with previousValue, momChange, momChangePct,
 * yoyChange and yoyChangePct computed per point. Multi-series indicators
 * (points carry a `series` dimension) are calculated per series.
 *
 * @param {Array<{date: string, value: number, series?: string}>} points
 * @param {import("./types.js").Frequency} frequency
 */
export function withCalculations(points, frequency) {
  const groups = new Map();
  for (const point of points) {
    const key = point.series ?? "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(point);
  }

  const out = [];
  for (const group of groups.values()) {
    const sorted = sortPoints(group);
    const byDate = new Map(sorted.map((point) => [point.date, point]));
    for (const point of sorted) {
      const prev = byDate.get(previousPeriodDate(point.date, frequency));
      const yearAgo = byDate.get(yearAgoDate(point.date));
      out.push({
        ...point,
        previousValue: prev ? prev.value : undefined,
        momChange: prev ? round(point.value - prev.value) : undefined,
        momChangePct: prev
          ? round(pctChange(point.value, prev.value))
          : undefined,
        yoyChange: yearAgo ? round(point.value - yearAgo.value) : undefined,
        yoyChangePct: yearAgo
          ? round(pctChange(point.value, yearAgo.value))
          : undefined,
      });
    }
  }
  return sortPoints(out);
}
