import { useEffect, useRef, useState, useCallback } from "react";
import styles from "../styles/live.module.css";

const HLS_URL =
  "https://pvqyb68gdz24-hls-live.5centscdn.com/vnm/033977cd45e8d7a87c4fc453d18e20c3.sdp/playlist.m3u8";
const VAST_TAG =
  "https://astrovms.com/api/vast/e707df66-f0cb-468f-be7b-eed24400f467";
const IMA_SDK_URL = "https://imasdk.googleapis.com/js/sdkloader/ima3.js";

let imaSdkPromise = null;

function loadImaSdk() {
  if (imaSdkPromise) return imaSdkPromise;

  imaSdkPromise = new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.google?.ima) {
      resolve();
      return;
    }
    const stale = document.querySelector(`script[src="${IMA_SDK_URL}"]`);
    if (stale) stale.remove();

    const timeout = setTimeout(() => {
      reject(new Error("IMA SDK load timed out"));
    }, 8000);

    const script = document.createElement("script");
    script.src = IMA_SDK_URL;
    script.async = true;
    script.onload = () => {
      clearTimeout(timeout);
      window.google?.ima
        ? resolve()
        : reject(new Error("IMA SDK loaded but google.ima not available"));
    };
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Failed to load IMA SDK"));
    };
    document.head.appendChild(script);
  });

  imaSdkPromise.catch(() => {
    imaSdkPromise = null;
  });
  return imaSdkPromise;
}

