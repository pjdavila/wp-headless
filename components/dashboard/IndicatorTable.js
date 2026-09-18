import { useState } from "react";
import DirectionArrow, { directionWord } from "./DirectionArrow";
import {
  formatValue,
  formatPeriod,
  formatPointChange,
} from "../../lib/economy/format";
import styles from "../../styles/dashboard.module.css";

const PAGE_SIZE = 24;

function ChangeCell({ point, unit, kind }) {
  const change = formatPointChange(point, unit, kind);
  if (!change) {
    return <td className={styles.numCell}>—</td>;
  }
  return (
    <td
      className={`${styles.numCell} ${
        change.direction === "up"
          ? styles.changeUp
          : change.direction === "down"
            ? styles.changeDown
            : styles.changeFlat
      }`}
    >
      <DirectionArrow direction={change.direction} />{" "}
      <span className="sr-only">{directionWord(change.direction)} </span>
      {change.text}
    </td>
  );
}

/**
 * Accessible historical data table for an indicator detail page:
 * Date / Value / MoM / YoY, most recent period first. Shows the last 24
 * periods with a toggle for the full history. MoM/YoY cells use an arrow
 * glyph plus text, never color alone.
 */
export default function IndicatorTable({ indicator, observations }) {
  const [showAll, setShowAll] = useState(false);

  const rows = [...(observations || [])]
    .filter((point) => Number.isFinite(point.value))
    .reverse();

  if (rows.length === 0) return null;

  const visible = showAll ? rows : rows.slice(0, PAGE_SIZE);

  return (
    <section className={styles.chartSection} aria-labelledby="indicator-table-title">
      <h2 id="indicator-table-title" className={styles.sectionTitle}>
        Datos históricos
      </h2>
      <p className={styles.sectionSub}>
        {indicator.name} · {rows.length} períodos publicados
      </p>

      <div className={styles.dataTableWrap}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col" className={styles.numCell}>
                Valor
              </th>
              <th scope="col" className={styles.numCell}>
                Vs. período anterior
              </th>
              <th scope="col" className={styles.numCell}>
                Vs. hace un año
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((point) => (
              <tr key={`${point.date}-${point.series || ""}`}>
                <td>
                  {formatPeriod(point.date, indicator.frequency)}
                  {point.preliminary ? " · preliminar" : ""}
                </td>
                <td className={styles.numCell}>
                  {formatValue(point.value, indicator.unit)}
                </td>
                <ChangeCell point={point} unit={indicator.unit} kind="mom" />
                <ChangeCell point={point} unit={indicator.unit} kind="yoy" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > PAGE_SIZE && (
        <button
          type="button"
          className={styles.showMoreBtn}
          onClick={() => setShowAll((value) => !value)}
        >
          {showAll
            ? "Mostrar solo los últimos 24 períodos"
            : `Ver historial completo (${rows.length} períodos)`}
        </button>
      )}
    </section>
  );
}
