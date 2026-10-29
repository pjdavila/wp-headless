import {
  L,
  fmt,
  per,
  freshness,
  shortSrc,
  signedPct,
  MONTHS,
} from "./format.js";
import {
  LIVE_SOURCES,
  SERIES_LIVE,
  TILE_LIVE,
  CHART_FIXED_ONLY,
  CHART_LIVE_COPY,
} from "./liveMap.js";
import { UI, fill } from "./i18n.js";

/**
 * Hybrid board model for /dashboard/: merges the fixed prototype snapshot
 * (/api/economy/fixed-snapshot/) with the live data layer
 * (/api/economy/overview/ + /api/economy/series/<id>/).
 *
 * Rule: a live source with usable observations wins; otherwise the fixed
 * snapshot value is used and flagged `origin: "fixed"`; with neither, the
 * chart/tile is flagged `origin: "none"` and renders an empty state. Fixed
 * data is never labelled live.
 */

// ------------------------------------------------------------------ keys

/** Convert a live observation date ("YYYY-MM-DD") to a prototype period key. */
function liveKey(date, frequency, periodKey) {
  const d = String(date || "");
  const year = d.slice(0, 4);
  const month = Number(d.slice(5, 7)) || 1;
  if (/month/.test(frequency)) return d.slice(0, 7);
  if (/quarter/.test(frequency)) return `${year}-Q${Math.ceil(month / 3)}`;
  return periodKey === "fy" ? `FY${year}` : year;
}

/** The same period one year earlier. */
export function yearAgoKey(key) {
  const k = String(key);
  let m = k.match(/^(\d{4})(-\d{2}|-Q\d)$/);
  if (m) return `${Number(m[1]) - 1}${m[2]}`;
  m = k.match(/^FY(\d{4})$/);
  if (m) return `FY${Number(m[1]) - 1}`;
  m = k.match(/^(\d{4})$/);
  if (m) return String(Number(m[1]) - 1);
  return null;
}

// ------------------------------------------------------------ live layer

function buildLiveSource(key, config, entry) {
  if (!entry) return null;
  const usable = entry.status === "ok" || entry.status === "error";
  let points = entry.observations || [];
  if (config.series) {
    points = points.filter((point) => point.series === config.series);
  }
  let o = points
    .filter((point) => point && point.value != null && point.date)
    .map((point) => [
      liveKey(point.date, entry.frequency, config.periodKey),
      Number(point.value),
    ]);
  // Deduplicate keys (keep the last) and sort chronologically.
  o = [...new Map(o).entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));

  if (config.transform === "yoyPct") {
    const byKey = new Map(o);
    o = o
      .map(([k, v]) => {
        const prev = byKey.get(yearAgoKey(k));
        return prev ? [k, Math.round((v / prev - 1) * 1000) / 10] : null;
      })
      .filter(Boolean);
  }

  if (!usable || o.length === 0) return null;

  return {
    key,
    indicatorId: entry.id,
    name: entry.name,
    source: entry.source,
    sourceUrl: entry.sourceUrl,
    retrievedAt: entry.retrievedAt,
    status: entry.status,
    stale: entry.stale,
    staleReason: entry.staleReason,
    frequency: entry.frequency,
    unit: config.transform === "yoyPct" ? "percent" : entry.unit,
    higherIs: entry.higherIs,
    o,
  };
}

/**
 * @param fixed     /api/economy/fixed-snapshot/ payload
 * @param overview  /api/economy/overview/ payload
 * @param seriesById { [indicatorId]: /api/economy/series/<id>/ payload }
 */
export function buildBoard({ fixed, overview, seriesById }) {
  const entries = {};
  for (const entry of overview?.indicators || []) entries[entry.id] = entry;
  for (const [id, payload] of Object.entries(seriesById || {})) {
    if (payload) entries[id] = payload;
  }

  const sources = {};
  for (const [key, config] of Object.entries(LIVE_SOURCES)) {
    sources[key] = buildLiveSource(key, config, entries[config.indicator]);
  }

  return {
    fixed,
    collectedOn: fixed.collectedOn,
    sources,
    liveEntries: Object.values(entries),
  };
}

// ---------------------------------------------------------------- series

/** Resolve a prototype series id for a given chart: live first, then fixed. */
export function resolveSeries(board, id, chartId) {
  const sourceKey = SERIES_LIVE[id];
  const live =
    sourceKey && !CHART_FIXED_ONLY.has(chartId)
      ? board.sources[sourceKey]
      : null;
  if (live) {
    return {
      o: live.o,
      src: live.source,
      url: live.sourceUrl,
      freq: live.frequency,
      origin: "live",
      live,
    };
  }
  const fixedSeries = board.fixed.data.series[id];
  if (fixedSeries) {
    return {
      o: fixedSeries.o,
      src: fixedSeries.src,
      url: fixedSeries.url,
      freq: fixedSeries.freq,
      origin: "fixed",
      live: null,
    };
  }
  return null;
}

