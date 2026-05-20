import Head from "next/head";
import Link from "next/link";
import { useQuery } from "@apollo/client";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SeoHead from "../components/SeoHead";
import { BreadcrumbJsonLd } from "../components/JsonLd";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import styles from "../styles/terms.module.css";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://caribbean.business").replace(/\/+$/, "");
const PAGE_URL = `${SITE_URL}/terms/`;

const PAGE_DESCRIPTION =
  "Terms governing the use of caribbean.business, operated by Vision News Media.";

const PAGE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": PAGE_URL,
  url: PAGE_URL,
  name: "Terms of Use — Caribbean Business",
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

export default function TermsPage() {
  const siteDataQuery = useQuery(SITE_DATA_QUERY) || {};
  const headerMenuDataQuery = useQuery(HEADER_MENU_QUERY) || {};

  const siteData = siteDataQuery?.data?.generalSettings || {};
  const menuItems = headerMenuDataQuery?.data?.primaryMenuItems?.nodes || [];
  const categories = headerMenuDataQuery?.data?.categories?.nodes || [];

  return (
    <>
      <SeoHead title="Terms of Use" description={PAGE_DESCRIPTION} url="/terms/" />

      <Head>
        <title>Terms of Use — Caribbean Business</title>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(PAGE_JSON_LD) }}
        />
      </Head>

      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Terms of Use", url: "/terms/" },
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
            <span aria-current="page">Terms of Use</span>
          </nav>

          <header className={styles.header}>
            <p className={styles.eyebrow}>Legal</p>
            <h1 className={styles.title}>Terms of Use</h1>
            <p className={styles.subtitle}>
              Please read these terms carefully before using caribbean.business.
            </p>
            <p className={styles.lastUpdated}>Last updated: May 2026</p>
          </header>

          <div className={styles.divider} aria-hidden="true" />

          <section className={styles.section}>
            <h2>1. Introduction</h2>
            <p>
              These Terms of Use (the &ldquo;Terms&rdquo;) govern your access to and use of the website
              located at caribbean.business (the &ldquo;Site&rdquo;), operated by Caribbean Business, a
              brand owned by Vision News Media (&ldquo;Vision News Media,&rdquo; &ldquo;VNM,&rdquo;
              &ldquo;we,&rdquo; &ldquo;us&rdquo; or &ldquo;our&rdquo;). By accessing or using the Site, you
              agree to be bound by these Terms. If you do not agree, please do not use the Site.
            </p>
          </section>

          <section className={styles.section}>
            <h2>2. About Caribbean Business</h2>
            <p>
              Caribbean Business is part of the editorial portfolio of Vision News Media, which also
              operates other affiliated publications and digital properties. References to &ldquo;our
              content&rdquo; or &ldquo;the publication&rdquo; in these Terms include content produced or
              distributed by Caribbean Business under the ownership of Vision News Media.
            </p>
          </section>

          <section className={styles.section}>
            <h2>3. Eligibility</h2>
            <p>
              You must be at least 18 years old, or the age of legal majority in your jurisdiction, to use
              the Site. By using the Site, you represent and warrant that you meet this requirement and
              that you have the legal capacity to enter into these Terms.
            </p>
          </section>

          <section className={styles.section}>
            <h2>4. Use of the Site</h2>
            <p>
              The Site is provided for your personal, non-commercial use. You agree not to: (a) use the
              Site for any unlawful purpose; (b) engage in automated scraping, crawling, or harvesting of
              content without our prior written consent; (c) attempt to reverse engineer, decompile, or
              otherwise interfere with the Site&rsquo;s software or security; or (d) take any action that
              imposes an unreasonable load on our infrastructure or disrupts the availability of the Site
              for other users.
            </p>
          </section>

          <section className={styles.section}>
            <h2>5. Intellectual Property</h2>
            <p>
              All content on the Site, including articles, photographs, videos, graphics, logos, and
              trademarks, is owned by Vision News Media or its licensors and is protected by intellectual
              property laws. You may quote brief excerpts of editorial content with proper attribution and
              a link back to the original source, consistent with applicable fair-use principles. Any other
              reproduction, distribution, or commercial use requires our prior written permission.
            </p>
          </section>

          <section className={styles.section}>
            <h2>6. User-Submitted Content</h2>
            <p>
              Any comments, suggestions, or other materials you submit to the Site are not considered
              confidential. By submitting content, you grant Vision News Media a worldwide, non-exclusive,
              royalty-free, transferable license to use, reproduce, adapt, publish, and display that
              content in connection with the Site and our editorial activities. You represent that you
              own or have the right to submit the content and that it does not violate any third
              party&rsquo;s rights.
            </p>
          </section>

          <section className={styles.section}>
            <h2>7. Third-Party Links and Advertising</h2>
            <p>
              The Site may contain links to third-party websites and display advertising served by third
              parties. We do not endorse and are not responsible for the content, products, services,
              privacy practices, or availability of any third-party sites or advertisements. Your use of
              third-party services is subject to their own terms and policies.
            </p>
          </section>

          <section className={styles.section}>
            <h2>8. Disclaimer</h2>
            <p>
              The Site and its content are provided on an &ldquo;as is&rdquo; and &ldquo;as
              available&rdquo; basis, without warranties of any kind, whether express or implied. We do
              not guarantee the accuracy, completeness, timeliness, or availability of any content.
              Nothing on the Site constitutes financial, legal, tax, investment, or other professional
              advice. You should consult a qualified professional before making any decisions based on
              information you read here.
            </p>
          </section>

          <section className={styles.section}>
            <h2>9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, Vision News Media, its affiliates, and
              their respective officers, directors, employees, and agents shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages arising out of or in
              connection with your use of, or inability to use, the Site, even if we have been advised of
              the possibility of such damages.
            </p>
          </section>

          <section className={styles.section}>
            <h2>10. Privacy</h2>
            <p>
              We respect your privacy. A separate privacy policy describing how we collect, use, and
              protect personal information will be published on the Site. In the meantime, if you have
              questions about your personal data, please contact Vision News Media at{" "}
              <a
                href="https://vnmedia.co/contacto"
                target="_blank"
                rel="noopener noreferrer"
              >
                vnmedia.co/contacto
              </a>
              .
            </p>
          </section>

          <section className={styles.section}>
            <h2>11. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. When we do, we will revise the
              &ldquo;Last updated&rdquo; date at the top of this page. Material changes will take effect
              as of the new effective date. Your continued use of the Site after changes are posted
              constitutes your acceptance of the revised Terms.
            </p>
          </section>

          <section className={styles.section}>
            <h2>12. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of the Commonwealth of
              Puerto Rico, without regard to its conflict-of-laws principles. Any dispute arising out of
              or related to these Terms or your use of the Site shall be brought exclusively in the
              competent courts located in Puerto Rico.
            </p>
          </section>

          <section className={styles.section}>
            <h2>13. Contact</h2>
            <p>
              For questions about these Terms or any other matter related to the Site, please contact
              Vision News Media at{" "}
              <a
                href="https://vnmedia.co/contacto"
                target="_blank"
                rel="noopener noreferrer"
              >
                vnmedia.co/contacto
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
