import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import SeoHead from "../../components/SeoHead";
import AuthModal from "../../components/AuthModal";
import SectionNav from "../../components/dashboard/SectionNav";
import DashboardBreadcrumbs from "../../components/dashboard/DashboardBreadcrumbs";
import IndicatorRow from "../../components/dashboard/IndicatorRow";
import { SITE_DATA_QUERY } from "../../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../../queries/MenuQueries";
import { useEconomyApi } from "../../lib/useEconomyApi";
import { SECTIONS, getSection, listSectionIndicators } from "../../lib/economy/sections";
import styles from "../../styles/dashboard.module.css";

/**
 * /dashboard/<section>/ — registry-driven category page.
 *
 * Each section from lib/economy/sections.js renders its indicators as
 * compact KPI rows (value, MoM change, sparkline, link to the detail page).
 * Sections with no live indicators yet render an honest "en integración"
 * state. Members-only like the overview: the served HTML carries no
 * economic values (data loads client-side from the authenticated
 * /api/economy routes), the page is noindex and excluded from sitemaps.
 */
export default function SectionPage({ section }) {
  const siteDataQuery = useQuery(SITE_DATA_QUERY) || {};
  const headerMenuDataQuery = useQuery(HEADER_MENU_QUERY) || {};

  const siteData = siteDataQuery?.data?.generalSettings || {};
  const menuItems = headerMenuDataQuery?.data?.primaryMenuItems?.nodes || [];
  const categories = headerMenuDataQuery?.data?.categories?.nodes || [];

  const indicators = useMemo(() => listSectionIndicators(section), [section]);
  const idsKey = indicators.map((indicator) => indicator.id).join(",");

  const { status, data, sessionExpired, retry } = useEconomyApi(
    indicators.length > 0
      ? (get) =>
          Promise.all(
            indicators.map((indicator) =>
              get(`/api/economy/series/${indicator.id}/`),
            ),
          )
      : null,
    [idsKey],
  );

  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <>
      <SeoHead
        title={`Tablero Económico — ${section.name}`}
        description={`Indicadores económicos de Puerto Rico: ${section.blurb} Exclusivo para usuarios registrados.`}
        url={`/dashboard/${section.slug}/`}
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
            { label: section.name },
          ]}
        />

        <div className={styles.pageHead}>
          <span className={styles.eyebrow}>Tablero Económico</span>
          <h1 className={styles.pageTitle}>{section.name}</h1>
          <p className={styles.leadText}>{section.blurb}</p>
        </div>

        <SectionNav active={section.slug} />

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
            <h2 className={styles.stateTitle}>No pudimos cargar esta sección</h2>
            <p className={styles.stateText}>
              Hubo un problema al obtener los datos. Inténtalo de nuevo.
            </p>
            <button type="button" className={styles.loginBtn} onClick={retry}>
              Reintentar
            </button>
          </div>
        )}

        {status === "ready" && indicators.length === 0 && (
          <div className={styles.stateBlock}>
            <h2 className={styles.stateTitle}>
              Esta sección aún no tiene indicadores en vivo
            </h2>
            <p className={styles.stateText}>
              Estamos integrando las fuentes oficiales de {section.name}. Los
              indicadores aparecerán aquí automáticamente en cuanto la fuente
              esté conectada — nunca mostramos datos estimados como si fueran
              actuales.
            </p>
          </div>
        )}

        {status === "ready" && indicators.length > 0 && data && (
          <>
            <section aria-label={`Indicadores de ${section.name}`}>
              <div className={styles.indicatorList}>
                {indicators.map((indicator, index) => (
                  <IndicatorRow key={indicator.id} entry={data[index]} />
                ))}
              </div>
            </section>

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

// Registry-driven: every section in lib/economy/sections.js (except the
// overview, which is /dashboard/ itself) gets a page at build time. Unknown
// slugs 404; adding a section to the registry creates its page on the next
// build with no route code.
export function getStaticProps({ params }) {
  const section = getSection(params?.section);
  if (!section || section.slug === "overview") {
    return { notFound: true };
  }
  return { props: { section } };
}

export function getStaticPaths() {
  return {
    paths: SECTIONS.filter((section) => section.slug !== "overview").map(
      (section) => ({ params: { section: section.slug } }),
    ),
    fallback: false,
  };
}
