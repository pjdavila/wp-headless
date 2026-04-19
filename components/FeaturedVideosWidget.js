import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "../styles/featured-videos.module.css";

const BUNNY_LIBRARY_ID = "638514";

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

function VolumeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function LoadingSkeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonPlayer} />
      <div className={styles.skeletonTabs}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.skeletonTab}>
            <div className={styles.skeletonTabThumb} />
            <div className={styles.skeletonLine} />
            <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FeaturedVideosWidget() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/cbtv-playlist")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setVideos((data.videos || []).slice(0, 3));
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
          <h2 className={styles.title}>
            <Image
              src="/cb-videos-logo.webp"
              alt="CB Videos"
              width={180}
              height={42}
              className={styles.titleLogo}
              priority
            />
          </h2>
        </div>
        <LoadingSkeleton />
      </section>
    );
  }

  if (videos.length === 0) return null;

  const active = videos[activeIndex] || videos[0];
  const muted = !hasInteracted;
  const playerSrc = `https://player.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${active.mediaid}?autoplay=true&loop=false&muted=${muted}&preload=true&responsive=true`;

  const handleSelect = (i) => {
    setHasInteracted(true);
    setActiveIndex(i);
  };

  const dismissHint = () => setHasInteracted(true);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <Image
            src="/cb-videos-logo.webp"
            alt="CB Videos"
            width={180}
            height={42}
            className={styles.titleLogo}
            priority
          />
        </h2>
        <Link href="/live" className={styles.viewAll}>
          Ver todo
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>

      <div className={styles.playerWrap}>
        <iframe
          key={`${active.mediaid}-${muted ? "m" : "s"}`}
          className={`${styles.playerIframe} ${styles.playerFade}`}
          src={playerSrc}
          loading="lazy"
          allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
          allowFullScreen
          title={active.title}
        />
        <div className={styles.nowPlaying}>
          <span className={styles.nowDot} />
          Now Playing
        </div>
        {muted && (
          <button
            type="button"
            className={styles.soundHint}
            onClick={dismissHint}
            aria-label="Click for sound"
          >
            <VolumeIcon />
            Click for Sound
          </button>
        )}
      </div>

      <div className={styles.metaStrip}>
        <h3 className={styles.activeTitle}>{active.title}</h3>
        <div className={styles.activeMeta}>
          {active.pubDate && (
            <time dateTime={active.pubDate}>{formatDate(active.pubDate)}</time>
          )}
          {active.duration > 0 && (
            <>
              <span className={styles.metaSep}>&middot;</span>
              <span>{formatDuration(active.duration)}</span>
            </>
          )}
        </div>
      </div>

      <div className={styles.tabsRow} role="tablist">
        {videos.map((v, i) => {
          const isActive = i === activeIndex;
          const thumbSrc = v.images?.find((img) => img.width >= 480)?.src || v.image;
          return (
            <button
              key={v.mediaid}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-pressed={isActive}
              className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
              onClick={() => handleSelect(i)}
            >
              <div className={styles.tabThumbWrap}>
                {thumbSrc && (
                  <img
                    src={thumbSrc}
                    alt={v.title}
                    className={styles.tabThumb}
                    loading="lazy"
                  />
                )}
                <div className={styles.tabPlayOverlay}>
                  <PlayIcon className={styles.tabPlayIcon} />
                </div>
                {v.duration > 0 && (
                  <span className={styles.tabDuration}>
                    {formatDuration(v.duration)}
                  </span>
                )}
                {isActive && <span className={styles.tabActiveBadge}>On Air</span>}
              </div>
              <div className={styles.tabBody}>
                <span className={styles.tabTitle}>{v.title}</span>
                {v.pubDate && (
                  <span className={styles.tabDate}>{formatDate(v.pubDate)}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
