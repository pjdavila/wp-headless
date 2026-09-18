import fs from "node:fs";
import { httpsGetText } from "./https.js";
import { observationsFromCsv } from "./csv.js";

/**
 * Instituto de Estadísticas de Puerto Rico — CPI, Manufacturing PMI,
 * cement sales, external trade, and airport passengers.
 *
 * LIVE adapter via the Instituto's CKAN open-data portal
 * (https://indicadores.pr). Each indicator's providerConfig.ckan names the
 * dataset and which CSV resource/column to read:
 *
 *   ckan: {
 *     dataset: "indice-de-precios-al-consumidor",   // CKAN package id
 *     resources: [
 *       { match: "ipc_", column: "Todos los artículos y servicios" },
 *       // or columns: [...] to sum several columns per month
 *       // or series: "exports" to tag multi-series observations
 *     ],
 *     valueScale: 1,                                 // optional unit conversion
 *   }
 *
 * Resource files are re-uploaded with date-stamped names every month
 * (ipc_abril2026.csv → ipc_mayo2026.csv), so the adapter NEVER hardcodes a
 * file URL: it resolves the current resource list through the CKAN API
 * (package_show) and matches `match` against the resource URL/name.
 *
 * TLS note: indicadores.pr serves an incomplete certificate chain (missing
 * the RapidSSL intermediate), which Node's fetch cannot verify. The
 * intermediate is bundled in ./certs/ and passed as an extra CA — see
 * https.js. If the portal ever rotates to a different CA, download the new
 * intermediate from the certificate's AIA "CA Issuers" URL.
 */

const CKAN_BASE = "https://indicadores.pr";
const PROVIDER_NAME = "Instituto de Estadísticas de Puerto Rico";
const EXTRA_CA_PEM = fs.readFileSync(
  new URL("./certs/rapidssl-tls-rsa-ca-g1.pem", import.meta.url),
  "utf8",
);

function getText(url) {
  return httpsGetText(url, {
    provider: "estadisticas-pr",
    extraCaPem: EXTRA_CA_PEM,
  });
}

async function listResources(dataset) {
  const text = await getText(
    `${CKAN_BASE}/api/3/action/package_show?id=${encodeURIComponent(dataset)}`,
  );
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(
      `estadisticas-pr: CKAN package_show for "${dataset}" returned non-JSON`,
    );
  }
  if (!body.success) {
    throw new Error(
      `estadisticas-pr: CKAN package_show for "${dataset}" failed — ${body.error?.message ?? "unknown error"}`,
    );
  }
  return body.result.resources.filter((r) => r.state === "active");
}

function resolveResource(resources, match) {
  const needle = match.toLowerCase();
  const hits = resources.filter(
    (r) =>
      (r.url || "").toLowerCase().includes(needle) ||
      (r.name || "").toLowerCase().includes(needle),
  );
  if (hits.length === 0) {
    throw new Error(
      `estadisticas-pr: no resource matching "${match}" — available: ${resources
        .map((r) => r.url?.split("/").pop() ?? r.name)
        .join(", ")}`,
    );
  }
  // Multiple hits: prefer the most recently modified upload.
  hits.sort((a, b) =>
    String(b.last_modified ?? "").localeCompare(String(a.last_modified ?? "")),
  );
  return hits[0];
}

export async function getSeries(indicator) {
  const config = indicator.providerConfig?.ckan;
  if (!config?.dataset || !config?.resources?.length) {
    throw new Error(
      `estadisticas-pr: indicator ${indicator.id} is missing providerConfig.ckan`,
    );
  }
  const resources = await listResources(config.dataset);
  const observations = [];
  for (const resourceConfig of config.resources) {
    const resource = resolveResource(resources, resourceConfig.match);
    const csvText = await getText(resource.url);
    observations.push(
      ...observationsFromCsv(csvText, {
        column: resourceConfig.column,
        columns: resourceConfig.columns,
        matchMode: resourceConfig.matchMode,
        series: resourceConfig.series,
        valueScale: config.valueScale,
      }),
    );
  }
  if (observations.length === 0) {
    throw new Error(
      `estadisticas-pr: ${config.dataset} CSVs produced no usable observations for ${indicator.id}`,
    );
  }
  return { observations };
}

export function getMetadata() {
  return {
    provider: PROVIDER_NAME,
    publisherUrl: "https://www.estadisticas.pr.gov/",
    pending: false,
    ingestionMethod:
      "CKAN open-data portal (indicadores.pr): package_show resolves the current CSV resource, which is downloaded and parsed.",
  };
}