const nonNull = (o) => o.filter((pair) => pair[1] != null);
const lastObs = (o) => {
  const list = nonNull(o);
  return list[list.length - 1] || null;
};

function combineOrigins(origins) {
  const set = new Set(origins.filter(Boolean));
  if (set.size === 0) return "none";
  if (set.size === 1) return [...set][0];
  return "mixed";
}

const COLORS = ["--s1", "--s2", "--s3", "--s4", "--s5"];

function applyRange(keys, range) {
  if (range === "max") return keys;
  return keys.slice(-(range === "2y" ? 24 : 60));
}

/** Title and subtitle, honoring live-definition overrides. */
export function chartCopy(spec, chartId, origin, lang) {
  const override =
    origin === "live" || origin === "mixed" ? CHART_LIVE_COPY[chartId] : null;
  return {
    title: L(override?.t || spec.t, lang),
    sub: L(override?.sub || spec.sub, lang),
  };
}

/** Port of the prototype's model(): everything a chart card needs to draw. */
export function chartModel(board, chartId, lang, range) {
  const spec = board.fixed.charts[chartId];
  if (!spec) return null;
  const tr = (label) => board.fixed.labels[label]?.[lang] || label;
  const { breakdowns, facts } = board.fixed.data;

  if (spec.kind === "hbar" || (spec.kind === "col" && spec.bref)) {
    const b = spec.bref ? breakdowns[spec.bref] : null;
    let items = spec.items || (b ? b.items : []);
    if (spec.top)
      items = [...items].sort((x, y) => y[1] - x[1]).slice(0, spec.top);
    const period = spec.period
      ? L(spec.period, lang)
      : b
        ? /^\d{4}-\d{2}$/.test(b.period)
          ? per(b.period, lang)
          : b.period
        : "";
    const { title, sub } = chartCopy(spec, chartId, "fixed", lang);
    return {
      id: chartId,
      spec,
      title,
      sub,
      cats: items.map((item) => tr(item[0])),
      full: items.map((item) => tr(item[0])),
      keys: items.map((item) => item[0]),
      series: [
        {
          name: title,
          color: "--s1",
          vals: items.map((item) => item[1]),
          origin: "fixed",
        },
      ],
      src: spec.src || b?.src,
      url: spec.urlFrom ? facts[spec.urlFrom]?.url : b?.url,
      freq: "static",
      lastKey: null,
      periodLabel: period,
      cat: true,
      origin: "fixed",
      lives: [],
    };
  }

  if (spec.kind === "overlay") {
    const s = resolveSeries(board, spec.ref, chartId);
    if (!s) return emptyModel(board, chartId, spec, lang);
    const groups = {};
    for (const [k, v] of s.o) {
      const y = Number(k.slice(0, 4));
      const m = Number(k.slice(5, 7));
      if (!m) continue;
      let g;
      let idx;
      if (spec.mode === "fy") {
        g = m >= 7 ? y + 1 : y;
        idx = m >= 7 ? m - 7 : m + 5;
      } else {
        g = y;
        idx = m - 1;
      }
      (groups[g] = groups[g] || Array(12).fill(null))[idx] = v;
    }
    const gs = Object.keys(groups).sort().slice(-3);
    const cols = gs.length === 3 ? ["--g2", "--g1", "--s1"] : ["--g1", "--s1"];
    const order =
      spec.mode === "fy"
        ? [6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5]
        : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const fyPrefix = spec.mode === "fy" ? (lang === "es" ? "AF" : "FY") : "";
    const { title, sub } = chartCopy(spec, chartId, s.origin, lang);
    return {
      id: chartId,
      spec,
      title,
      sub,
      cats: order.map((i) => MONTHS[lang][i]),
      full: order.map((i) => MONTHS[lang][i]),
      keys: order,
      series: gs.map((g, i) => ({
        name: `${fyPrefix}${g}`,
        color: cols[i] || "--s1",
        vals: groups[g],
        emph: i === gs.length - 1,
        origin: s.origin,
      })),
      src: s.src,
      url: s.url,
      freq: s.freq,
      lastKey: lastObs(s.o)?.[0] || null,
      cat: true,
      line: true,
      origin: s.origin,
      lives: s.live ? [s.live] : [],
    };
  }

  // line / col / stacked
  const resolved = spec.series.map((sp) =>
    (sp.refs || [sp.ref])
      .map((ref) => resolveSeries(board, ref, chartId))
      .filter(Boolean),
  );
  const firstResolved = resolved[0]?.[0];
  if (!firstResolved) return emptyModel(board, chartId, spec, lang);

  const keySet = new Set();
  for (const group of resolved)
    for (const s of group) for (const [k] of s.o) keySet.add(k);
  if (spec.extra) for (const [k] of spec.extra) keySet.add(k);
  let keys = [...keySet].sort();
  if (
    spec.range !== false &&
    /month/.test(firstResolved.freq) &&
    keys.length > 30
  ) {
    keys = applyRange(keys, range);
  }
  const scale = spec.scale || 1;
  const series = spec.series.map((sp, i) => {
    const maps = resolved[i].map((s) => new Map(s.o));
    if (spec.extra && i === 0 && maps[0]) {
      for (const [k, v] of spec.extra) maps[0].set(k, v);
    }
    return {
      name: L(sp.n, lang),
      color: COLORS[i],
      origin: combineOrigins(resolved[i].map((s) => s.origin)),
      vals: keys.map((k) => {
        let total = 0;
        let ok = false;
        for (const map of maps) {
          const v = map.get(k);
          if (v != null) {
            total += v;
            ok = true;
          }
        }
        return ok ? total * scale : null;
      }),
    };
  });

  const origin = combineOrigins(resolved.flat().map((s) => s.origin));
  const lives = [];
  for (const s of resolved.flat()) {
    if (s.live && !lives.includes(s.live)) lives.push(s.live);
  }
  const { title, sub } = chartCopy(spec, chartId, origin, lang);
  return {
    id: chartId,
    spec,
    title,
    sub,
    cats: keys.map((k) => per(k, lang, true)),
    full: keys.map((k) => per(k, lang)),
    keys,
    series,
    src: firstResolved.src,
    url: firstResolved.url,
    freq: firstResolved.freq,
    lastKey: lastObs(firstResolved.o)?.[0] || null,
    proj: spec.proj || [],
    origin,
    lives,
  };
}

