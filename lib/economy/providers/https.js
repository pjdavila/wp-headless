import https from "node:https";
import tls from "node:tls";

/**
 * Minimal https.get-based text fetcher for sources whose TLS configuration
 * Node's fetch (undici) cannot handle. indicadores.pr serves an incomplete
 * certificate chain (missing the RapidSSL intermediate — browsers/paper-over
 * tools fetch it via AIA, Node does not), so callers can pass an extra CA
 * bundle that is APPENDED to Node's built-in Mozilla roots.
 *
 * Same error philosophy as http.js: explicit failures, no silent fallbacks.
 */

const DEFAULT_TIMEOUT_MS = 20000;
const MAX_REDIRECTS = 5;

/**
 * @param {string} url
 * @param {{timeoutMs?: number, provider: string, extraCaPem?: string|null, redirects?: number}} options
 * @returns {Promise<string>} response body decoded as UTF-8
 */
export function httpsGetText(
  url,
  {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    provider,
    extraCaPem = null,
    redirects = 0,
  } = {},
) {
  return new Promise((resolve, reject) => {
    const options = {};
    if (extraCaPem) {
      options.ca = [...tls.rootCertificates, extraCaPem];
    }
    const req = https.get(url, options, (res) => {
      const { statusCode, headers } = res;
      if (
        statusCode >= 300 &&
        statusCode < 400 &&
        headers.location &&
        redirects < MAX_REDIRECTS
      ) {
        res.resume();
        const next = new URL(headers.location, url).toString();
        resolve(
          httpsGetText(next, {
            timeoutMs,
            provider,
            extraCaPem,
            redirects: redirects + 1,
          }),
        );
        return;
      }
      if (statusCode < 200 || statusCode >= 300) {
        res.resume();
        reject(new Error(`${provider}: HTTP ${statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      res.on("error", reject);
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy(
        new Error(`${provider}: request timed out after ${timeoutMs}ms`),
      );
    });
    req.on("error", reject);
  });
}
