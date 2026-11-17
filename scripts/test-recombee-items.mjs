// Tests for the Recombee item metadata helpers (lib/recombeeItems.js).
// Run with: npm run test:recommendations

import assert from "node:assert/strict";
import {
  createItemFiller,
  postToItemValues,
  recommendationToCard,
  slugForItem,
  valuesToFill,
} from "../lib/recombeeItems.js";

const wpPost = (slug, extra = {}) => ({
  slug,
  title: `Title &#8220;${slug}&#8221; &amp; more`,
  excerpt: "<p>Some <strong>excerpt</strong> text&nbsp;here [&hellip;]</p>\n",
  uri: `/${slug}/`,
  dateGmt: "2026-04-07T20:13:58",
  featuredImage: {
    node: {
      sourceUrl: `https://cms.vnmedia.co/cbusiness/wp-content/uploads/sites/2/2026/04/${slug}.jpg`,
    },
  },
  categories: {
    nodes: [
      {
        name: "Uncategorized",
        slug: "uncategorized",
        uri: "/category/uncategorized/",
      },
      {
        name: "Energy &amp; Oil",
        slug: "energy-oil",
        uri: "/category/energy-oil/",
      },
    ],
  },
  ...extra,
});

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test("postToItemValues maps a WordPress post to feed-compatible values", () => {
  const v = postToItemValues(wpPost("my-post"));
  assert.deepEqual(v, {
    title: "Title “my-post” & more",
    link: "https://caribbean.business/my-post/",
    "media:content":
      "https://img.caribbean.business/uploads/2026/04/my-post.jpg",
    pubDate: Date.UTC(2026, 3, 7, 20, 13, 58) / 1000,
    categories: "Energy & Oil",
    categoryUri: "/category/energy-oil/",
    description: "Some excerpt text here […]",
  });
});

test("postToItemValues leaves unknown fields null", () => {
  const v = postToItemValues(
    wpPost("x", {
      featuredImage: null,
      excerpt: "",
      categories: { nodes: [] },
      dateGmt: null,
    }),
  );
  assert.equal(v["media:content"], null);
  assert.equal(v.description, null);
  assert.equal(v.categories, null);
  assert.equal(v.categoryUri, null);
  assert.equal(v.pubDate, null);
});

test("valuesToFill never overwrites existing (feed) values", () => {
  const current = {
    title: "Feed title",
    link: "https://caribbean.business/a/",
    "media:content": null,
    pubDate: 1775624547,
    categories: "Business",
    description: "",
  };
  const next = postToItemValues(wpPost("a"));
  const fill = valuesToFill(current, next);
  assert.deepEqual(Object.keys(fill).sort(), [
    "categoryUri",
    "description",
    "media:content",
  ]);
  assert.equal(fill["media:content"], next["media:content"]);
});

test("slugForItem uses the link path for feed items, the id otherwise", () => {
  assert.equal(
    slugForItem("00d82059e50971b5ef418469d01749c4", {
      link: "https://caribbean.business/some-slug/",
    }),
    "some-slug",
  );
  assert.equal(slugForItem("tracked-slug", { link: null }), "tracked-slug");
  assert.equal(slugForItem("tracked-slug", null), "tracked-slug");
});

test("recommendationToCard builds a card from Recombee values only", () => {
  const card = recommendationToCard({
    id: "abc",
    values: {
      title: "T",
      link: "https://caribbean.business/t-slug/",
      "media:content": "https://img.caribbean.business/uploads/x.jpg",
      pubDate: 1775624547,
      categories: "Business",
      categoryUri: "/category/business/",
      description: "A <b> & B",
    },
  });
  assert.deepEqual(card, {
    id: "abc",
    title: "T",
    excerpt: "A &lt;b&gt; &amp; B",
    uri: "/t-slug/",
    date: new Date(1775624547 * 1000).toISOString(),
    imageUrl: "https://img.caribbean.business/uploads/x.jpg",
    category: "Business",
    categoryUri: "/category/business/",
  });
  assert.equal(recommendationToCard({ id: "s", values: {} }).uri, "/s/");
});