function emptyModel(board, chartId, spec, lang) {
  const { title, sub } = chartCopy(spec, chartId, "none", lang);
  const firstRef = spec.ref || spec.series?.[0]?.ref;
  const sourceKey = SERIES_LIVE[firstRef];
  return {
    id: chartId,
    spec,
    title,
    sub,
    cats: [],
    keys: [],
    series: [],
    origin: "none",
    lives: [],
    empty: true,
    liveIndicator: sourceKey ? LIVE_SOURCES[sourceKey].indicator : null,
  };
}

// ----------------------------------------------------------------- tiles

const DIR_SYMBOL = { up: "▲", down: "▼", flat: "●" };

function deltaClass(dir, good) {
  if (good == null) return "flat";
  return (dir === "up") === good ? "up" : "down";
}

function fixedValue(spec, board, lang) {
  const { series, facts } = board.fixed.data;
  if (!spec) return "—";
  if (spec.s) {
    const last = series[spec.s] ? lastObs(series[spec.s].o) : null;
    return last ? fmt(last[1], spec.fmt, lang) : "—";
  }
  if (spec.f) {
    const raw = facts[spec.f]?.[spec.key || "v"];
    if (raw == null) return "—";
    return fmt(raw * (spec.mul || 1), spec.fmt, lang) + (spec.suffix || "");
  }
  if (spec.num != null)
    return fmt(spec.num, spec.fmt, lang) + (spec.suffix || "");
  return "—";
}

function fixedDeltaX(x, board, lang) {
  if (!x) return "";
  const { series, facts } = board.fixed.data;
  if (x.yoy) {
    const o = series[x.yoy]?.o || [];
    const a = o[o.length - 1];
    const b = o[o.length - 1 - x.lag];
    return a && b && a[1] != null && b[1] != null
      ? signedPct((a[1] / b[1] - 1) * 100, lang)
      : "—";
  }
  if (x.ago) {
    const o = nonNull(series[x.ago]?.o || []);
    const point = o[o.length - 1 - x.lag];
    return point ? fmt(point[1], x.fmt, lang) : "—";
  }
  if (x.f) {
    const raw = facts[x.f]?.[x.key || "v"];
    if (raw == null) return "—";
    return x.as === "sg" ? signedPct(raw, lang) : fmt(raw, x.as, lang);
  }
  return "";
}

function sparkValues(o, n) {
  const values = nonNull(o)
    .slice(-(n || 36))
    .map((pair) => pair[1]);
  return values.length > 1 ? values : null;
}

