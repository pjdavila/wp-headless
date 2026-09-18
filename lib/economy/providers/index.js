import * as bls from "./bls.js";
import * as eia from "./eia.js";
import * as bea from "./bea.js";
import * as census from "./census.js";
import * as estadisticasPr from "./estadisticas-pr.js";
import { hacienda } from "./hacienda.js";
import { planningBoard } from "./planning-board.js";
import { tourism } from "./tourism.js";

/**
 * Provider registry. `Indicator.provider` in lib/economy/indicators.js is the
 * key into this map. Every provider exposes the standardized interface:
 *
 *   getSeries(indicator)   → { observations: [{date, value, preliminary?}] }
 *   getLatest(indicator)   → latest observation (derived from getSeries)
 *   getMetadata()          → provider-level info (docs, key requirements)
 *
 * Sources without a machine-readable feed (Hacienda IVU, Junta de
 * Planificación GNP, Tourism Company hotel occupancy) are served by the
 * manual-upload providers in manual-file.js; they throw PendingSourceError
 * until an operator supplies lib/economy/manual/<indicatorId>.csv, and the
 * ingestion pipeline reports those indicators as "pending" (never with
 * fabricated values).
 */
const PROVIDERS = {
  bls: wrapProvider("bls", bls),
  eia: wrapProvider("eia", eia),
  bea: wrapProvider("bea", bea),
  census: wrapProvider("census", census),
  "estadisticas-pr": wrapProvider("estadisticas-pr", estadisticasPr),
  hacienda: wrapProvider("hacienda", hacienda),
  "planning-board": wrapProvider("planning-board", planningBoard),
  tourism: wrapProvider("tourism", tourism),
};

function wrapProvider(id, adapter) {
  return {
    id,
    pending: false,
    getSeries: adapter.getSeries,
    getMetadata: adapter.getMetadata,
    async getLatest(indicator) {
      const { observations } = await adapter.getSeries(indicator);
      const sorted = [...observations].sort((a, b) =>
        a.date.localeCompare(b.date),
      );
      return sorted.length > 0 ? sorted[sorted.length - 1] : null;
    },
  };
}

export function getProvider(id) {
  return PROVIDERS[id] || null;
}
