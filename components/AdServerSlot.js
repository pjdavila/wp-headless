import { useEffect, useRef } from "react";

let slotCounter = 0;

export default function AdServerSlot({ zone, width, height, className, style }) {
  const insRef = useRef(null);
  const idRef = useRef(null);
  const loadedRef = useRef(false);

  if (!idRef.current) {
    slotCounter += 1;
    idRef.current = `aso-slot-${zone}-${slotCounter}`;
  }

  useEffect(() => {
    if (loadedRef.current) return;
    const ins = insRef.current;
    if (!ins) return;

    let cancelled = false;
    let timeoutId = null;
    let attempts = 0;
    const tryLoad = () => {
      if (cancelled || typeof window === "undefined") return;
      if (window._ASO && typeof window._ASO.loadAd === "function") {
        try {
          window._ASO.loadAd(idRef.current, Number(zone));
          loadedRef.current = true;
        } catch (e) {
          console.warn("[AdServerSlot] loadAd failed", e);
        }
        return;
      }
      attempts += 1;
      if (attempts < 40) {
        timeoutId = setTimeout(tryLoad, 250);
      }
    };
    tryLoad();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [zone]);

  const wrapperStyle = {
    width,
    height,
    overflow: "hidden",
    margin: "0 auto",
    ...style,
  };

  const insStyle = {
    display: "block",
    width,
    height,
  };

  return (
    <div className={className} style={wrapperStyle}>
      <ins
        ref={insRef}
        id={idRef.current}
        className="ins-zone"
        data-zone={String(zone)}
        style={insStyle}
      />
    </div>
  );
}
