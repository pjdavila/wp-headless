import { useState, useEffect, useRef } from "react";
import AdIframe, { buildAdUrl } from "./AdIframe";

const AD_CONFIG = {
  DESKTOP: { zoneId: 921047, width: 300, height: 600 },
  MOBILE: { zoneId: 921047, width: 300, height: 250 },
  MAX_SHOWS_PER_SESSION: 1,
  DELAY_MS: 3000,
  COUNTDOWN_SECONDS: 5,
  SESSION_KEY: "adbutler_interstitial_count",
};

export default function InterstitialAd() {
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(AD_CONFIG.COUNTDOWN_SECONDS);
  const desktopUrl = useRef(null);
  const mobileUrl = useRef(null);

  if (desktopUrl.current === null) {
    desktopUrl.current = buildAdUrl(AD_CONFIG.DESKTOP.zoneId, AD_CONFIG.DESKTOP.width, AD_CONFIG.DESKTOP.height);
  }
  if (mobileUrl.current === null) {
    mobileUrl.current = buildAdUrl(AD_CONFIG.MOBILE.zoneId, AD_CONFIG.MOBILE.width, AD_CONFIG.MOBILE.height);
  }

  useEffect(() => {
    try {
      const shown = parseInt(sessionStorage.getItem(AD_CONFIG.SESSION_KEY) || "0", 10);
      if (shown >= AD_CONFIG.MAX_SHOWS_PER_SESSION) return;

      const delayTimer = setTimeout(() => {
        setVisible(true);
        sessionStorage.setItem(AD_CONFIG.SESSION_KEY, String(shown + 1));
      }, AD_CONFIG.DELAY_MS);

      return () => clearTimeout(delayTimer);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (countdown <= 0) {
      setVisible(false);
      return;
    }
    const interval = setInterval(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, countdown]);

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0,0,0,0.7)",
    }}>
      <div style={{ position: "relative", background: "hsl(var(--card))", borderRadius: "8px", padding: "0.5rem", maxWidth: "95vw" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.25rem", fontSize: "0.8rem", color: "hsl(var(--muted-foreground))" }}>
          Closing in {countdown}s
        </div>
        <div className="hidden md:block">
          <AdIframe
            src={desktopUrl.current}
            width={AD_CONFIG.DESKTOP.width}
            height={AD_CONFIG.DESKTOP.height}
            title="Interstitial Ad Desktop"
          />
        </div>
        <div className="block md:hidden">
          <AdIframe
            src={mobileUrl.current}
            width={AD_CONFIG.MOBILE.width}
            height={AD_CONFIG.MOBILE.height}
            title="Interstitial Ad Mobile"
          />
        </div>
      </div>
    </div>
  );
}
