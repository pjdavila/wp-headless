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
 * One slot of the six-indicator KPI strip. Compact financial density:
 * big number, direction + change, period, sparkline, source. Pending or
 * failed sources get an explicit state instead of a number.
 */
export default function KpiCard({ entry }) {
  const {
    id,
    shortName,
    unit,
    frequency,
    source,
    status,
    stale,
    staleReason,
    latest,
    observations,
  } = entry;

  // A failed refresh keeps serving last-good data (with the badge),
  // never hides it — only a source with NO usable data falls through
  // to the pending/unavailable state.
  const hasData = Boolean(latest) && (status === "ok" || status === "error");
  const change = hasData ? formatChange(latest, unit) : null;
  const sparkPoints = (observations || []).slice(-24);

  return (
    <Link href={indicatorPath(id)} className={styles.kpiCard}>
      <span className={styles.kpiHeader}>
        <span className={styles.kpiName}>{shortName}</span>
        {status === "pending" && (
          <span className={styles.badgePending}>Data pending</span>
        )}
        {status === "error" && (
          <span className={styles.badgeStale}>Source error</span>
        )}
        {hasData && stale && <span className={styles.badgeStale}>Stale</span>}
      </span>

      {hasData ? (
        <>
          <span className={styles.kpiValueRow}>
            <span className={styles.kpiValue}>
              {formatValue(latest.value, unit)}
            </span>
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
                <span className="sr-only">
                  {directionWord(change.direction)}{" "}
                </span>
                {change.text}
              </span>
            )}
          </span>
          <span className={styles.kpiPeriod}>
            {formatPeriod(latest.date, frequency)}
            {latest.preliminary ? " · preliminar" : ""}
          </span>
          <span className={styles.kpiSpark} aria-hidden="true">
            <Sparkline points={sparkPoints} width={200} height={40} />
          </span>
          <span className={styles.kpiSource}>
            Fuente: {source}
            {staleReason === "refresh-failed" && " · último dato válido"}
          </span>
        </>
      ) : (
        <>
          <span className={styles.kpiPending}>
            {status === "pending"
              ? "Fuente en integración"
              : "Sin datos disponibles"}
          </span>
          <span className={styles.kpiPeriod}>
            {status === "pending"
              ? "La fuente oficial publica en PDF/Excel; la conexión automática está en desarrollo."
              : "El último intento de actualización falló."}
          </span>
          <span className={styles.kpiSource}>Fuente: {source}</span>
        </>
      )}
    </Link>
  );
}
