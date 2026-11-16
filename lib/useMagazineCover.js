import { useEffect, useState } from "react";
import { safeImageUrl } from "./imageHosts";

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
        const thumbnailUrl = safeImageUrl(data?.thumbnailUrl);
        if (!cancelled && data && (data.flipbookUrl || thumbnailUrl)) {
          cached = { ...data, thumbnailUrl };
          setCover(cached);
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
