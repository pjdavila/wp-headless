// Saves the print-subscription form details on the subscriber's Stripe
// Customer (native name/email/phone/address/shipping fields), so the Stripe
// dashboard, invoices and the customer portal show the address the form
// validated, and Checkout does not have to ask for it again.
//
// A customer is reused only when it is bound to the same Firebase account
// (metadata.firebaseUid). Matching by email alone is deliberately NOT enough:
// Firebase accounts can be created for addresses the registrant does not
// own, so an email-only match would let a stranger overwrite another
// subscriber's shipping address. See lib/printSubscriptionAccount.js.
//
// This module is imported ONLY from API routes.

export const PRINT_CUSTOMER_SOURCE = "suscripcion-impresa";

/**
 * Maps the validated form fields to Stripe Customer create/update params.
 * Pure: no Stripe calls, so it is unit-tested directly.
 */
export function buildCustomerParams({
  uid,
  fullName,
  email,
  phone,
  addressLine1,
  addressLine2,
  town,
  zip,
}) {
  const address = {
    line1: addressLine1,
    // Stripe treats "" as "clear this field", which is what an omitted
    // apartment/suite should do on a returning subscriber.
    line2: addressLine2 || "",
    city: town,
    state: "PR",
    postal_code: zip,
    country: "PR",
  };
  return {
    name: fullName,
    email,
    phone,
    address,
    shipping: { name: fullName, phone, address: { ...address } },
    metadata: { source: PRINT_CUSTOMER_SOURCE, firebaseUid: uid },
  };
}

function escapeSearchValue(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/**
 * Finds the Stripe customer already bound to this Firebase account, or null.
 * Customer search is eventually consistent (a customer created seconds ago
 * may not be indexed yet), so the email listing is checked as well — but
 * there too only an exact uid match counts.
 */
export async function findAccountCustomer(stripe, { uid, email }) {
  if (!uid) return null;

  const isOwn = (c) => !c.deleted && c.metadata?.firebaseUid === uid;

  try {
    const found = await stripe.customers.search({
      query: `metadata['firebaseUid']:'${escapeSearchValue(uid)}'`,
      limit: 10,
    });
    const match = (found?.data || []).find(isOwn);
    if (match) return match;
  } catch (err) {
    // Search is not available on every account/region; the email listing
    // below still finds customers created by this flow.
    console.warn("Stripe customer search unavailable:", err.message);
  }

  if (!email) return null;
  const listed = await stripe.customers.list({ email, limit: 100 });
  return (listed?.data || []).find(isOwn) || null;
}

/**
 * Creates or updates the account's Stripe customer with the form details.
 * Throws on any Stripe error so the caller never starts a checkout for a
 * half-saved customer.
 */
export async function upsertPrintSubscriptionCustomer(stripe, fields) {
  const params = buildCustomerParams(fields);
  const existing = await findAccountCustomer(stripe, {
    uid: fields.uid,
    email: fields.email,
  });
  if (existing) {
    return stripe.customers.update(existing.id, params);
  }
  return stripe.customers.create(params);
}
