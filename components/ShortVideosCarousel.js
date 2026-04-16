import { useState, useEffect, useRef, useCallback } from "react";
import VideoModal from "./VideoModal";
import styles from "../styles/short-videos-carousel.module.css";

function useVisibleCount() {
  const [count, setCount] = useState(4);

  useEffect(() => {
    function update() {
      if (window.innerWidth <= 640) setCount(1);
      else if (window.innerWidth <= 1024) setCount(2);
      else setCount(4);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return count;
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ShortVideosCarousel() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState(null);

  const total = videos.length;
  const visibleCount = useVisibleCount();
  const [index, setIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef(null);

  useEffect(() => {
    fetch("/api/shorts-playlist")
      .then((r) => r.json())
      .then((data) => {
        setVideos((data.videos || []).slice(0, 6));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const cloneCount = visibleCount;
  const clonedVideos =
    total > 0
      ? [...videos.slice(-cloneCount), ...videos, ...videos.slice(0, cloneCount)]
      : [];

  const goTo = useCallback(
    (newIndex) => {
      setIsTransitioning(true);
      setIndex(newIndex);
    },
    []
  );

  const next = useCallback(() => goTo(index + 1), [index, goTo]);
  const prev = useCallback(() => goTo(index - 1), [index, goTo]);

  useEffect(() => {
    if (paused || total === 0 || total <= visibleCount) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [paused, next, total, visibleCount]);

  const handleTransitionEnd = useCallback(() => {
    if (index >= total) {
      setIsTransitioning(false);
      setIndex(0);
    } else if (index < 0) {
      setIsTransitioning(false);
      setIndex(total - 1);
    }
  }, [index, total]);

  useEffect(() => {
    if (!isTransitioning && trackRef.current) {
      const frame = requestAnimationFrame(() => {
        setIsTransitioning(true);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [isTransitioning]);

  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.header}>
          <h2 className={styles.title}>Short Videos</h2>
        </div>
        <div className={styles.loading}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.loadingCard} />
          ))}
        </div>
      </section>
    );
  }

  if (total === 0) return null;

  const canLoop = total > visibleCount;
  const slidePercent = 100 / visibleCount;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Short Videos</h2>
      </div>

      <div
        className={styles.carousel}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          ref={trackRef}
          className={styles.track}
          style={{
            transform: canLoop
              ? `translateX(-${(index + cloneCount) * slidePercent}%)`
              : undefined,
            transition:
              canLoop && isTransitioning ? "transform 0.5s ease" : "none",
          }}
          onTransitionEnd={canLoop ? handleTransitionEnd : undefined}
        >
          {(canLoop ? clonedVideos : videos).map((video, i) => (
            <div
              key={`${video.mediaid}-${i}`}
              className={styles.slide}
              style={{ flex: `0 0 ${slidePercent}%` }}
            >
              <div
                className={styles.card}
                onClick={() => setActiveVideo(video.mediaid)}
              >
                <div className={styles.thumbWrap}>
                  <img
                    src={
                      video.images?.find((img) => img.width === 480)?.src ||
                      video.image
                    }
                    alt={video.title}
                    className={styles.thumb}
                    loading="lazy"
                  />
                  <div className={styles.playBtn}>
                    <span className={styles.playIcon} />
                  </div>
                  {video.duration > 0 && (
                    <span className={styles.duration}>
                      {formatDuration(video.duration)}
                    </span>
                  )}
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{video.title}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        {canLoop && (
          <>
            <button
              className={`${styles.arrow} ${styles.arrowLeft}`}
              onClick={prev}
              aria-label="Previous"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              className={`${styles.arrow} ${styles.arrowRight}`}
              onClick={next}
              aria-label="Next"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </button>

            <div className={styles.dots}>
              {videos.map((_, i) => (
                <button
                  key={i}
                  className={`${styles.dot} ${((index % total) + total) % total === i ? styles.dotActive : ""}`}
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {activeVideo && (
        <VideoModal
          mediaid={activeVideo}
          onClose={() => setActiveVideo(null)}
        />
      )}
    </section>
  );
}
