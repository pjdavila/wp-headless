import Link from "next/link";
import styles from "../styles/fortyUnder40Promo.module.css";

export default function FortyUnder40Promo() {
  return (
    <section className={styles.banner} aria-label="40 Under 40 · 2026 call for entries">
      <div className={styles.logoWrap}>
        <img
          src="/40under40/logo-on-light.webp"
          alt="Caribbean Business 40 Under 40 · 2026"
          width={1400}
          height={1015}
          className={`${styles.logo} ${styles.logoOnLight}`}
        />
        <img
          src="/40under40/logo-on-dark.webp"
          alt=""
          aria-hidden="true"
          width={1400}
          height={1015}
          className={`${styles.logo} ${styles.logoOnDark}`}
        />
      </div>
      <div className={styles.copy}>
        <p className={styles.headline}>Do you have what it takes?</p>
        <Link href="/40under40/" className={styles.cta}>
          Apply Here
        </Link>
      </div>
    </section>
  );
}
