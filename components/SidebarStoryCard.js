import Link from "next/link";
import Image from "next/image";
import styles from "../styles/sidebar-story-card.module.css";

function relativeTime(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return "hace un momento";
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return `hace ${m} min`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return `hace ${h}h`;
  }
  if (diff < 604800) {
    const d = Math.floor(diff / 86400);
    return `hace ${d}d`;
  }
  return new Date(dateStr).toLocaleDateString("es-ES", {
    month: "short",
    day: "numeric",
  });
}

export default function SidebarStoryCard({ post, index }) {
  const { title, uri, date, featuredImage } = post;
  const imgSrc = featuredImage?.node?.sourceUrl;
  const imgAlt = featuredImage?.node?.altText || title;

  return (
    <article className={styles.card}>
      {typeof index === "number" && (
        <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
      )}
      {imgSrc && (
        <Link href={uri} className={styles.thumbWrap}>
          <Image
            src={imgSrc}
            alt={imgAlt}
            fill
            sizes="64px"
            className={styles.thumb}
          />
        </Link>
      )}
      <div className={styles.body}>
        <h4 className={styles.title}>
          <Link href={uri} className={styles.titleLink}>
            {title}
          </Link>
        </h4>
        {date && <time className={styles.time} dateTime={date}>{relativeTime(date)}</time>}
      </div>
    </article>
  );
}
