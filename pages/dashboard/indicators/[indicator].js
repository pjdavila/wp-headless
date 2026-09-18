import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import SeoHead from "../../../components/SeoHead";
import AuthModal from "../../../components/AuthModal";
import SectionNav from "../../../components/dashboard/SectionNav";
import DashboardBreadcrumbs from "../../../components/dashboard/DashboardBreadcrumbs";
import IndicatorChart from "../../../components/dashboard/IndicatorChart";
import IndicatorTable from "../../../components/dashboard/IndicatorTable";
import AttributionBlock from "../../../components/dashboard/AttributionBlock";
import DirectionArrow, {
  directionWord,
} from "../../../components/dashboard/DirectionArrow";
import { SITE_DATA_QUERY } from "../../../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../../../queries/MenuQueries";
import { useEconomyApi } from "../../../lib/useEconomyApi";
import { INDICATORS, getIndicator } from "../../../lib/economy/indicators";
import { sectionForIndicator, sectionPath } from "../../../lib/economy/sections";
import { buildWhatItMeans } from "../../../lib/economy/summary";
import {
  formatValue,
  formatPeriod,
  formatTimestamp,
  formatPointChange,
  unitLabel,
} from "../../../lib/economy/format";
import styles from "../../../styles/dashboard.module.css";

/**
 * /dashboard/indicators/<id>/ — registry-driven indicator detail page.
 *
 * Latest value with MoM/YoY changes, the interactive chart with range
 * controls, a deterministic "Qué significa" summary, the historical data
 * table, methodology and full source attribution. Multi-series indicators
 * (employment by industry, exports vs imports) get a series selector shared
 * by the chart and the table. Pending sources render methodology and source
 * info with a clear data-pending state — never a fabricated number.
 *
 * Members-only like the overview: the served HTML carries no economic
 * values (data loads client-side from the authenticated /api/economy/series
 * route), the page is noindex and excluded from sitemaps.
 */
