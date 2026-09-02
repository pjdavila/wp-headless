import Head from "next/head";
import { useQuery } from "@apollo/client";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SeoHead from "../components/SeoHead";
import { BreadcrumbJsonLd } from "../components/JsonLd";
import FortyUnder40Form from "../components/FortyUnder40Form";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import styles from "../styles/forty-under-40.module.css";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://caribbean.business").replace(/\/+$/, "");
const PAGE_URL = `${SITE_URL}/40under40/`;
const OG_IMAGE = `${SITE_URL}/40under40/og.png`;

const PAGE_DESCRIPTION =
  "Caribbean Business is looking for the 40 leaders under 40 shaping Puerto Rico's economy in 2026. Submit your entry — name, title, company and town — in a few minutes.";

const PAGE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": PAGE_URL,
  url: PAGE_URL,
  name: "40 Under 40 · 2026 — Submit your entry | Caribbean Business",
  inLanguage: "en",
  description: PAGE_DESCRIPTION,
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
  about: {
    "@type": "Event",
    name: "Caribbean Business 40 Under 40 · 2026",
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: "Puerto Rico",
      address: { "@type": "PostalAddress", addressCountry: "PR" },
    },
    organizer: {
      "@type": "NewsMediaOrganization",
      name: "Caribbean Business",
      url: SITE_URL,
    },
  },
};

function safeJsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

export default function FortyUnder40Page() {
  const siteDataQuery = useQuery(SITE_DATA_QUERY) || {};
  const headerMenuDataQuery = useQuery(HEADER_MENU_QUERY) || {};

  const siteData = siteDataQuery?.data?.generalSettings || {};
  const menuItems = headerMenuDataQuery?.data?.primaryMenuItems?.nodes || [];
  const categories = headerMenuDataQuery?.data?.categories?.nodes || [];

  return (
    <>
      <SeoHead
        title="40 Under 40 · 2026 — Submit your entry"
        description={PAGE_DESCRIPTION}
        url="/40under40/"
        ogImage={OG_IMAGE}
        imageAlt="Caribbean Business 40 Under 40 · 2026"
      />

      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(PAGE_JSON_LD) }}
        />
      </Head>

      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "40 Under 40", url: "/40under40/" },
        ]}
      />

      <Header
        siteTitle={siteData.title}
        menuItems={menuItems}
        categories={categories}
      />

      <main className={`container ${styles.page}`}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Call for entries</span>

          <div className={styles.logoWrap}>
            <img
              src="/40under40/logo-on-light.webp"
              alt="Caribbean Business 40 Under 40 · 2026"
              width={1400}
              height={1015}
              className={`${styles.logo} ${styles.logoOnLight}`}
            />
            <img
              src="/40under40/logo-on-dark.webp"
              alt=""
              aria-hidden="true"
              width={1400}
              height={1015}
              className={`${styles.logo} ${styles.logoOnDark}`}
            />
          </div>

          <h1 className={styles.title}>
            Do you have what it takes?
          </h1>
          <p className={styles.lead}>
            Every year Caribbean Business spotlights the executives, founders and operators moving
            the island&rsquo;s business landscape forward. If that sounds like you &mdash; or like
            someone you work with &mdash; put your name in for the class of 2026.
          </p>
          <p className={styles.deadline}>Entries are open · Free to submit</p>

          <div className={styles.divider} aria-hidden="true" />
        </section>

        <section className={styles.formSection}>
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>Do you have what it takes?</h2>
            <p className={styles.formSubtitle}>
              It takes about three minutes. You can go back and edit any step before submitting.
            </p>
            <FortyUnder40Form />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
