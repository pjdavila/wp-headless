import * as bls from "./bls.js";
import * as eia from "./eia.js";
import * as bea from "./bea.js";
import * as census from "./census.js";
import { estadisticasPr } from "./estadisticas-pr.js";
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
 * Providers marked `pending: true` are documented stubs for sources without
 * a usable API; they never return data.
 */
const PROVIDERS = {
  bls: wrapProvider("bls", bls),
  eia: wrapProvider("eia", eia),
  bea: wrapProvider("bea", bea),
  census: wrapProvider("census", census),
  "estadisticas-pr": estadisticasPr,
  hacienda,
  "planning-board": planningBoard,
  tourism,
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
