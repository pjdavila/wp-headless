import { useRef, useEffect } from "react";

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
    const existing = document.querySelector(`script[src="${IMA_SDK_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => {
        window.google?.ima ? resolve() : reject(new Error("IMA SDK loaded but google.ima not available"));
      });
      existing.addEventListener("error", () => reject(new Error("Failed to load IMA SDK")));
      return;
    }
    const script = document.createElement("script");
    script.src = IMA_SDK_URL;
    script.async = true;
    script.onload = () => {
      window.google?.ima ? resolve() : reject(new Error("IMA SDK loaded but google.ima not available"));
    };
    script.onerror = () => reject(new Error("Failed to load IMA SDK"));
    document.head.appendChild(script);
  });

  imaSdkPromise.catch(() => { imaSdkPromise = null; });
  return imaSdkPromise;
}

export default function LivePlayer() {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  useEffect(() => {
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

      if (!videoRef.current) return;

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

      if (imaReady) {
        player.ready(() => {
          if (typeof player.ima === "function") {
            player.ima({
              adTagUrl: VAST_TAG,
            });
          }
        });
      }

      playerRef.current = player;
    }

    init();

    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

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