function setupFiller({ recombee = {}, wpKnown = null, wpFail = false } = {}) {
  let t = 1_000_000;
  let scheduled = [];
  const calls = { get: [], wp: [], set: [] };
  const state = { wpFail };
  const filler = createItemFiller({
    now: () => t,
    schedule: (fn) => scheduled.push(fn),
    getValuesMany: async (ids) => {
      calls.get.push([...ids]);
      const out = {};
      for (const id of ids) out[id] = recombee[id] ?? null;
      return out;
    },
    fetchBySlugs: async (slugs) => {
      calls.wp.push([...slugs]);
      if (state.wpFail) throw new Error("WP down");
      return slugs
        .filter((s) => !wpKnown || wpKnown.includes(s))
        .map((s) => wpPost(s));
    },
    setValuesMany: async (writes) => {
      calls.set.push(writes);
      for (const w of writes)
        recombee[w.id] = { ...(recombee[w.id] || {}), ...w.values };
    },
  });
  const runScheduled = async () => {
    const fns = scheduled;
    scheduled = [];
    for (const fn of fns) await fn();
  };
  return {
    filler,
    calls,
    state,
    recombee,
    runScheduled,
    advance: (ms) => (t += ms),
    scheduledCount: () => scheduled.length,
  };
}

test("filler batches views into one Recombee check and one WordPress request", async () => {
  const s = setupFiller({ recombee: { done: { title: "Already there" } } });
  for (const id of ["a", "b", "a", "done"]) s.filler.track(id);
  assert.equal(s.scheduledCount(), 1);
  await s.runScheduled();
  assert.deepEqual(s.calls.get, [["a", "b", "done"]]);
  assert.deepEqual(s.calls.wp, [["a", "b"]]);
  assert.equal(s.calls.set.length, 1);
  assert.equal(s.recombee.a.title, "Title “a” & more");
  assert.equal(s.recombee.b.link, "https://caribbean.business/b/");
});

test("filler checks each item only once per process", async () => {
  const s = setupFiller({ recombee: { done: { title: "x" } } });
  s.filler.track("a");
  s.filler.track("done");
  await s.runScheduled();
  s.filler.track("a");
  s.filler.track("done");
  assert.equal(s.scheduledCount(), 0);
  assert.equal(s.calls.get.length, 1);
});

test("filler remembers slugs WordPress does not know for a while", async () => {
  const s = setupFiller({ wpKnown: [] });
  s.filler.track("junk");
  await s.runScheduled();
  s.filler.track("junk");
  assert.equal(s.scheduledCount(), 0);
  s.advance(61 * 60 * 1000);
  s.filler.track("junk");
  await s.runScheduled();
  assert.equal(s.calls.wp.length, 2);
  assert.equal(s.calls.set.length, 0);
});

test("filler backs off after a WordPress error and retries later views", async () => {
  const s = setupFiller({ wpFail: true });
  s.filler.track("a");
  await s.runScheduled();
  assert.equal(s.calls.wp.length, 1);
  s.state.wpFail = false;
  s.filler.track("a");
  await s.runScheduled(); // still inside the backoff: reschedules, no WP call
  assert.equal(s.calls.wp.length, 1);
  s.advance(61 * 1000);
  await s.runScheduled();
  assert.equal(s.calls.wp.length, 2);
  assert.equal(s.recombee.a.title, "Title “a” & more");
});

test("settled() waits for the delayed write (what Workers pass to waitUntil)", async () => {
  const s = setupFiller();
  s.filler.track("a");
  let done = false;
  const settled = s.filler.settled().then(() => (done = true));
  await Promise.resolve();
  assert.equal(done, false); // the flush has not run yet
  await s.runScheduled();
  await settled;
  assert.equal(done, true);
  assert.equal(s.recombee.a.title, "Title “a” & more");
  await s.filler.settled(); // idle: resolves immediately
});

test("filler queue is capped", async () => {
  let t = 0;
  const seen = [];
  const filler = createItemFiller({
    now: () => t,
    schedule: () => {},
    maxQueue: 3,
    getValuesMany: async (ids) => (seen.push(...ids), {}),
    fetchBySlugs: async () => [],
    setValuesMany: async () => {},
  });
  for (const id of ["a", "b", "c", "d", "e"]) filler.track(id);
  assert.equal(filler.pending(), 3);
});

let failed = 0;
const origError = console.error;
for (const [name, fn] of tests) {
  console.error = () => {};
  try {
    await fn();
    console.error = origError;
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error = origError;
    failed++;
    console.error(`FAIL - ${name}\n${err.stack}`);
  }
}
if (failed) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log(`${tests.length} tests passed`);
