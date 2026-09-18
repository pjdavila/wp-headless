/**
 * Inline SVG sparkline — no chart library, so it costs nothing at first
 * paint and works identically in dark/light themes via currentColor.
 * Purely decorative: the accompanying text (value + change) carries the
 * information, so the SVG is aria-hidden.
 */
export default function Sparkline({
  points,
  width = 120,
  height = 36,
  strokeWidth = 1.5,
}) {
  const values = (points || [])
    .map((point) => (typeof point === "number" ? point : point?.value))
    .filter((value) => Number.isFinite(value));

  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = strokeWidth + 1;
  const stepX = (width - pad * 2) / (values.length - 1);

  const coords = values.map((value, index) => [
    pad + index * stepX,
    pad + (1 - (value - min) / span) * (height - pad * 2),
  ]);

  const line = coords
    .map(
      ([x, y], index) =>
        `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`,
    )
    .join(" ");
  const area = `${line} L${coords[coords.length - 1][0].toFixed(2)},${height} L${coords[0][0].toFixed(2)},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="none"
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      <path d={area} fill="currentColor" opacity={0.08} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
