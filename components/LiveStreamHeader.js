import styles from "../styles/live.module.css";

export default function LiveStreamHeader({
  title = "Caribbean Business Live",
  subtitle = "Broadcasting from Puerto Rico",
}) {
  return (
    <div className={styles.streamHeader}>
      <div className={styles.headerMain}>
        <span className={styles.liveBadge}>
          <span className={styles.liveDot} aria-hidden="true" />
          Live
        </span>
        <div className={styles.titleGroup}>
          <h1 className={styles.streamTitle}>{title}</h1>
          <p className={styles.streamSubtitle}>{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
