import { useEffect, useState } from "react";

let cached = null;

export function useMagazineCover() {
  const [cover, setCover] = useState(cached);

  useEffect(() => {
    if (cached) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/magazine-cover");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data && (data.flipbookUrl || data.thumbnailUrl)) {
          cached = data;
          setCover(data);
        }
      } catch {
        // Non-fatal: callers keep their static fallbacks.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return cover;
}
