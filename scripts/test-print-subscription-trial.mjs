// Tests for the print subscription free trial (lib/printSubscriptionTrial.js).
// Run with: npm run test:print-subscription

import assert from "node:assert/strict";
import {
  addCalendarMonths,
  isTrialEligible,
  printTrialEnd,
  PRINT_TRIAL_MONTHS,
} from "../lib/printSubscriptionTrial.js";

const iso = (d) => d.toISOString().slice(0, 10);

const tests = [
  ["trial is 3 months", () => assert.equal(PRINT_TRIAL_MONTHS, 3)],
  [
    "Oct 29 + 3 months = Jan 29 of next year",
    () =>
      assert.equal(
        iso(addCalendarMonths(new Date("2026-10-29T15:00:00Z"), 3)),
        "2027-01-29",
      ),
  ],
  [
    "clamps to the end of a shorter month",
    () => {
      assert.equal(
        iso(addCalendarMonths(new Date("2026-11-30T12:00:00Z"), 3)),
        "2027-02-28",
      );
      assert.equal(
        iso(addCalendarMonths(new Date("2027-11-30T12:00:00Z"), 3)),
        "2028-02-29",
      );
    },
  ],
  [
    "trial_end is a unix timestamp in seconds, well past Stripe's 48h minimum",
    () => {
      const now = new Date("2026-10-29T15:00:00Z");
      const end = printTrialEnd(now);
      assert.equal(end, Date.UTC(2027, 0, 29, 15) / 1000);
      assert.ok(end - now.getTime() / 1000 > 48 * 3600);
    },
  ],
  [
    "only accounts without a previous print subscription get the trial",
    () => {
      assert.equal(isTrialEligible(null), true);
      assert.equal(isTrialEligible({ id: "sub_1", status: "canceled" }), false);
    },
  ],
];

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
