import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@apollo/client";
import { useRouter } from "next/router";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SeoHead from "../components/SeoHead";
import AuthModal from "../components/AuthModal";
import ActiveSubscriptionCard from "../components/ActiveSubscriptionCard";
import ManageSubscriptionForm from "../components/ManageSubscriptionForm";
import { usePrintSubscriptionStatus } from "../lib/usePrintSubscriptionStatus";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import layout from "../styles/edicion-impresa.module.css";
import styles from "../styles/subscription.module.css";

// /account/ — the signed-in member's home for their print edition
// subscription: plan status and one-click access to the Stripe billing
// portal. Members whose subscription predates account linking (no Firebase
// UID in the Stripe metadata) fall back to the inbox-delivered management
// link, which proves mailbox ownership. Members-only: noindex, and the plan
// data only loads client-side with a Firebase ID token.
export default function AccountPage() {
  const router = useRouter();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const siteDataQuery = useQuery(SITE_DATA_QUERY) || {};
  const headerMenuDataQuery = useQuery(HEADER_MENU_QUERY) || {};

  const siteData = siteDataQuery?.data?.generalSettings || {};
  const menuItems = headerMenuDataQuery?.data?.primaryMenuItems?.nodes || [];
  const categories = headerMenuDataQuery?.data?.categories?.nodes || [];

  const { user, authLoading, subState } = usePrintSubscriptionStatus();

  const portalInvalid = router.query.portal === "invalid";
  const checking =
    authLoading ||
    (user && (subState.status === "idle" || subState.status === "loading"));

  return (
    <>
      <SeoHead
        title="Manage My Subscription"
        description="Manage your Caribbean Business print edition subscription: review your plan, update your payment method or cancel."
        url="/account/"
        noIndex
      />

      <Header
        siteTitle={siteData.title}
        menuItems={menuItems}
        categories={categories}
      />

      <main className="container">
        <div className={layout.wrapper}>
          <section className={layout.hero}>
            <span className={layout.eyebrow}>Manage my subscription</span>
            <h1 className={layout.title}>Your print edition subscription</h1>
            <p className={layout.lead}>
              Review your print edition plan, update your payment method or
              cancel anytime.
            </p>
          </section>

          <div className={styles.stack}>
            <section className={layout.formCard}>
              <h2 className={layout.formTitle}>Print edition subscription</h2>

              {checking ? (
                <p className={styles.planLoading} role="status">
                  Checking your subscription…
                </p>
              ) : !user ? (
                <div className={styles.authGate}>
                  <p className={styles.authGateText}>
                    Sign in to see your plan and manage your subscription.
                  </p>
                  <button
                    type="button"
                    className={styles.authGateBtn}
                    onClick={() => setAuthModalOpen(true)}
                  >
                    Sign in or create account
                  </button>
                </div>
              ) : subState.status === "ready" && subState.subscription ? (
                <ActiveSubscriptionCard subscription={subState.subscription} />
              ) : (
                <>
                  <p className={layout.formSubtitle}>
                    We couldn't find an active print subscription linked to this
                    account.{" "}
                    {subState.status === "error" &&
                      "The subscription check failed — you can try again later or use the email link below. "}
                    If you subscribed with a different email, request a
                    management link below.
                  </p>
                  {portalInvalid && (
                    <p className={styles.cancelNotice} role="status">
                      That management link has expired or is invalid. Request a
                      new one by entering your email below.
                    </p>
                  )}
                  <ManageSubscriptionForm />
                  <p className={styles.planHint}>
                    Not a subscriber yet?{" "}
                    <Link href="/subscription/">
                      Subscribe to the print edition
                    </Link>
                    .
                  </p>
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
