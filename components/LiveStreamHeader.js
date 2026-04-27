import { useEffect, useRef, useState } from "react";
import styles from "../styles/live.module.css";

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81a3 3 0 1 0-3-3c0 .24.04.47.09.7L8.04 9.81A3 3 0 0 0 3 12a3 3 0 0 0 5.04 2.19l7.12 4.16c-.05.21-.08.43-.08.65a2.92 2.92 0 1 0 2.92-2.92Z"
      />
    </svg>
  );
}

export default function LiveStreamHeader({
  title = "Caribbean Business Live",
  subtitle = "Broadcasting from Puerto Rico",
}) {
  const [time, setTime] = useState("");
  const [shareState, setShareState] = useState("idle");
  const copiedTimerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let formatter;
    try {
      formatter = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: false,
        timeZone: "America/Puerto_Rico",
      });
    } catch {
      formatter = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: false,
      });
    }

    const update = () => {
      try {
        setTime(formatter.format(new Date()));
      } catch {
        const d = new Date();
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        setTime(`${hh}:${mm}`);
      }
    };

    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);

  const handleShare = async () => {
    if (typeof window === "undefined") return;
    const data = {
      title,
      text: "Watch Caribbean Business live — breaking news, analysis and market updates from the Caribbean.",
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(data.url);
        if (!mountedRef.current) return;
        setShareState("copied");
        if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setShareState("idle");
          copiedTimerRef.current = null;
        }, 2200);
      }
    } catch {
      /* user cancelled or blocked */
    }
  };

  return (
    <div className={styles.streamHeader}>
      <div className={styles.headerMain}>
        <span className={styles.liveBadge}>
          <span className={styles.liveDot} aria-hidden="true" />
          Live
        </span>
        <div className={styles.titleGroup}>
          <h1 className={styles.streamTitle}>{title}</h1>
          <p className={styles.streamSubtitle}>{subtitle}</p>
        </div>
      </div>

      <div className={styles.headerMeta}>
        <span className={styles.onAirTime} suppressHydrationWarning>
          <span className={styles.onAirGlyph} aria-hidden="true" />
          {time ? `On Air Now • ${time} AST` : "On Air Now"}
        </span>
        <button
          type="button"
          className={styles.shareBtn}
          onClick={handleShare}
          aria-label={
            shareState === "copied"
              ? "Enlace copiado al portapapeles"
              : "Compartir transmisión"
          }
          title={shareState === "copied" ? "¡Enlace copiado!" : "Compartir"}
        >
          <ShareIcon />
          <span className={styles.shareLabel}>
            {shareState === "copied" ? "Copiado" : "Compartir"}
          </span>
        </button>
      </div>
    </div>
  );
}
