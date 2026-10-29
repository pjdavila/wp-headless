// Tests for saving the print-subscription form on the Stripe customer
// (lib/printSubscriptionCustomer.js). Run with:
//   npm run test:print-subscription

import assert from "node:assert/strict";
import {
  buildCustomerParams,
  findAccountCustomer,
  upsertPrintSubscriptionCustomer,
} from "../lib/printSubscriptionCustomer.js";

const FORM = {
  uid: "uid-owner",
  fullName: "María Rivera",
  email: "maria@example.com",
  phone: "787-555-0100",
  addressLine1: "123 Calle Luna",
  addressLine2: "Apt 4B",
  town: "San Juan",
  zip: "00901",
};

function fakeStripe({
  searchResults = [],
  listResults = [],
  searchThrows,
} = {}) {
  const calls = [];
  return {
    calls,
    customers: {
      async search(params) {
        calls.push(["search", params]);
        if (searchThrows) throw new Error("search unavailable");
        return { data: searchResults };
      },
      async list(params) {
        calls.push(["list", params]);
        return { data: listResults };
      },
      async create(params) {
        calls.push(["create", params]);
        return { id: "cus_new", ...params };
      },
      async update(id, params) {
        calls.push(["update", id, params]);
        return { id, ...params };
      },
    },
  };
}

const tests = [];
function test(name, fn) {
  tests.push([name, fn]);
}

test("maps the form to Stripe address and shipping fields", () => {
  const p = buildCustomerParams(FORM);
  const expectedAddress = {
    line1: "123 Calle Luna",
    line2: "Apt 4B",
    city: "San Juan",
    state: "PR",
    postal_code: "00901",
    country: "PR",
  };
  assert.equal(p.name, "María Rivera");
  assert.equal(p.email, "maria@example.com");
  assert.equal(p.phone, "787-555-0100");
  assert.deepEqual(p.address, expectedAddress);
  assert.deepEqual(p.shipping, {
    name: "María Rivera",
    phone: "787-555-0100",
    address: expectedAddress,
  });
  assert.deepEqual(p.metadata, {
    source: "suscripcion-impresa",
    firebaseUid: "uid-owner",
  });
});

test("an empty apartment/suite clears line 2 on both addresses", () => {
  const p = buildCustomerParams({ ...FORM, addressLine2: "" });
  assert.equal(p.address.line2, "");
  assert.equal(p.shipping.address.line2, "");
});

test("keeps ZIP+4 exactly as validated", () => {
  const p = buildCustomerParams({ ...FORM, zip: "00901-1234" });
  assert.equal(p.address.postal_code, "00901-1234");
  assert.equal(p.shipping.address.postal_code, "00901-1234");
});

test("creates a customer when the account has none", async () => {
  const stripe = fakeStripe();
  const customer = await upsertPrintSubscriptionCustomer(stripe, FORM);
  assert.equal(customer.id, "cus_new");
  const create = stripe.calls.find(([k]) => k === "create");
  assert.ok(create, "customers.create was called");
  assert.equal(create[1].shipping.address.city, "San Juan");
});

test("reuses and updates the customer bound to the same uid", async () => {
  const stripe = fakeStripe({
    searchResults: [{ id: "cus_own", metadata: { firebaseUid: "uid-owner" } }],
  });
  const customer = await upsertPrintSubscriptionCustomer(stripe, {
    ...FORM,
    addressLine1: "9 Calle Sol",
  });
  assert.equal(customer.id, "cus_own");
  assert.ok(!stripe.calls.some(([k]) => k === "create"), "no duplicate");
  const update = stripe.calls.find(([k]) => k === "update");
  assert.equal(update[1], "cus_own");
  assert.equal(update[2].shipping.address.line1, "9 Calle Sol");
});

test("finds a just-created customer through the email list when search lags", async () => {
  const stripe = fakeStripe({
    searchResults: [],
    listResults: [{ id: "cus_own", metadata: { firebaseUid: "uid-owner" } }],
  });
  const found = await findAccountCustomer(stripe, {
    uid: "uid-owner",
    email: "maria@example.com",
  });
  assert.equal(found?.id, "cus_own");
});

test("still works when customer search is unavailable", async () => {
  const stripe = fakeStripe({
    searchThrows: true,
    listResults: [{ id: "cus_own", metadata: { firebaseUid: "uid-owner" } }],
  });
  const found = await findAccountCustomer(stripe, {
    uid: "uid-owner",
    email: "maria@example.com",
  });
  assert.equal(found?.id, "cus_own");
});

test("never reuses a same-email customer bound to another account", async () => {
  const stripe = fakeStripe({
    listResults: [
      { id: "cus_other", metadata: { firebaseUid: "uid-someone-else" } },
      { id: "cus_legacy", metadata: {} },
    ],
  });
  const customer = await upsertPrintSubscriptionCustomer(stripe, FORM);
  assert.equal(customer.id, "cus_new");
  assert.ok(!stripe.calls.some(([k]) => k === "update"), "nobody overwritten");
});

test("ignores deleted customers", async () => {
  const stripe = fakeStripe({
    searchResults: [
      { id: "cus_gone", deleted: true, metadata: { firebaseUid: "uid-owner" } },
    ],
  });
  const found = await findAccountCustomer(stripe, {
    uid: "uid-owner",
    email: "",
  });
  assert.equal(found, null);
});

test("Stripe errors propagate so no checkout starts", async () => {
  const stripe = fakeStripe();
  stripe.customers.create = async () => {
    throw new Error("invalid_request_error");
  };
  await assert.rejects(
    () => upsertPrintSubscriptionCustomer(stripe, FORM),
    /invalid_request_error/,
  );
});

test("guest checkout (no uid) always creates an unbound customer", async () => {
  const stripe = fakeStripe({
    listResults: [
      { id: "cus_owner", metadata: { firebaseUid: "uid-owner" } },
      { id: "cus_guest", metadata: { source: "suscripcion-impresa" } },
    ],
  });
  const customer = await upsertPrintSubscriptionCustomer(stripe, {
    ...FORM,
    uid: null,
  });
  assert.equal(customer.id, "cus_new");
  assert.deepEqual(customer.metadata, { source: "suscripcion-impresa" });
  assert.ok(!stripe.calls.some(([k]) => k === "update"), "nobody overwritten");
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
