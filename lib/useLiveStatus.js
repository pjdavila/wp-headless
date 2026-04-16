import { useEffect, useRef, useState, useCallback } from "react";

export default function useLiveStatus({ intervalMs = 60000 } = {}) {
  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(true);
  const aliveRef = useRef(true);

  const check = useCallback(async () => {
    try {
      const r = await fetch("/api/live-status", { cache: "no-store" });
      const data = await r.json();
      if (!aliveRef.current) return;
      setLive(!!data.live);
    } catch {
      if (!aliveRef.current) return;
      setLive(false);
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    check();
    const id = setInterval(check, intervalMs);
    return () => {
      aliveRef.current = false;
      clearInterval(id);
    };
  }, [check, intervalMs]);

  return { live, loading, refresh: check };
}
