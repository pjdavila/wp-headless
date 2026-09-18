import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";

/**
 * Generic authenticated data hook for the /api/economy routes, shared by the
 * dashboard section and indicator pages (the overview has its own hook with
 * the same contract).
 *
 * `load(authedGet)` receives a GET helper that attaches the Firebase ID
 * token and retries once with a forced refresh on 401; it may return a
 * single Response or an array of Responses (fanned-out requests). The hook
 * resolves to the parsed JSON payload(s). Pass `null` to skip the request
 * entirely (e.g. a section with no indicators yet) — it resolves to an
 * empty-ready state but still requires a session.
 *
 * States (same contract as useEconomyOverview):
 *  - "loading"         auth resolving or request in flight
 *  - "unauthenticated" no session, or token rejected even after refresh
 *                      (`sessionExpired` distinguishes the two)
 *  - "ready"           data available
 *  - "error"           network or server failure; `retry` re-attempts
 */
export function useEconomyApi(load, deps = []) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState({ status: "loading", data: null });
  const [sessionExpired, setSessionExpired] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setState({ status: "unauthenticated", data: null });
      return;
    }

    if (!loadRef.current) {
      setState({ status: "ready", data: null });
      return;
    }

    let cancelled = false;

    async function authedGet(path) {
      let token = await user.getIdToken();
      let response = await fetch(path, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // A rejected token may just be stale — force one refresh before
      // concluding the session is gone.
      if (response.status === 401) {
        token = await user.getIdToken(true);
        response = await fetch(path, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      return response;
    }

    async function run() {
      setState((prev) => ({ status: "loading", data: prev.data || null }));
      try {
        const result = await loadRef.current(authedGet);
        const responses = Array.isArray(result) ? result : [result];

        if (responses.some((response) => response.status === 401)) {
          if (cancelled) return;
          setSessionExpired(true);
          setState({ status: "unauthenticated", data: null });
          return;
        }

        const failed = responses.find((response) => !response.ok);
        if (failed) {
          throw new Error(`Economic API answered ${failed.status}`);
        }

        const payloads = await Promise.all(
          responses.map((response) => response.json()),
        );
        if (cancelled) return;
        setSessionExpired(false);
        setState({
          status: "ready",
          data: Array.isArray(result) ? payloads : payloads[0],
        });
      } catch (error) {
        if (cancelled) return;
        setState({
          status: "error",
          data: null,
          error: error.message || "Request failed",
        });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, reloadKey, ...deps]);

  return { ...state, sessionExpired, authLoading, retry };
}
