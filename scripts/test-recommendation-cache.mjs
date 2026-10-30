// Tests for the WordPress post-card cache behind the recommendations API
// (lib/recommendationPostCache.js). Run with: npm run test:recommendations

import assert from "node:assert/strict";
import {
  createPostCardCache,
  ERROR_BACKOFF_MS,
  MISS_TTL_MS,
  POST_TTL_MS,
} from "../lib/recommendationPostCache.js";

const card = (slug) => ({ slug, title: `Title ${slug}`, uri: `/${slug}/` });

function setup({ fail = false, known = null } = {}) {
  let t = 1_000_000;
  const calls = [];
  const state = { fail };
  const cache = createPostCardCache({
    now: () => t,
    fetchBySlugs: async (slugs) => {
      calls.push([...slugs]);
      if (state.fail) throw new Error("WP down");
      return slugs.filter((s) => !known || known.includes(s)).map(card);
    },
  });
  return { cache, calls, state, advance: (ms) => (t += ms) };
}

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test("repeat views within the hour make no new WordPress request", async () => {
  const { cache, calls, advance } = setup();
  const first = await cache.getMany(["a", "b"]);
  assert.equal(first.a.title, "Title a");
  assert.equal(first.b.uri, "/b/");
  for (let i = 0; i < 50; i++) {
    advance(60 * 1000 - 1);
    const again = await cache.getMany(["b", "a"]);
    assert.equal(again.a.title, "Title a");
  }
  assert.equal(calls.length, 1);
});

test("only uncached slugs are requested, in one batch", async () => {
  const { cache, calls } = setup();
  await cache.getMany(["a", "b"]);
  const r = await cache.getMany(["a", "c", "d", "c"]);
  assert.deepEqual(Object.keys(r).sort(), ["a", "c", "d"]);
  assert.deepEqual(calls, [
    ["a", "b"],
    ["c", "d"],
  ]);
});

test("posts are refreshed after the TTL", async () => {
  const { cache, calls, advance } = setup();
  await cache.getMany(["a"]);
  advance(POST_TTL_MS + 1);
  await cache.getMany(["a"]);
  assert.equal(calls.length, 2);
});

test("unknown slugs are remembered for the miss TTL", async () => {
  const { cache, calls, advance } = setup({ known: ["a"] });
  const r = await cache.getMany(["a", "gone"]);
  assert.deepEqual(Object.keys(r), ["a"]);
  await cache.getMany(["gone"]);
  assert.equal(calls.length, 1);
  advance(MISS_TTL_MS + 1);
  await cache.getMany(["gone"]);
  assert.equal(calls.length, 2);
});

test("concurrent views share one WordPress request", async () => {
  const { cache, calls } = setup();
  const results = await Promise.all(
    Array.from({ length: 10 }, () => cache.getMany(["a", "b"])),
  );
  assert.equal(calls.length, 1);
  for (const r of results) assert.equal(r.b.title, "Title b");
});

test("WordPress errors back off and keep serving expired cards", async () => {
  const { cache, calls, state, advance } = setup();
  await cache.getMany(["a"]);
  advance(POST_TTL_MS + 1);
  state.fail = true;
  const r = await cache.getMany(["a", "new"]);
  assert.equal(r.a.title, "Title a");
  assert.equal(r.new, undefined);
  assert.equal(calls.length, 2);
  // During the backoff no further WordPress request is made.
  await cache.getMany(["a", "new"]);
  assert.equal(calls.length, 2);
  advance(ERROR_BACKOFF_MS + 1);
  state.fail = false;
  const after = await cache.getMany(["new"]);
  assert.equal(after.new.title, "Title new");
  assert.equal(calls.length, 3);
});

test("cache size is bounded", async () => {
  let t = 0;
  const cache = createPostCardCache({
    now: () => t,
    maxEntries: 3,
    fetchBySlugs: async (slugs) => slugs.map(card),
  });
  await cache.getMany(["a", "b", "c", "d", "e"]);
  assert.equal(cache.size(), 3);
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
