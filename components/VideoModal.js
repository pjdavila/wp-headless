import { useEffect, useCallback, useState, useRef } from "react";
import AdServerSlot from "./AdServerSlot";
import { videoPath } from "../lib/videoUrl";
import styles from "../styles/video-modal.module.css";

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("es-PR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const HLS_MIMES = new Set([
  "application/vnd.apple.mpegurl",
  "application/x-mpegurl",
  "application/x-mpegURL",
  "vnd.apple.mpegurl",
]);

function pickSources(item) {
  const list = Array.isArray(item?.sources) ? item.sources : [];
  if (list.length === 0) return [];
  const out = [];
  const seen = new Set();
  const push = (src, type) => {
    if (!src || seen.has(src)) return;
    seen.add(src);
    out.push({ src, type });
  };

  const mp4s = list.filter((s) => s && s.file && s.type === "video/mp4");
  const mp4_720 = mp4s.find((s) => (s.height || 0) === 720 || s.label === "720p");
  if (mp4_720) push(mp4_720.file, "video/mp4");
  const mp4_360 = mp4s.find((s) => (s.height || 0) === 360 || s.label === "360p");
  if (mp4_360) push(mp4_360.file, "video/mp4");
  for (const s of mp4s) push(s.file, "video/mp4");

  const hls = list.find(
    (s) => s && s.file && typeof s.type === "string" && HLS_MIMES.has(s.type.toLowerCase())
  );
  if (hls) push(hls.file, "application/x-mpegURL");

  return out;
}

