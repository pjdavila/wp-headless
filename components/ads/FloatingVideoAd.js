import { useCallback, useEffect, useRef, useState } from "react";
import { loadImaSdk } from "../../lib/imaSdk";
import styles from "../../styles/floatingVideoAd.module.css";

// Adserver.Online "slider" video zone. It is a VAST tag, so it cannot go
// through AdServerSlot/_ASO.loadAd; the IMA SDK reads it and plays the ad.
const VAST_TAG = "https://srv.aso1.net/vast?z=161518";

// Set once an ad has actually been shown (or closed) so the slider appears
// at most once per browser session, including across article navigations.
const SEEN_KEY = "cb-floating-video-ad-seen";

// Give up if IMA has not loaded an ad or started playback in this time.
const LOAD_WATCHDOG_MS = 15000;
const START_WATCHDOG_MS = 8000;

function alreadySeen() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {}
}

function VolumeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

function VolumeOnIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function FloatingVideoAd() {
  // active: the IMA request is in flight or the ad is on screen.
  // shown: IMA confirmed an ad (LOADED), so the player is visible.
  const [active, setActive] = useState(false);
  const [shown, setShown] = useState(false);
  const [muted, setMuted] = useState(true);
  const slotRef = useRef(null);
  const adContainerRef = useRef(null);
  const videoRef = useRef(null);
  const adsManagerRef = useRef(null);

  const finish = useCallback(() => {
    setShown(false);
    setActive(false);
  }, []);

  // Wait until the article is interactive and the browser is idle before
  // even downloading the IMA SDK, so the ad never competes with the page.
  useEffect(() => {
    if (alreadySeen()) return;
    let cancelled = false;
    let idleId = null;
    let timeoutId = null;

    const go = () => {
      if (!cancelled && !alreadySeen()) setActive(true);
    };
    const schedule = () => {
      if (cancelled) return;
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(go, { timeout: 4000 });
      } else {
        timeoutId = setTimeout(go, 1500);
      }
    };

    if (document.readyState === "complete") {
      schedule();
    } else {
      window.addEventListener("load", schedule, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", schedule);
      if (idleId !== null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    let disposed = false;
    let adDisplayContainer = null;
    let adsLoader = null;
    let adsManager = null;
    let watchdog = null;

    const armWatchdog = (ms) => {
      if (watchdog) clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        if (!disposed) finish();
      }, ms);
    };

    const slotSize = () => {
      const slot = slotRef.current;
      return {
        width: slot?.offsetWidth || 320,
        height: slot?.offsetHeight || 180,
      };
    };

    const handleResize = () => {
      const ima = window.google?.ima;
      if (!adsManager || !ima) return;
      const { width, height } = slotSize();
      try {
        adsManager.resize(width, height, ima.ViewMode.NORMAL);
      } catch {}
    };

    async function init() {
      armWatchdog(LOAD_WATCHDOG_MS);
      try {
        await loadImaSdk();
      } catch {
        // Blocked by an ad blocker or offline: stay hidden.
        if (!disposed) finish();
        return;
      }
      if (disposed || !adContainerRef.current || !videoRef.current) return;

      const ima = window.google.ima;
      const video = videoRef.current;

      try {
        adDisplayContainer = new ima.AdDisplayContainer(
          adContainerRef.current,
          video
        );
        adDisplayContainer.initialize();
        adsLoader = new ima.AdsLoader(adDisplayContainer);
        try {
          adsLoader
            .getSettings()
            .setVpaidMode(ima.ImaSdkSettings.VpaidMode.ENABLED);
        } catch {}

        adsLoader.addEventListener(
          ima.AdErrorEvent.Type.AD_ERROR,
          // Empty VAST (no fill), timeouts and media errors all land here.
          () => {
            if (!disposed) finish();
          },
          false
        );

        adsLoader.addEventListener(
          ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
          (evt) => {
            if (disposed) return;
            const settings = new ima.AdsRenderingSettings();
            settings.restoreCustomPlaybackStateOnAdBreakComplete = false;
            settings.uiElements = [
              ima.UiElements.AD_ATTRIBUTION,
              ima.UiElements.COUNTDOWN,
            ];
            adsManager = evt.getAdsManager(video, settings);
            adsManagerRef.current = adsManager;
            const T = ima.AdEvent.Type;

            adsManager.addEventListener(
              ima.AdErrorEvent.Type.AD_ERROR,
              () => {
                if (!disposed) finish();
              },
              false
            );
            adsManager.addEventListener(T.LOADED, () => {
              if (disposed) return;
              markSeen();
              setShown(true);
              armWatchdog(START_WATCHDOG_MS);
            });
            adsManager.addEventListener(T.STARTED, () => {
              if (watchdog) clearTimeout(watchdog);
              watchdog = null;
            });
            adsManager.addEventListener(T.VOLUME_CHANGED, () => {
              try {
                setMuted(adsManager.getVolume() === 0);
              } catch {}
            });
            adsManager.addEventListener(T.VOLUME_MUTED, () => setMuted(true));
            const done = () => {
              if (!disposed) finish();
            };
            adsManager.addEventListener(T.ALL_ADS_COMPLETED, done);
            adsManager.addEventListener(T.CONTENT_RESUME_REQUESTED, done);
            adsManager.addEventListener(T.SKIPPED, done);
            adsManager.addEventListener(T.USER_CLOSE, done);

            try {
              const { width, height } = slotSize();
              adsManager.init(width, height, ima.ViewMode.NORMAL);
              adsManager.setVolume(0);
              adsManager.start();
            } catch {
              finish();
            }
          },
          false
        );

        const { width, height } = slotSize();
        const request = new ima.AdsRequest();
        request.adTagUrl = VAST_TAG;
        request.linearAdSlotWidth = width;
        request.linearAdSlotHeight = height;
        request.nonLinearAdSlotWidth = width;
        request.nonLinearAdSlotHeight = height;
        request.vastLoadTimeout = 8000;
        request.setAdWillAutoPlay(true);
        request.setAdWillPlayMuted(true);
        adsLoader.requestAds(request);
      } catch {
        if (!disposed) finish();
      }
    }

    init();
    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      window.removeEventListener("resize", handleResize);
      if (watchdog) clearTimeout(watchdog);
      adsManagerRef.current = null;
      try {
        adsManager?.destroy();
      } catch {}
      try {
        adsLoader?.destroy();
      } catch {}
      try {
        adDisplayContainer?.destroy();
      } catch {}
    };
  }, [active, finish]);

  const toggleMute = () => {
    const manager = adsManagerRef.current;
    if (!manager) return;
    const next = !muted;
    try {
      manager.setVolume(next ? 0 : 1);
      setMuted(next);
    } catch {}
  };

  const handleClose = () => {
    markSeen();
    finish();
  };

  if (!active) return null;

  return (
    <div
      className={`${styles.wrapper} ${shown ? styles.shown : styles.pending}`}
      aria-hidden={shown ? undefined : true}
      role={shown ? "complementary" : undefined}
      aria-label={shown ? "Publicidad en video" : undefined}
    >
      <div className={styles.toolbar}>
        <span className={styles.label}>Publicidad</span>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btn}
            onClick={toggleMute}
            aria-label={muted ? "Activar sonido" : "Silenciar"}
            title={muted ? "Activar sonido" : "Silenciar"}
            tabIndex={shown ? 0 : -1}
          >
            {muted ? <VolumeOffIcon /> : <VolumeOnIcon />}
          </button>
          <button
            type="button"
            className={styles.btn}
            onClick={handleClose}
            aria-label="Cerrar anuncio"
            title="Cerrar anuncio"
            tabIndex={shown ? 0 : -1}
          >
            <CloseIcon />
          </button>
        </div>
      </div>
      <div ref={slotRef} className={styles.slot}>
        <video
          ref={videoRef}
          className={styles.video}
          muted
          playsInline
          preload="none"
        />
        <div ref={adContainerRef} className={styles.adContainer} />
      </div>
    </div>
  );
}
