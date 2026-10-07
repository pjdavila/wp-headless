// Tests for the required recommendation letter on the 40 Under 40 form
// (lib/fortyUnder40Required.js). Run with:
//   npm run test:40under40

import assert from "node:assert/strict";
import {
  MISSING_LETTER_ERROR,
  missingRequiredLetterError,
  requiredLetterStored,
} from "../lib/fortyUnder40Required.js";

const tests = [];
function test(name, fn) {
  tests.push([name, fn]);
}

test("flags a submission with no letters at all", () => {
  assert.equal(missingRequiredLetterError({}, {}), MISSING_LETTER_ERROR);
});

test("flags a submission with only optional letters", () => {
  const uploads = {
    recommendation2: { ok: true },
    recommendation3: { ok: true },
  };
  assert.equal(missingRequiredLetterError(uploads, {}), MISSING_LETTER_ERROR);
});

test("keeps a more specific upload error for the first letter", () => {
  const errors = {
    recommendation1: "The recommendation letter must be a PDF file.",
  };
  assert.equal(missingRequiredLetterError({}, errors), null);
});

test("accepts a submission with the first letter", () => {
  assert.equal(
    missingRequiredLetterError({ recommendation1: { ok: true } }, {}),
    null,
  );
});

test("storage failure: required letter not stored blocks acknowledgement", () => {
  // R2 and local disk both failed -> the loop never records recommendation1.
  assert.equal(requiredLetterStored({}), false);
  assert.equal(
    requiredLetterStored({ recommendation2: { storedName: "x.pdf" } }),
    false,
  );
  assert.equal(
    requiredLetterStored({ recommendation1: { storedName: null } }),
    false,
  );
});

test("storage success: required letter stored allows acknowledgement", () => {
  assert.equal(
    requiredLetterStored({
      recommendation1: { storedName: "40under40/a.pdf" },
    }),
    true,
  );
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
