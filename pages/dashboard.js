import { useState } from "react";
import { useQuery } from "@apollo/client";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SeoHead from "../components/SeoHead";
import AuthModal from "../components/AuthModal";
import PulseHero from "../components/dashboard/PulseHero";
import KpiCard from "../components/dashboard/KpiCard";
import InsightsList from "../components/dashboard/InsightsList";
import ChartPanel from "../components/dashboard/ChartPanel";
import SectionNav from "../components/dashboard/SectionNav";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import { useEconomyOverview } from "../lib/useEconomyOverview";
import { KPI_SLOTS } from "../lib/economy/dashboardConfig";
import { formatTimestamp } from "../lib/economy/format";
import styles from "../styles/dashboard.module.css";

/**
 * /dashboard/ — Puerto Rico Economic Dashboard overview.
 *
 * Members-only by decision: the served HTML carries no economic values
 * (everything loads client-side from /api/economy/overview, which requires
 * a Firebase ID token), the page is noindex, and it is excluded from every
 * sitemap. Anonymous visitors get a login gate wired to the existing auth
 * modal.
 */
export default function DashboardPage() {
  const siteDataQuery = useQuery(SITE_DATA_QUERY) || {};
  const headerMenuDataQuery = useQuery(HEADER_MENU_QUERY) || {};

  const siteData = siteDataQuery?.data?.generalSettings || {};
  const menuItems = headerMenuDataQuery?.data?.primaryMenuItems?.nodes || [];
  const categories = headerMenuDataQuery?.data?.categories?.nodes || [];

  const { status, data, sessionExpired, retry } = useEconomyOverview();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <>
      <SeoHead
        title="Tablero Económico de Puerto Rico"
        description="Panel económico de Puerto Rico: indicadores clave, tendencias y el Pulso Económico CB. Exclusivo para usuarios registrados."
        url="/dashboard/"
        noIndex
      />

      <Header
        siteTitle={siteData.title}
        menuItems={menuItems}
        categories={categories}
      />

      <main className="container">
        <div className={styles.pageHead}>
          <span className={styles.eyebrow}>Tablero Económico</span>
          <h1 className={styles.pageTitle}>Puerto Rico en números</h1>
          {status === "ready" && data?.lastUpdated && (
            <p className={styles.lastUpdated}>
              Última actualización: {formatTimestamp(data.lastUpdated)}
            </p>
          )}
        </div>

        <SectionNav active="overview" />

        {status === "loading" && (
          <div className={styles.stateBlock} role="status" aria-live="polite">
            <p className={styles.stateTitle}>Cargando indicadores…</p>
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
            <h2 className={styles.stateTitle}>No pudimos cargar el tablero</h2>
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
            <PulseHero pulse={data.pulse} />

            <section aria-label="Indicadores clave">
              <div className={styles.kpiGrid}>
                {KPI_SLOTS.map((slotId) => {
                  const entry = data.indicators.find(
                    (item) => item.id === slotId,
                  );
                  return entry ? <KpiCard key={slotId} entry={entry} /> : null;
                })}
              </div>
            </section>

            <InsightsList insights={data.insights} />

            <ChartPanel indicators={data.indicators} />

            <p className={styles.footnote}>
              Los indicadores marcados como pendientes o desactualizados
              reflejan el estado real de su fuente oficial — nunca mostramos
              datos estimados como si fueran actuales.
            </p>
          </>
        )}
      </main>

      <Footer />

      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
    </>
  );
}
