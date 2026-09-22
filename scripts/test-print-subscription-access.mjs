// Authorization tests for the signed-in print-subscription lookup
// (lib/printSubscriptionAccount.js). Run with:
//   npm run test:print-subscription
//
// These tests guard the access-control rule that direct portal/status access
// requires an exact firebaseUid metadata match — never an email-only match.

import assert from "node:assert/strict";
import {
  findAccountPrintSubscription,
  isAccountPrintSubscription,
  LIVE_SUBSCRIPTION_STATUSES,
} from "../lib/printSubscriptionAccount.js";

function fakeSub(overrides = {}) {
  return {
    id: "sub_1",
    customer: "cus_1",
    created: 1700000000,
    status: "active",
    metadata: { source: "suscripcion-impresa", firebaseUid: "uid-owner" },
    ...overrides,
  };
}

function fakeStripe(customersWithSubs) {
  return {
    customers: {
      async list() {
        return {
          data: customersWithSubs.map(([customerId]) => ({ id: customerId })),
        };
      },
    },
    subscriptions: {
      async list({ customer }) {
        const entry = customersWithSubs.find(([id]) => id === customer);
        return { data: entry ? entry[1] : [] };
      },
    },
  };
}

const tests = [];
function test(name, fn) {
  tests.push([name, fn]);
}

test("returns the subscription when the firebaseUid matches exactly", async () => {
  const sub = fakeSub();
  const stripe = fakeStripe([["cus_1", [sub]]]);
  const found = await findAccountPrintSubscription(stripe, {
    uid: "uid-owner",
    email: "owner@example.com",
  });
  assert.equal(found?.id, "sub_1");
});

test("denies a subscription pinned to a different uid, same email", async () => {
  const stripe = fakeStripe([["cus_1", [fakeSub()]]]);
  const found = await findAccountPrintSubscription(stripe, {
    uid: "uid-attacker",
    email: "owner@example.com",
  });
  assert.equal(found, null);
});

test("denies legacy subscriptions without firebaseUid, same email", async () => {
  // Subscriptions created before accounts were linked carry no firebaseUid.
  // An email-only match must NOT grant access: Firebase accounts can be
  // registered for emails the registrant does not own.
  const legacy = fakeSub({ metadata: { source: "suscripcion-impresa" } });
  const stripe = fakeStripe([["cus_1", [legacy]]]);
  const found = await findAccountPrintSubscription(stripe, {
    uid: "uid-attacker",
    email: "owner@example.com",
  });
  assert.equal(found, null);
});

test("ignores subscriptions without the print-edition source marker", async () => {
  const other = fakeSub({ metadata: { firebaseUid: "uid-owner" } });
  const stripe = fakeStripe([["cus_1", [other]]]);
  const found = await findAccountPrintSubscription(stripe, {
    uid: "uid-owner",
    email: "owner@example.com",
  });
  assert.equal(found, null);
});

test("returns the most recent matching subscription", async () => {
  const older = fakeSub({ id: "sub_old", created: 1600000000 });
  const newer = fakeSub({ id: "sub_new", created: 1700000000 });
  const stripe = fakeStripe([["cus_1", [older, newer]]]);
  const found = await findAccountPrintSubscription(stripe, {
    uid: "uid-owner",
    email: "owner@example.com",
  });
  assert.equal(found?.id, "sub_new");
});

test("returns null when the account has no Stripe customer", async () => {
  const stripe = fakeStripe([]);
  const found = await findAccountPrintSubscription(stripe, {
    uid: "uid-owner",
    email: "nobody@example.com",
  });
  assert.equal(found, null);
});

test("returns null without a uid or email to locate anything with", async () => {
  const stripe = fakeStripe([["cus_1", [fakeSub()]]]);
  assert.equal(
    await findAccountPrintSubscription(stripe, {
      uid: "",
      email: "owner@example.com",
    }),
    null,
  );
  assert.equal(
    await findAccountPrintSubscription(stripe, { uid: "uid-owner", email: "" }),
    null,
  );
});

test("isAccountPrintSubscription never matches a missing uid", () => {
  assert.equal(isAccountPrintSubscription(fakeSub(), ""), false);
  assert.equal(isAccountPrintSubscription(fakeSub(), undefined), false);
});

test("live statuses are exactly active, trialing and past_due", () => {
  assert.deepEqual([...LIVE_SUBSCRIPTION_STATUSES].sort(), [
    "active",
    "past_due",
    "trialing",
  ]);
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
