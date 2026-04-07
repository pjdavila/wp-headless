import { useState, useEffect, useRef } from "react";
import { getVisitorId } from "./visitor-id";

export function useTrackView(itemId) {
  const lastTracked = useRef(null);
  useEffect(() => {
    if (!itemId || itemId === lastTracked.current) return;
    lastTracked.current = itemId;
    const userId = getVisitorId();
    if (!userId) return;
    fetch("/api/recombee-track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, itemId }),
    }).catch(() => {});
  }, [itemId]);
}

export function useRecommendations({ type = "user", itemId, count = 6, enabled = true }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const lastKey = useRef(null);

  useEffect(() => {
    const key = `${type}:${itemId || ""}:${count}`;
    if (!enabled || key === lastKey.current) return;
    lastKey.current = key;

    const userId = getVisitorId();
    if (!userId) return;

    let cancelled = false;
    setLoading(true);
    setItems([]);

    const params = new URLSearchParams({ type, userId, count: String(count) });
    if (itemId) params.set("itemId", itemId);

    fetch(`/api/recombee-recommend?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setItems(data.items || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [type, itemId, count, enabled]);

  return { items, loading };
}
