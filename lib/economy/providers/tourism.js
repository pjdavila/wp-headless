import { createManualProvider } from "./manual-file.js";

/**
 * Puerto Rico Tourism Company — hotel occupancy.
 *
 * Occupancy is published only in the Tourism Company's monthly "Selected
 * Lodging Properties" report (PDF) at https://tourism.pr.gov/statistics-2;
 * there is no public API. (Airport passengers, the other tourism
 * indicator, moved to the Instituto de Estadísticas' CKAN portal and is
 * fully automated — see the estadisticas-pr provider.)
 *
 * Integrated via the manual-upload path: transcribe the occupancy rate
 * from the monthly report into lib/economy/manual/hotel-occupancy.csv and
 * the regular ingestion run normalizes and snapshots it. Until then the
 * indicator reports PENDING — no fabricated values.
 */
export const tourism = createManualProvider({
  id: "tourism",
  name: "Puerto Rico Tourism Company",
  publisherUrl: "https://tourism.pr.gov/statistics-2",
  sourceDocs:
    "the occupancy rate from the monthly Selected Lodging Properties report (PDF)",
});
