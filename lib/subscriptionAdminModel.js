// Pure read model for the internal subscriptions panel
// (/admin/suscripciones/). Turns raw Stripe subscription objects into flat
// rows, derives the status/"activo hasta"/trial fields, and holds the shared
// filter, sort, summary and CSV logic used by both the admin API and the
// page. No I/O and no secrets: safe to import from page code and from the
// plain-Node test script (scripts/test-subscriptions-admin.mjs).
//
// Stripe is the only data store. Nothing here is persisted anywhere.

export const STATUS_LABELS = {
  active: "Activo",
  trialing: "En prueba",
  past_due: "Pago pendiente",
  unpaid: "Impago",
  canceled: "Cancelado",
  incomplete: "Incompleta",
  incomplete_expired: "Expirada",
  paused: "Pausada",
};

// Statuses where the subscriber is up to date and receives the product.
// past_due/unpaid are counted separately as payment problems.
const ACTIVE_STATUSES = new Set(["active", "trialing"]);
const PAYMENT_PROBLEM_STATUSES = new Set(["past_due", "unpaid"]);
const ENDED_STATUSES = new Set(["canceled", "incomplete_expired"]);

export function statusLabel(status) {
  return STATUS_LABELS[status] || status || "Desconocido";
}

export function isActiveStatus(status) {
  return ACTIVE_STATUSES.has(status);
}

export function isPaymentProblem(status) {
  return PAYMENT_PROBLEM_STATUSES.has(status);
}

function toIso(seconds) {
  return typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1000).toISOString()
    : null;
}

