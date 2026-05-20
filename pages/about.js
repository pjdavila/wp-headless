import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@apollo/client";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SeoHead from "../components/SeoHead";
import { BreadcrumbJsonLd } from "../components/JsonLd";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import styles from "../styles/about.module.css";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://caribbean.business").replace(/\/+$/, "");
const PAGE_URL = `${SITE_URL}/about/`;

const PAGE_DESCRIPTION =
  "Learn about Caribbean Business: more than four decades of trusted business, economic and political journalism in Puerto Rico and the Caribbean.";

const PAGE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": PAGE_URL,
  url: PAGE_URL,
  name: "About — Caribbean Business",
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
};

function safeJsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

export default function AboutPage() {
  const siteDataQuery = useQuery(SITE_DATA_QUERY) || {};
  const headerMenuDataQuery = useQuery(HEADER_MENU_QUERY) || {};

  const siteData = siteDataQuery?.data?.generalSettings || {};
  const menuItems = headerMenuDataQuery?.data?.primaryMenuItems?.nodes || [];
  const categories = headerMenuDataQuery?.data?.categories?.nodes || [];

  return (
    <>
      <SeoHead title="About" description={PAGE_DESCRIPTION} url="/about/" />

      <Head>
        <title>About — Caribbean Business</title>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(PAGE_JSON_LD) }}
        />
      </Head>

      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "About", url: "/about/" },
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
            <span aria-current="page">About</span>
          </nav>

          <section className={styles.hero}>
            <div className={styles.heroLeft}>
              <header className={styles.header}>
                <p className={styles.eyebrow}>Our Story</p>
                <h1 className={styles.title}>About Caribbean Business</h1>
                <p className={styles.subtitle}>
                  Trusted business journalism for Puerto Rico and the Caribbean.
                </p>
              </header>

              <div className={styles.divider} aria-hidden="true" />

              <div className={styles.leadBlock}>
                <p className={styles.lead}>
                  For more than four decades, Caribbean Business has served as a trusted source of business,
                  economic and political journalism in Puerto Rico and the Caribbean. Its reporting has
                  helped inform executives, investors, policymakers, entrepreneurs and professionals across
                  every major industry, from finance and real estate to healthcare, technology, tourism and
                  government.
                </p>
              </div>

              <div className={styles.body}>
                <p>
                  Throughout its history, Caribbean Business has chronicled Puerto Rico&rsquo;s economic
                  evolution, providing in-depth coverage, analysis and editorial perspective during some of
                  the Island&rsquo;s most defining moments. Its work has been recognized by leaders in the
                  financial and investment communities as essential reading for understanding Puerto
                  Rico&rsquo;s business landscape.
                </p>

                <blockquote className={styles.pullquote}>
                  &ldquo;Essential reading for understanding Puerto Rico&rsquo;s business landscape.&rdquo;
                  <span className={styles.pullquoteAttr}>
                    Association of Financial Guaranty Insurers
                  </span>
                </blockquote>

                <p>
                  In 2016, following Caribbean Business&rsquo;s participation in a panel discussion before
                  leading Wall Street investment bankers, the Association of Financial Guaranty Insurers
                  praised the publication&rsquo;s contribution to a substantive and forward-thinking
                  conversation on Puerto Rico&rsquo;s revitalization. The organization also described
                  Caribbean Business&rsquo;s coverage of economic and political developments in Puerto Rico
                  as essential reading.
                </p>
                <p>
                  Today, Caribbean Business begins a new chapter under Vision News Media, honoring the
                  legacy of the publication while bringing it into the digital era. With a renewed
                  commitment to high journalistic standards, a robust digital platform and the multimedia
                  network developed by Metro Puerto Rico over the past 13 years, Caribbean Business is
                  positioned to continue serving readers with credible, relevant and forward-looking
                  business journalism.
                </p>
              </div>

              <aside className={styles.missionCard}>
                <p className={styles.missionEyebrow}>Our Mission</p>
                <p className={styles.missionText}>
                  Our mission is clear: to inform, analyze and connect Puerto Rico&rsquo;s business
                  community with the news and insights that shape the Island&rsquo;s future.
                </p>
              </aside>
            </div>

            <div className={styles.heroRight}>
              <figure className={styles.figure}>
                <Image
                  src="/about/legacy-covers.png"
                  alt="Historic Caribbean Business magazine covers spanning four decades of coverage."
                  width={820}
                  height={1100}
                  sizes="(max-width: 960px) 100vw, 480px"
                  className={styles.figureImg}
                />
                <figcaption className={styles.caption}>
                  Four decades of front pages — moments that shaped Puerto Rico&rsquo;s economy.
                </figcaption>
              </figure>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
