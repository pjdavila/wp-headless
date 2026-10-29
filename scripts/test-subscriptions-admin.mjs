// Tests for the internal subscriptions panel read model, admin allowlist and
// Stripe cache (lib/subscriptionAdminModel.js, lib/adminAuth.js,
// lib/stripeSubscriptionsAdmin.js). Run with:
//   npm run test:subscriptions-admin
//
// No network: Stripe is faked. Covers the status, "activo hasta" and trial
// derivation the panel relies on.

import assert from "node:assert/strict";
import {
  applyView,
  buildSummary,
  currentPeriodEnd,
  deriveActiveUntil,
  deriveTrial,
  formatPrice,
  hasScheduledCancellation,
  isActiveStatus,
  normalizeSubscription,
  parseFilters,
  rowsToCsv,
  statusLabel,
} from "../lib/subscriptionAdminModel.js";
import { checkAdminAccess, parseAdminAllowlist } from "../lib/adminAuth.js";
import {
  clearSubscriptionsCache,
  getSubscriptionsSnapshot,
} from "../lib/stripeSubscriptionsAdmin.js";

const DAY = 86400;
const NOW = 1_800_000_000;

function fakeSub(overrides = {}) {
  return {
    id: "sub_1",
    object: "subscription",
    livemode: false,
    status: "active",
    created: NOW - 40 * DAY,
    start_date: NOW - 40 * DAY,
    cancel_at: null,
    cancel_at_period_end: false,
    canceled_at: null,
    ended_at: null,
    trial_start: null,
    trial_end: null,
    metadata: {
      source: "suscripcion-impresa",
      firebaseUid: "uid-1",
      fullName: "María Rivera",
      email: "Maria@Example.com",
      phone: "787-555-0100",
      addressLine1: "Calle Luna 12",
      addressLine2: "",
      town: "San Juan",
      zip: "00901",
    },
    customer: {
      id: "cus_1",
      object: "customer",
      name: "Customer Name",
      email: "customer@example.com",
      phone: "+1 787 555 0199",
      shipping: {
        name: "Ship Name",
        phone: null,
        address: {
          line1: "Ship St 1",
          line2: null,
          city: "Ponce",
          postal_code: "00716",
        },
      },
      address: null,
    },
    items: {
      data: [
        {
          id: "si_1",
          current_period_start: NOW - 10 * DAY,
          current_period_end: NOW + 20 * DAY,
          quantity: 1,
          price: {
            id: "price_1",
            unit_amount: 499,
            currency: "usd",
            nickname: null,
            recurring: { interval: "month", interval_count: 1 },
            product: { id: "prod_print", name: "Edición impresa" },
          },
        },
      ],
    },
    ...overrides,
  };
}

const tests = [];
function test(name, fn) {
  tests.push([name, fn]);
}

// ---- status ----

test("status labels and active flag", () => {
  assert.equal(statusLabel("active"), "Activo");
  assert.equal(statusLabel("trialing"), "En prueba");
  assert.equal(statusLabel("past_due"), "Pago pendiente");
  assert.equal(statusLabel("canceled"), "Cancelado");
  assert.equal(statusLabel("something_new"), "something_new");
  assert.equal(isActiveStatus("active"), true);
  assert.equal(isActiveStatus("trialing"), true);
  assert.equal(isActiveStatus("past_due"), false);
  assert.equal(isActiveStatus("canceled"), false);
});

// ---- period / activo hasta ----

test("period end comes from subscription items (new API versions)", () => {
  assert.equal(currentPeriodEnd(fakeSub()), NOW + 20 * DAY);
});

test("period end falls back to the subscription field (old API versions)", () => {
  const sub = fakeSub({
    items: { data: [{ price: null }] },
    current_period_end: NOW + 5 * DAY,
  });
  assert.equal(currentPeriodEnd(sub), NOW + 5 * DAY);
});

test("active: activo hasta = current period end", () => {
  assert.deepEqual(deriveActiveUntil(fakeSub()), {
    at: NOW + 20 * DAY,
    reason: "period",
  });
});

