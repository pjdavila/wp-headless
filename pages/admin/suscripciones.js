import { useState } from "react";
import { useQuery } from "@apollo/client";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import SeoHead from "../../components/SeoHead";
import AuthModal from "../../components/AuthModal";
import SubscriptionsPanel from "../../components/admin/SubscriptionsPanel";
import { useAdminSubscriptions } from "../../lib/useAdminSubscriptions";
import { SITE_DATA_QUERY } from "../../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../../queries/MenuQueries";
import styles from "../../styles/admin-subscriptions.module.css";

/**
 * /admin/suscripciones/ — internal, staff-only subscriptions panel.
 *
 * Reads every subscription live from Stripe through the admin API
 * (/api/admin/subscriptions/); Stripe is the only data store. Access needs a
 * Firebase sign-in whose verified email is on the ADMIN_EMAILS allowlist.
 * The served HTML carries no subscriber data; noindex and not linked from
 * any sitemap or menu. Read-only: changes are made in the Stripe dashboard.
 */
export default function AdminSubscriptionsPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const siteDataQuery = useQuery(SITE_DATA_QUERY) || {};
  const headerMenuDataQuery = useQuery(HEADER_MENU_QUERY) || {};
  const siteData = siteDataQuery?.data?.generalSettings || {};
  const menuItems = headerMenuDataQuery?.data?.primaryMenuItems?.nodes || [];
  const categories = headerMenuDataQuery?.data?.categories?.nodes || [];

  const api = useAdminSubscriptions();

  return (
    <>
      <SeoHead
        title="Panel de suscripciones"
        description="Panel interno de suscripciones de Caribbean Business."
        url="/admin/suscripciones/"
        noIndex
      />

      <Header
        siteTitle={siteData.title}
        menuItems={menuItems}
        categories={categories}
      />

      <main className={`container ${styles.page}`}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Uso interno</span>
          <h1 className={styles.title}>Suscripciones</h1>
          <p className={styles.lead}>
            Todos los suscriptores y el estado de su suscripción, leídos en vivo
            de Stripe. Para cancelar, reembolsar o cambiar un plan, abre la
            suscripción en Stripe.
          </p>
        </section>

        <PanelBody api={api} onLogin={() => setAuthModalOpen(true)} />
      </main>

      <Footer />

      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
    </>
  );
}

function PanelBody({ api, onLogin }) {
  if (api.authLoading || api.status === "loading") {
    return (
      <div className={styles.stateCard} role="status">
        <span className={styles.spinner} aria-hidden="true" />
        Cargando suscripciones de Stripe…
      </div>
    );
  }

  if (api.status === "unauthenticated") {
    return (
      <div className={styles.stateCard}>
        <h2 className={styles.stateTitle}>
          {api.sessionExpired ? "Tu sesión expiró" : "Acceso para el equipo"}
        </h2>
        <p className={styles.stateText}>
          Inicia sesión con tu cuenta de trabajo para ver el panel. Solo el
          personal autorizado tiene acceso.
        </p>
        <button type="button" className={styles.primaryBtn} onClick={onLogin}>
          Iniciar sesión
        </button>
      </div>
    );
  }

  if (api.status === "forbidden") {
    return (
      <div className={`${styles.stateCard} ${styles.stateWarn}`} role="alert">
        <h2 className={styles.stateTitle}>No autorizado</h2>
        <p className={styles.stateText}>{api.error}</p>
        {api.user?.email && (
          <p className={styles.stateHint}>
            Sesión iniciada como <strong>{api.user.email}</strong>.
          </p>
        )}
      </div>
    );
  }

  if (api.status === "error") {
    return (
      <div className={`${styles.stateCard} ${styles.stateError}`} role="alert">
        <h2 className={styles.stateTitle}>
          No pudimos cargar las suscripciones
        </h2>
        <p className={styles.stateText}>{api.error}</p>
        <p className={styles.stateHint}>
          Esto no significa que no haya suscriptores: los datos no se pudieron
          leer de Stripe.
        </p>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={api.refresh}
          disabled={api.refreshing}
        >
          {api.refreshing ? "Reintentando…" : "Reintentar"}
        </button>
      </div>
    );
  }

  return (
    <SubscriptionsPanel
      data={api.data}
      refreshing={api.refreshing}
      refreshError={api.refreshError}
      onRefresh={api.refresh}
      onDownloadCsv={api.downloadCsv}
    />
  );
}
