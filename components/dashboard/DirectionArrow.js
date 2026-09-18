/**
 * Direction indicator that never relies on color alone: an arrow glyph plus
 * an sr-only word ("subió"/"bajó"/"sin cambio") accompany every colored
 * change figure. Inherits its color from the parent change/sentiment class.
 */
export default function DirectionArrow({ direction }) {
  const glyph = direction === "up" ? "▲" : direction === "down" ? "▼" : "▬";
  return (
    <span aria-hidden="true" style={{ fontSize: "0.7em" }}>
      {glyph}
    </span>
  );
}

export function directionWord(direction) {
  if (direction === "up") return "subió";
  if (direction === "down") return "bajó";
  return "sin cambio";
}
