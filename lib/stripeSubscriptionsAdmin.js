import { getStripe } from "./stripePrint.js";
import {
  buildSummary,
  normalizeSubscription,
} from "./subscriptionAdminModel.js";

/**
 * Server-only live read of every Stripe subscription for the internal
 * subscriptions panel. Stripe is the only data store: nothing is written
 * anywhere. The full result is cached in memory (per server instance) for
 * about a minute so reloading the panel does not hammer the Stripe API; the
 * panel's "Actualizar" button forces a fresh read.
 *
 * Errors are never cached and always propagate — the panel must show an
 * explicit error, never an empty list that looks like "no subscribers".
 *
 * This module is imported ONLY from API routes and tests.
 */

export const CACHE_TTL_MS = 60_000;
// Safety cap so a runaway pagination can never loop forever.
const MAX_SUBSCRIPTIONS = 20_000;

let cache = null; // { rows, summary, fetchedAt, expiresAt }
let inFlight = null;

export async function fetchAllSubscriptions(stripe) {
  const subs = [];
  // The price is embedded in each item by default; expanding
  // data.items.data.price.product is rejected by the current API version
  // (property_expansion_max_depth), so products are listed separately.
  const list = stripe.subscriptions.list({
    status: "all",
    limit: 100,
    expand: ["data.customer"],
  });
  for await (const sub of list) {
    subs.push(sub);
    if (subs.length >= MAX_SUBSCRIPTIONS) {
      throw new Error(
        `Hay más de ${MAX_SUBSCRIPTIONS} suscripciones; el panel no puede mostrarlas todas.`,
      );
    }
  }
  return subs;
}

// All products (active and archived), keyed by id.
export async function fetchProducts(stripe) {
  const map = new Map();
  for await (const product of stripe.products.list({ limit: 100 })) {
    map.set(product.id, product);
  }
  return map;
}

// Replaces product ids inside each item's price with the product object.
function attachProducts(sub, products) {
  const items = sub?.items?.data;
  if (!Array.isArray(items)) return sub;
  return {
    ...sub,
    items: {
      ...sub.items,
      data: items.map((item) => {
        const productId = item?.price?.product;
        if (typeof productId !== "string" || !products.has(productId)) {
          return item;
        }
        return {
          ...item,
          price: { ...item.price, product: products.get(productId) },
        };
      }),
    },
  };
}

async function load(stripe, now) {
  const [subs, products] = await Promise.all([
    fetchAllSubscriptions(stripe),
    fetchProducts(stripe),
  ]);
  const rows = subs.map((sub) =>
    normalizeSubscription(attachProducts(sub, products)),
  );
  const fetchedAt = now();
  return {
    rows,
    summary: buildSummary(rows),
    fetchedAt: new Date(fetchedAt).toISOString(),
    expiresAt: fetchedAt + CACHE_TTL_MS,
  };
}

/**
 * Returns { rows, summary, fetchedAt, cached }.
 * Options: force (bypass the cache), stripe and now (injectable for tests).
 */
export async function getSubscriptionsSnapshot({
  force = false,
  stripe,
  now = Date.now,
} = {}) {
  if (!force && cache && now() < cache.expiresAt) {
    return { ...publicView(cache), cached: true };
  }
  // Concurrent callers share one Stripe read.
  if (!inFlight) {
    const client = stripe || getStripe();
    inFlight = load(client, now)
      .then((result) => {
        cache = result;
        return result;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  const result = await inFlight;
  return { ...publicView(result), cached: false };
}

function publicView({ rows, summary, fetchedAt }) {
  return { rows, summary, fetchedAt };
}

export function clearSubscriptionsCache() {
  cache = null;
  inFlight = null;
}
