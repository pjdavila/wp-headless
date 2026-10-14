// Tests for the required recommendation letters on the 40 Under 40 form
// (lib/fortyUnder40Required.js). All three letters are required. Run with:
//   npm run test:40under40

import assert from "node:assert/strict";
import {
  MISSING_LETTER_ERROR,
  REQUIRED_RECOMMENDATION_FIELDS,
  missingRequiredLetterErrors,
  requiredLettersStored,
} from "../lib/fortyUnder40Required.js";

const tests = [];
function test(name, fn) {
  tests.push([name, fn]);
}

const ALL_UPLOADS = Object.fromEntries(
  REQUIRED_RECOMMENDATION_FIELDS.map((f) => [f, { ok: true }]),
);
const ALL_STORED = Object.fromEntries(
  REQUIRED_RECOMMENDATION_FIELDS.map((f) => [
    f,
    { storedName: `40under40/${f}.pdf` },
  ]),
);

test("requires exactly the three recommendation letters", () => {
  assert.deepEqual(REQUIRED_RECOMMENDATION_FIELDS, [
    "recommendation1",
    "recommendation2",
    "recommendation3",
  ]);
});

test("flags every letter when none are uploaded", () => {
  assert.deepEqual(missingRequiredLetterErrors({}, {}), {
    recommendation1: MISSING_LETTER_ERROR,
    recommendation2: MISSING_LETTER_ERROR,
    recommendation3: MISSING_LETTER_ERROR,
  });
});

for (const field of REQUIRED_RECOMMENDATION_FIELDS) {
  test(`flags only ${field} when it alone is missing`, () => {
    const uploads = { ...ALL_UPLOADS };
    delete uploads[field];
    assert.deepEqual(missingRequiredLetterErrors(uploads, {}), {
      [field]: MISSING_LETTER_ERROR,
    });
  });

  test(`keeps a more specific upload error for ${field}`, () => {
    const uploads = { ...ALL_UPLOADS };
    delete uploads[field];
    const errors = { [field]: "The recommendation letter must be a PDF file." };
    assert.deepEqual(missingRequiredLetterErrors(uploads, errors), {});
  });

  test(`storage failure on ${field} blocks acknowledgement`, () => {
    const stored = { ...ALL_STORED };
    delete stored[field];
    assert.equal(requiredLettersStored(stored), false);
    assert.equal(
      requiredLettersStored({ ...ALL_STORED, [field]: { storedName: null } }),
      false,
    );
  });
}

test("accepts a submission with all three letters", () => {
  assert.deepEqual(missingRequiredLetterErrors(ALL_UPLOADS, {}), {});
});

test("nothing stored blocks acknowledgement", () => {
  assert.equal(requiredLettersStored({}), false);
  assert.equal(requiredLettersStored(undefined), false);
});

test("all three stored allows acknowledgement", () => {
  assert.equal(requiredLettersStored(ALL_STORED), true);
});

let failed = 0;
for (const [name, fn] of tests) {
  try {
    await fn();
    console.log("ok   -", name);
  } catch (err) {
    failed += 1;
    console.error("FAIL -", name);
    console.error(err);
  }
}
if (failed) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${tests.length} tests passed`);
