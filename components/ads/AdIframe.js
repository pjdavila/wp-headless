const AD_CONFIG = {
  ACCOUNT_ID: 188652,
  BASE_URL: "https://servedbyadbutler.com/adserve/",
};

export function buildAdUrl(zoneId, width, height) {
  return `${AD_CONFIG.BASE_URL};ID=${AD_CONFIG.ACCOUNT_ID};size=${width}x${height};setID=${zoneId};type=iframe;click=CLICK_MACRO_PLACEHOLDER`;
}

export default function AdIframe({ zoneId, width, height, src, className = "", title }) {
  const iframeSrc = src || buildAdUrl(zoneId, width, height);

  return (
    <iframe
      src={iframeSrc}
      width={width}
      height={height}
      className={className}
      style={{ border: "none", overflow: "hidden" }}
      scrolling="no"
      frameBorder="0"
      allowtransparency="true"
      title={title || `Ad ${zoneId}`}
    />
  );
}
