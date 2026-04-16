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
  const [status, setStatus] = useState("loading"); // loading | live | offair
  const [checking, setChecking] = useState(false);

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

      player.on("error", () => {
        const err = player.error();
        if (err && (err.code === 2 || err.code === 4)) {
          setStatus("offair");
        }
      });

      if (imaReady) {
        player.ready(() => {
          if (typeof player.ima === "function") {
            player.ima({ adTagUrl: VAST_TAG });
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
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
              <polyline points="17 2 12 7 7 2" />
              <line x1="3" y1="3" x2="21" y2="21" />
            </svg>
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
    <div data-vjs-player>
      <video
        ref={videoRef}
        className="video-js vjs-big-play-centered vjs-theme-cb"
        playsInline
      />
    </div>
  );
}
