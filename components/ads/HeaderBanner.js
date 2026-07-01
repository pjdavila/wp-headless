import { useEffect, useState } from "react";
import AdServerSlot from "../AdServerSlot";
import styles from "../../styles/headerBanner.module.css";

const ZONES = {
  desktop: { zone: "161517", width: 970, height: 90 },
  tablet: { zone: "161715", width: 728, height: 90 },
  mobile: { zone: "161717", width: 320, height: 100 },
};

function pickBreakpoint(width) {
  if (width >= 1024) return "desktop";
  if (width >= 768) return "tablet";
  return "mobile";
}

export default function HeaderBanner() {
  const [breakpoint, setBreakpoint] = useState(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const update = () => setBreakpoint(pickBreakpoint(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    let ticking = false;
    const evaluate = () => {
      ticking = false;
      const y = window.scrollY;
      setHidden((prev) => {
        if (!prev && y > 250) return true;
        if (prev && y < 50) return false;
        return prev;
      });
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(evaluate);
    };
    evaluate();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!breakpoint) return null;

  const { zone, width, height } = ZONES[breakpoint];

  return (
    <div className={`${styles.bar} ${hidden ? styles.hidden : ""}`}>
      <AdServerSlot key={breakpoint} zone={zone} width={width} height={height} />
    </div>
  );
}
