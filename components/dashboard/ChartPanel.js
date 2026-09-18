import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { formatValue, formatPeriod } from "../../lib/economy/format";
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
 * Historical chart with indicator picker, 1Y/3Y/5Y/10Y/MAX ranges and a
 * raw/YoY toggle. Every control is a real button/select (keyboard
 * accessible) and a plain-text summary always accompanies the canvas.
 */
export default function ChartPanel({ indicators }) {
  const chartable = useMemo(
    () =>
      indicators.filter(
        (entry) =>
          (entry.status === "ok" || entry.status === "error") &&
          (entry.observations || []).length > 1,
      ),
    [indicators],
  );

  const [selectedId, setSelectedId] = useState("unemployment-rate");
  const [range, setRange] = useState("5Y");
  const [mode, setMode] = useState("raw");

  const entry =
    chartable.find((item) => item.id === selectedId) || chartable[0];

  const prepared = useMemo(() => {
    if (!entry) return null;
    const all = entry.observations;
    const latestDate = all[all.length - 1]?.date;
    const cutoff = cutoffDate(range, latestDate);
    const ranged = cutoff ? all.filter((p) => p.date >= cutoff) : all;

    if (mode === "yoy") {
      const points = ranged
        .filter((p) =>
          entry.unit === "percent"
            ? p.yoyChange !== undefined && p.yoyChange !== null
            : p.yoyChangePct !== undefined && p.yoyChangePct !== null,
        )
        .map((p) => ({
          date: p.date,
          value: entry.unit === "percent" ? p.yoyChange : p.yoyChangePct,
        }));
      return { points, unit: "percent" };
    }
    return {
      points: ranged.map((p) => ({ date: p.date, value: p.value })),
      unit: entry.unit,
    };
  }, [entry, range, mode]);

  if (!entry || !prepared) {
    return (
      <section className={styles.chartSection} aria-labelledby="history-title">
        <h2 id="history-title" className={styles.sectionTitle}>
          Historial
        </h2>
        <p className={styles.sectionSub}>
          Todavía no hay series con datos suficientes para graficar.
        </p>
      </section>
    );
  }

  const { points, unit } = prepared;
  const first = points[0];
  const last = points[points.length - 1];
  const values = points.map((p) => p.value);
  const maxPoint = points.find((p) => p.value === Math.max(...values));
  const minPoint = points.find((p) => p.value === Math.min(...values));
  const formatY = (value) => formatValue(value, unit);

  const title = `${entry.name}${mode === "yoy" ? " — cambio interanual" : ""}`;

  return (
    <section className={styles.chartSection} aria-labelledby="history-title">
      <div className={styles.chartHeader}>
        <div>
          <h2 id="history-title" className={styles.sectionTitle}>
            Historial
          </h2>
          <p className={styles.sectionSub}>
            {entry.name} · Fuente: {entry.source}
          </p>
        </div>
        <div className={styles.chartControls}>
          <label className={styles.chartSelectLabel}>
            <span className="sr-only">Indicador</span>
            <select
              className={styles.chartSelect}
              value={entry.id}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {chartable.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.shortName}
                </option>
              ))}
            </select>
          </label>
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
          Entre {formatPeriod(first.date, entry.frequency)} y{" "}
          {formatPeriod(last.date, entry.frequency)}, {entry.shortName} pasó de{" "}
          {formatY(first.value)} a {formatY(last.value)}. Máximo del período:{" "}
          {formatY(maxPoint.value)} (
          {formatPeriod(maxPoint.date, entry.frequency)}); mínimo:{" "}
          {formatY(minPoint.value)} (
          {formatPeriod(minPoint.date, entry.frequency)}).
          {mode === "yoy" &&
            (entry.unit === "percent"
              ? " Valores en puntos porcentuales de cambio interanual."
              : " Valores en cambio porcentual interanual.")}
        </p>
      )}
    </section>
  );
}
