import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "../styles/epaper-banner.module.css";

function formatDate(date) {
  const formatted = new Intl.DateTimeFormat("es-PR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Puerto_Rico",
  }).format(date);
  return formatted.toLowerCase();
}

function isoDate(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Puerto_Rico",
  }).format(date);
  return parts;
}

export default function EpaperBanner() {
  const [dateLabel, setDateLabel] = useState("");
  const [dateIso, setDateIso] = useState("");

  useEffect(() => {
    const now = new Date();
    setDateLabel(formatDate(now));
    setDateIso(isoDate(now));
  }, []);

  return (
    <Link
      href="/edicion-impresa/"
      className={styles.banner}
      aria-label="Última edición de Caribbean Business: ver edición impresa"
    >
      <div className={styles.coversWrap} aria-hidden="true">
        <div className={`${styles.cover} ${styles.coverBack}`} />
        <div className={`${styles.cover} ${styles.coverMid}`} />
        <div className={`${styles.cover} ${styles.coverFront}`}>
          <Image
            src="/epaper/portada-actual.webp"
            alt="Portada del día de Caribbean Business"
            fill
            sizes="(max-width: 640px) 90px, 130px"
            className={styles.coverImg}
          />
        </div>
      </div>

      <div className={styles.text}>
        <span className={styles.title}>Última Edición</span>
        {dateLabel ? (
          <time className={styles.date} dateTime={dateIso}>
            {dateLabel}
          </time>
        ) : (
          <span className={styles.date} aria-hidden="true">
            &nbsp;
          </span>
        )}
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
