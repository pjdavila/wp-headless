import { createPendingProvider } from "./pending.js";

/**
 * Junta de Planificación de Puerto Rico — GNP/GDP, personal consumption,
 * investment (Informe Económico al Gobernador).
 *
 * Status: PENDING. Macro aggregates are published annually in the Informe
 * Económico al Gobernador (PDF/Excel appendices) at https://jp.pr.gov/;
 * there is no public API. Documented ingestion method: annual manual/scheduled
 * extraction of the national-accounts appendix tables, then normalize.
 */
export const planningBoard = createPendingProvider({
  id: "planning-board",
  name: "Junta de Planificación",
  publisherUrl: "https://jp.pr.gov/",
  ingestionMethod:
    "Annual manual/scheduled extraction of the national-accounts tables in the Informe Económico al Gobernador (PDF/Excel) from jp.pr.gov (no public API).",
});
