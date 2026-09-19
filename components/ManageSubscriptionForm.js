import { useState } from "react";
import styles from "../styles/print-edition-form.module.css";

export default function ManageSubscriptionForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg("Invalid email.");
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch("/api/stripe-customer-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.error || "Something went wrong. Please try again.",
        );
      }

      setInfoMsg(
        data?.message ||
          "If we find a subscription under that email, we've sent you a link to manage it. Check your inbox.",
      );
      setEmail("");
      setStatus("idle");
    } catch (err) {
      setErrorMsg(
        err.message || "We couldn't process your request. Please try again.",
      );
      setStatus("idle");
    }
  }

  const isLoading = status === "loading";

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor="manage-email" className={styles.label}>
          The email you subscribed with{" "}
          <span className={styles.required}>*</span>
        </label>
        <input
          id="manage-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          className={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      {errorMsg && (
        <p className={styles.formError} role="alert" aria-live="polite">
          {errorMsg}
        </p>
      )}

      {infoMsg && (
        <p className={styles.formInfo} role="status" aria-live="polite">
          {infoMsg}
        </p>
      )}

      <button type="submit" className={styles.submitBtn} disabled={isLoading}>
        {isLoading ? (
          <>
            <span className={styles.spinner} aria-hidden="true" />
            Sending link…
          </>
        ) : (
          "Email me the management link"
        )}
      </button>

      <p className={styles.disclaimer}>
        For your security, we email you a one-time link: from there you open the
        secure Stripe portal to update your card or cancel your subscription.
      </p>
    </form>
  );
}
