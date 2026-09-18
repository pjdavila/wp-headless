import { createPendingProvider } from "./pending.js";

/**
 * Puerto Rico Tourism Company / Discover Puerto Rico — airport passengers,
 * hotel occupancy, cruise passengers.
 *
 * Status: PENDING. Tourism statistics are published as monthly/annual
 * reports and press releases (PDF) via Discover Puerto Rico's industry pages;
 * there is no public API. Documented ingestion method: scheduled/manual
 * extraction from the monthly lodging and airport traffic reports, then
 * normalize.
 */
export const tourism = createPendingProvider({
  id: "tourism",
  name: "Puerto Rico Tourism Company",
  publisherUrl: "https://www.discoverpuertorico.com/",
  ingestionMethod:
    "Scheduled/manual extraction from monthly lodging and airport traffic reports (PDF) published by Discover Puerto Rico (no public API).",
});
