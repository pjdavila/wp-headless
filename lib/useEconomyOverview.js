import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";

/**
 * Client data hook for the dashboard overview. Waits for the Firebase
 * session, then fetches /api/economy/overview with the user's ID token.
 *
 * States:
 *  - "loading"         auth resolving or request in flight
 *  - "unauthenticated" no session (or the token was rejected even after a
 *                      forced refresh — e.g. the session expired); the page
 *                      shows the login gate. `sessionExpired` distinguishes
 *                      a lost session from a never-logged-in visitor.
 *  - "ready"           data available
 *  - "error"           network or server failure; `retry` re-attempts
 */
export function useEconomyOverview() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState({ status: "loading", data: null });
  const [sessionExpired, setSessionExpired] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setState({ status: "unauthenticated", data: null });
      return;
    }

    let cancelled = false;

    async function load() {
      setState((prev) => ({ status: "loading", data: prev.data || null }));
      try {
        let token = await user.getIdToken();
        let response = await fetch("/api/economy/overview/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        // A rejected token may just be stale — force one refresh before
        // concluding the session is gone.
        if (response.status === 401) {
          token = await user.getIdToken(true);
          response = await fetch("/api/economy/overview/", {
            headers: { Authorization: `Bearer ${token}` },
          });
        }

        if (cancelled) return;

        if (response.status === 401) {
          setSessionExpired(true);
          setState({ status: "unauthenticated", data: null });
          return;
        }
        if (!response.ok) {
          throw new Error(`Economic API answered ${response.status}`);
        }

        const data = await response.json();
        setSessionExpired(false);
        setState({ status: "ready", data });
      } catch (error) {
        if (cancelled) return;
        setState({
          status: "error",
          data: null,
          error: error.message || "Request failed",
        });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, reloadKey]);

  return { ...state, sessionExpired, authLoading, retry };
}
