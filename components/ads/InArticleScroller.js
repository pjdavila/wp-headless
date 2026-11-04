import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import AdServerSlot from "../AdServerSlot";
import styles from "../../styles/inArticleScroller.module.css";

// Adserver.Online 700x1600 "scroller" zone, sold on the Teads Scroller
// Vertical spec: a 7:16 creative whose central 700x1244 band is the safe
// zone. The window in the article has the safe-zone proportions, and the
// creative drifts inside it more slowly than the text while the window
// crosses the screen, so the reader discovers it from top to bottom.
// Zone 166706 is served as a plain <a><img></a>, with no motion of its own.
const ZONE = "166706";
const CREATIVE_HEIGHT = 1600;
const SAFE_HEIGHT = 1244;
// Part of the creative that does not fit in the window, relative to it.
const OVERFLOW_RATIO = (CREATIVE_HEIGHT - SAFE_HEIGHT) / SAFE_HEIGHT;

// How long to wait for a creative before collapsing the block.
const NO_FILL_TIMEOUT_MS = 8000;
const POLL_MS = 300;

// A creative counts only once it has actually rendered: an image that
// loaded, or an iframe/video/canvas with a size. Ad blockers that hide ad
// markup leave elements without client rects, so those count as no fill.
function hasRenderedCreative(root) {
  if (!root) return false;
  const nodes = root.querySelectorAll("img, iframe, video, canvas");
  for (const el of nodes) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    if (el.tagName === "IMG" && !(el.complete && el.naturalWidth > 1)) continue;
    return true;
  }
  return false;
}

// Height of the sticky bottom banner, which it publishes as a CSS variable.
function readBottomInset() {
  return (
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--sticky-bottom-height",
      ),
    ) || 0
  );
}

// The site header is sticky and shrinks as the reader scrolls, so its
// bottom edge is read on every frame.
function readTopInset(header) {
  return header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
}

export default function InArticleScroller() {
  const [status, setStatus] = useState("pending");
  const windowRef = useRef(null);
  const trackRef = useRef(null);
  const router = useRouter();

  // Decide whether the zone delivered something. Restarts on every
  // client-side navigation, because AdServerSlot re-requests the zone then.
  useEffect(() => {
    let pollId = null;
    let deadline = 0;

    const stop = () => {
      if (pollId) clearInterval(pollId);
      pollId = null;
    };

    const check = () => {
      if (hasRenderedCreative(trackRef.current)) {
        stop();
        setStatus("filled");
      } else if (Date.now() >= deadline) {
        stop();
        setStatus("empty");
      }
    };

    const start = () => {
      stop();
      setStatus("pending");
      deadline = Date.now() + NO_FILL_TIMEOUT_MS;
      pollId = setInterval(check, POLL_MS);
    };

    start();
    router?.events?.on("routeChangeComplete", start);
    return () => {
      stop();
      router?.events?.off("routeChangeComplete", start);
    };
  }, [router]);

  // Move the creative while the block is on screen.
  useEffect(() => {
    const win = windowRef.current;
    const track = trackRef.current;
    if (!win || !track) return;

    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const header = document.querySelector("header");
    let rafId = 0;
    let inView = false;

    const update = () => {
      rafId = 0;
      const rect = win.getBoundingClientRect();
      const windowHeight = rect.height;
      if (!windowHeight) return;
      const overflow = windowHeight * OVERFLOW_RATIO;
      let offset = -overflow / 2;
      if (!reduceMotion) {
        const screenTop = readTopInset(header);
        const screenBottom = window.innerHeight - readBottomInset();
        // 0 when the window starts entering at the bottom of the visible
        // area, 1 when it has left at the top. At 0.5 the window is centred
        // and frames exactly the safe zone.
        const travel = screenBottom - screenTop + windowHeight;
        let progress = (screenBottom - rect.top) / travel;
        progress = Math.min(1, Math.max(0, progress));
        offset = -overflow * (1 - progress);
      }
      track.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    };

    const schedule = () => {
      if (!rafId) rafId = requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        const next = entry.isIntersecting;
        if (next === inView) return;
        inView = next;
        if (inView) {
          window.addEventListener("scroll", schedule, { passive: true });
          schedule();
        } else {
          window.removeEventListener("scroll", schedule);
        }
      },
      { rootMargin: "200px 0px" },
    );

    update();
    observer.observe(win);
    window.addEventListener("resize", schedule);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const className = [
    styles.scroller,
    status === "filled" ? styles.filled : "",
    status === "empty" ? styles.empty : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside className={className} aria-label="Publicidad">
      <div className={styles.label}>Publicidad</div>
      <div ref={windowRef} className={styles.window}>
        <div ref={trackRef} className={styles.track}>
          <AdServerSlot
            zone={ZONE}
            width="100%"
            height="100%"
            className={styles.slot}
          />
        </div>
      </div>
      <div className={styles.continue} aria-hidden="true">
        Sigue leyendo
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </aside>
  );
}
