/**
 * Product configuration for the dashboard overview page (/dashboard/).
 *
 * KPI_SLOTS is the ordered six-slot strip from the product brief. Slots
 * whose source is still a documented stub render an honest "data pending"
 * state — never a fabricated number. Each slot links to its indicator
 * detail page.
 */
export const KPI_SLOTS = [
  "unemployment-rate",
  "ivu-collections",
  "pmi",
  "cement-sales",
  "airport-passengers",
  "commercial-electricity-price",
];

/** Route prefix for indicator detail pages (built in a follow-up task). */
export function indicatorPath(id) {
  return `/dashboard/indicators/${id}/`;
}