function str(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Current billing period end in Unix seconds. In the Stripe API version the
 * SDK pins (basil and later), the period dates live on each subscription
 * item, not on the subscription; take the latest item end. Older payloads
 * that still carry `current_period_end` on the subscription are honored as a
 * fallback.
 */
export function currentPeriodEnd(sub) {
  const ends = (sub?.items?.data || [])
    .map((item) => item?.current_period_end)
    .filter((v) => typeof v === "number");
  if (ends.length > 0) return Math.max(...ends);
  return typeof sub?.current_period_end === "number"
    ? sub.current_period_end
    : null;
}

/**
 * Whether a cancellation is scheduled but has not happened yet. Newer API
 * versions express "cancel at period end" through `cancel_at` as well, so
 * either field counts.
 */
export function hasScheduledCancellation(sub) {
  if (!sub || ENDED_STATUSES.has(sub.status)) return false;
  return sub.cancel_at_period_end === true || typeof sub.cancel_at === "number";
}

/**
 * "Activo hasta": the date until which the subscriber has service.
 *  - ended (canceled / incomplete_expired): when it ended;
 *  - cancellation scheduled: the cancel-at date;
 *  - incomplete (first payment never succeeded): none;
 *  - otherwise: the end of the current billing period (or trial).
 * Returns { at: Unix seconds | null, reason }.
 */
export function deriveActiveUntil(sub) {
  if (!sub) return { at: null, reason: "none" };
  if (ENDED_STATUSES.has(sub.status)) {
    const at = sub.ended_at ?? sub.canceled_at ?? null;
    return { at: typeof at === "number" ? at : null, reason: "ended" };
  }
  if (sub.status === "incomplete") return { at: null, reason: "none" };
  if (typeof sub.cancel_at === "number") {
    return { at: sub.cancel_at, reason: "cancel_scheduled" };
  }
  const periodEnd = currentPeriodEnd(sub);
  if (sub.cancel_at_period_end === true && periodEnd) {
    return { at: periodEnd, reason: "cancel_scheduled" };
  }
  if (sub.status === "trialing" && typeof sub.trial_end === "number") {
    return { at: sub.trial_end, reason: "trial" };
  }
  return { at: periodEnd, reason: periodEnd ? "period" : "none" };
}

/**
 * Trial facts: whether the subscription has (or had) a trial, whether it is
 * in the trial right now, and the trial dates.
 */
export function deriveTrial(sub) {
  const start = typeof sub?.trial_start === "number" ? sub.trial_start : null;
  const end = typeof sub?.trial_end === "number" ? sub.trial_end : null;
  return {
    hadTrial: start !== null || end !== null,
    inTrial: sub?.status === "trialing",
    start,
    end,
  };
}

function customerObject(sub) {
  const c = sub?.customer;
  if (c && typeof c === "object" && !c.deleted) return c;
  return null;
}

function customerId(sub) {
  const c = sub?.customer;
  if (typeof c === "string") return c;
  if (c && typeof c === "object" && typeof c.id === "string") return c.id;
  return null;
}

function describeItems(sub) {
  const items = sub?.items?.data || [];
  const products = [];
  const prices = [];
  for (const item of items) {
    const price = item?.price || null;
    if (!price) continue;
    const product = price.product;
    const productId =
      typeof product === "string" ? product : product?.id || null;
    const productName =
      (product && typeof product === "object" && !product.deleted
        ? str(product.name)
        : "") ||
      str(price.nickname) ||
      productId ||
      "";
    products.push({ id: productId, name: productName });
    prices.push({
      amount: typeof price.unit_amount === "number" ? price.unit_amount : null,
      currency: price.currency || null,
      interval: price.recurring?.interval || null,
      intervalCount: price.recurring?.interval_count || 1,
      quantity: item.quantity || 1,
    });
  }
  return { products, prices };
}

export function stripeDashboardBase(livemode) {
  return livemode === false
    ? "https://dashboard.stripe.com/test"
    : "https://dashboard.stripe.com";
}

/**
 * Normalizes one Stripe subscription (customer and price.product expanded,
 * but tolerant of unexpanded ids) into a panel row. Subscriber details come
 * from the checkout metadata first, falling back to the customer record.
 */
export function normalizeSubscription(sub) {
  const meta = sub?.metadata || {};
  const customer = customerObject(sub);
  const shipping = customer?.shipping || null;
  const shipAddr = shipping?.address || null;
  const billAddr = customer?.address || null;

  const name =
    str(meta.fullName) || str(customer?.name) || str(shipping?.name) || "";
  const email = (str(meta.email) || str(customer?.email)).toLowerCase();
  const phone = str(meta.phone) || str(customer?.phone) || str(shipping?.phone);

  const hasMetaAddress = Boolean(str(meta.addressLine1) || str(meta.town));
  const addr = hasMetaAddress
    ? {
        line1: str(meta.addressLine1),
        line2: str(meta.addressLine2),
        town: str(meta.town),
        zip: str(meta.zip),
      }
    : {
        line1: str(shipAddr?.line1) || str(billAddr?.line1),
        line2: str(shipAddr?.line2) || str(billAddr?.line2),
        town: str(shipAddr?.city) || str(billAddr?.city),
        zip: str(shipAddr?.postal_code) || str(billAddr?.postal_code),
      };

  const { products, prices } = describeItems(sub);
  const trial = deriveTrial(sub);
  const activeUntil = deriveActiveUntil(sub);
  const base = stripeDashboardBase(sub?.livemode);
  const cusId = customerId(sub);
  const firstPrice = prices[0] || null;

  return {
    id: sub.id,
    customerId: cusId,
    name,
    email,
    phone,
    addressLine1: addr.line1,
    addressLine2: addr.line2,
    town: addr.town,
    zip: addr.zip,
    productId: products[0]?.id || null,
    productName: products
      .map((p) => p.name)
      .filter(Boolean)
      .join(", "),
    priceAmount: firstPrice?.amount ?? null,
    priceCurrency: firstPrice?.currency || null,
    priceInterval: firstPrice?.interval || null,
    priceIntervalCount: firstPrice?.intervalCount || 1,
    status: sub.status,
    statusLabel: statusLabel(sub.status),
    active: isActiveStatus(sub.status),
    paymentProblem: isPaymentProblem(sub.status),
    activeUntil: toIso(activeUntil.at),
    activeUntilReason: activeUntil.reason,
    currentPeriodEnd: toIso(currentPeriodEnd(sub)),
    hadTrial: trial.hadTrial,
    inTrial: trial.inTrial,
    trialStart: toIso(trial.start),
    trialEnd: toIso(trial.end),
    cancelScheduled: hasScheduledCancellation(sub),
    cancelAt: toIso(sub.cancel_at),
    canceledAt: toIso(sub.canceled_at),
    endedAt: toIso(sub.ended_at),
    startDate: toIso(sub.start_date ?? sub.created),
    created: toIso(sub.created),
    source: str(meta.source) || null,
    livemode: sub.livemode !== false,
    stripeSubscriptionUrl: `${base}/subscriptions/${sub.id}`,
    stripeCustomerUrl: cusId ? `${base}/customers/${cusId}` : null,
  };
}

export function buildSummary(rows) {
  const customers = new Set();
  const summary = {
    total: rows.length,
    uniqueCustomers: 0,
    active: 0,
    trialing: 0,
    paymentProblems: 0,
    canceled: 0,
    cancelScheduled: 0,
  };
  for (const row of rows) {
    customers.add(row.customerId || row.email || row.id);
    if (row.status === "active") summary.active += 1;
    if (row.status === "trialing") summary.trialing += 1;
    if (row.paymentProblem) summary.paymentProblems += 1;
    if (row.status === "canceled") summary.canceled += 1;
    if (row.cancelScheduled) summary.cancelScheduled += 1;
  }
  summary.uniqueCustomers = customers.size;
  return summary;
}

// ---- Filtering / sorting (shared by the page and the CSV export) ----

export const SORT_FIELDS = {
  start: "startDate",
  activeUntil: "activeUntil",
  trialEnd: "trialEnd",
};

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Normalizes untrusted filter input (query string or UI state) into a
 * canonical filter object.
 *  - q:       free text matched against name and email
 *  - status:  a Stripe status, "all", or "problems" (past_due + unpaid)
 *  - trial:   "all" | "yes" (has/had a trial) | "active" (in trial now) | "no"
 *  - product: a product id or "all"
 *  - sort:    "start" | "activeUntil" | "trialEnd"
 *  - dir:     "desc" | "asc"
 */
export function parseFilters(input = {}) {
  const pick = (v) => (Array.isArray(v) ? v[0] : v);
  const q = String(pick(input.q) || "").slice(0, 200);
  const status = String(pick(input.status) || "all");
  const trialRaw = String(pick(input.trial) || "all");
  const trial = ["all", "yes", "active", "no"].includes(trialRaw)
    ? trialRaw
    : "all";
  const product = String(pick(input.product) || "all");
  const sortRaw = String(pick(input.sort) || "start");
  const sort = Object.hasOwn(SORT_FIELDS, sortRaw) ? sortRaw : "start";
  const dir = pick(input.dir) === "asc" ? "asc" : "desc";
  return { q, status, trial, product, sort, dir };
}

export function filterRows(rows, filters) {
  const f = parseFilters(filters);
  const needle = normalizeText(f.q.trim());
  return rows.filter((row) => {
    if (needle) {
      const hay = `${normalizeText(row.name)} ${normalizeText(row.email)}`;
      if (!hay.includes(needle)) return false;
    }
    if (f.status === "problems") {
      if (!row.paymentProblem) return false;
    } else if (f.status === "cancelScheduled") {
      if (!row.cancelScheduled) return false;
    } else if (f.status !== "all" && row.status !== f.status) {
      return false;
    }
    if (f.trial === "yes" && !row.hadTrial) return false;
    if (f.trial === "active" && !row.inTrial) return false;
    if (f.trial === "no" && row.hadTrial) return false;
    if (f.product !== "all" && row.productId !== f.product) return false;
    return true;
  });
}

export function sortRows(rows, filters) {
  const f = parseFilters(filters);
  const field = SORT_FIELDS[f.sort];
  const sign = f.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[field] ? Date.parse(a[field]) : null;
    const bv = b[field] ? Date.parse(b[field]) : null;
    // Rows without the date always go last, whatever the direction.
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return (av - bv) * sign;
  });
}

