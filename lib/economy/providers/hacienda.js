import { createPendingProvider } from "./pending.js";

/**
 * Departamento de Hacienda de Puerto Rico — IVU (sales & use tax) collections,
 * General Fund revenue.
 *
 * Status: PENDING. Hacienda publishes monthly revenue figures in its
 * "Informe de Recaudaciones" reports (PDF/Excel) at https://hacienda.pr.gov/;
 * there is no public API. Documented ingestion method: scheduled/manual
 * download of the monthly revenue report, extract the IVU line, normalize.
 */
export const hacienda = createPendingProvider({
  id: "hacienda",
  name: "Departamento de Hacienda",
  publisherUrl: "https://hacienda.pr.gov/",
  ingestionMethod:
    "Scheduled/manual download of the monthly Informe de Recaudaciones (PDF/Excel) from hacienda.pr.gov, then extract and normalize (no public API).",
});
