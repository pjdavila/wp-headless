import AdIframe from "./AdIframe";

const AD_CONFIG = {
  zoneId: 909696,
  width: 320,
  height: 100,
};

export default function MobileBanner() {
  return (
    <div className="block md:hidden" style={{ justifyContent: "center", margin: "1rem 0", display: "flex" }}>
      <AdIframe zoneId={AD_CONFIG.zoneId} width={AD_CONFIG.width} height={AD_CONFIG.height} />
    </div>
  );
}
