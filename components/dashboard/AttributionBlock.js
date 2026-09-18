import { formatPeriod, formatTimestamp } from "../../lib/economy/format";
import styles from "../../styles/dashboard.module.css";

const FREQUENCY_LABELS = {
  daily: "Diaria",
  weekly: "Semanal",
  monthly: "Mensual",
  quarterly: "Trimestral",
  annual: "Anual",
};

/**
 * About / methodology / attribution block for an indicator detail page.
 * Renders even when the source is pending — the registry metadata is real
 * and linkable regardless of data status. Source links out to the official
 * government publisher; "Actualizado" is the latest published period and
 * "Obtenido" is when we last retrieved the source.
 */
export default function AttributionBlock({ indicator, entry }) {
  const latest = entry?.latest || null;
  const retrievedAt = entry?.retrievedAt || null;

  return (
    <section className={styles.chartSection} aria-labelledby="indicator-about">
      <h2 id="indicator-about" className={styles.sectionTitle}>
        Acerca de este indicador
      </h2>
      <p className={styles.aboutText}>{indicator.description}</p>

      <dl className={styles.attribGrid}>
        <div className={styles.attribItem}>
          <dt>Fuente</dt>
          <dd>
            {indicator.sourceUrl ? (
              <a
                href={indicator.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.attribLink}
              >
                {indicator.source}
              </a>
            ) : (
              indicator.source
            )}
          </dd>
        </div>
        <div className={styles.attribItem}>
          <dt>Actualizado</dt>
          <dd>
            {latest
              ? `${formatPeriod(latest.date, indicator.frequency)} (período más reciente publicado)`
              : "Sin datos publicados aún"}
          </dd>
        </div>
        <div className={styles.attribItem}>
          <dt>Obtenido</dt>
          <dd>{retrievedAt ? formatTimestamp(retrievedAt) : "—"}</dd>
        </div>
        <div className={styles.attribItem}>
          <dt>Frecuencia</dt>
          <dd>{FREQUENCY_LABELS[indicator.frequency] || indicator.frequency}</dd>
        </div>
        <div className={styles.attribItem}>
          <dt>Geografía</dt>
          <dd>{indicator.geography}</dd>
        </div>
        <div className={styles.attribItem}>
          <dt>Ajuste estacional</dt>
          <dd>{indicator.seasonallyAdjusted ? "Sí" : "No"}</dd>
        </div>
      </dl>

      {indicator.methodology && (
        <>
          <h3 className={styles.aboutSubtitle}>Metodología</h3>
          <p className={styles.aboutText}>{indicator.methodology}</p>
        </>
      )}
    </section>
  );
}
