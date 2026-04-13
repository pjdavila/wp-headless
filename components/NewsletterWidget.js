import { useState } from "react";
import styles from "../styles/newsletter-widget.module.css";

const BENEFITS = [
  "Weekly business digest",
  "Breaking news alerts",
  "Exclusive Caribbean analysis",
];

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function NewsletterWidget() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch("/api/moosend-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong.");
      }

      setStatus("success");
      setEmail("");
    } catch (err) {
      setErrorMsg(err.message || "Failed to subscribe. Try again.");
      setStatus("idle");
    }
  }

  if (status === "success") {
    return (
      <div className={styles.card}>
        <div className={styles.successState}>
          <div className={styles.successIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 className={styles.successHeading}>You&apos;re in!</h3>
          <p className={styles.successText}>Welcome to Caribbean Business. Check your inbox for a confirmation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.iconWrap}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <h3 className={styles.heading}>Stay Informed</h3>
        <p className={styles.subheading}>Subscribe to our Newsletter</p>
      </div>

      <div className={styles.body}>
        <div className={styles.badge}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
          Join 5,000+ readers
        </div>

        <ul className={styles.benefits}>
          {BENEFITS.map((b) => (
            <li key={b} className={styles.benefitItem}>
              <span className={styles.benefitIcon}><CheckIcon /></span>
              {b}
            </li>
          ))}
        </ul>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            disabled={status === "loading"}
            required
          />
          <button
            type="submit"
            className={styles.button}
            disabled={status === "loading"}
          >
            {status === "loading" ? (
              <>
                <span className={styles.spinner} />
                Subscribing...
              </>
            ) : (
              "Subscribe for Free"
            )}
          </button>
        </form>

        {errorMsg && <p className={styles.error}>{errorMsg}</p>}

        <p className={styles.disclaimer}>No spam, ever. Unsubscribe anytime.</p>
      </div>
    </div>
  );
}
