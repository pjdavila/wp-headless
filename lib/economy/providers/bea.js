import { fetchJson, requireEnv } from "./http.js";

/**
 * U.S. Bureau of Economic Analysis — Regional dataset.
 * Docs: https://apps.bea.gov/api/ (user guide PDF, Appendix N).
 *
 * Puerto Rico is GeoFips 72000 in the Regional dataset. BEA reports personal
 * income in current dollars with a UNIT_MULT field ("3" = thousands); values
 * arrive as comma-formatted strings (e.g. "98,765").
 *
 * The adapter normalizes everything to millions of USD so the registry unit
 * stays stable regardless of the table's UNIT_MULT.
 *
 * The API requires a key: BEA_API_KEY (free at https://apps.bea.gov/api/signup).
 *
 * NOTE: the indicator config carries a fallback list of candidate tables
 * (["SAINC1", "SQINC1"] for personal income) because BEA's Puerto Rico
 * coverage has moved between tables. The first table that returns data wins;
 * if none do, the run report carries BEA's own error message.
 */

const BEA_URL = "https://apps.bea.gov/api/data/";
const PROVIDER = "BEA";

/** "2024" → annual date; "2024Q1" → quarter-start date. */
function periodToDate(timePeriod) {
  if (/^\d{4}$/.test(timePeriod)) return `${timePeriod}-01-01`;
  const quarterly = /^(\d{4})Q([1-4])$/.exec(timePeriod);
  if (quarterly) {
    const month = String((Number(quarterly[2]) - 1) * 3 + 1).padStart(2, "0");
    return `${quarterly[1]}-${month}-01`;
  }
  return null;
}

function parseValue(dataValue, unitMult) {
  const raw = Number(String(dataValue).replace(/,/g, ""));
  if (!Number.isFinite(raw)) return null;
  // Normalize to millions of USD.
  if (unitMult === "3") return raw / 1000;
  if (unitMult === "0") return raw / 1_000_000;
  return raw; // "6" (millions) or unknown: use as reported
}

async function fetchTable(apiKey, { table, lineCode, geoFips }) {
  const url =
    `${BEA_URL}?UserID=${encodeURIComponent(apiKey)}` +
    `&method=GetData&datasetname=Regional` +
    `&TableName=${encodeURIComponent(table)}` +
    `&LineCode=${encodeURIComponent(lineCode)}` +
    `&GeoFips=${encodeURIComponent(geoFips)}` +
    `&Year=ALL&ResultFormat=JSON`;

  const payload = await fetchJson(url, {
    provider: PROVIDER,
    timeoutMs: 25000,
  });
  const result = payload?.BEAAPI?.Results;
  const apiError = result?.Error;
  if (apiError) {
    throw new Error(
      `${PROVIDER} ${table}: ${apiError.APIErrorDescription || "API error"}`,
    );
  }
  return result?.Data || [];
}

/**
 * @param {import("../types").Indicator} indicator
 */
export async function getSeries(indicator) {
  const apiKey = requireEnv("BEA_API_KEY", PROVIDER);
  const { tables, lineCode, geoFips } = indicator.providerConfig || {};
  if (!tables?.length || !lineCode || !geoFips) {
    throw new Error(
      `${PROVIDER}: indicator ${indicator.id} needs providerConfig {tables, lineCode, geoFips}`,
    );
  }

  let lastError = null;
  for (const table of tables) {
    let rows;
    try {
      rows = await fetchTable(apiKey, { table, lineCode, geoFips });
    } catch (err) {
      lastError = err;
      continue;
    }
    const observations = rows
      .map((row) => {
        const date = periodToDate(row.TimePeriod || "");
        const value = parseValue(row.DataValue, row.UNIT_MULT);
        return date && value !== null ? { date, value } : null;
      })
      .filter(Boolean);
    if (observations.length > 0) {
      return { observations };
    }
    lastError = new Error(`${PROVIDER} ${table}: returned no usable rows`);
  }
  throw lastError || new Error(`${PROVIDER}: no candidate table returned data`);
}

export function getMetadata() {
  return {
    provider: PROVIDER,
    apiDocs: "https://apps.bea.gov/api/",
    requiresKey: true,
    keyEnvVar: "BEA_API_KEY",
  };
}
