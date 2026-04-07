import AdIframe from "./AdIframe";

const AD_CONFIG = {
  DESKTOP: { zoneId: 921050, width: 728, height: 90 },
  TABLET: { zoneId: 921050, width: 728, height: 90 },
  MOBILE: { zoneId: 921049, width: 320, height: 100 },
};

export default function StaticBanner() {
  return (
    <div className="bg-[#000000]" style={{ display: "flex", justifyContent: "center", padding: "0.5rem 0" }}>
      <div className="hidden lg:block">
        <AdIframe zoneId={AD_CONFIG.DESKTOP.zoneId} width={AD_CONFIG.DESKTOP.width} height={AD_CONFIG.DESKTOP.height} />
      </div>
      <div className="hidden md:block lg:hidden">
        <AdIframe zoneId={AD_CONFIG.TABLET.zoneId} width={AD_CONFIG.TABLET.width} height={AD_CONFIG.TABLET.height} />
      </div>
      <div className="block md:hidden">
        <AdIframe zoneId={AD_CONFIG.MOBILE.zoneId} width={AD_CONFIG.MOBILE.width} height={AD_CONFIG.MOBILE.height} />
      </div>
    </div>
  );
}