test("scheduled cancellation via cancel_at wins over period end", () => {
  const sub = fakeSub({
    cancel_at: NOW + 20 * DAY,
    cancel_at_period_end: true,
  });
  assert.deepEqual(deriveActiveUntil(sub), {
    at: NOW + 20 * DAY,
    reason: "cancel_scheduled",
  });
  assert.equal(hasScheduledCancellation(sub), true);
});

test("cancel_at_period_end without cancel_at uses the period end", () => {
  const sub = fakeSub({ cancel_at_period_end: true });
  assert.deepEqual(deriveActiveUntil(sub), {
    at: NOW + 20 * DAY,
    reason: "cancel_scheduled",
  });
  assert.equal(hasScheduledCancellation(sub), true);
});

test("canceled: activo hasta = ended_at, no scheduled flag", () => {
  const sub = fakeSub({
    status: "canceled",
    canceled_at: NOW - 3 * DAY,
    ended_at: NOW - 2 * DAY,
    cancel_at: NOW - 2 * DAY,
  });
  assert.deepEqual(deriveActiveUntil(sub), {
    at: NOW - 2 * DAY,
    reason: "ended",
  });
  assert.equal(hasScheduledCancellation(sub), false);
});

test("incomplete subscriptions were never paid", () => {
  assert.deepEqual(deriveActiveUntil(fakeSub({ status: "incomplete" })), {
    at: null,
    reason: "none",
  });
});

test("trialing: activo hasta = trial end", () => {
  const sub = fakeSub({
    status: "trialing",
    trial_start: NOW - 2 * DAY,
    trial_end: NOW + 12 * DAY,
  });
  assert.deepEqual(deriveActiveUntil(sub), {
    at: NOW + 12 * DAY,
    reason: "trial",
  });
});

// ---- trial ----

test("trial: none", () => {
  assert.deepEqual(deriveTrial(fakeSub()), {
    hadTrial: false,
    inTrial: false,
    start: null,
    end: null,
  });
});

test("trial: in progress", () => {
  const t = deriveTrial(
    fakeSub({
      status: "trialing",
      trial_start: NOW - DAY,
      trial_end: NOW + DAY,
    }),
  );
  assert.equal(t.hadTrial, true);
  assert.equal(t.inTrial, true);
  assert.equal(t.end, NOW + DAY);
});

test("trial: finished, now paying", () => {
  const t = deriveTrial(
    fakeSub({ trial_start: NOW - 30 * DAY, trial_end: NOW - 16 * DAY }),
  );
  assert.equal(t.hadTrial, true);
  assert.equal(t.inTrial, false);
});

// ---- normalize ----

test("normalize prefers checkout metadata over customer fields", () => {
  const row = normalizeSubscription(fakeSub());
  assert.equal(row.name, "María Rivera");
  assert.equal(row.email, "maria@example.com");
  assert.equal(row.phone, "787-555-0100");
  assert.equal(row.town, "San Juan");
  assert.equal(row.zip, "00901");
  assert.equal(row.productId, "prod_print");
  assert.equal(row.productName, "Edición impresa");
  assert.equal(row.priceAmount, 499);
  assert.equal(formatPrice(row), "$4.99 USD / mes");
  assert.equal(row.active, true);
  assert.equal(row.statusLabel, "Activo");
  assert.equal(row.customerId, "cus_1");
  assert.equal(
    row.stripeSubscriptionUrl,
    "https://dashboard.stripe.com/test/subscriptions/sub_1",
  );
  assert.equal(
    row.stripeCustomerUrl,
    "https://dashboard.stripe.com/test/customers/cus_1",
  );
});

test("normalize falls back to customer and shipping without metadata", () => {
  const row = normalizeSubscription(fakeSub({ metadata: {}, livemode: true }));
  assert.equal(row.name, "Customer Name");
  assert.equal(row.email, "customer@example.com");
  assert.equal(row.phone, "+1 787 555 0199");
  assert.equal(row.addressLine1, "Ship St 1");
  assert.equal(row.town, "Ponce");
  assert.equal(row.zip, "00716");
  assert.equal(
    row.stripeSubscriptionUrl,
    "https://dashboard.stripe.com/subscriptions/sub_1",
  );
});

