// Fills missing article metadata (title, link, image, date, category,
// excerpt) on Recombee items from WordPress, so recommendations never need
// WordPress at request time. Only empty properties are written: values set by
// the RSS catalog feed are never overwritten. View tracking fills new items as
// they are read (pages/api/recombee-track.js); run this to backfill the
// catalog or to catch items that tracking could not fill (e.g. WP was down).
//
//   npm run sync:recombee              # write
//   npm run sync:recombee -- --dry-run # only report what would change

import { createRequire } from "node:module";
import {
  ITEM_PROPERTIES,
  fetchPostsBySlugs,
  postToItemValues,
  slugForItem,
  valuesToFill,
} from "../lib/recombeeItems.js";
import { createItemStore } from "../lib/recombeeItemStore.js";

const require = createRequire(import.meta.url);
const { getClient, rqs } = require("../lib/recombee.js");

const DRY_RUN = process.argv.includes("--dry-run");
// Small batches with one retry: the WordPress server is slow and answers
// 502/525 to large or back-to-back queries.
const WP_BATCH = 20;
const PAGE = 1000;

const client = getClient();
if (!client) {
  console.error("RECOMBEE_DB_ID / RECOMBEE_PRIVATE_TOKEN are not set.");
  process.exit(1);
}
const store = createItemStore(client, rqs);

async function listAllItems() {
  // Ask only for properties that exist yet (categoryUri may not, before the
  // first write).
  const existing = new Set(
    (await client.send(new rqs.ListItemProperties())).map((p) => p.name),
  );
  const props = ITEM_PROPERTIES.map((p) => p.name).filter((n) =>
    existing.has(n),
  );
  const all = [];
  for (let offset = 0; ; offset += PAGE) {
    const page = await client.send(
      new rqs.ListItems({
        count: PAGE,
        offset,
        returnProperties: true,
        includedProperties: props,
      }),
    );
    all.push(...page);
    if (page.length < PAGE) break;
  }
  return all;
}

function hasEmptyProperty(item) {
  return ITEM_PROPERTIES.some(
    ({ name }) =>
      item[name] === null || item[name] === undefined || item[name] === "",
  );
}

const items = await listAllItems();
const candidates = items.filter(hasEmptyProperty);
console.log(
  `${items.length} items in Recombee, ${candidates.length} with empty properties.`,
);

const stats = { updated: 0, notInWp: 0, nothingToAdd: 0, wpErrors: 0 };
const fieldCounts = {};
const sample = [];

for (let i = 0; i < candidates.length; i += WP_BATCH) {
  const batch = candidates.slice(i, i + WP_BATCH);
  const slugs = [...new Set(batch.map((it) => slugForItem(it.itemId, it)))];
  let posts;
  try {
    posts = await fetchPostsBySlugs(slugs).catch(async () => {
      await new Promise((r) => setTimeout(r, 5000));
      return fetchPostsBySlugs(slugs);
    });
  } catch (err) {
    stats.wpErrors += batch.length;
    console.error(
      `WordPress lookup failed for ${slugs.length} slugs: ${err.message}`,
    );
    continue;
  }
  const bySlug = new Map(posts.map((p) => [p.slug, p]));

  const writes = [];
  for (const item of batch) {
    const post = bySlug.get(slugForItem(item.itemId, item));
    if (!post) {
      stats.notInWp++;
      continue;
    }
    const values = valuesToFill(item, postToItemValues(post));
    if (!Object.keys(values).length) {
      stats.nothingToAdd++;
      continue;
    }
    for (const k of Object.keys(values))
      fieldCounts[k] = (fieldCounts[k] || 0) + 1;
    if (sample.length < 3) sample.push({ id: item.itemId, values });
    writes.push({ id: item.itemId, values });
  }

  if (writes.length && !DRY_RUN) await store.setValuesMany(writes);
  stats.updated += writes.length;
  console.log(
    `  ${Math.min(i + WP_BATCH, candidates.length)}/${candidates.length} checked, ${stats.updated} ${DRY_RUN ? "would be " : ""}updated`,
  );
}

console.log(DRY_RUN ? "Dry run, nothing written." : "Done.");
console.log(JSON.stringify({ ...stats, fields: fieldCounts }, null, 2));
if (sample.length) console.log("Sample:", JSON.stringify(sample, null, 2));
if (stats.wpErrors) process.exit(1);
