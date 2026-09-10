import { useEffect, useState } from "react";

const cache = new Map();

export function useMagazineEditions(currentFlipbookUrl) {
  const cacheKey = currentFlipbookUrl || "";
  const [editions, setEditions] = useState(cache.get(cacheKey) || []);

  useEffect(() => {
    if (cache.has(cacheKey)) {
      setEditions(cache.get(cacheKey));
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const query = currentFlipbookUrl
          ? `?current=${encodeURIComponent(currentFlipbookUrl)}`
          : "";
        const response = await fetch(`/api/magazine-editions${query}`);
        if (!response.ok) return;

        const data = await response.json();
        if (!cancelled && Array.isArray(data?.editions)) {
          cache.set(cacheKey, data.editions);
          setEditions(data.editions);
        }
      } catch {
        // Non-fatal: the archive remains hidden.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, currentFlipbookUrl]);

  return editions;
}
