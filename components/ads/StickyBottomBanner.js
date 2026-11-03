import { useEffect, useRef, useState } from "react";
import AdServerSlot from "../AdServerSlot";
import styles from "../../styles/stickyBottom.module.css";

const STORAGE_KEY = "bj-sticky-bottom-dismissed";
// Other floating elements (e.g. the article floating video ad) read this
// CSS variable to stay above the bar instead of covering it.
const HEIGHT_VAR = "--sticky-bottom-height";

const ZONES = {
  desktop: { zone: "161517", width: 970, height: 90 },
  tablet: { zone: "161716", width: 728, height: 90 },
  mobile: { zone: "161713", width: 320, height: 100 },
};

function pickBreakpoint(width) {
  if (width >= 1024) return "desktop";
  if (width >= 768) return "tablet";
  return "mobile";
}

export default function StickyBottomBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [breakpoint, setBreakpoint] = useState(null);
  const barRef = useRef(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") {
        setDismissed(true);
      }
    } catch (e) {}

    const update = () => setBreakpoint(pickBreakpoint(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const visible = !dismissed && !!breakpoint;

  useEffect(() => {
    const root = document.documentElement;
    const bar = barRef.current;
    if (!visible || !bar) {
      root.style.removeProperty(HEIGHT_VAR);
      return;
    }
    const publish = () =>
      root.style.setProperty(HEIGHT_VAR, `${bar.offsetHeight}px`);
    publish();
    let observer = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(publish);
      observer.observe(bar);
    }
    return () => {
      if (observer) observer.disconnect();
      root.style.removeProperty(HEIGHT_VAR);
    };
  }, [visible, breakpoint]);

  const handleClose = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch (e) {}
    setDismissed(true);
  };

  if (!visible) return null;

  const { zone, width, height } = ZONES[breakpoint];

  return (
    <div ref={barRef} className={styles.bar}>
      <button
        type="button"
        className={styles.close}
        onClick={handleClose}
        aria-label="Cerrar anuncio"
      >
        ×
      </button>
      <AdServerSlot key={breakpoint} zone={zone} width={width} height={height} />
    </div>
  );
}
