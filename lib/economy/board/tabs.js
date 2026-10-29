/**
 * Tabs of /dashboard/ (from "The Great Puerto Rico Dashboard" prototype).
 * The active tab lives in the `?tab=` query param so it can be linked to
 * and so the old /dashboard/<section>/ routes can redirect to it.
 */
export const TABS = [
  { key: "pulse", slug: "pulso" },
  { key: "life", slug: "ciencias-vivas" },
  { key: "energy", slug: "energia" },
  { key: "tourism", slug: "turismo" },
  { key: "auto", slug: "automotriz" },
  { key: "re", slug: "bienes-raices" },
  { key: "method", slug: "metodologia" },
];

export const DEFAULT_TAB = "pulse";

export function tabFromSlug(slug) {
  const match = TABS.find((tab) => tab.slug === slug || tab.key === slug);
  return match ? match.key : DEFAULT_TAB;
}

export function slugForTab(key) {
  const match = TABS.find((tab) => tab.key === key);
  return match ? match.slug : TABS[0].slug;
}

/** Link to a dashboard tab ("pulse" is the bare /dashboard/ route). */
export function tabHref(key) {
  return key === DEFAULT_TAB
    ? "/dashboard/"
    : `/dashboard/?tab=${slugForTab(key)}`;
}
