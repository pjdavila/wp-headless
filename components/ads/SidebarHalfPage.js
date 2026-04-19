import AdIframe from "./AdIframe";

const AD_CONFIG = {
  zoneId: 161724,
  width: 300,
  height: 600,
};

export default function SidebarHalfPage() {
  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "1.5rem 0" }}>
      <AdIframe zoneId={AD_CONFIG.zoneId} width={AD_CONFIG.width} height={AD_CONFIG.height} />
    </div>
  );
}
