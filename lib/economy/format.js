/**
 * Display formatting for economic values. Raw numbers live in the data
 * layer; everything user-visible funnels through here so the dashboard is
 * consistent (es-PR locale, compact financial notation).
 */

const NUMBER_FORMATS = new Map();

function numberFormat(options) {
  const key = JSON.stringify(options);
  if (!NUMBER_FORMATS.has(key)) {
    NUMBER_FORMATS.set(key, new Intl.NumberFormat("es-PR", options));
  }
  return NUMBER_FORMATS.get(key);
}

/** Big-number formatting per registry unit. */
export function formatValue(value, unit) {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return "—";
  }
  switch (unit) {
    case "percent":
      return `${numberFormat({ maximumFractionDigits: 1 }).format(value)}%`;
    case "millions of USD":
      return `$${numberFormat({ maximumFractionDigits: 0 }).format(value)}M`;
    case "USD":
      return `$${numberFormat({ maximumFractionDigits: 0 }).format(value)}`;
    case "cents per kWh":
      return `${numberFormat({ maximumFractionDigits: 1 }).format(value)}¢`;
    case "index":
      return numberFormat({ maximumFractionDigits: 1 }).format(value);
    default:
      return numberFormat({
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value);
  }
}

/** Short unit label shown next to a big number. */
export function unitLabel(unit) {
  switch (unit) {
    case "percent":
      return "";
    case "index":
      return "índice";
    case "millions of USD":
      return "millones USD";
    case "cents per kWh":
      return "¢/kWh";
    case "million kWh":
      return "millones kWh";
    case "thousands of bags":
      return "miles de sacos";
    case "thousands of jobs":
      return "miles de empleos";
    case "passengers":
      return "pasajeros";
    case "people":
      return "personas";
    default:
      return unit || "";
  }
}

/**
 * Change text for one point: percentage-point movement for percent units,
 * percent change otherwise. `kind` selects the MoM ("mom") or YoY ("yoy")
 * fields. Returns null when there is no comparison.
 */
export function formatPointChange(point, unit, kind = "mom") {
  if (!point) return null;
  const absolute = kind === "yoy" ? point.yoyChange : point.momChange;
  const percent = kind === "yoy" ? point.yoyChangePct : point.momChangePct;
  if (unit === "percent") {
    if (absolute === undefined || absolute === null) return null;
    const sign = absolute > 0 ? "+" : absolute < 0 ? "−" : "";
    return {
      text: `${sign}${numberFormat({ maximumFractionDigits: 1 }).format(Math.abs(absolute))} pp`,
      direction: absolute > 0 ? "up" : absolute < 0 ? "down" : "flat",
    };
  }
  if (percent === undefined || percent === null) return null;
  const sign = percent > 0 ? "+" : percent < 0 ? "−" : "";
  return {
    text: `${sign}${numberFormat({ maximumFractionDigits: 1 }).format(Math.abs(percent))}%`,
    direction: percent > 0 ? "up" : percent < 0 ? "down" : "flat",
  };
}

/**
 * Change text for a KPI card: percentage-point movement for percent units,
 * percent change otherwise. Returns null when there is no comparison.
 */
export function formatChange(point, unit) {
  return formatPointChange(point, unit, "mom");
}

/**
 * Format an absolute percentage-point value (chart axes/tooltips in YoY mode
 * for percent-unit indicators, where the plotted value is a pp difference,
 * not a percent). Negative values keep their minus sign.
 */
export function formatPpChange(value) {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return "—";
  }
  return `${numberFormat({ maximumFractionDigits: 1 }).format(value)} pp`;
}

/** "jul 2026" for monthly, "2025" for annual, etc. */
export function formatPeriod(isoDate, frequency) {
  if (!isoDate) return "";
  const [year, month] = isoDate.split("-").map(Number);
  if (frequency === "annual") return String(year);
  const date = new Date(Date.UTC(year, (month || 1) - 1, 1));
  return new Intl.DateTimeFormat("es-PR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Full timestamp for the LAST UPDATED line. */
export function formatTimestamp(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("es-PR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
