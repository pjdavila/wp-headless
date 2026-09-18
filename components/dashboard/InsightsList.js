import DirectionArrow, { directionWord } from "./DirectionArrow";
import { formatValue, formatPeriod } from "../../lib/economy/format";
import styles from "../../styles/dashboard.module.css";

const WINDOW_WORDS = {
  annual: "años",
  quarterly: "trimestres",
  monthly: "meses",
};

function windowPhrase(insight) {
  const size = insight.windowSize || 12;
  const word = WINDOW_WORDS[insight.frequency] || "períodos";
  return `${size} ${word}`;
}

function typeTag(insight) {
  switch (insight.type) {
    case "yoy-mover":
      return "Interanual";
    case "12m-high":
      return `Máximo ${windowPhrase(insight)}`;
    case "12m-low":
      return `Mínimo ${windowPhrase(insight)}`;
    case "reversal":
      return "Cambio de tendencia";
    default:
      return insight.type;
  }
}

function insightText(insight) {
  const period = formatPeriod(insight.period, insight.frequency || "monthly");
  switch (insight.type) {
    case "yoy-mover": {
      const isPp = insight.unit === "percent";
      const magnitude = isPp
        ? Math.abs(insight.yoyChange).toFixed(1)
        : Math.abs(insight.yoyChangePct).toFixed(1);
      const verb = insight.direction === "up" ? "subió" : "bajó";
      return `${insight.indicatorName} ${verb} ${magnitude}${isPp ? " pp" : "%"} interanual (${period}).`;
    }
    case "12m-high":
      return `${insight.indicatorName} en su nivel más alto de los últimos ${windowPhrase(insight)}: ${formatValue(insight.value, insight.unit)} (${period}).`;
    case "12m-low":
      return `${insight.indicatorName} en su nivel más bajo de los últimos ${windowPhrase(insight)}: ${formatValue(insight.value, insight.unit)} (${period}).`;
    case "reversal": {
      const recent =
        insight.direction === "up"
          ? "tres alzas consecutivas"
          : "tres bajas consecutivas";
      const prior =
        insight.direction === "up"
          ? "tres bajas previas"
          : "tres alzas previas";
      return `${insight.indicatorName} cambió de tendencia: ${recent} tras ${prior} (${period}).`;
    }
    default:
      return "";
  }
}

/**
 * "What's Moving Puerto Rico" — deterministic, auto-generated insights
 * (see lib/economy/insights.js). Each item cites its indicator and period.
 */
export default function InsightsList({ insights }) {
  if (!insights || insights.length === 0) return null;

  return (
    <section className={styles.insights} aria-labelledby="whats-moving">
      <h2 id="whats-moving" className={styles.sectionTitle}>
        What&rsquo;s Moving Puerto Rico
      </h2>
      <p className={styles.sectionSub}>
        Señales generadas automáticamente a partir de las observaciones
        almacenadas — mismos datos, mismas conclusiones.
      </p>
      <ol className={styles.insightList}>
        {insights.map((insight) => (
          <li
            key={`${insight.type}-${insight.indicatorId}`}
            className={styles.insightItem}
          >
            <span className={styles.insightBody}>
              <span
                className={`${styles.insightDir} ${
                  insight.sentiment === "positive"
                    ? styles.changeUp
                    : insight.sentiment === "negative"
                      ? styles.changeDown
                      : styles.changeFlat
                }`}
              >
                <DirectionArrow direction={insight.direction} />
                <span className="sr-only">
                  {directionWord(insight.direction)}
                </span>
              </span>
              <span>{insightText(insight)}</span>
            </span>
            <span className={styles.insightTag}>{typeTag(insight)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