function resolveFixedTile(def, board, lang) {
  const { series } = board.fixed.data;
  const k =
    typeof def.k === "string"
      ? def.k
      : lastObs(series[def.k?.last]?.o || [])?.[0];
  return {
    id: def.id,
    label: L(def.l, lang),
    value: fixedValue(def.v, board, lang),
    delta: def.d
      ? {
          text: fill(L(def.d.t, lang), {
            x: fixedDeltaX(def.d.x, board, lang),
          }),
          cls: deltaClass(def.dir, def.good),
          sym: DIR_SYMBOL[def.dir || "flat"],
        }
      : null,
    spark:
      def.spark && series[def.spark]
        ? sparkValues(series[def.spark].o, def.sn)
        : null,
    stamp: { key: k, freq: def.freq, src: def.src, force: def.force },
    origin: "fixed",
    live: null,
    open: def.open || null,
  };
}

function resolveLiveTile(def, cfg, live, lang) {
  const o = nonNull(live.o);
  const [k, v] = o[o.length - 1];
  const prev = new Map(o).get(yearAgoKey(k));
  let delta = null;
  if (cfg.delta !== "none" && prev != null) {
    const change = cfg.delta === "yoy" ? (v / prev - 1) * 100 : v - prev;
    const dir = Math.abs(change) < 1e-9 ? "flat" : change > 0 ? "up" : "down";
    const good =
      live.higherIs === "positive"
        ? true
        : live.higherIs === "negative"
          ? false
          : null;
    let text;
    if (cfg.delta === "yoy") {
      text = fill(L(UI.vsYearAgo, lang), { x: signedPct(change, lang) });
    } else {
      const template =
        dir === "up" ? UI.upFrom : dir === "down" ? UI.downFrom : UI.sameAs;
      text = fill(L(template, lang), { x: fmt(prev, cfg.fmt, lang) });
    }
    delta = {
      text,
      cls: dir === "flat" ? "flat" : deltaClass(dir, good),
      sym: DIR_SYMBOL[dir],
    };
  }
  const label = cfg.label
    ? fill(L(cfg.label, lang), { month: per(k, lang), period: per(k, lang) })
    : L(def.l, lang);
  return {
    id: def.id,
    label,
    value: fmt(v, cfg.fmt, lang),
    delta,
    spark: sparkValues(o, def.sn),
    stamp: { key: k, freq: live.frequency, src: shortSrc(live.source) },
    origin: "live",
    live,
    open: cfg.open || def.open || null,
  };
}

/** Resolve a KPI tile: live when mapped and usable, otherwise fixed. */
export function resolveTile(def, board, lang) {
  const cfg = TILE_LIVE[def.id];
  const live = cfg ? board.sources[cfg.source] : null;
  if (cfg && live) return resolveLiveTile(def, cfg, live, lang);
  return resolveFixedTile(def, board, lang);
}

// -------------------------------------------------------------- stamps

export function stampText(stamp, lang) {
  if (!stamp?.key) return null;
  const fresh = freshness(stamp.key, stamp.freq, stamp.force);
  return {
    fresh,
    text: [L(UI.fresh[fresh], lang), per(stamp.key, lang), stamp.src]
      .filter(Boolean)
      .join(" · "),
  };
}

// ------------------------------------------------------------ methodology

/** Latest period of a live indicator entry, as a display label. */
export function liveEntryPeriod(entry, lang) {
  const date = entry?.latest?.date;
  if (!date) return "—";
  const config = Object.values(LIVE_SOURCES).find(
    (s) => s.indicator === entry.id,
  );
  return per(liveKey(date, entry.frequency, config?.periodKey), lang);
}

/** One row per chart: title, origin, source, latest period, freshness. */
export function methodologyRows(board, lang) {
  const rows = [];
  for (const chartId of Object.keys(board.fixed.charts)) {
    const spec = board.fixed.charts[chartId];
    if (spec.h) continue;
    const model = chartModel(board, chartId, lang, "max");
    if (!model) continue;
    const source =
      model.origin === "live"
        ? [...new Set(model.lives.map((live) => live.source))].join("; ")
        : model.origin === "mixed"
          ? [
              ...new Set([
                ...model.lives.map((live) => live.source),
                model.src,
              ]),
            ].join("; ")
          : model.src || "—";
    rows.push({
      id: chartId,
      title: model.title,
      origin: model.origin,
      source,
      latest: model.lastKey
        ? per(model.lastKey, lang)
        : model.periodLabel || "—",
      fresh: model.lastKey
        ? freshness(model.lastKey, model.freq, spec.force)
        : null,
      url: model.url,
    });
  }
  return rows;
}
