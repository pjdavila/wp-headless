import { useEffect, useRef, useState } from "react";
import styles from "../styles/articleAudioPlayer.module.css";

const SPEEDS = [1, 1.25, 1.5, 2];

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ArticleAudioPlayer({ src, title }) {
  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => setDuration(audio.duration || 0);
    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = SPEEDS[speedIndex];
  }, [speedIndex]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      const p = audio.play();
      if (p && typeof p.catch === "function") p.catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  };

  const seekFromEvent = (e) => {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  const onKeyDownProgress = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    if (e.key === "ArrowRight") {
      audio.currentTime = Math.min(duration, audio.currentTime + 5);
    } else if (e.key === "ArrowLeft") {
      audio.currentTime = Math.max(0, audio.currentTime - 5);
    }
  };

  const cycleSpeed = () => setSpeedIndex((i) => (i + 1) % SPEEDS.length);

  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className={styles.player} role="region" aria-label={title ? `Listen: ${title}` : "Article audio"}>
      <button
        type="button"
        className={styles.playBtn}
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className={styles.body}>
        <div className={styles.label}>Listen to this article</div>
        <div
          ref={progressRef}
          className={styles.progress}
          onClick={seekFromEvent}
          onKeyDown={onKeyDownProgress}
          role="slider"
          tabIndex={0}
          aria-label="Seek audio"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration) || 0}
          aria-valuenow={Math.round(currentTime)}
        >
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        <div className={styles.meta}>
          <span className={styles.time}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <button
            type="button"
            className={styles.speedBtn}
            onClick={cycleSpeed}
            aria-label={`Playback speed ${SPEEDS[speedIndex]}x`}
          >
            {SPEEDS[speedIndex]}x
          </button>
        </div>
      </div>

      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}
