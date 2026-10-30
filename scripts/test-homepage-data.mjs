// Tests for shaping the single homepage WordPress response
// (lib/homepageData.js) and the header nav built from the flat category
// list. Run with: npm run test:homepage

import assert from "node:assert/strict";
import {
  buildHomepageProps,
  buildSpecialReportEditions,
  HOMEPAGE_REVALIDATE_SECONDS,
  pickLatestEdition,
} from "../lib/homepageData.js";

const SR = "cat-sr";
const post = (id, date, cats) => ({
  id,
  title: `Post ${id}`,
  uri: `/${id}/`,
  date,
  featuredImage: null,
  categories: { nodes: cats },
});
const ed = (id, name) => ({
  id,
  name,
  uri: `/category/special-reports/${id}/`,
  parentId: SR,
});
const OCT = ed("oct", "October: Home Improvement");
const SEP = ed("sep", "September: Insurance");

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test("revalidation stays at 15 minutes", () => {
  assert.equal(HOMEPAGE_REVALIDATE_SECONDS, 900);
});

test("groups special reports by edition, newest first, in widget shape", () => {
  const editions = buildSpecialReportEditions(
    [
      post("a", "2026-10-22T17:00:00", [OCT]),
      post("b", "2026-10-03T11:00:00", [SEP]),
      post("c", "2026-10-19T16:00:00", [OCT]),
    ],
    SR,
  );
  assert.deepEqual(
    editions.map((e) => [e.name, e.posts.nodes.map((p) => p.id)]),
    [
      ["October: Home Improvement", ["a", "c"]],
      ["September: Insurance", ["b"]],
    ],
  );
  assert.equal(editions[0].uri, OCT.uri);
  assert.equal(editions[0].posts.nodes[0].categories, undefined);
});

test("the widget still picks the edition with the newest article", () => {
  const editions = buildSpecialReportEditions(
    [
      post("b", "2026-10-23T09:00:00", [SEP]),
      post("a", "2026-10-22T17:00:00", [OCT]),
    ],
    SR,
  );
  assert.equal(pickLatestEdition(editions).name, "September: Insurance");
});

test("ignores posts filed only under the parent or unrelated categories", () => {
  const editions = buildSpecialReportEditions(
    [
      post("p", "2026-10-22", [
        { id: SR, name: "Special Reports", parentId: null },
      ]),
      post("q", "2026-10-21", [{ id: "news", name: "News", parentId: null }]),
    ],
    SR,
  );
  assert.deepEqual(editions, []);
  assert.deepEqual(
    buildSpecialReportEditions([post("a", "x", [OCT])], null),
    [],
  );
});

const VALID = {
  generalSettings: { title: "Caribbean Business" },
  categories: { nodes: [{ id: "n", slug: "news", parentId: null }] },
  posts: { nodes: [post("a", "2026-10-22", [])] },
  economy: { nodes: [post("e", "2026-10-21", [])] },
  specialReports: { id: SR },
  specialReportPosts: { nodes: [post("s", "2026-10-20", [OCT])] },
};

test("builds the props the homepage renders", () => {
  const props = buildHomepageProps(VALID);
  assert.equal(props.siteTitle, "Caribbean Business");
  assert.equal(props.posts.length, 1);
  assert.deepEqual(
    props.sectionPosts.economy.map((p) => p.id),
    ["e"],
  );
  assert.deepEqual(props.sectionPosts.business, []);
  assert.deepEqual(props.featuredPosts, []);
  assert.equal(props.specialReportEditions[0].name, OCT.name);
});

test("an unusable response throws so ISR keeps the last good homepage", () => {
  assert.throws(() => buildHomepageProps(null), /no posts/);
  assert.throws(
    () => buildHomepageProps({ ...VALID, posts: { nodes: [] } }),
    /no posts/,
  );
  assert.throws(
    () => buildHomepageProps({ ...VALID, categories: { nodes: [] } }),
    /no categories/,
  );
});

let failed = 0;
for (const [name, fn] of tests) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL - ${name}`);
    console.error(err);
  }
}
if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log(`\n${tests.length} tests passed`);
