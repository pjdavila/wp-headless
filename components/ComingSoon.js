import { useState } from "react";
import Image from "next/image";
import Countdown from "./Countdown";
import styles from "../styles/coming-soon.module.css";

export default function ComingSoon({ onUnlock }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/verify-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        onUnlock();
      } else {
        const data = await res.json();
        setError(data.message || "Incorrect password");
        setPassword("");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.bg} />
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.logoWrap}>
            <Image
              src="/logo-dark.webp"
              alt="Caribbean Business"
              width={280}
              height={60}
              className={styles.logo}
              priority
            />
          </div>

          <div className={styles.divider} />

          <h1 className={styles.title}>Coming Soon</h1>
          <p className={styles.tagline}>
            We&apos;re building something exciting. Enter the access code to preview the site.
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter access code"
                className={styles.input}
                autoComplete="off"
                autoFocus
                disabled={loading}
              />
              <button
                type="submit"
                className={styles.button}
                disabled={loading || !password.trim()}
              >
                {loading ? (
                  <span className={styles.spinner} />
                ) : (
                  <ArrowIcon />
                )}
              </button>
            </div>
            {error && <p className={styles.error}>{error}</p>}
          </form>

          <section className={styles.summitSection} aria-labelledby="cbs-summit-title">
            <img
              src="https://summit.caribbean.business/img/logo-cbs.png"
              alt="Caribbean Business Summit"
              className={styles.summitLogo}
              width="200"
              height="56"
              loading="lazy"
            />
            <h2 id="cbs-summit-title" className={styles.summitTitle}>
              Caribbean Business Summit
            </h2>
            <p className={styles.summitMeta}>
              <strong>May 7, 2026</strong>
              <br />
              Sheraton Puerto Rico Convention Center, San Juan, Puerto Rico
            </p>

            <Countdown />

            <a
              href="https://summit.caribbean.business/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.summitCta}
            >
              More information
              <ExternalArrow />
            </a>
          </section>

          <p className={styles.footer}>
            &copy; {new Date().getFullYear()} Caribbean Business
          </p>
        </div>
      </div>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function ExternalArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}
