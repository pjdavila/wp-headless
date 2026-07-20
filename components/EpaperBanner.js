import Link from "next/link";
import Image from "next/image";
import { useMagazineCover } from "../lib/useMagazineCover";
import styles from "../styles/epaper-banner.module.css";

const FALLBACK_COVER_SRC = "/epaper/portada-actual.webp";

export default function EpaperBanner() {
  const cover = useMagazineCover();
  const coverSrc = cover?.thumbnailUrl || FALLBACK_COVER_SRC;

  return (
    <Link
      href="/magazine/"
      className={styles.banner}
      aria-label="Latest edition of Caribbean Business: open the magazine"
    >
      <div className={styles.coversWrap} aria-hidden="true">
        <div className={`${styles.cover} ${styles.coverBack}`} />
        <div className={`${styles.cover} ${styles.coverMid}`} />
        <div className={`${styles.cover} ${styles.coverFront}`}>
          <Image
            key={coverSrc}
            src={coverSrc}
            alt="Caribbean Business latest edition cover"
            fill
            sizes="(max-width: 640px) 90px, 130px"
            className={styles.coverImg}
          />
        </div>
      </div>

      <div className={styles.text}>
        <span className={`${styles.title} text-[20px]`}>Latest Edition</span>
      </div>

      <span className={styles.arrow} aria-hidden="true">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </span>
    </Link>
  );
}
