/**
 * Shared fetch helper for provider adapters. Same pattern as
 * pages/api/markets.js: AbortController timeout, explicit errors (no silent
 * fallbacks — a failing provider must surface as an error status so the
 * ingestion pipeline can keep last-good data and flag it).
 */

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * @param {string} url
 * @param {{timeoutMs?: number, init?: RequestInit, provider: string}} options
 * @returns {Promise<any>} parsed JSON body
 */
export async function fetchJson(
  url,
  { timeoutMs = DEFAULT_TIMEOUT_MS, init, provider } = {},
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `${provider}: HTTP ${res.status}${body ? ` — ${body.slice(0, 200)}` : ""}`,
      );
    }
    return await res.json();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`${provider}: request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/** Reads a required env var, failing loudly so the run report names the gap. */
export function requireEnv(name, provider) {
  const value = (process.env[name] || "").trim();
  if (!value) {
    throw new Error(`${provider}: ${name} not configured`);
  }
  return value;
}

/** Reads an optional env var (some government APIs work keyless at low volume). */
export function optionalEnv(name) {
  return (process.env[name] || "").trim() || null;
}
