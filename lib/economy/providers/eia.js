import { fetchJson, requireEnv } from "./http.js";

/**
 * U.S. Energy Information Administration — Open Data API v2.
 * Docs: https://www.eia.gov/opendata/documentation.php
 *
 * Route used: electricity/retail-sales (EIA-861M) for Puerto Rico (stateid=PR).
 *   metric "price" → average revenue per kWh, cents per kilowatthour
 *   metric "sales" → retail sales, million kilowatthours
 * sectorid: RES (residential), COM (commercial), IND (industrial),
 *           TRA (transportation), ALL (total).
 *
 * The v2 API requires a key: EIA_API_KEY (free at https://www.eia.gov/opendata/).
 */

const EIA_URL = "https://api.eia.gov/v2/electricity/retail-sales/data/";
const PROVIDER = "EIA";

/**
 * @param {import("../types").Indicator} indicator
 */
export async function getSeries(indicator) {
  const apiKey = requireEnv("EIA_API_KEY", PROVIDER);
  const { sector, metric } = indicator.providerConfig || {};
  if (!sector || !metric) {
    throw new Error(
      `${PROVIDER}: indicator ${indicator.id} needs providerConfig {sector, metric}`,
    );
  }

  const url =
    `${EIA_URL}?api_key=${encodeURIComponent(apiKey)}` +
    `&frequency=monthly` +
    `&data[0]=${encodeURIComponent(metric)}` +
    `&facets[stateid][0]=PR` +
    `&facets[sectorid][0]=${encodeURIComponent(sector)}` +
    `&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=5000`;

  const payload = await fetchJson(url, { provider: PROVIDER });
  const rows = payload.response?.data || [];

  const observations = rows
    .filter(
      (row) =>
        /^\d{4}-\d{2}$/.test(row.period || "") &&
        row[metric] !== null &&
        row[metric] !== undefined,
    )
    .map((row) => ({
      date: `${row.period}-01`,
      value: Number(row[metric]),
    }));

  if (observations.length === 0) {
    throw new Error(`${PROVIDER}: no ${metric} observations for PR/${sector}`);
  }
  return { observations };
}

export function getMetadata() {
  return {
    provider: PROVIDER,
    apiDocs: "https://www.eia.gov/opendata/documentation.php",
    requiresKey: true,
    keyEnvVar: "EIA_API_KEY",
  };
}
