import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/router";
import { useQuery } from "@apollo/client";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SeoHead from "../components/SeoHead";
import { BreadcrumbJsonLd } from "../components/JsonLd";
import PrintSubscriptionForm from "../components/PrintSubscriptionForm";
import AuthModal from "../components/AuthModal";
import { usePrintSubscriptionStatus } from "../lib/usePrintSubscriptionStatus";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import layout from "../styles/edicion-impresa.module.css";
import styles from "../styles/subscription.module.css";
import formStyles from "../styles/print-edition-form.module.css";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://caribbean.business"
).replace(/\/+$/, "");
const PAGE_URL = `${SITE_URL}/subscription/`;

const PAGE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": PAGE_URL,
  url: PAGE_URL,
  name: "Print Edition Subscription | Caribbean Business",
  inLanguage: "en",
  description:
    "Subscribe to the Caribbean Business print edition for $4.99 a month and get it delivered straight to your home anywhere in Puerto Rico.",
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

export default function PrintSubscriptionPage() {
  const router = useRouter();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const siteDataQuery = useQuery(SITE_DATA_QUERY) || {};
  const headerMenuDataQuery = useQuery(HEADER_MENU_QUERY) || {};

  const siteData = siteDataQuery?.data?.generalSettings || {};
  const menuItems = headerMenuDataQuery?.data?.primaryMenuItems?.nodes || [];
  const categories = headerMenuDataQuery?.data?.categories?.nodes || [];

  const success = router.query.success === "1";
  const canceled = router.query.canceled === "1";

  // Signed-in visitors are checked for a live print subscription: existing
  // subscribers get pointed to My Account instead of a second subscribe form.
  // A failed check falls back to the normal form.
  const { user, authLoading, subState } = usePrintSubscriptionStatus(success);

  return (
    <>
      <SeoHead
        title="Print Edition Subscription — $4.99/month"
        description="Subscribe to the Caribbean Business print edition for $4.99 a month and get it delivered straight to your home anywhere in Puerto Rico."
        url="/subscription/"
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
          { name: "Print subscription", url: "/subscription/" },
        ]}
      />

      <Header
        siteTitle={siteData.title}
        menuItems={menuItems}
        categories={categories}
      />

      <main className="container">
        <div className={layout.wrapper}>
          <section className={layout.hero}>
            <span className={layout.eyebrow}>Print edition</span>
            <h1 className={layout.title}>
              Caribbean Business at your door, every month
            </h1>
            <p className={layout.lead}>
              Subscribe to the print edition and get it delivered straight to
              your home in any town in Puerto Rico.
            </p>
            <p className={styles.price}>
              <span className={styles.priceAmount}>$4.99</span>
              <span className={styles.pricePeriod}>
                USD / month · cancel anytime
              </span>
            </p>
            <ul className={layout.benefits}>
              <li>
                Exclusive analysis of the Caribbean business community's key
                players.
              </li>
              <li>In-depth reporting you won't find online.</li>
              <li>Direct delivery to your address in Puerto Rico.</li>
              <li>
                Secure payment with Stripe; manage or cancel your plan anytime.
              </li>
            </ul>
          </section>

          <div className={styles.stack}>
            <section className={layout.formCard}>
              {success ? (
                <div className={formStyles.successCard}>
                  <div className={formStyles.successIcon} aria-hidden="true">
                    <svg
                      width="36"
                      height="36"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h2 className={formStyles.successHeading}>
                    Subscription activated!
                  </h2>
                  <p className={formStyles.successText}>
                    Thank you for subscribing to the print edition. You'll
                    receive a confirmation email with your plan details. To
                    update your card or cancel, visit{" "}
                    <Link href="/account/">Manage My Subscription</Link>{" "}
                    anytime.
                  </p>
                </div>
              ) : user &&
                subState.status === "ready" &&
                subState.subscription ? (
                <div className={styles.planCard}>
                  <p className={styles.planBadge} role="status">
                    Active
                  </p>
                  <h2 className={layout.formTitle}>
                    You're already subscribed
                  </h2>
                  <p className={styles.planDetail}>
                    This account has an active print edition subscription. You
                    can review your plan, update your payment method or cancel
                    from the Manage My Subscription page.
                  </p>
                  <Link href="/account/" className={styles.planButton}>
                    Manage My Subscription
                  </Link>
                </div>
              ) : (
                <>
                  <h2 className={layout.formTitle}>Subscribe now</h2>
                  <p className={layout.formSubtitle}>
                    Fill in your shipping details and we'll take you to Stripe
                    to complete your payment securely. We only ship within
                    Puerto Rico.
                  </p>
                  {canceled && (
                    <p className={styles.cancelNotice} role="status">
                      The payment was canceled at Stripe. No charge was made —
                      you can try again whenever you're ready.
                    </p>
                  )}
                  {!authLoading && !user ? (
                    <div className={styles.authGate}>
                      <p className={styles.authGateText}>
                        To subscribe you need a Caribbean Business account. Sign
                        in or create one for free — it takes less than a minute.
                      </p>
                      <button
                        type="button"
                        className={styles.authGateBtn}
                        onClick={() => setAuthModalOpen(true)}
                      >
                        Sign in or create account
                      </button>
                    </div>
                  ) : user && subState.status === "loading" ? (
                    <p className={styles.planLoading} role="status">
                      Checking your subscription…
                    </p>
                  ) : user ? (
                    <PrintSubscriptionForm userEmail={user.email} />
                  ) : null}
                </>
              )}
            </section>
          </div>
        </div>
      </main>

      <Footer />

      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
    </>
  );
}
