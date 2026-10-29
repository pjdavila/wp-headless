import { useEffect, useState } from "react";

/** Content-box width of an element, kept current with a ResizeObserver. */
export default function useElementWidth(ref) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    setWidth(node.clientWidth);
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const next = Math.round(entry.contentRect.width);
        setWidth((prev) => (Math.abs(prev - next) > 2 ? next : prev));
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}
