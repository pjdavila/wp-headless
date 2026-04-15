import { useRef, useEffect } from "react";

const HLS_URL =
  "https://pvqyb68gdz24-hls-live.5centscdn.com/vnm/033977cd45e8d7a87c4fc453d18e20c3.sdp/playlist.m3u8";
const VAST_TAG =
  "https://astrovms.com/api/vast/e707df66-f0cb-468f-be7b-eed24400f467";

export default function LivePlayer() {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  useEffect(() => {
    let player;

    async function init() {
      const videojs = (await import("video.js")).default;
      await import("videojs-contrib-ads");
      await import("videojs-ima");

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

      player.ready(() => {
        if (typeof player.ima === "function") {
          player.ima({
            adTagUrl: VAST_TAG,
          });
        }
      });

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
