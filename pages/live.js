import { useQuery } from "@apollo/client";
import Head from "next/head";
import Script from "next/script";
import dynamic from "next/dynamic";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { getNextStaticProps } from "@faustwp/core";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import styles from "../styles/live.module.css";

const LivePlayer = dynamic(() => import("../components/LivePlayer"), {
  ssr: false,
});

export default function LivePage() {
  const siteDataQuery = useQuery(SITE_DATA_QUERY) || {};
  const headerMenuDataQuery = useQuery(HEADER_MENU_QUERY) || {};

  const siteData = siteDataQuery?.data?.generalSettings || {};
  const menuItems = headerMenuDataQuery?.data?.primaryMenuItems?.nodes || [];
  const categories =
    headerMenuDataQuery?.data?.categories?.nodes || [];

  return (
    <>
      <Head>
        <title>Live Stream — {siteData.title || "Caribbean Business"}</title>
        <meta
          name="description"
          content="Watch Caribbean Business live stream — breaking news, analysis, and market updates from the Caribbean region."
        />
        <meta property="og:title" content="Live Stream — Caribbean Business" />
        <meta
          property="og:description"
          content="Watch Caribbean Business live stream — breaking news, analysis, and market updates."
        />
        <meta property="og:type" content="website" />
      </Head>

      <Script
        src="https://imasdk.googleapis.com/js/sdkloader/ima3.js"
        strategy="beforeInteractive"
      />

      <Header
        siteTitle={siteData.title}
        siteDescription={siteData.description}
        menuItems={menuItems}
        categories={categories}
      />

      <main className={styles.page}>
        <div className={styles.hero}>
          <div className={`container ${styles.playerSection}`}>
            <div className={styles.liveHeader}>
              <span className={styles.liveBadge}>
                <span className={styles.liveDot} />
                Live
              </span>
              <h1 className={styles.streamTitle}>Caribbean Business Live</h1>
            </div>

            <div className={styles.playerWrapper}>
              <LivePlayer />
            </div>
          </div>

          <div className={`container ${styles.streamInfo}`}>
            <div className={styles.streamMeta}>
              <span className={styles.channelName}>VNM Media Group</span>
              <span className={styles.separator} />
              <span className={styles.liveBadge} style={{ fontSize: "0.6rem", padding: "0.2rem 0.5rem" }}>
                <span className={styles.liveDot} />
                En Vivo
              </span>
            </div>
            <p className={styles.streamDesc}>
              Transmisión en vivo de Caribbean Business — noticias de negocios, economía, tecnología y análisis del mercado caribeño. Sintoniza para mantenerte informado con las últimas actualizaciones.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

LivePage.queries = [
  {
    query: SITE_DATA_QUERY,
  },
  {
    query: HEADER_MENU_QUERY,
  },
];

export function getStaticProps(ctx) {
  return getNextStaticProps(ctx, {
    Page: LivePage,
  });
}
