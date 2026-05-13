import Head from "next/head";
import Link from "next/link";
import { useQuery } from "@apollo/client";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SeoHead from "../components/SeoHead";
import { BreadcrumbJsonLd } from "../components/JsonLd";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import styles from "../styles/edicion-actual.module.css";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://caribbean.business").replace(/\/+$/, "");
const PAGE_URL = `${SITE_URL}/edicion-actual/`;

const PAGE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": PAGE_URL,
  url: PAGE_URL,
  name: "Edición Actual — Caribbean Business",
  inLanguage: "es",
  description:
    "Lee la edición más reciente de la revista Caribbean Business directamente desde tu navegador.",
  isPartOf: {
    "@type": "WebSite",
    name: "Caribbean Business",
    url: SITE_URL,
  },
  publisher: {
    "@type": "NewsMediaOrganization",
    name: "Caribbean Business",
    url: SITE_URL,
  },
};

function safeJsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

export default function CurrentEditionPage() {
  const siteDataQuery = useQuery(SITE_DATA_QUERY) || {};
  const headerMenuDataQuery = useQuery(HEADER_MENU_QUERY) || {};

  const siteData = siteDataQuery?.data?.generalSettings || {};
  const menuItems = headerMenuDataQuery?.data?.primaryMenuItems?.nodes || [];
  const categories = headerMenuDataQuery?.data?.categories?.nodes || [];

  return (
    <>
      <SeoHead
        title="Edición Actual"
        description="Lee la edición más reciente de la revista Caribbean Business directamente desde tu navegador."
        url="/edicion-actual/"
      />

      <Head>
        <title>Edición Actual — Caribbean Business</title>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(PAGE_JSON_LD) }}
        />
      </Head>

      <BreadcrumbJsonLd
        items={[
          { name: "Inicio", url: "/" },
          { name: "Edición Actual", url: "/edicion-actual/" },
        ]}
      />

      <Header
        siteTitle={siteData.title}
        menuItems={menuItems}
        categories={categories}
      />

      <main className="container">
        <div className={styles.wrapper}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true" className={styles.breadcrumbSep}>›</span>
            <span aria-current="page">Edición Actual</span>
          </nav>

          <header className={styles.header}>
            <h1 className={styles.title}>Edición Actual</h1>
            <p className={styles.subtitle}>
              Lee la edición más reciente de la revista Caribbean Business directamente desde tu navegador.
            </p>
          </header>

          <div className={styles.viewer}>
            <iframe
              src="https://www.pdf-flip.com/viewers/379264/k1crph.html"
              title="Edición actual de Caribbean Business"
              className={styles.iframe}
              loading="lazy"
              allowFullScreen
            />
          </div>

          <p className={styles.cta}>
            ¿Quieres recibir la edición impresa en tu casa?{" "}
            <Link href="/edicion-impresa/">Anótate en la lista de espera.</Link>
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}
