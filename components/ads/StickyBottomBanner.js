import { useEffect, useState } from "react";
import AdServerSlot from "../AdServerSlot";
import styles from "../../styles/stickyBottom.module.css";

const STORAGE_KEY = "bj-sticky-bottom-dismissed";

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

  const handleClose = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch (e) {}
    setDismissed(true);
  };

  if (dismissed || !breakpoint) return null;

  const { zone, width, height } = ZONES[breakpoint];

  return (
    <div className={styles.bar}>
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
