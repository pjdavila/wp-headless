import Link from "next/link";
import Sparkline from "./Sparkline";
import DirectionArrow, { directionWord } from "./DirectionArrow";
import {
  formatValue,
  formatChange,
  formatPeriod,
} from "../../lib/economy/format";
import { indicatorPath } from "../../lib/economy/dashboardConfig";
import styles from "../../styles/dashboard.module.css";

/**
 * Compact KPI row for a section page: name + source, latest value with MoM
 * change, sparkline, chevron. The whole row is the link to the indicator
 * detail page. Pending/error sources get explicit states — never a number.
 */
export default function IndicatorRow({ entry }) {
  const {
    id,
    name,
    unit,
    frequency,
    source,
    status,
    stale,
    staleReason,
    latest,
    observations,
  } = entry;

  const hasData = Boolean(latest) && (status === "ok" || status === "error");
  const change = hasData ? formatChange(latest, unit) : null;
  const sparkPoints = (observations || []).slice(-24);

  return (
    <Link href={indicatorPath(id)} className={styles.indicatorRow}>
      <span className={styles.rowMain}>
        <span className={styles.rowName}>
          {name}
          {status === "pending" && (
            <span className={styles.badgePending}>Data pending</span>
          )}
          {status === "error" && (
            <span className={styles.badgeStale}>Source error</span>
          )}
          {hasData && stale && status === "ok" && (
            <span className={styles.badgeStale}>Stale</span>
          )}
        </span>
        <span className={styles.rowMeta}>Fuente: {source}</span>
      </span>

      {hasData ? (
        <span className={styles.rowValueBlock}>
          <span className={styles.rowValue}>{formatValue(latest.value, unit)}</span>
          <span className={styles.rowMeta}>
            {change && (
              <span
                className={`${styles.kpiChange} ${
                  change.direction === "up"
                    ? styles.changeUp
                    : change.direction === "down"
                      ? styles.changeDown
                      : styles.changeFlat
                }`}
              >
                <DirectionArrow direction={change.direction} />
                <span className="sr-only">{directionWord(change.direction)} </span>
                {change.text}
              </span>
            )}{" "}
            · {formatPeriod(latest.date, frequency)}
            {latest.preliminary ? " · preliminar" : ""}
            {staleReason === "refresh-failed" ? " · último dato válido" : ""}
          </span>
        </span>
      ) : (
        <span className={styles.rowValueBlock}>
          <span className={styles.rowPending}>
            {status === "pending" ? "Fuente en integración" : "Sin datos disponibles"}
          </span>
        </span>
      )}

      <span className={styles.rowSpark} aria-hidden="true">
        {hasData && <Sparkline points={sparkPoints} width={120} height={34} />}
      </span>

      <span className={styles.rowChevron} aria-hidden="true">
        ›
      </span>
    </Link>
  );
}
