import { fetchJson, requireEnv } from "./http.js";

/**
 * U.S. Census Bureau — American Community Survey 5-Year API.
 * Docs: https://www.census.gov/data/developers/data-sets/acs-5year.html
 *
 * Puerto Rico is state FIPS 72 in ACS. This adapter currently fetches the
 * island-wide series (`for=state:72`); the future municipal map extends the
 * same call with `for=county:*&in=state:72` (Census treats municipios as
 * county-equivalents).
 *
 * The Census API requires a key (keyless requests now redirect to a
 * "Missing Key" page): CENSUS_API_KEY (free at https://api.census.gov/data/key_signup.html).
 *
 * All PR-level indicators share one request per vintage; a small in-process
 * cache avoids re-fetching the same row when several Census indicators are
 * ingested in the same run.
 */

const PROVIDER = "Census ACS";
// Newest-first; the newest vintage that answers wins (annual release moves).
const VINTAGES = ["2024", "2023", "2022"];

const rowCache = new Map();

async function fetchPrRow(apiKey, variables) {
  const cacheKey = variables.slice().sort().join(",");
  if (rowCache.has(cacheKey)) return rowCache.get(cacheKey);

  let lastError = null;
  for (const year of VINTAGES) {
    const url =
      `https://api.census.gov/data/${year}/acs/acs5` +
      `?get=NAME,${variables.join(",")}&for=state:72` +
      `&key=${encodeURIComponent(apiKey)}`;
    try {
      const payload = await fetchJson(url, { provider: PROVIDER });
      if (Array.isArray(payload) && payload.length >= 2) {
        const row = { year, headers: payload[0], values: payload[1] };
        rowCache.set(cacheKey, row);
        return row;
      }
      lastError = new Error(
        `${PROVIDER}: unexpected response for vintage ${year}`,
      );
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error(`${PROVIDER}: no vintage returned data`);
}

/**
 * @param {import("../types").Indicator} indicator
 */
export async function getSeries(indicator) {
  const apiKey = requireEnv("CENSUS_API_KEY", PROVIDER);
  const config = indicator.providerConfig || {};

  let row;
  let value;
  if (config.compute === "ratio") {
    // e.g. poverty rate = below-poverty / poverty-universe * 100
    row = await fetchPrRow(apiKey, [config.numerator, config.denominator]);
    const num = Number(row.values[row.headers.indexOf(config.numerator)]);
    const den = Number(row.values[row.headers.indexOf(config.denominator)]);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
      throw new Error(`${PROVIDER}: ratio inputs missing for ${indicator.id}`);
    }
    value = (num / den) * (config.scale ?? 1);
  } else if (config.variable) {
    row = await fetchPrRow(apiKey, [config.variable]);
    value = Number(row.values[row.headers.indexOf(config.variable)]);
    if (!Number.isFinite(value)) {
      throw new Error(
        `${PROVIDER}: ${config.variable} missing for ${indicator.id}`,
      );
    }
  } else {
    throw new Error(
      `${PROVIDER}: indicator ${indicator.id} has no providerConfig`,
    );
  }

  // ACS 5-year vintage "2024" covers 2020–2024; we date it at the midpoint
  // (July 1) per Census guidance for placing 5-year estimates on a timeline.
  return {
    observations: [{ date: `${row.year}-07-01`, value }],
  };
}

export function getMetadata() {
  return {
    provider: PROVIDER,
    apiDocs: "https://www.census.gov/data/developers/data-sets/acs-5year.html",
    requiresKey: true,
    keyEnvVar: "CENSUS_API_KEY",
  };
}