export default function IndicatorPage({ indicator }) {
  const siteDataQuery = useQuery(SITE_DATA_QUERY) || {};
  const headerMenuDataQuery = useQuery(HEADER_MENU_QUERY) || {};

  const siteData = siteDataQuery?.data?.generalSettings || {};
  const menuItems = headerMenuDataQuery?.data?.primaryMenuItems?.nodes || [];
  const categories = headerMenuDataQuery?.data?.categories?.nodes || [];

  const { status, data, sessionExpired, retry } = useEconomyApi(
    (get) => get(`/api/economy/series/${indicator.id}/`),
    [indicator.id],
  );

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [seriesKey, setSeriesKey] = useState(
    indicator.providerConfig?.primarySeries || null,
  );

  const section = sectionForIndicator(indicator);

  const hasData =
    Boolean(data?.latest) && (data?.status === "ok" || data?.status === "error");

  // Series dimension (only multi-series indicators carry one).
  const seriesOptions = useMemo(() => {
    const configured = indicator.providerConfig?.series;
    if (configured && configured.length > 1) return configured;
    const keys = new Set(
      (data?.observations || [])
        .map((point) => point.series)
        .filter(Boolean),
    );
    if (keys.size < 2) return null;
    return [...keys].map((key) => ({ key, label: key }));
  }, [indicator, data]);

  const activeSeries = seriesOptions
    ? seriesOptions.some((option) => option.key === seriesKey)
      ? seriesKey
      : seriesOptions[0].key
    : null;

  const seriesObservations = useMemo(() => {
    const all = data?.observations || [];
    if (!activeSeries) return all;
    return all.filter((point) => point.series === activeSeries);
  }, [data, activeSeries]);

  const seriesLabel = seriesOptions
    ? seriesOptions.find((option) => option.key === activeSeries)?.label
    : null;

  const meaning = useMemo(
    () => (hasData ? buildWhatItMeans(indicator, seriesObservations) : []),
    [indicator, seriesObservations, hasData],
  );

  const latest = data?.latest || null;
  const mom = hasData ? formatPointChange(latest, indicator.unit, "mom") : null;
  const yoy = hasData ? formatPointChange(latest, indicator.unit, "yoy") : null;
  const staleMonths =
    data?.stale && Number.isFinite(data?.ageDays)
      ? Math.max(1, Math.round(data.ageDays / 30))
      : null;

  return (
    <>
      <SeoHead
        title={`${indicator.name} — Tablero Económico`}
        description={indicator.description}
        url={`/dashboard/indicators/${indicator.id}/`}
        noIndex
      />

      <Header
        siteTitle={siteData.title}
        menuItems={menuItems}
        categories={categories}
      />

      <main className="container">
        <DashboardBreadcrumbs
          items={[
            { label: "Tablero Económico", href: "/dashboard/" },
            ...(section
              ? [{ label: section.name, href: sectionPath(section.slug) }]
              : []),
            { label: indicator.shortName },
          ]}
        />

        <div className={styles.pageHead}>
          {section && <span className={styles.eyebrow}>{section.name}</span>}
          <h1 className={styles.pageTitle}>{indicator.name}</h1>
          <p className={styles.leadText}>{indicator.description}</p>
        </div>

        <SectionNav active={section ? section.slug : "overview"} />

        {status === "loading" && (
          <div className={styles.stateBlock} role="status" aria-live="polite">
            <p className={styles.stateTitle}>Cargando indicador…</p>
          </div>
        )}

        {status === "unauthenticated" && (
          <div className={styles.stateBlock}>
            <h2 className={styles.stateTitle}>
              Este tablero es exclusivo para usuarios registrados
            </h2>
            <p className={styles.stateText}>
              {sessionExpired
                ? "Tu sesión expiró. Inicia sesión de nuevo para ver los indicadores."
                : "Inicia sesión o crea una cuenta gratis para ver los indicadores económicos de Puerto Rico."}
            </p>
            <button
              type="button"
              className={styles.loginBtn}
              onClick={() => setAuthModalOpen(true)}
            >
              Iniciar sesión
            </button>
          </div>
        )}

        {status === "error" && (
          <div className={styles.stateBlock} role="alert">
            <h2 className={styles.stateTitle}>
              No pudimos cargar este indicador
            </h2>
            <p className={styles.stateText}>
              Hubo un problema al obtener los datos. Inténtalo de nuevo.
            </p>
            <button type="button" className={styles.loginBtn} onClick={retry}>
              Reintentar
            </button>
          </div>
        )}

        {status === "ready" && data && (
          <>
            {data.status === "pending" && (
              <div className={styles.noticePending} role="status">
                <strong>Datos pendientes.</strong> La fuente oficial de este
                indicador publica en PDF/Excel y la conexión automática está en
                desarrollo. Mientras tanto, esta página documenta qué mide, su
                metodología y su fuente.
              </div>
            )}

            {hasData && data.stale && (
              <div className={styles.noticeStale} role="status">
                {data.staleReason === "refresh-failed" ? (
                  <>
                    <strong>La última actualización falló.</strong> Mostramos el
                    último dato válido publicado por la fuente.
                  </>
                ) : (
                  <>
                    <strong>Datos desactualizados.</strong> El dato más reciente
                    {staleMonths
                      ? ` es de hace ${staleMonths} ${staleMonths === 1 ? "mes" : "meses"}`
                      : " es anterior al ritmo habitual de publicación"}
                    ; la fuente oficial aún no publica un período más reciente.
                  </>
                )}
              </div>
            )}

            {hasData && (
              <>
                <div className={styles.statGrid}>
                  <div className={styles.statBox}>
                    <span className={styles.statLabel}>
                      Último valor · {formatPeriod(latest.date, indicator.frequency)}
                      {latest.preliminary ? " · preliminar" : ""}
                    </span>
                    <span className={styles.statValue}>
                      {formatValue(latest.value, indicator.unit)}
                      {unitLabel(indicator.unit) && (
                        <span className={styles.statUnit}>
                          {unitLabel(indicator.unit)}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className={styles.statBox}>
                    <span className={styles.statLabel}>
                      Vs. período anterior
                    </span>
                    {mom ? (
                      <span
                        className={`${styles.statChange} ${
                          mom.direction === "up"
                            ? styles.changeUp
                            : mom.direction === "down"
                              ? styles.changeDown
                              : styles.changeFlat
                        }`}
                      >
                        <DirectionArrow direction={mom.direction} />
                        <span className="sr-only">
                          {directionWord(mom.direction)}{" "}
                        </span>
                        {mom.text}
                      </span>
                    ) : (
                      <span className={styles.statChangeNa}>—</span>
                    )}
                  </div>
                  <div className={styles.statBox}>
                    <span className={styles.statLabel}>Vs. hace un año</span>
                    {yoy ? (
                      <span
                        className={`${styles.statChange} ${
                          yoy.direction === "up"
                            ? styles.changeUp
                            : yoy.direction === "down"
                              ? styles.changeDown
                              : styles.changeFlat
                        }`}
                      >
                        <DirectionArrow direction={yoy.direction} />
                        <span className="sr-only">
                          {directionWord(yoy.direction)}{" "}
                        </span>
                        {yoy.text}
                      </span>
                    ) : (
                      <span className={styles.statChangeNa}>—</span>
                    )}
                  </div>
                  <div className={styles.statBox}>
                    <span className={styles.statLabel}>Actualizado</span>
                    <span className={styles.statDate}>
                      {data.retrievedAt
                        ? formatTimestamp(data.retrievedAt)
                        : "—"}
                    </span>
                  </div>
                </div>

                {seriesOptions && (
                  <div className={styles.seriesSelectRow}>
                    <label className={styles.chartSelectLabel}>
                      <span className={styles.statLabel}>Serie</span>
                      <select
                        className={styles.chartSelect}
                        value={activeSeries}
                        onChange={(event) => setSeriesKey(event.target.value)}
                      >
                        {seriesOptions.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}

                <IndicatorChart
                  indicator={indicator}
                  observations={seriesObservations}
                  seriesLabel={seriesLabel}
                />

                {meaning.length > 0 && (
                  <section
                    className={styles.chartSection}
                    aria-labelledby="indicator-meaning"
                  >
                    <h2 id="indicator-meaning" className={styles.sectionTitle}>
                      Qué significa
                    </h2>
                    <ul className={styles.meaningList}>
                      {meaning.map((sentence) => (
                        <li key={sentence}>{sentence}</li>
                      ))}
                    </ul>
                  </section>
                )}

                <IndicatorTable
                  indicator={indicator}
                  observations={seriesObservations}
                />
              </>
            )}

            <AttributionBlock indicator={indicator} entry={data} />

            <p className={styles.footnote}>
              Fuente:{" "}
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
              . Si la fuente está pendiente o desactualizada, esta página lo
              indica — nunca mostramos datos estimados como si fueran actuales.
            </p>
          </>
        )}
      </main>

      <Footer />

      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
    </>
  );
}

// Registry-driven: every indicator in lib/economy/indicators.js gets a page
// at build time. Unknown ids 404; adding an indicator to the registry
// creates its page on the next build with no route code.
export function getStaticProps({ params }) {
  const indicator = getIndicator(params?.indicator);
  if (!indicator) {
    return { notFound: true };
  }
  return { props: { indicator } };
}

export function getStaticPaths() {
  return {
    paths: INDICATORS.map((indicator) => ({
      params: { indicator: indicator.id },
    })),
    fallback: false,
  };
}
