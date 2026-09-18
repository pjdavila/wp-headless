import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  formatValue,
  formatPeriod,
  formatPpChange,
} from "../../lib/economy/format";
import styles from "../../styles/dashboard.module.css";

// ECharts loads after first paint; the controls and the accessible summary
// render immediately regardless.
const EconomicChart = dynamic(() => import("./EconomicChart"), {
  ssr: false,
  loading: () => (
    <div className={styles.chartSkeleton} aria-hidden="true">
      Cargando gráfica…
    </div>
  ),
});

const RANGES = [
  { key: "1Y", years: 1 },
  { key: "3Y", years: 3 },
  { key: "5Y", years: 5 },
  { key: "10Y", years: 10 },
  { key: "MAX", years: null },
];

function cutoffDate(rangeKey, latestDate) {
  const range = RANGES.find((r) => r.key === rangeKey);
  if (!range || !range.years || !latestDate) return null;
  const [year, ...rest] = latestDate.split("-");
  return `${Number(year) - range.years}-${rest.join("-")}`;
}

/**
 * Historical chart for an indicator detail page: one series of observations
 * (already filtered by the page's series selector), 1Y/3Y/5Y/10Y/MAX ranges
 * and a raw/YoY toggle. A plain-text summary always accompanies the canvas.
 */
export default function IndicatorChart({ indicator, observations, seriesLabel }) {
  const [range, setRange] = useState("5Y");
  const [mode, setMode] = useState("raw");

  const prepared = useMemo(() => {
    const all = (observations || []).filter((point) =>
      Number.isFinite(point.value),
    );
    if (all.length === 0) return null;
    const latestDate = all[all.length - 1]?.date;
    const cutoff = cutoffDate(range, latestDate);
    const ranged = cutoff ? all.filter((p) => p.date >= cutoff) : all;

    if (mode === "yoy") {
      // Percent-unit indicators chart the ABSOLUTE YoY difference, which is
      // a percentage-point movement — format axes/tooltips as pp, never %.
      const isPp = indicator.unit === "percent";
      const points = ranged
        .filter((p) =>
          isPp
            ? p.yoyChange !== undefined && p.yoyChange !== null
            : p.yoyChangePct !== undefined && p.yoyChangePct !== null,
        )
        .map((p) => ({
          date: p.date,
          value: isPp ? p.yoyChange : p.yoyChangePct,
        }));
      return { points, unit: isPp ? "pp" : "percent", isPp, count: all.length };
    }
    return {
      points: ranged.map((p) => ({ date: p.date, value: p.value })),
      unit: indicator.unit,
      isPp: false,
      count: all.length,
    };
  }, [indicator, observations, range, mode]);

  const heading = seriesLabel
    ? `${indicator.name} — ${seriesLabel}`
    : indicator.name;

  if (!prepared || prepared.points.length < 2) {
    return (
      <section className={styles.chartSection} aria-labelledby="indicator-history">
        <h2 id="indicator-history" className={styles.sectionTitle}>
          Historial
        </h2>
        <p className={styles.sectionSub}>
          Todavía no hay datos suficientes de esta serie para graficar.
        </p>
      </section>
    );
  }

  const { points, unit, isPp } = prepared;
  const first = points[0];
  const last = points[points.length - 1];
  const values = points.map((p) => p.value);
  const maxPoint = points.find((p) => p.value === Math.max(...values));
  const minPoint = points.find((p) => p.value === Math.min(...values));
  const formatY = (value) =>
    isPp ? formatPpChange(value) : formatValue(value, unit);

  const title = `${heading}${mode === "yoy" ? " — cambio interanual" : ""}`;

  return (
    <section className={styles.chartSection} aria-labelledby="indicator-history">
      <div className={styles.chartHeader}>
        <div>
          <h2 id="indicator-history" className={styles.sectionTitle}>
            Historial
          </h2>
          <p className={styles.sectionSub}>
            {heading} · Fuente: {indicator.source}
          </p>
        </div>
        <div className={styles.chartControls}>
          <div
            className={styles.rangeGroup}
            role="group"
            aria-label="Rango de tiempo"
          >
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                className={`${styles.rangeBtn} ${range === r.key ? styles.rangeBtnActive : ""}`}
                aria-pressed={range === r.key}
                onClick={() => setRange(r.key)}
              >
                {r.key}
              </button>
            ))}
          </div>
          <div
            className={styles.rangeGroup}
            role="group"
            aria-label="Modo de valores"
          >
            <button
              type="button"
              className={`${styles.rangeBtn} ${mode === "raw" ? styles.rangeBtnActive : ""}`}
              aria-pressed={mode === "raw"}
              onClick={() => setMode("raw")}
            >
              Nivel
            </button>
            <button
              type="button"
              className={`${styles.rangeBtn} ${mode === "yoy" ? styles.rangeBtnActive : ""}`}
              aria-pressed={mode === "yoy"}
              onClick={() => setMode("yoy")}
            >
              Interanual
            </button>
          </div>
        </div>
      </div>

      <EconomicChart title={title} points={points} formatY={formatY} />

      {points.length > 1 && (
        <p className={styles.chartSummary}>
          Entre {formatPeriod(first.date, indicator.frequency)} y{" "}
          {formatPeriod(last.date, indicator.frequency)}, {heading} pasó de{" "}
          {formatY(first.value)} a {formatY(last.value)}. Máximo del período:{" "}
          {formatY(maxPoint.value)} (
          {formatPeriod(maxPoint.date, indicator.frequency)}); mínimo:{" "}
          {formatY(minPoint.value)} (
          {formatPeriod(minPoint.date, indicator.frequency)}).
          {mode === "yoy" &&
            (indicator.unit === "percent"
              ? " Valores en puntos porcentuales de cambio interanual."
              : " Valores en cambio porcentual interanual.")}
        </p>
      )}
    </section>
  );
}
