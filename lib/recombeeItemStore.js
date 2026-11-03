// Recombee reads/writes for item metadata (see lib/recombeeItems.js). Shared by
// the view-tracking API route and scripts/sync-recombee-items.mjs.

import { ITEM_PROPERTIES } from "./recombeeItems.js";

export function createItemStore(client, rqs) {
  let propsReady = null;

  // Creates any of our item properties missing from the Recombee schema
  // (today only categoryUri; the rest come from the RSS feed). Once per process.
  function ensureProperties() {
    if (!propsReady) {
      propsReady = (async () => {
        const existing = await client.send(new rqs.ListItemProperties());
        const names = new Set((existing || []).map((p) => p.name));
        for (const { name, type } of ITEM_PROPERTIES) {
          if (names.has(name)) continue;
          try {
            await client.send(new rqs.AddItemProperty(name, type));
          } catch (err) {
            // 409: created meanwhile by another instance.
            if (err?.statusCode !== 409) throw err;
          }
        }
      })().catch((err) => {
        propsReady = null;
        throw err;
      });
    }
    return propsReady;
  }

  async function getValuesMany(ids) {
    if (!ids.length) return {};
    const results = await client.send(
      new rqs.Batch(ids.map((id) => new rqs.GetItemValues(id))),
    );
    const out = {};
    ids.forEach((id, i) => {
      const r = results?.[i];
      if (r?.code === 200) out[id] = r.json || {};
      else if (r?.code === 404) out[id] = null;
      else throw new Error(`Recombee GetItemValues ${id}: ${r?.code}`);
    });
    return out;
  }

  async function setValuesMany(writes) {
    if (!writes.length) return;
    await ensureProperties();
    const results = await client.send(
      new rqs.Batch(
        writes.map(
          (w) => new rqs.SetItemValues(w.id, w.values, { cascadeCreate: true }),
        ),
      ),
    );
    const failed = (results || []).filter((r) => r.code < 200 || r.code > 299);
    if (failed.length) {
      throw new Error(
        `Recombee SetItemValues failed for ${failed.length}/${writes.length}: ${JSON.stringify(failed[0]?.json)}`,
      );
    }
  }

  return { ensureProperties, getValuesMany, setValuesMany };
}
