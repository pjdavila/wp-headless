import { useEffect, useRef, useId } from "react";
import { useRouter } from "next/router";

export default function AdServerSlot({
  zone,
  width,
  height,
  className,
  style,
}) {
  const insRef = useRef(null);
  const loadedRef = useRef(false);
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const idRef = useRef(`aso-slot-${zone}-${reactId}`);
  const router = useRouter();

  useEffect(() => {
    const ins = insRef.current;
    if (!ins) return;

    let cancelled = false;
    let timeoutId = null;
    let intervalId = null;
    let attempts = 0;

    const loadAd = () => {
      if (cancelled || typeof window === "undefined") return false;
      if (window._ASO && typeof window._ASO.loadAd === "function") {
        try {
          window._ASO.loadAd(idRef.current, Number(zone));
        } catch (e) {
          console.warn("[AdServerSlot] loadAd failed", e);
        }
        return true;
      }
      return false;
    };

    const startRefresh = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        if (cancelled || typeof document === "undefined") return;
        if (document.hidden) return;
        loadAd();
      }, 30000);
    };

    const tryLoad = () => {
      if (cancelled) return;
      if (loadAd()) {
        loadedRef.current = true;
        startRefresh();
        return;
      }
      attempts += 1;
      if (attempts < 40) {
        timeoutId = setTimeout(tryLoad, 250);
      }
    };
    tryLoad();

    // Slots like the sticky bottom banner stay mounted across page
    // navigations (they live in _app.js), so the ad never refreshes on
    // its own when the route changes. Re-request the ad on every
    // completed client-side navigation once it has loaded at least once.
    const handleRouteChange = () => {
      if (loadedRef.current) loadAd();
    };
    router?.events?.on("routeChangeComplete", handleRouteChange);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
      router?.events?.off("routeChangeComplete", handleRouteChange);
    };
  }, [zone, router]);

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