test("normalize tolerates unexpanded and deleted customers", () => {
  const a = normalizeSubscription(fakeSub({ metadata: {}, customer: "cus_9" }));
  assert.equal(a.customerId, "cus_9");
  assert.equal(a.name, "");
  const b = normalizeSubscription(
    fakeSub({ metadata: {}, customer: { id: "cus_8", deleted: true } }),
  );
  assert.equal(b.customerId, "cus_8");
  assert.equal(b.email, "");
});

// ---- summary / filters / csv ----

function sampleRows() {
  return [
    normalizeSubscription(fakeSub({ id: "sub_a", start_date: NOW - 50 * DAY })),
    normalizeSubscription(
      fakeSub({
        id: "sub_b",
        status: "trialing",
        trial_start: NOW - DAY,
        trial_end: NOW + 13 * DAY,
        start_date: NOW - DAY,
        metadata: { fullName: "José Pérez", email: "jose@example.com" },
        customer: { id: "cus_2", email: "jose@example.com" },
      }),
    ),
    normalizeSubscription(
      fakeSub({ id: "sub_c", status: "past_due", start_date: NOW - 20 * DAY }),
    ),
    normalizeSubscription(
      fakeSub({
        id: "sub_d",
        status: "canceled",
        ended_at: NOW - DAY,
        start_date: NOW - 90 * DAY,
        customer: { id: "cus_3" },
      }),
    ),
    normalizeSubscription(
      fakeSub({
        id: "sub_e",
        cancel_at: NOW + 5 * DAY,
        start_date: NOW - 10 * DAY,
      }),
    ),
  ];
}

test("summary counts", () => {
  const s = buildSummary(sampleRows());
  assert.equal(s.total, 5);
  assert.equal(s.active, 2);
  assert.equal(s.trialing, 1);
  assert.equal(s.paymentProblems, 1);
  assert.equal(s.canceled, 1);
  assert.equal(s.cancelScheduled, 1);
  assert.equal(s.uniqueCustomers, 3);
});

test("filters: search ignores accents and case", () => {
  const out = applyView(sampleRows(), { q: "jose perez" });
  assert.deepEqual(
    out.map((r) => r.id),
    ["sub_b"],
  );
});

test("filters: status groups, trial and product", () => {
  const rows = sampleRows();
  assert.deepEqual(
    applyView(rows, { status: "problems" }).map((r) => r.id),
    ["sub_c"],
  );
  assert.deepEqual(
    applyView(rows, { status: "cancelScheduled" }).map((r) => r.id),
    ["sub_e"],
  );
  assert.deepEqual(
    applyView(rows, { trial: "active" }).map((r) => r.id),
    ["sub_b"],
  );
  assert.equal(applyView(rows, { trial: "no" }).length, 4);
  assert.equal(applyView(rows, { product: "prod_other" }).length, 0);
  assert.equal(applyView(rows, { product: "prod_print" }).length, 5);
});

test("sort by start date, both directions", () => {
  const rows = sampleRows();
  assert.deepEqual(
    applyView(rows, { sort: "start", dir: "desc" }).map((r) => r.id),
    ["sub_b", "sub_e", "sub_c", "sub_a", "sub_d"],
  );
  assert.deepEqual(
    applyView(rows, { sort: "start", dir: "asc" }).map((r) => r.id),
    ["sub_d", "sub_a", "sub_c", "sub_e", "sub_b"],
  );
});

test("parseFilters rejects unknown sort/trial values", () => {
  const f = parseFilters({
    sort: "__proto__",
    trial: "maybe",
    dir: "sideways",
  });
  assert.equal(f.sort, "start");
  assert.equal(f.trial, "all");
  assert.equal(f.dir, "desc");
});

