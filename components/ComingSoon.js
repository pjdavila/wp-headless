import { useState } from "react";
import Image from "next/image";
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
