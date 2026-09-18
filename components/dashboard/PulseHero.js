import { useState } from "react";
import Sparkline from "./Sparkline";
import DirectionArrow, { directionWord } from "./DirectionArrow";
import { formatPeriod } from "../../lib/economy/format";
import styles from "../../styles/dashboard.module.css";

/**
 * CB Economic Pulse hero. The score comes from lib/economy/pulse.js, whose
 * header comment is the canonical methodology; the UI surfaces a summary of
 * it plus the live contributor weights so the number is never a black box.
 */
export default function PulseHero({ pulse }) {
  const [showMethodology, setShowMethodology] = useState(false);

  if (!pulse || !pulse.ok) {
    return (
      <section className={styles.pulse} aria-label="CB Economic Pulse">
        <div className={styles.pulseTop}>
          <span className={styles.pulseBadge}>
            CB Economic Pulse — Experimental
          </span>
        </div>
        <p className={styles.pulseUnavailable}>
          El índice no se publica ahora mismo: menos de{" "}
          {pulse?.reason === "insufficient-contributors"
            ? "tres"
            : "suficientes"}{" "}
          indicadores contribuyentes tienen datos actualizados. El Pulso solo se
          calcula con datos reales y vigentes — nunca con estimaciones.
        </p>
      </section>
    );
  }

  const changeDirection =
    pulse.change === null
      ? "flat"
      : pulse.change > 0
        ? "up"
        : pulse.change < 0
          ? "down"
          : "flat";

  return (
    <section className={styles.pulse} aria-label="CB Economic Pulse">
      <div className={styles.pulseTop}>
        <span className={styles.pulseBadge}>
          CB Economic Pulse — Experimental
        </span>
        <span className={styles.pulseAsOf}>
          Datos al {formatPeriod(pulse.asOf, "monthly")}
        </span>
      </div>

      <div className={styles.pulseMain}>
        <div className={styles.pulseScoreBlock}>
          <span className={styles.pulseScore}>{pulse.score}</span>
          <span className={styles.pulseScale}>/100</span>
          {pulse.change !== null && (
            <span
              className={`${styles.kpiChange} ${
                changeDirection === "up"
                  ? styles.changeUp
                  : changeDirection === "down"
                    ? styles.changeDown
                    : styles.changeFlat
              }`}
            >
              <DirectionArrow direction={changeDirection} />
              <span className="sr-only">{directionWord(changeDirection)} </span>
              {pulse.change > 0 ? "+" : pulse.change < 0 ? "−" : ""}
              {Math.abs(pulse.change)} pts vs. mes anterior
            </span>
          )}
          <span className={styles.pulseLabel}>{pulse.label}</span>
        </div>
        <div className={styles.pulseSpark} aria-hidden="true">
          <Sparkline
            points={pulse.history.map((h) => h.score)}
            width={420}
            height={120}
            strokeWidth={2}
          />
        </div>
      </div>

      <div className={styles.pulseMeta}>
        <p className={styles.pulseMethod}>
          Compuesto experimental de {pulse.contributors.length} indicadores
          normalizados (z-score interanual, ponderado).{" "}
          <button
            type="button"
            className={styles.methodToggle}
            onClick={() => setShowMethodology((v) => !v)}
            aria-expanded={showMethodology}
          >
            {showMethodology ? "Ocultar metodología" : "Ver metodología"}
          </button>
        </p>
        {showMethodology && (
          <div className={styles.methodology}>
            <p>
              Cada indicador se compara contra su propia historia reciente
              (z-score del cambio interanual, limitado a ±2 desviaciones), se
              ajusta por dirección (p. ej. una baja del desempleo suma) y se
              pondera. 50 es neutral; por encima, expansión. Los pesos se
              renormalizan automáticamente sobre los indicadores con datos
              vigentes — si una fuente se atrasa o falla, sale del cálculo en
              lugar de arrastrar datos viejos.
            </p>
            <ul>
              {pulse.contributors.map((c) => (
                <li key={c.id}>
                  {c.name} — peso {(c.weight * 100).toFixed(0)}%
                  {c.direction === "down" ? " (baja = positivo)" : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