export function applyView(rows, filters) {
  return sortRows(filterRows(rows, filters), filters);
}

export function listProducts(rows) {
  const map = new Map();
  for (const row of rows) {
    if (row.productId && !map.has(row.productId)) {
      map.set(row.productId, row.productName || row.productId);
    }
  }
  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

// ---- CSV ----

const INTERVAL_LABELS = {
  day: ["día", "días"],
  week: ["semana", "semanas"],
  month: ["mes", "meses"],
  year: ["año", "años"],
};

export function formatPrice(row) {
  if (typeof row.priceAmount !== "number") return "";
  const currency = (row.priceCurrency || "").toUpperCase();
  const amount = (row.priceAmount / 100).toFixed(2);
  const money = currency === "USD" ? `$${amount} USD` : `${amount} ${currency}`;
  if (!row.priceInterval) return money.trim();
  const count = row.priceIntervalCount || 1;
  const [one, many] = INTERVAL_LABELS[row.priceInterval] || [
    row.priceInterval,
    row.priceInterval,
  ];
  const every = count > 1 ? `cada ${count} ${many}` : one;
  return `${money.trim()} / ${every}`;
}

const CSV_COLUMNS = [
  ["Nombre", (r) => r.name],
  ["Email", (r) => r.email],
  ["Teléfono", (r) => r.phone],
  ["Dirección 1", (r) => r.addressLine1],
  ["Dirección 2", (r) => r.addressLine2],
  ["Pueblo", (r) => r.town],
  ["Código postal", (r) => r.zip],
  ["Producto", (r) => r.productName],
  ["Precio", (r) => formatPrice(r)],
  ["Estado", (r) => r.statusLabel],
  ["Estado Stripe", (r) => r.status],
  ["Activo", (r) => (r.active ? "Sí" : "No")],
  ["Activo hasta", (r) => r.activeUntil],
  ["Prueba", (r) => (r.hadTrial ? "Sí" : "No")],
  ["Fin de prueba", (r) => r.trialEnd],
  ["Cancela al final del período", (r) => (r.cancelScheduled ? "Sí" : "No")],
  ["Cancela el", (r) => r.cancelAt],
  ["Cancelada el", (r) => r.canceledAt],
  ["Inicio", (r) => r.startDate],
  ["ID suscripción", (r) => r.id],
  ["ID cliente", (r) => r.customerId],
  ["Stripe suscripción", (r) => r.stripeSubscriptionUrl],
  ["Stripe cliente", (r) => r.stripeCustomerUrl],
];

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // Neutralize spreadsheet formula injection from subscriber-entered text.
  // Plain phone numbers like "+1 787-555-0100" are left alone.
  if (/^[=+\-@\t\r]/.test(s) && !/^\+?[\d\s().-]+$/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCsv(rows) {
  const lines = [CSV_COLUMNS.map(([h]) => csvEscape(h)).join(",")];
  for (const row of rows) {
    lines.push(CSV_COLUMNS.map(([, get]) => csvEscape(get(row))).join(","));
  }
  // BOM so Excel opens the accents correctly.
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
