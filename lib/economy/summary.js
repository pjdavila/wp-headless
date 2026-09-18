import { formatValue, formatPeriod, formatPointChange } from "./format.js";
import { previousPeriodDate, yearAgoDate } from "./calculations.js";

/**
 * Deterministic "Qué significa" copy for an indicator detail page.
 *
 * Every sentence is computed from the observations themselves — direction,
 * magnitude and period comparisons — with no editorializing and no external
 * text. Returns an array of sentences; empty when there is not enough data
 * to say anything factual.
 *
 * @param {import("./types").Indicator} indicator
 * @param {Array} points  One series of observations, ascending, with MoM/YoY
 *                        calculations applied.
 */
export function buildWhatItMeans(indicator, points) {
  const series = (points || []).filter((point) => Number.isFinite(point.value));
  if (series.length < 2) return [];

  const latest = series[series.length - 1];
  const unit = indicator.unit;
  const frequency = indicator.frequency;
  const sentences = [];

  // 1. Latest reading + movement vs the previous period.
  const period = formatPeriod(latest.date, frequency);
  const valueText = formatValue(latest.value, unit);
  const mom = formatPointChange(latest, unit, "mom");
  let first = `En ${period}, ${indicator.name} se ubicó en ${valueText}`;
  if (mom) {
    const previousPeriod = formatPeriod(
      previousPeriodDate(latest.date, frequency),
      frequency,
    );
    const move =
      mom.direction === "up"
        ? `un aumento de ${mom.text.replace(/^\+/, "")}`
        : mom.direction === "down"
          ? `una disminución de ${mom.text.replace(/^−/, "")}`
          : "sin cambios";
    first += ` — ${move} frente a ${previousPeriod}.`;
  } else {
    first += ".";
  }
  sentences.push(first);

  // 2. Comparison vs the same period one year earlier.
  const yoy = formatPointChange(latest, unit, "yoy");
  if (yoy) {
    const yearAgoPeriod = formatPeriod(yearAgoDate(latest.date), frequency);
    const verb =
      yoy.direction === "up"
        ? `aumentó ${yoy.text.replace(/^\+/, "")}`
        : yoy.direction === "down"
          ? `disminuyó ${yoy.text.replace(/^−/, "")}`
          : `se mantuvo prácticamente estable (${yoy.text})`;
    sentences.push(`Comparado con ${yearAgoPeriod}, ${verb}.`);
  }

  // 3. Context: range of the last twelve periods.
  const recent = series.slice(-12);
  if (recent.length >= 4) {
    const maxPoint = recent.reduce((a, b) => (b.value > a.value ? b : a));
    const minPoint = recent.reduce((a, b) => (b.value < a.value ? b : a));
    if (maxPoint.date !== minPoint.date) {
      sentences.push(
        `En los últimos ${recent.length} períodos osciló entre ` +
          `${formatValue(minPoint.value, unit)} (${formatPeriod(minPoint.date, frequency)}) y ` +
          `${formatValue(maxPoint.value, unit)} (${formatPeriod(maxPoint.date, frequency)}).`,
      );
    }
  }

  return sentences;
}
