import { useState } from "react";
import { auth } from "../lib/firebase";
import styles from "../styles/subscription.module.css";

function formatDate(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(date);
}

function formatPlan(plan) {
  if (!plan || typeof plan.amount !== "number") return null;
  const amount = (plan.amount / 100).toFixed(2);
  const interval = plan.interval === "month" ? "month" : plan.interval || "";
  return `$${amount} ${String(plan.currency || "USD").toUpperCase()} / ${interval}`.trim();
}

const STATUS_LABELS = {
  active: "Active",
  trialing: "Trial",
  past_due: "Payment issue",
};

// Shown to a signed-in subscriber in place of the subscribe form: their plan
// status at a glance plus one-click access to the Stripe billing portal.
export default function ActiveSubscriptionCard({ subscription }) {
  const [managing, setManaging] = useState(false);
  const [error, setError] = useState("");

  const statusLabel = STATUS_LABELS[subscription.status] || "Active";
  const renewalDate = formatDate(subscription.currentPeriodEnd);
  const planLabel = formatPlan(subscription.plan);

  async function openPortal() {
    setError("");
    setManaging(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("Please sign in again to continue.");
      }
      const idToken = await currentUser.getIdToken();

      const res = await fetch("/api/print-subscription-portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        throw new Error(
          "Your session expired. Please sign out and sign in again.",
        );
      }
      if (!res.ok || !data?.url) {
        throw new Error(
          data?.error ||
            "We couldn't open the subscription portal. Please try again.",
        );
      }

      // Hand off to the Stripe billing portal. Keep the loading state — the
      // browser is leaving the page.
      window.location.assign(data.url);
    } catch (err) {
      setError(err.message);
      setManaging(false);
    }
  }

  return (
    <div className={styles.planCard}>
      <p
        className={`${styles.planBadge} ${
          subscription.status === "past_due" ? styles.planBadgeWarning : ""
        }`}
        role="status"
      >
        {statusLabel}
      </p>

      {planLabel && (
        <p className={styles.planName}>Print edition · {planLabel}</p>
      )}

      {subscription.status === "past_due" ? (
        <p className={styles.planDetail}>
          We couldn't charge your card on the last attempt. Update your payment
          method in the portal to keep receiving the print edition.
        </p>
      ) : subscription.cancelAtPeriodEnd && renewalDate ? (
        <p className={styles.planDetail}>
          Your plan is set to cancel on {renewalDate}. Until then, your delivery
          continues as usual.
        </p>
      ) : renewalDate ? (
        <p className={styles.planDetail}>Next renewal: {renewalDate}.</p>
      ) : null}

      <button
        type="button"
        className={styles.planButton}
        onClick={openPortal}
        disabled={managing}
      >
        {managing ? "Opening the portal…" : "Manage subscription"}
      </button>
      <p className={styles.planHint}>
        Update your card, download invoices or cancel your plan in Stripe's
        secure portal.
      </p>

      {error && (
        <p className={styles.planError} role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}
