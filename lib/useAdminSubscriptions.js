import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";

/**
 * Client hook for the internal subscriptions panel (/admin/suscripciones/).
 * Loads /api/admin/subscriptions/ with the Firebase ID token (one forced
 * token refresh on 401, like useEconomyApi) and exposes:
 *
 *  status: "loading" | "unauthenticated" | "forbidden" | "error" | "ready"
 *  data:   API payload ({ rows, summary, products, fetchedAt }) when loaded
 *  error / code: server message and machine code for forbidden/error
 *  refreshing: an "Actualizar" request is in flight (data stays visible)
 *  refreshError: the last refresh failed; `data` is the previous read
 *  refresh(): re-read bypassing the server cache
 *  downloadCsv(filters): fetches the CSV of the filtered view and saves it
 */

const API_PATH = "/api/admin/subscriptions/";
const EXPORT_PATH = "/api/admin/subscriptions-export/";

async function readError(response) {
  try {
    const body = await response.json();
    return { error: body?.error || null, code: body?.code || null };
  } catch {
    return { error: null, code: null };
  }
}

export function useAdminSubscriptions() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState({ status: "loading", data: null });
  const [sessionExpired, setSessionExpired] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const userRef = useRef(user);
  userRef.current = user;

  const authedFetch = useCallback(async (path) => {
    const current = userRef.current;
    let token = await current.getIdToken();
    let response = await fetch(path, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 401) {
      token = await current.getIdToken(true);
      response = await fetch(path, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    return response;
  }, []);

  // Returns the next state for a response, or throws on network failure.
  const interpret = useCallback(async (response) => {
    if (response.status === 401) {
      return { status: "unauthenticated", data: null, expired: true };
    }
    if (response.status === 403) {
      const { error, code } = await readError(response);
      return {
        status: "forbidden",
        data: null,
        error: error || "No autorizado.",
        code,
      };
    }
    if (!response.ok) {
      const { error } = await readError(response);
      return {
        status: "error",
        data: null,
        error: error || `El servidor respondió ${response.status}.`,
      };
    }
    const data = await response.json();
    if (!data || !Array.isArray(data.rows) || !data.summary) {
      return {
        status: "error",
        data: null,
        error: "Respuesta inesperada del servidor.",
      };
    }
    return { status: "ready", data };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setState({ status: "unauthenticated", data: null });
      return;
    }
    let cancelled = false;
    setState({ status: "loading", data: null });
    (async () => {
      try {
        const next = await interpret(await authedFetch(API_PATH));
        if (cancelled) return;
        setSessionExpired(Boolean(next.expired));
        setState(next);
      } catch (err) {
        if (cancelled) return;
        setState({
          status: "error",
          data: null,
          error: `No pudimos contactar el servidor: ${err.message}`,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, authedFetch, interpret]);

  const refresh = useCallback(async () => {
    if (!userRef.current) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      const next = await interpret(await authedFetch(`${API_PATH}?refresh=1`));
      if (next.status !== "error") {
        setSessionExpired(Boolean(next.expired));
        setState(next);
      } else {
        // Keep the previous read on screen, flagged as not refreshed; with
        // no previous read, the error replaces the panel.
        setState((prev) => (prev.status === "ready" ? prev : next));
        setRefreshError(next.error);
      }
    } catch (err) {
      setRefreshError(`No pudimos contactar el servidor: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  }, [authedFetch, interpret]);

  const downloadCsv = useCallback(
    async (filters) => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters || {})) {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, String(value));
        }
      }
      const response = await authedFetch(`${EXPORT_PATH}?${params}`);
      if (!response.ok) {
        const { error } = await readError(response);
        throw new Error(error || `El servidor respondió ${response.status}.`);
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = match ? match[1] : "suscripciones.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    [authedFetch],
  );

  return {
    ...state,
    user,
    authLoading,
    sessionExpired,
    refreshing,
    refreshError,
    refresh,
    downloadCsv,
  };
}
