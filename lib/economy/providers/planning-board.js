import { createManualProvider } from "./manual-file.js";

/**
 * Junta de Planificación de Puerto Rico — real GNP growth.
 *
 * Macro aggregates are published annually in the Informe Económico al
 * Gobernador and its Apéndice Estadístico (PDF) at https://jp.pr.gov/;
 * there is no public API and no machine-readable table.
 *
 * Integrated via the manual-upload path: transcribe the real GNP growth
 * row from the Apéndice Estadístico into lib/economy/manual/gnp-growth.csv
 * once a year and the regular ingestion run normalizes and snapshots it.
 * Until then the indicator reports PENDING — no fabricated values.
 */
export const planningBoard = createManualProvider({
  id: "planning-board",
  name: "Junta de Planificación",
  publisherUrl: "https://jp.pr.gov/informe-economico-al-gobernador",
  sourceDocs:
    "the real GNP growth row from the Apéndice Estadístico del Informe Económico al Gobernador (annual PDF)",
});
