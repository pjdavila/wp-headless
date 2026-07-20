import Head from "next/head";
import Link from "next/link";
import { useQuery } from "@apollo/client";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SeoHead from "../components/SeoHead";
import { BreadcrumbJsonLd } from "../components/JsonLd";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import { useMagazineCover } from "../lib/useMagazineCover";
import styles from "../styles/magazine.module.css";

const FALLBACK_FLIPBOOK_URL = "https://www.pdf-flip.com/viewers/379264/vpj6ik.html";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://caribbean.business").replace(/\/+$/, "");
const PAGE_URL = `${SITE_URL}/magazine/`;

const PAGE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": PAGE_URL,
  url: PAGE_URL,
  name: "Current Edition — Caribbean Business",
  inLanguage: "en",
  description:
    "Read the latest issue of Caribbean Business magazine directly from your browser.",
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
  const cover = useMagazineCover();
  const flipbookUrl = cover?.flipbookUrl || FALLBACK_FLIPBOOK_URL;

  const siteDataQuery = useQuery(SITE_DATA_QUERY) || {};
  const headerMenuDataQuery = useQuery(HEADER_MENU_QUERY) || {};

  const siteData = siteDataQuery?.data?.generalSettings || {};
  const menuItems = headerMenuDataQuery?.data?.primaryMenuItems?.nodes || [];
  const categories = headerMenuDataQuery?.data?.categories?.nodes || [];

  return (
    <>
      <SeoHead
        title="Current Edition"
        description="Read the latest issue of Caribbean Business magazine directly from your browser."
        url="/magazine/"
      />

      <Head>
        <title>Current Edition — Caribbean Business</title>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(PAGE_JSON_LD) }}
        />
      </Head>

      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Current Edition", url: "/magazine/" },
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
            <Link href="/">Home</Link>
            <span aria-hidden="true" className={styles.breadcrumbSep}>›</span>
            <span aria-current="page">Current Edition</span>
          </nav>

          <header className={styles.header}>
            <h1 className={styles.title}>Current Edition</h1>
            <p className={styles.subtitle}>
              Read the latest issue of Caribbean Business magazine directly from your browser.
            </p>
          </header>

          <div className={styles.viewer}>
            <iframe
              key={flipbookUrl}
              src={flipbookUrl}
              title="Caribbean Business — Current Edition"
              className={styles.iframe}
              loading="lazy"
              allowFullScreen
            />
          </div>

          <p className={styles.cta}>
            Want to receive the print edition at home?{" "}
            <Link href="/edicion-impresa/">Join the waitlist.</Link>
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}
