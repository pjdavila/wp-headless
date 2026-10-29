// Free trial for the print subscription: the first 3 calendar months are
// free, then the monthly price is charged. Checkout still collects the card
// up front (Stripe's default), so the first charge happens automatically
// when the trial ends unless the subscriber cancels.
//
// One trial per account: an account that already had a print subscription
// (any status, including canceled) subscribes without a trial, so cancelling
// and resubscribing cannot chain free periods.

export const PRINT_TRIAL_MONTHS = 3;

/**
 * Adds calendar months in UTC, clamping to the last day of the target month
 * (Nov 30 + 3 months = Feb 28/29, not Mar 2).
 */
export function addCalendarMonths(date, months) {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/**
 * Unix timestamp (seconds) for Stripe's subscription_data.trial_end.
 * Checkout requires it at least 48 hours ahead; 3 months always is.
 */
export function printTrialEnd(now = new Date()) {
  return Math.floor(
    addCalendarMonths(now, PRINT_TRIAL_MONTHS).getTime() / 1000,
  );
}

/** Trial applies only when the account never had a print subscription. */
export function isTrialEligible(previousSubscription) {
  return !previousSubscription;
}
