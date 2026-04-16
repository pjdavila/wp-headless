import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "../styles/featured-videos.module.css";

function formatDuration(seconds) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("es-PR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function PlayIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function MainCard({ video }) {
  const href = `/video/${video.mediaid}`;
  const thumbSrc =
    video.images?.find((img) => img.width >= 720)?.src || video.image;

  return (
    <Link href={href} className={styles.mainCard}>
      <div className={styles.mainThumbWrap}>
        {thumbSrc && (
          <img
            src={thumbSrc}
            alt={video.title}
            className={styles.mainThumb}
          />
        )}
        <div className={styles.mainOverlay} />
        <div className={styles.playOverlay}>
          <PlayIcon className={styles.playIcon} />
        </div>
        {video.duration > 0 && (
          <span className={styles.durationBadge}>
            {formatDuration(video.duration)}
          </span>
        )}
      </div>
      <div className={styles.mainContent}>
        <span className={styles.badge}>Video</span>
        <h3 className={styles.mainTitle}>{video.title}</h3>
        <div className={styles.mainMeta}>
          <span>Caribbean Business</span>
          {video.pubDate && (
            <>
              <span className={styles.mainMetaSep}>&bull;</span>
              <time>{formatDate(video.pubDate)}</time>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

function SideCard({ video }) {
  const href = `/video/${video.mediaid}`;
  const thumbSrc =
    video.images?.find((img) => img.width >= 320)?.src || video.image;

  return (
    <Link href={href} className={styles.sideCard}>
      <div className={styles.sideThumbWrap}>
        {thumbSrc && (
          <img
            src={thumbSrc}
            alt={video.title}
            className={styles.sideThumb}
            loading="lazy"
          />
        )}
        <div className={styles.sidePlayOverlay}>
          <PlayIcon className={styles.sidePlayIcon} />
        </div>
        {video.duration > 0 && (
          <span className={styles.durationBadge}>
            {formatDuration(video.duration)}
          </span>
        )}
      </div>
      <div className={styles.sideBody}>
        <span className={styles.sideBadge}>
          <span className={styles.sideBadgeDot} />
          Video
        </span>
        <h4 className={styles.sideTitle}>{video.title}</h4>
        <div className={styles.sideMeta}>
          <span>Caribbean Business</span>
          {video.pubDate && (
            <>
              <span className={styles.sideMetaSep}>&bull;</span>
              <time>{formatDate(video.pubDate)}</time>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonMain} />
      <div className={styles.skeletonSide}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.skeletonSideItem}>
            <div className={styles.skeletonSideThumb} />
            <div className={styles.skeletonSideText}>
              <div className={`${styles.skeletonLine}`} />
              <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FeaturedVideosWidget() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/astro-playlist")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setVideos((data.videos || []).slice(0, 4));
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.header}>
          <h2 className={styles.title}>Videos</h2>
        </div>
        <LoadingSkeleton />
      </section>
    );
  }

  if (videos.length === 0) return null;

  const [main, ...side] = videos;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Videos</h2>
        <Link href="/live" className={styles.viewAll}>
          Ver todo
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>

      <div className={styles.grid}>
        <MainCard video={main} />
        <div className={styles.sideList}>
          {side.map((v) => (
            <SideCard key={v.mediaid} video={v} />
          ))}
        </div>
      </div>
    </section>
  );
}
