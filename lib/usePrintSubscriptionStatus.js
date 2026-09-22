import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { useAuth } from "./useAuth";

// Checks whether the signed-in account holds a live print-edition
// subscription (via /api/print-subscription-status). States:
//   idle    — signed out (or auth still resolving)
//   loading — check in flight
//   ready   — `subscription` holds the plan summary, or null when the
//             account has no live subscription
//   error   — the check failed; treat as unknown and offer fallbacks
// Pass a changing `refreshKey` to re-run the check (e.g. after checkout).
export function usePrintSubscriptionStatus(refreshKey) {
  const { user, loading: authLoading } = useAuth();
  const [subState, setSubState] = useState({ status: "idle" });
  const uid = user?.uid || null;

  useEffect(() => {
    if (!uid) {
      setSubState({ status: "idle" });
      return;
    }
    let cancelled = false;
    setSubState({ status: "loading" });
    (async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("not signed in");
        const idToken = await currentUser.getIdToken();
        const res = await fetch("/api/print-subscription-status", {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "status check failed");
        if (cancelled) return;
        setSubState({ status: "ready", subscription: data.subscription });
      } catch {
        if (!cancelled) setSubState({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, refreshKey]);

  return { user, authLoading, subState };
}
