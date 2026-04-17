import { useQuery } from "@apollo/client";
import Head from "next/head";
import dynamic from "next/dynamic";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { getNextStaticProps } from "@faustwp/core";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import styles from "../styles/live.module.css";
import AdServerSlot from "../components/AdServerSlot";

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

          <div className={`container ${styles.adSlotWrap}`}>
            <div className={styles.adSlotDesktop}>
              <AdServerSlot zone="161517" width={970} height={90} />
            </div>
            <div className={styles.adSlotMobile}>
              <AdServerSlot zone="161713" width={320} height={100} />
            </div>
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
