import Link from "next/link";
import styles from "../styles/fortyUnder40Promo.module.css";

export default function FortyUnder40Promo() {
  return (
    <section className={styles.banner} aria-label="40 Under 40 · 2026 call for entries">
      <div className={styles.logoPanel}>
        <div className={styles.logoWrap}>
          <img
            src="/40under40/logo-on-dark.webp"
            alt="Caribbean Business 40 Under 40 · 2026"
            width={1400}
            height={1015}
            className={styles.logo}
          />
        </div>
      </div>

      <div className={styles.content}>
        <span className={styles.eyebrow}>Call for entries</span>
        <h2 className={styles.headline}>Do you have what it takes?</h2>
        <p className={styles.lead}>
          Many have asked the prevalent question: &ldquo;Will you be producing
          40 Under 40 again?&rdquo; The answer is &ldquo;yes.&rdquo; The
          recognition, 40 Under 40, and the nomination period is now
          officially open.
        </p>
        <div className={styles.actions}>
          <Link href="/40under40/" className={styles.cta}>
            Apply Here
            <span aria-hidden="true" className={styles.ctaArrow}>
              →
            </span>
          </Link>
          <span className={styles.deadline}>Nominations close September 25, 2026</span>
        </div>
      </div>
    </section>
  );
}
