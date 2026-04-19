import { useEffect, useCallback, useState, useRef } from "react";
import styles from "../styles/video-modal.module.css";

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("es-PR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function pickSources(item) {
  const list = Array.isArray(item?.sources) ? item.sources : [];
  if (list.length === 0) return [];
  const out = [];
  const hls = list.find(
    (s) => s && s.file && s.type === "application/vnd.apple.mpegurl"
  );
  if (hls) out.push({ src: hls.file, type: "application/x-mpegURL" });
  const mp4s = list
    .filter((s) => s && s.file && s.type === "video/mp4")
    .sort((a, b) => (b.height || 0) - (a.height || 0));
  for (const s of mp4s) out.push({ src: s.file, type: "video/mp4" });
  return out;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function VideoModal({
  videos,
  startIndex = 0,
  mediaid,
  variant,
  onClose,
}) {
  const isShorts =
    variant === "shorts" || (variant !== "default" && Array.isArray(videos) && videos.length > 0);

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

  const overlayRef = useRef(null);
  const closeBtnRef = useRef(null);
  const previousFocusRef = useRef(null);
  const videoElRef = useRef(null);
  const playerRef = useRef(null);

  const activeSources = isShorts ? pickSources(active) : [];
  const useVideoJs = isShorts && activeSources.length > 0;

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
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (isShorts && total > 1) {
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          next();
          return;
        }
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          prev();
          return;
        }
      }
      if (e.key === "Tab" && overlayRef.current) {
        const focusables = overlayRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const activeEl = document.activeElement;
        if (e.shiftKey && activeEl === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && activeEl === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose, next, prev, isShorts, total]
  );

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    const focusTimer = window.setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 0);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      const prevFocus = previousFocusRef.current;
      if (prevFocus && typeof prevFocus.focus === "function") {
        prevFocus.focus();
      }
    };
  }, [handleKeyDown]);

  // Initialize video.js when the shorts variant has direct sources.
  useEffect(() => {
    if (!useVideoJs) return;
    let cancelled = false;
    let player;

    (async () => {
      const videojs = (await import("video.js")).default;
      if (cancelled || !videoElRef.current) return;

      player = videojs(videoElRef.current, {
        controls: true,
        autoplay: true,
        muted: true,
        loop: true,
        playsinline: true,
        preload: "auto",
        fill: true,
        userActions: { doubleClick: false },
        sources: pickSources(active),
      });

      player.on("volumechange", () => {
        if (!player.isDisposed()) setMuted(player.muted());
      });

      playerRef.current = player;
    })();

    return () => {
      cancelled = true;
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useVideoJs]);

  // Swap source when navigating between clips (no remount).
  useEffect(() => {
    const player = playerRef.current;
    if (!player || player.isDisposed()) return;
    const sources = pickSources(active);
    if (sources.length === 0) return;
    player.src(sources);
    const p = player.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }, [active]);

  const touchStart = useRef(null);
  const onTouchStart = (e) => {
    const t = e.touches[0];
    if (!t) return;
    touchStart.current = { y: t.clientY, x: t.clientX };
  };
  const onTouchEnd = (e) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    if (!t) { touchStart.current = null; return; }
    const dy = t.clientY - touchStart.current.y;
    const dx = t.clientX - touchStart.current.x;
    if (Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx)) {
      if (dy < 0) next();
      else prev();
    }
    touchStart.current = null;
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSoundOn = () => {
    const player = playerRef.current;
    if (player && !player.isDisposed()) {
      player.muted(false);
      const p = player.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
    setMuted(false);
  };

  if (!active) return null;

  if (!isShorts) {
    return (
      <div
        ref={overlayRef}
        className={styles.defaultOverlay}
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-label="Video player"
      >
        <div className={styles.defaultContainer}>
          <button
            ref={closeBtnRef}
            className={styles.defaultClose}
            onClick={onClose}
            aria-label="Cerrar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <iframe
            className={styles.defaultIframe}
            src={`https://astrovms.com/embed/${active.mediaid}`}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title="Video Player"
          />
        </div>
      </div>
    );
  }

  const fallbackSrc = `https://astrovms.com/embed/${active.mediaid}?autoplay=1&muted=${muted ? 1 : 0}`;

  return (
    <div
      ref={overlayRef}
      className={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={active.title || "Video player"}
    >
      <button
        ref={closeBtnRef}
        className={styles.close}
        onClick={onClose}
        aria-label="Cerrar"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div className={styles.stage} onClick={handleOverlayClick}>
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

        <div className={styles.player} data-vjs-player={useVideoJs ? "" : undefined}>
          {useVideoJs ? (
            <video
              ref={videoElRef}
              className={`video-js vjs-fill ${styles.videoEl}`}
              playsInline
            />
          ) : (
            <iframe
              key={`${active.mediaid}-${muted ? "m" : "u"}`}
              className={styles.iframe}
              src={fallbackSrc}
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
              title={active.title || "Video"}
            />
          )}
          {muted && (
            <button
              type="button"
              className={styles.soundHint}
              onClick={handleSoundOn}
              aria-label="Activar sonido"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              Activar sonido
            </button>
          )}
          <div
            className={styles.swipeArea}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            aria-hidden="true"
          />
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
