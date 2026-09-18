import { fetchJson, optionalEnv } from "./http.js";

/**
 * U.S. Bureau of Labor Statistics — Public Data API v2.
 * Docs: https://www.bls.gov/developers/api_signature_v2.htm
 *
 * Keyless access works at low volume (25 queries/day, 10 years per request),
 * which covers development. BLS_API_KEY (free registration) raises that to
 * 500 queries/day and 20 years per request.
 *
 * Puerto Rico series used by the registry:
 *   LASST720000000000003  LAUS unemployment rate (SA, %)
 *   LASST720000000000005  LAUS employment (SA, persons)
 *   LASST720000000000006  LAUS labor force (SA, persons)
 *   SMU7200000SSSSSSSS01  SM employment by industry (NSA, thousands) —
 *                         SSSSSSSS is the NAICS supersector code
 *                         (00000000 total nonfarm, 30000000 manufacturing, ...).
 *                         Supersector detail is published not seasonally
 *                         adjusted at the state level, so the whole
 *                         employment-by-industry indicator is NSA — never
 *                         mix SA and NSA series in one indicator.
 *
 * providerConfig shapes:
 *   { seriesIds: ["LASST..."] }                    single-series indicator
 *   { series: [{key, id, label}], primarySeries }  multi-series indicator;
 *                                                  observations are tagged
 *                                                  with `series: key`.
 */

const BLS_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/";
const PROVIDER = "BLS";

function isPreliminary(point) {
  return (point.footnotes || []).some((footnote) => footnote.code === "P");
}

function seriesSpecsFor(indicator) {
  const config = indicator.providerConfig || {};
  if (Array.isArray(config.series) && config.series.length > 0) {
    return config.series.map(({ key, id }) => ({ key, id }));
  }
  return (config.seriesIds || []).map((id) => ({ key: null, id }));
}

/**
 * @param {import("../types.js").Indicator} indicator
 * @returns {Promise<{observations: Array<{date: string, value: number, series?: string, preliminary?: boolean}>}>}
 */
export async function getSeries(indicator) {
  const specs = seriesSpecsFor(indicator);
  if (specs.length === 0) {
    throw new Error(
      `${PROVIDER}: indicator ${indicator.id} has no series configured`,
    );
  }

  const apiKey = optionalEnv("BLS_API_KEY");
  const endYear = new Date().getUTCFullYear();
  // Keyless requests are limited to 10 years of data per call. Stored history
  // is merged on ingest, so the rolling window extends rather than replaces.
  const startYear = apiKey ? endYear - 19 : endYear - 9;

  const body = {
    seriesid: specs.map((spec) => spec.id),
    startyear: String(startYear),
    endyear: String(endYear),
    ...(apiKey ? { registrationkey: apiKey } : {}),
  };

  const payload = await fetchJson(BLS_URL, {
    provider: PROVIDER,
    timeoutMs: 25000,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  });

  if (payload.status !== "REQUEST_SUCCEEDED") {
    throw new Error(
      `${PROVIDER}: ${payload.status}${payload.message?.length ? ` — ${payload.message.join("; ")}` : ""}`,
    );
  }

  const observations = [];
  for (const series of payload.Results?.series || []) {
    const spec = specs.find((s) => s.id === series.seriesID);
    for (const point of series.data || []) {
      // Monthly periods are "M01".."M12"; "M13" is the annual average — skip it.
      if (!/^M(0[1-9]|1[0-2])$/.test(point.period || "")) continue;
      observations.push({
        date: `${point.year}-${point.period.slice(1)}-01`,
        value: Number(point.value),
        ...(spec?.key ? { series: spec.key } : {}),
        ...(isPreliminary(point) ? { preliminary: true } : {}),
      });
    }
  }

  if (observations.length === 0) {
    throw new Error(
      `${PROVIDER}: no observations returned for ${specs.map((s) => s.id).join(", ")}`,
    );
  }
  return { observations };
}

export function getMetadata() {
  return {
    provider: PROVIDER,
    apiDocs: "https://www.bls.gov/developers/api_signature_v2.htm",
    requiresKey: false,
    keyEnvVar: "BLS_API_KEY",
  };
}