function pickPoster(video) {
  const sized =
    (video?.images || []).find((im) => im.width === 480) ||
    (video?.images || []).find((im) => im.width >= 320);
  return sized?.src || video?.image || "";
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

const MOBILE_BREAKPOINT = "(max-width: 768px)";

function ShortsMobileFeed({
  list,
  index,
  setIndex,
  muted,
  onToggleMute,
  onShare,
  expanded,
  toggleExpanded,
}) {
  const feedRef = useRef(null);
  const sectionRefs = useRef([]);
  const externalScrollLock = useRef(false);
  const programmaticScroll = useRef(false);

  // Scroll to active section when index changes from outside (keyboard, init).
  useEffect(() => {
    const section = sectionRefs.current[index];
    const feed = feedRef.current;
    if (!section || !feed) return;
    const sRect = section.getBoundingClientRect();
    const fRect = feed.getBoundingClientRect();
    if (Math.abs(sRect.top - fRect.top) > 8) {
      programmaticScroll.current = true;
      externalScrollLock.current = true;
      section.scrollIntoView({ behavior: "auto", block: "start" });
      setTimeout(() => {
        externalScrollLock.current = false;
      }, 250);
    }
  }, [index]);

  // IntersectionObserver: update index when a section is mostly visible.
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (externalScrollLock.current) return;
        let best = null;
        for (const e of entries) {
          if (e.isIntersecting && (!best || e.intersectionRatio > best.intersectionRatio)) {
            best = e;
          }
        }
        if (best) {
          const idx = Number(best.target.getAttribute("data-idx"));
          if (!Number.isNaN(idx)) setIndex(idx);
        }
      },
      { root: feed, threshold: [0.55] }
    );
    sectionRefs.current.forEach((s) => s && io.observe(s));
    return () => io.disconnect();
  }, [list.length, setIndex]);

  return (
    <div ref={feedRef} className={styles.feed} role="list">
      {list.map((video, i) => {
        const isActive = i === index;
        const sources = pickSources(video);
        const mp4 = sources.find((s) => s.type === "video/mp4");
        const poster = pickPoster(video);
        const hasLongDesc = (video.description || "").length > 90;
        return (
          <section
            key={`${video.mediaid}-${i}`}
            ref={(el) => (sectionRefs.current[i] = el)}
            data-idx={i}
            className={styles.feedItem}
            role="listitem"
            aria-label={video.title}
          >
            <div className={styles.feedPlayer}>
              {isActive && mp4 ? (
                <ActiveNativeVideo src={mp4.src} poster={poster} muted={muted} />
              ) : isActive && !mp4 ? (
                <iframe
                  className={styles.feedIframe}
                  src={`https://astrovms.com/embed/${video.mediaid}?autoplay=1&muted=${muted ? 1 : 0}`}
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  allowFullScreen
                  title={video.title || "Video"}
                />
              ) : (
                poster && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className={styles.feedPoster}
                    src={poster}
                    alt=""
                    loading="lazy"
                  />
                )
              )}

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={onToggleMute}
                  aria-label={muted ? "Activar sonido" : "Silenciar"}
                >
                  {muted ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={onShare}
                  aria-label="Compartir"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </button>
              </div>

              <div className={styles.mobileMeta}>
                {video.title && <h3 className={styles.mobileTitle}>{video.title}</h3>}
                {video.pubDate && (
                  <time className={styles.mobileDate} dateTime={video.pubDate}>
                    {formatDate(video.pubDate)}
                  </time>
                )}
                {video.description && (
                  <>
                    <p
                      className={`${styles.mobileDescription} ${
                        isActive && expanded ? styles.mobileDescriptionExpanded : ""
                      }`}
                    >
                      {video.description}
                    </p>
                    {hasLongDesc && isActive && (
                      <button
                        type="button"
                        className={styles.moreBtn}
                        onClick={toggleExpanded}
                      >
                        {expanded ? "menos" : "más"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ActiveNativeVideo({ src, poster, muted }) {
  const ref = useRef(null);
  const [paused, setPaused] = useState(false);
  const [showBig, setShowBig] = useState(false);
  const hideTimerRef = useRef(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = muted;
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }, [src, muted]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    setShowBig(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (v.paused) {
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
      hideTimerRef.current = setTimeout(() => setShowBig(false), 600);
    } else {
      v.pause();
    }
  };

  return (
    <>
      <video
        ref={ref}
        className={styles.feedVideo}
        src={src}
        poster={poster}
        autoPlay
        loop
        playsInline
        preload="auto"
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        onClick={toggle}
      />
      <button
        type="button"
        className={`${styles.bigPlayBtn} ${!paused && !showBig ? styles.bigPlayBtnHidden : ""}`}
        onClick={(e) => { e.stopPropagation(); toggle(); }}
        aria-label={paused ? "Reproducir" : "Pausar"}
      >
        {paused ? (
          <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M9 5v14l10-7z" />
          </svg>
        ) : (
          <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        )}
      </button>
    </>
  );
}

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [showBigBtn, setShowBigBtn] = useState(true);
  const [toast, setToast] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const total = list.length;
  const active = list[index];

  const overlayRef = useRef(null);
  const closeBtnRef = useRef(null);
  const previousFocusRef = useRef(null);
  const videoElRef = useRef(null);
  const playerRef = useRef(null);
  const hideBtnTimerRef = useRef(null);
  const toastTimerRef = useRef(null);

  // Detect mobile breakpoint (must match CSS @media).
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(MOBILE_BREAKPOINT);
    const update = () => setIsMobile(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener("change", update);
    else mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", update);
      else mq.removeListener(update);
    };
  }, []);

  // Reset description expansion on clip change.
  useEffect(() => {
    setExpanded(false);
  }, [index]);

  const activeSources = isShorts ? pickSources(active) : [];
  // Only use video.js on desktop (mobile uses native <video> per feed item).
  const useVideoJs = isShorts && !isMobile && activeSources.length > 0;

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

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 2200);
  }, []);

  const handleShare = useCallback(async () => {
    if (!active) return;
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${videoPath(active)}/`
        : active.link || "";
    const shareData = {
      title: active.title || "Caribbean Business",
      text: active.title || "",
      url,
    };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        showToast("Enlace copiado");
        return;
      }
    } catch {}
    showToast("No se pudo compartir");
  }, [active, showToast]);

  const handleToggleMute = useCallback(() => {
    const player = playerRef.current;
    if (player && !player.isDisposed()) {
      const newMuted = !player.muted();
      player.muted(newMuted);
      if (!newMuted) {
        const p = player.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
      setMuted(newMuted);
    } else {
      setMuted((m) => !m);
    }
  }, []);

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

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, []);

  // Initialize video.js (desktop only).
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

      const scheduleHide = () => {
        if (hideBtnTimerRef.current) clearTimeout(hideBtnTimerRef.current);
        hideBtnTimerRef.current = setTimeout(() => setShowBigBtn(false), 600);
      };
      const cancelHide = () => {
        if (hideBtnTimerRef.current) {
          clearTimeout(hideBtnTimerRef.current);
          hideBtnTimerRef.current = null;
        }
      };

      player.on("play", () => { setIsPlaying(true); scheduleHide(); });
      player.on("playing", () => { setIsPlaying(true); scheduleHide(); });
      player.on("pause", () => { setIsPlaying(false); cancelHide(); setShowBigBtn(true); });
      player.on("waiting", () => { cancelHide(); setShowBigBtn(true); });
      player.on("ended", () => { setIsPlaying(false); setShowBigBtn(true); });

      playerRef.current = player;
    })();

    return () => {
      cancelled = true;
      if (hideBtnTimerRef.current) {
        clearTimeout(hideBtnTimerRef.current);
        hideBtnTimerRef.current = null;
      }
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useVideoJs]);

  // Swap source when navigating between clips on desktop.
  useEffect(() => {
    const player = playerRef.current;
    if (!player || player.isDisposed()) return;
    const sources = pickSources(active);
    if (sources.length === 0) return;
    player.src(sources);
    const p = player.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }, [active]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const togglePlay = () => {
    const player = playerRef.current;
    if (!player || player.isDisposed()) return;
    setShowBigBtn(true);
    if (hideBtnTimerRef.current) {
      clearTimeout(hideBtnTimerRef.current);
      hideBtnTimerRef.current = null;
    }
    if (player.paused()) {
      const p = player.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      player.pause();
    }
  };

  const handlePlayerClick = (e) => {
    if (!useVideoJs) return;
    if (e.target && typeof e.target.closest === "function" &&
        e.target.closest(".vjs-control-bar, .vjs-menu, .vjs-button, ." + styles.soundHint + ", ." + styles.bigPlayBtn + ", ." + styles.actionBtn)) {
      return;
    }
    togglePlay();
  };

  const handleSoundOn = useCallback(() => {
    const player = playerRef.current;
    if (player && !player.isDisposed()) {
      player.muted(false);
      const p = player.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
    setMuted(false);
  }, []);

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

      {total > 1 && (
        <div className={styles.progress} aria-hidden="true">
          {list.map((_, i) => (
            <span
              key={i}
              className={`${styles.segment} ${
                i === index
                  ? styles.segmentActive
                  : i < index
                  ? styles.segmentDone
                  : ""
              }`}
            />
          ))}
        </div>
      )}

      {isMobile ? (
        <ShortsMobileFeed
          list={list}
          index={index}
          setIndex={(i) => goTo(i)}
          muted={muted}
          onToggleMute={handleToggleMute}
          onShare={handleShare}
          expanded={expanded}
          toggleExpanded={() => setExpanded((v) => !v)}
        />
      ) : (
        <>
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

            <div
              className={styles.player}
              data-vjs-player={useVideoJs ? "" : undefined}
              onClick={useVideoJs ? handlePlayerClick : undefined}
            >
              {useVideoJs ? (
                <>
                  <video
                    ref={videoElRef}
                    className={`video-js vjs-fill ${styles.videoEl}`}
                    playsInline
                  />
                  <button
                    type="button"
                    className={`${styles.bigPlayBtn} ${isPlaying && !showBigBtn ? styles.bigPlayBtnHidden : ""}`}
                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                    aria-label={isPlaying ? "Pausar" : "Reproducir"}
                  >
                    {isPlaying ? (
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <rect x="6" y="5" width="4" height="14" rx="1" />
                        <rect x="14" y="5" width="4" height="14" rx="1" />
                      </svg>
                    ) : (
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M9 5v14l10-7z" />
                      </svg>
                    )}
                  </button>
                </>
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

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={(e) => { e.stopPropagation(); handleToggleMute(); }}
                  aria-label={muted ? "Activar sonido" : "Silenciar"}
                >
                    {muted ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
                        <line x1="23" y1="9" x2="17" y2="15" />
                        <line x1="17" y1="9" x2="23" y2="15" />
                      </svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                      </svg>
                    )}
                </button>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={(e) => { e.stopPropagation(); handleShare(); }}
                  aria-label="Compartir"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </button>
              </div>

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
            <div className={styles.brandChip}>
              <span className={styles.brandDot} aria-hidden="true" />
              Caribbean Business
            </div>
            {active.title && <h3 className={styles.metaTitle}>{active.title}</h3>}
            {active.pubDate && (
              <time className={styles.metaDate} dateTime={active.pubDate}>
                {formatDate(active.pubDate)}
              </time>
            )}
            {active.description && (
              <p className={styles.metaDescription}>{active.description}</p>
            )}
            <div className={styles.metaAd}>
              <AdServerSlot zone="161655" width={300} height={250} />
            </div>
            {total > 1 && (
              <div className={styles.counter}>
                {index + 1} / {total}
              </div>
            )}
          </aside>
        </>
      )}

      {muted && (
        <button
          type="button"
          className={styles.soundHint}
          onClick={(e) => { e.stopPropagation(); handleSoundOn(); }}
          aria-label="Activar sonido"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
          Activar sonido
        </button>
      )}

      {toast && (
        <div className={styles.toast} role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}
