import AdIframe from "./AdIframe";

const AD_CONFIG = {
  DESKTOP: { zoneId: 921050, width: 728, height: 90 },
  MOBILE: { zoneId: 921049, width: 320, height: 100 },
};

export default function MobileBanner() {
  return (
    <div style={{ justifyContent: "center", margin: "1rem 0", display: "flex" }}>
      <div className="hidden md:block">
        <AdIframe zoneId={AD_CONFIG.DESKTOP.zoneId} width={AD_CONFIG.DESKTOP.width} height={AD_CONFIG.DESKTOP.height} />
      </div>
      <div className="block md:hidden">
        <AdIframe zoneId={AD_CONFIG.MOBILE.zoneId} width={AD_CONFIG.MOBILE.width} height={AD_CONFIG.MOBILE.height} />
      </div>
    </div>
  );
}