export default function LivePlayer() {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const adPausedRef = useRef(false);
  const [status, setStatus] = useState("loading"); // loading | live | offair
  const [checking, setChecking] = useState(false);
  const [adActive, setAdActive] = useState(false);
  const [adPaused, setAdPaused] = useState(false);

  const updateAdPaused = useCallback((value) => {
    adPausedRef.current = value;
    setAdPaused(value);
  }, []);

  const handleAdToggle = useCallback(
    (e) => {
      e.stopPropagation();
      e.preventDefault();
      const player = playerRef.current;
      if (!player || player.isDisposed()) {
        console.warn("Ad toggle: no player available");
        return;
      }
      const ima = player.ima;
      const wasPaused = adPausedRef.current;
      console.info(
        "Ad toggle clicked. wasPaused:",
        wasPaused,
        "ima available:",
        Boolean(ima),
        "pauseAd:",
        typeof ima?.pauseAd,
        "resumeAd:",
        typeof ima?.resumeAd
      );
      try {
        if (wasPaused) {
          if (ima && typeof ima.resumeAd === "function") {
            ima.resumeAd();
            console.info("Ad toggle: called ima.resumeAd()");
          } else {
            const p = player.play();
            if (p && typeof p.catch === "function") p.catch(() => {});
            console.info("Ad toggle: called player.play() fallback");
          }
        } else {
          if (ima && typeof ima.pauseAd === "function") {
            ima.pauseAd();
            console.info("Ad toggle: called ima.pauseAd()");
          } else {
            player.pause();
            console.info("Ad toggle: called player.pause() fallback");
          }
        }
        // Optimistic flip; the IMA AdEvent listener will reconcile.
        updateAdPaused(!wasPaused);
      } catch (err) {
        console.warn("Ad toggle failed:", err);
      }
    },
    [updateAdPaused]
  );

  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const r = await fetch("/api/live-status", { cache: "no-store" });
      const data = await r.json();
      setStatus(data.live ? "live" : "offair");
    } catch {
      setStatus("offair");
    } finally {
      setChecking(false);
    }
  }, []);

  // Initial check
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Auto-retry every 30s while off-air
  useEffect(() => {
    if (status !== "offair") return;
    const id = setInterval(checkStatus, 30000);
    return () => clearInterval(id);
  }, [status, checkStatus]);

  // Init video.js when status is live
  useEffect(() => {
    if (status !== "live") return;
    let cancelled = false;
    let player;

    async function init() {
      const videojs = (await import("video.js")).default;

      try {
        await import("videojs-contrib-quality-levels");
        await import("videojs-hls-quality-selector");
      } catch (e) {
        console.warn("Quality selector unavailable:", e.message);
      }

      let imaReady = false;
      try {
        await loadImaSdk();
        await import("videojs-contrib-ads");
        await import("videojs-ima");
        imaReady = true;
      } catch (e) {
        console.warn("IMA SDK unavailable, playing without ads:", e.message);
      }

      if (cancelled || !videoRef.current) return;

      player = videojs(videoRef.current, {
        controls: true,
        autoplay: true,
        muted: true,
        preload: "auto",
        fluid: true,
        liveui: true,
        userActions: {
          click: false,
          doubleClick: false,
        },
        html5: {
          vhs: {
            overrideNative: true,
            enableLowInitialPlaylist: true,
          },
        },
        sources: [
          {
            src: HLS_URL,
            type: "application/x-mpegURL",
          },
        ],
      });

      const handlePlayerError = () => {
        const err = player.error && player.error();
        if (!err || err.code === 2 || err.code === 4) {
          setStatus("offair");
        }
      };
      player.on("error", handlePlayerError);
      player.ready(() => {
        const tech = player.tech && player.tech({ IWillNotUseThisInPlugins: true });
        if (tech && typeof tech.on === "function") {
          tech.on("error", handlePlayerError);
        }
        if (typeof player.hlsQualitySelector === "function") {
          try {
            player.hlsQualitySelector({ displayCurrentQuality: true });
          } catch (e) {
            console.warn("hlsQualitySelector init failed:", e);
          }
        }
      });

      if (imaReady) {
        player.ready(() => {
          if (typeof player.ima !== "function") return;
          try {
            const imaSettings = {
              adTagUrl: VAST_TAG,
              debug: false,
              showControlsForJSAds: true,
              adWillAutoPlay: true,
              adWillPlayMuted: true,
            };
            if (window.google?.ima?.ImaSdkSettings?.VpaidMode) {
              imaSettings.vpaidMode =
                window.google.ima.ImaSdkSettings.VpaidMode.ENABLED;
            }
            player.ima(imaSettings);

            if (typeof player.ima.initializeAdDisplayContainer === "function") {
              try {
                player.ima.initializeAdDisplayContainer();
              } catch (e) {
                console.warn("IMA initializeAdDisplayContainer failed:", e);
              }
            }

            player.one("play", () => {
              if (typeof player.ima?.requestAds === "function") {
                try {
                  player.ima.requestAds();
                  console.info("IMA: requestAds() called on first play");
                } catch (e) {
                  console.warn("IMA requestAds failed:", e);
                }
              }
            });

            player.on("ads-ad-started", () => {
              console.info("IMA: ad started");
              setAdActive(true);
              updateAdPaused(false);
            });
            const clearAd = () => {
              setAdActive(false);
              updateAdPaused(false);
            };
            player.on("ads-ad-ended", () => {
              console.info("IMA: ad ended");
              clearAd();
            });
            player.on("ads-ad-skipped", clearAd);
            player.on("ads-content-resumed", clearAd);
            player.on("adserror", (e) => {
              console.warn("IMA: adserror", e?.data || e);
              clearAd();
            });

            // Fallback sync from player events for edge cases where IMA
            // events arrive out of order (e.g., during ad/content transition).
            const isInAd = () => {
              try {
                return Boolean(
                  player.ads &&
                    player.ads.isInAdMode &&
                    player.ads.isInAdMode()
                );
              } catch {
                return false;
              }
            };
            player.on("pause", () => {
              if (isInAd()) updateAdPaused(true);
            });
            player.on("play", () => {
              if (isInAd()) updateAdPaused(false);
            });

            // IMA SDK fires PAUSED/RESUMED on its adsManager but does not
            // re-broadcast them as player events. Hook them via 'ads-manager'.
            player.on("ads-manager", (evt) => {
              const adsManager = evt?.adsManager;
              const AdEventType = window.google?.ima?.AdEvent?.Type;
              if (!adsManager || !AdEventType) return;
              try {
                adsManager.addEventListener(AdEventType.PAUSED, () =>
                  updateAdPaused(true)
                );
                adsManager.addEventListener(AdEventType.RESUMED, () =>
                  updateAdPaused(false)
                );
                adsManager.addEventListener(AdEventType.STARTED, () =>
                  updateAdPaused(false)
                );
              } catch (err) {
                console.warn("IMA adsManager listener attach failed:", err);
              }
            });
          } catch (e) {
            console.warn("IMA setup failed, continuing without ads:", e);
          }
        });
      }

      playerRef.current = player;
    }

    init();

    return () => {
      cancelled = true;
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [status]);

  if (status === "offair") {
    return (
      <div className={styles.offAirPanel}>
        <div className={styles.offAirInner}>
          <div className={styles.offAirIcon} aria-hidden="true">
            <img
              src="https://img.caribbean.business/Logo-CB-White.png"
              alt="Caribbean Business"
              className={styles.offAirLogo}
            />
          </div>
          <h2 className={styles.offAirTitle}>
            No estamos transmitiendo en estos momentos
          </h2>
          <p className={styles.offAirSubtitle}>
            Vuelve pronto. Estamos preparando la próxima transmisión.
          </p>
          <button
            type="button"
            className={styles.offAirBtn}
            onClick={checkStatus}
            disabled={checking}
          >
            {checking ? "Comprobando…" : "Reintentar"}
          </button>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className={styles.offAirPanel}>
        <div className={styles.offAirInner}>
          <p className={styles.offAirSubtitle}>Cargando transmisión…</p>
        </div>
      </div>
    );
  }

  return (
    <div data-vjs-player className={styles.vjsHost}>
      <video
        ref={videoRef}
        className="video-js vjs-big-play-centered vjs-theme-cb"
        playsInline
      />
      {adActive && (
        <button
          type="button"
          className={styles.adPlayPauseBtn}
          onClick={handleAdToggle}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label={adPaused ? "Reanudar anuncio" : "Pausar anuncio"}
          title={adPaused ? "Reanudar anuncio" : "Pausar anuncio"}
        >
          {adPaused ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M6 5h4v14H6zM14 5h4v14h-4z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
