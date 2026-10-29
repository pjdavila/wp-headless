/**
 * Locale-aware formatting for the /dashboard/ board (ported from "The Great
 * Puerto Rico Dashboard" prototype). Every function takes the active
 * dashboard language ("es" | "en"); numbers and dates use es-PR / en-US.
 */

export const MONTHS = {
  en: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  es: [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ],
};

export const localeTag = (lang) => (lang === "es" ? "es-PR" : "en-US");

/** Pick the active language from an { en, es } object (or pass strings). */
export function L(value, lang) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value[lang] ?? value.en ?? "";
}

function nf(lang, value, digits = 0) {
  return new Intl.NumberFormat(localeTag(lang), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function compact(lang, value, digits) {
  return new Intl.NumberFormat(localeTag(lang), {
    notation: "compact",
    maximumFractionDigits: digits,
  }).format(value);
}

/** Value formatter keyed by the prototype's format codes. */
export function fmt(value, code, lang) {
  if (value == null || Number.isNaN(value)) return "—";
  switch (code) {
    case "pct":
      return `${nf(lang, value, 1)}%`;
    case "pct0":
      return `${nf(lang, value, 0)}%`;
    case "int":
      return nf(lang, value, 0);
    case "num1":
    case "idx":
      return nf(lang, value, 1);
    case "num2":
      return nf(lang, value, 2);
    case "k":
      return nf(lang, value, 1) + (lang === "es" ? " mil" : "K");
    case "compact":
      return compact(lang, value, 2);
    case "usd":
      return `$${nf(lang, value, 0)}`;
    case "cents":
      return `${nf(lang, value, 2)}¢`;
    case "usdM":
      if (lang === "es") return `$${nf(lang, value, 0)} M`;
      return Math.abs(value) >= 1000
        ? `$${nf(lang, value / 1000, 1)}B`
        : `$${nf(lang, value, 0)}M`;
    case "usdB":
      return lang === "es"
        ? `$${nf(lang, value * 1000, 0)} M`
        : `$${nf(lang, value, 1)}B`;
    case "signedPct0":
      return signedPct(value, lang, 0);
    default:
      return nf(lang, value, 1);
  }
}

/** Shorter axis-label formatter. */
export function axisFmt(value, code, lang) {
  const smallFraction = Math.abs(value) < 10 && value % 1;
  switch (code) {
    case "usdM":
      if (lang === "es") return `$${nf(lang, value, 0)}`;
      return Math.abs(value) >= 1000
        ? `$${nf(lang, value / 1000, 1)}B`
        : `$${nf(lang, value, 0)}M`;
    case "usdB":
      return `$${nf(lang, value, 0)}${lang === "es" ? " mm" : "B"}`;
    case "k":
      return nf(lang, value, 0);
    case "pct":
    case "pct0":
      return `${nf(lang, value, smallFraction ? 1 : 0)}%`;
    case "cents":
      return `${nf(lang, value, 0)}¢`;
    case "usd":
      return `$${nf(lang, value, 0)}`;
    case "compact":
    case "int":
      return compact(lang, value, 1);
    default:
      return nf(lang, value, smallFraction ? 1 : 0);
  }
}

/** Signed percent with a real minus sign, e.g. "+0.9%" / "−3.4%". */
export function signedPct(value, lang, digits = 1) {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${nf(lang, Math.abs(value), digits)}%`;
}

/** Period label for a key: "2026-07", "2026-Q2", "FY2026" or "2024". */
export function per(key, lang, short = false) {
  const k = String(key);
  let m = k.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const year = short ? `'${m[1].slice(2)}` : m[1];
    return `${MONTHS[lang][Number(m[2]) - 1]} ${year}`;
  }
  m = k.match(/^(\d{4})-Q(\d)$/);
  if (m) {
    const year = short ? `'${m[1].slice(2)}` : m[1];
    return `${lang === "es" ? "T" : "Q"}${m[2]} ${year}`;
  }
  m = k.match(/^FY(\d{4})$/);
  if (m) return `${lang === "es" ? "AF" : "FY"}${short ? m[1].slice(2) : m[1]}`;
  return k;
}

/** Last day covered by a period key (null when not a period key). */
export function endDate(key) {
  const k = String(key);
  let m = k.match(/^(\d{4})-(\d{2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]), 0);
  m = k.match(/^(\d{4})-Q(\d)$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) * 3, 0);
  m = k.match(/^FY(\d{4})$/);
  if (m) return new Date(Number(m[1]), 6, 0);
  m = k.match(/^(\d{4})$/);
  if (m) return new Date(Number(m[1]), 12, 0);
  return null;
}

/**
 * Freshness of a period key relative to today: monthly data is current for
 * ~3.5 months and stale after 7; quarterly 6.5/10; annual 20/32.
 */
export function freshness(key, freq, force) {
  if (force) return force;
  const end = endDate(key);
  if (!end) return "current";
  const months = (Date.now() - end.getTime()) / 2629800000;
  const f = String(freq || "");
  const limits = /month/.test(f)
    ? [3.5, 7]
    : /quarter/.test(f)
      ? [6.5, 10]
      : [20, 32];
  if (months <= limits[0]) return "current";
  if (months <= limits[1]) return "aging";
  return "stale";
}

const SHORT_SOURCES = {
  "U.S. Bureau of Labor Statistics via FRED": "BLS",
  "U.S. Bureau of Labor Statistics": "BLS",
  "World Bank via FRED": "World Bank",
  "Instituto de Estadísticas de Puerto Rico": "IEPR",
  "U.S. Census Bureau": "Census",
  "U.S. Energy Information Administration": "EIA",
};

/** Short source label for stamps and footers. */
export function shortSrc(source) {
  if (!source) return "";
  if (SHORT_SOURCES[source]) return SHORT_SOURCES[source];
  if (/^Instituto de Estad/.test(source)) return "IEPR";
  if (/^DDEC/.test(source)) return "DDEC";
  if (/Hacienda/.test(source) && !/AAFAF/.test(source)) return "Hacienda";
  if (/AAFAF/.test(source)) return "AAFAF";
  if (/ASUR/.test(source)) return "ASUR";
  if (/Discover/.test(source)) return "Discover PR";
  if (/GUIA/.test(source)) return "GUIA";
  if (/EIA/.test(source) && !/Congress/.test(source)) return "EIA";
  if (/Congress/.test(source)) return "CRS / EIA";
  if (/Planificaci/.test(source)) return "Junta de Planificación";
  if (/Economic Analysis/.test(source)) return "BEA";
  if (/Census/.test(source)) return "Census";
  if (/Tourism Company|Compañía de Turismo/.test(source)) return "CTPR";
  return source.split(/[,(–-]/)[0].trim();
}

/** Date like "18 sept 2026" / "Sep 18, 2026" from an ISO date or timestamp. */
export function formatDay(value, lang) {
  if (!value) return "";
  const iso = String(value);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? new Date(`${iso}T12:00:00`)
    : new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(localeTag(lang), {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
