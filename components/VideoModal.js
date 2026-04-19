import { useEffect, useCallback, useState, useRef } from "react";
import styles from "../styles/video-modal.module.css";

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("es-PR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export default function VideoModal({
  videos,
  startIndex = 0,
  mediaid,
  onClose,
}) {
  const list = Array.isArray(videos) && videos.length
    ? videos
    : mediaid
    ? [{ mediaid, title: "", description: "", pubDate: null }]
    : [];

  const [index, setIndex] = useState(() => {
    if (mediaid && Array.isArray(videos)) {
      const i = videos.findIndex((v) => v.mediaid === mediaid);
      if (i >= 0) return i;
    }
    return Math.min(Math.max(0, startIndex), Math.max(0, list.length - 1));
  });
  const [muted, setMuted] = useState(true);
  const total = list.length;
  const active = list[index];

  const goTo = useCallback(
    (next) => {
      if (total === 0) return;
      const wrapped = ((next % total) + total) % total;
      setIndex(wrapped);
    },
    [total]
  );

  const prev = useCallback(() => goTo(index - 1), [goTo, index]);
  const next = useCallback(() => goTo(index + 1), [goTo, index]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    },
    [onClose, next, prev]
  );

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const touchStartY = useRef(null);
  const onTouchStart = (e) => {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  };
  const onTouchEnd = (e) => {
    if (touchStartY.current == null) return;
    const endY = e.changedTouches[0]?.clientY ?? touchStartY.current;
    const delta = endY - touchStartY.current;
    if (Math.abs(delta) > 50) {
      if (delta < 0) next();
      else prev();
    }
    touchStartY.current = null;
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!active) return null;

  const playerSrc = `https://astrovms.com/embed/${active.mediaid}?autoplay=1&muted=${muted ? 1 : 0}`;

  return (
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Video player"
    >
      <button
        className={styles.close}
        onClick={onClose}
        aria-label="Cerrar"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div className={styles.stage} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {total > 1 && (
          <button
            className={`${styles.navBtn} ${styles.navUp}`}
            onClick={prev}
            aria-label="Anterior"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        )}

        <div className={styles.player}>
          <iframe
            key={`${active.mediaid}-${muted ? "m" : "u"}`}
            className={styles.iframe}
            src={playerSrc}
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            title={active.title || "Video"}
          />
          {muted && (
            <button
              type="button"
              className={styles.soundHint}
              onClick={() => setMuted(false)}
              aria-label="Activar sonido"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              Activar sonido
            </button>
          )}
        </div>

        {total > 1 && (
          <button
            className={`${styles.navBtn} ${styles.navDown}`}
            onClick={next}
            aria-label="Siguiente"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}
      </div>

      <aside className={styles.meta}>
        {active.title && <h3 className={styles.metaTitle}>{active.title}</h3>}
        {active.pubDate && (
          <time className={styles.metaDate} dateTime={active.pubDate}>
            {formatDate(active.pubDate)}
          </time>
        )}
        {active.description && (
          <p className={styles.metaDescription}>{active.description}</p>
        )}
        {total > 1 && (
          <div className={styles.counter}>
            {index + 1} / {total}
          </div>
        )}
      </aside>
    </div>
  );
}
