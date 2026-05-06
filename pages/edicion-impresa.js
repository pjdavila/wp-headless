import { useQuery } from "@apollo/client";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SeoHead from "../components/SeoHead";
import PrintEditionForm from "../components/PrintEditionForm";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import styles from "../styles/edicion-impresa.module.css";

export default function PrintEditionPage() {
  const siteDataQuery = useQuery(SITE_DATA_QUERY) || {};
  const headerMenuDataQuery = useQuery(HEADER_MENU_QUERY) || {};

  const siteData = siteDataQuery?.data?.generalSettings || {};
  const menuItems = headerMenuDataQuery?.data?.primaryMenuItems?.nodes || [];
  const categories = headerMenuDataQuery?.data?.categories?.nodes || [];

  return (
    <>
      <SeoHead
        title="Edición impresa — Lista de espera"
        description="Anótate para recibir la edición impresa de Caribbean Business en tu casa cuando arranque nuestro programa de distribución en Puerto Rico."
        url="/edicion-impresa/"
      />

      <Header
        siteTitle={siteData.title}
        menuItems={menuItems}
        categories={categories}
      />

      <main className="container">
        <div className={styles.wrapper}>
          <section className={styles.hero}>
            <span className={styles.eyebrow}>Edición impresa</span>
            <h1 className={styles.title}>Recibe Caribbean Business en tu casa</h1>
            <p className={styles.lead}>
              Estamos preparando el regreso de la edición impresa. Anótate ahora para asegurar tu
              lugar en la primera tirada y recibirla directamente en tu hogar en Puerto Rico.
            </p>
            <ul className={styles.benefits}>
              <li>Análisis exclusivos de los protagonistas del negocio caribeño.</li>
              <li>Reportajes en profundidad que no encontrarás en línea.</li>
              <li>Entrega directa a tu dirección, sin costo durante el lanzamiento.</li>
            </ul>
          </section>

          <section className={styles.formCard}>
            <h2 className={styles.formTitle}>Anótate en la lista de espera</h2>
            <p className={styles.formSubtitle}>
              Completa tus datos. Te enviaremos una confirmación por email y te avisaremos cuando
              comience el envío.
            </p>
            <PrintEditionForm />
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
