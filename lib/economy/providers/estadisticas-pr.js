import { createPendingProvider } from "./pending.js";

/**
 * Instituto de Estadísticas de Puerto Rico — CPI, Manufacturing PMI,
 * cement sales, external trade statistics.
 *
 * Status: PENDING. The Instituto publishes these series as downloadable
 * Excel/PDF files on https://estadisticas.pr/ (and its datos.pr.gov portal);
 * there is no stable public query API. Documented ingestion method: download
 * the published Excel workbooks on a schedule (or manually), parse the
 * relevant sheets, and feed the same normalization pipeline — a future task
 * that does not change this layer's contracts.
 */
export const estadisticasPr = createPendingProvider({
  id: "estadisticas-pr",
  name: "Instituto de Estadísticas de Puerto Rico",
  publisherUrl: "https://estadisticas.pr/",
  ingestionMethod:
    "Scheduled/manual download of the published Excel workbooks from estadisticas.pr, then parse and normalize (no public API).",
});