test("csv escapes quotes/commas and neutralizes formulas", () => {
  const row = normalizeSubscription(
    fakeSub({
      metadata: {
        fullName: '=HYPERLINK("x")',
        email: "a@b.co",
        phone: "+1 787 555 0100",
        addressLine1: "Calle 1, Apt 2",
        town: "Caguas",
      },
    }),
  );
  const csv = rowsToCsv([row]);
  assert.ok(csv.startsWith("\uFEFFNombre,Email"));
  assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`));
  assert.ok(csv.includes('"Calle 1, Apt 2"'));
  assert.ok(csv.includes(",+1 787 555 0100,"));
});

// ---- admin allowlist ----

test("allowlist parsing is case-insensitive and ignores junk", () => {
  const list = parseAdminAllowlist(" Ana@CB.com, bob@cb.com ;; nope ,");
  assert.deepEqual([...list].sort(), ["ana@cb.com", "bob@cb.com"]);
});

test("empty allowlist lets nobody in", () => {
  const d = checkAdminAccess(
    { email: "ana@cb.com", email_verified: true },
    parseAdminAllowlist(""),
  );
  assert.equal(d.ok, false);
  assert.equal(d.status, 403);
  assert.equal(d.code, "not_configured");
});

test("email not on the list → 403", () => {
  const d = checkAdminAccess(
    { email: "eve@cb.com", email_verified: true },
    parseAdminAllowlist("ana@cb.com"),
  );
  assert.equal(d.status, 403);
  assert.equal(d.code, "not_allowed");
});

test("listed but unverified email → 403", () => {
  const d = checkAdminAccess(
    { email: "ana@cb.com", email_verified: false },
    parseAdminAllowlist("ana@cb.com"),
  );
  assert.equal(d.status, 403);
  assert.equal(d.code, "email_unverified");
});

test("listed and verified email → ok", () => {
  const d = checkAdminAccess(
    { email: "ANA@cb.com", email_verified: true },
    parseAdminAllowlist("ana@cb.com"),
  );
  assert.deepEqual(d, { ok: true, email: "ana@cb.com" });
});

// ---- Stripe read + cache ----

function fakeStripe(subs, counter, { fail = false } = {}) {
  return {
    products: {
      list() {
        return {
          async *[Symbol.asyncIterator]() {
            yield { id: "prod_print", name: "Edición impresa (catálogo)" };
          },
        };
      },
    },
    subscriptions: {
      list(params) {
        counter.calls += 1;
        counter.params = params;
        return {
          async *[Symbol.asyncIterator]() {
            if (fail) throw new Error("Stripe down");
            for (const s of subs) yield s;
          },
        };
      },
    },
  };
}

test("snapshot reads all statuses with expansions and caches ~1 minute", async () => {
  clearSubscriptionsCache();
  const counter = { calls: 0 };
  // Stripe returns product ids inside prices; names come from products.list.
  const unexpanded = fakeSub();
  unexpanded.items.data[0].price.product = "prod_print";
  const stripe = fakeStripe([unexpanded, fakeSub({ id: "sub_2" })], counter);
  let t = 1_000_000;
  const now = () => t;

  const first = await getSubscriptionsSnapshot({ stripe, now });
  assert.equal(first.rows.length, 2);
  assert.equal(first.cached, false);
  assert.equal(counter.params.status, "all");
  assert.ok(counter.params.expand.includes("data.customer"));
  assert.equal(first.rows[0].productName, "Edición impresa (catálogo)");
  assert.equal(first.rows[0].productId, "prod_print");

  t += 30_000;
  const second = await getSubscriptionsSnapshot({ stripe, now });
  assert.equal(second.cached, true);
  assert.equal(counter.calls, 1);

  const forced = await getSubscriptionsSnapshot({ stripe, now, force: true });
  assert.equal(forced.cached, false);
  assert.equal(counter.calls, 2);

  t += 61_000;
  await getSubscriptionsSnapshot({ stripe, now });
  assert.equal(counter.calls, 3);
});

test("Stripe failures propagate and are never cached as empty", async () => {
  clearSubscriptionsCache();
  const counter = { calls: 0 };
  await assert.rejects(
    getSubscriptionsSnapshot({
      stripe: fakeStripe([], counter, { fail: true }),
    }),
    /Stripe down/,
  );
  const ok = await getSubscriptionsSnapshot({
    stripe: fakeStripe([fakeSub()], counter),
  });
  assert.equal(ok.rows.length, 1);
  assert.equal(ok.cached, false);
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
clearSubscriptionsCache();
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exit(failed ? 1 : 0);
