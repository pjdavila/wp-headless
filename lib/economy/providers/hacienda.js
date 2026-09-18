import { createManualProvider } from "./manual-file.js";

/**
 * Departamento de Hacienda de Puerto Rico — IVU (sales & use tax) collections.
 *
 * Hacienda publishes monthly IVU collections only as per-fiscal-year PDFs
 * ("Distribución Mensual Recaudos IVU") on its Statistics and Revenues page;
 * the file URLs change every fiscal year and the tables are PDF-only, so
 * there is no stable machine-readable feed.
 *
 * Integrated via the manual-upload path: transcribe the monthly IVU total
 * from the PDF into lib/economy/manual/ivu-collections.csv and the regular
 * ingestion run normalizes and snapshots it. Until then the indicator
 * reports PENDING — no fabricated values.
 */
export const hacienda = createManualProvider({
  id: "hacienda",
  name: "Departamento de Hacienda",
  publisherUrl:
    "https://hacienda.pr.gov/inversionistas/estadisticas-y-recaudos-statistics-and-revenues/ingresos-del-impuesto-sobre-ventas-y-uso-ivu-sales-and-use-tax-sut-revenues",
  sourceDocs:
    "the monthly total from the Distribución Mensual Recaudos IVU PDFs",
});
