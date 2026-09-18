import { listIndicators } from "./indicators.js";

/**
 * Economic section registry for the dashboard.
 *
 * Sections are the product-facing navigation (Resumen → Gobierno); each maps
 * to one or more indicator-registry categories, so every indicator gets a
 * category page automatically and adding an indicator to the registry later
 * files it under the right section with no new routes.
 *
 * Sections whose mapped categories have no indicators yet (Construcción,
 * Vivienda) still render — with an honest "en integración" state instead of
 * a 404 or fabricated data.
 */
export const SECTIONS = [
  {
    slug: "overview",
    name: "Resumen",
    categories: [],
    blurb:
      "Pulso Económico CB, indicadores clave y tendencias de un vistazo.",
  },
  {
    slug: "jobs",
    name: "Empleo",
    categories: ["jobs"],
    blurb: "Desempleo, fuerza laboral y empleo por industria.",
  },
  {
    slug: "consumer",
    name: "Consumo",
    categories: ["consumer"],
    blurb: "Inflación y recaudos del IVU: el pulso del gasto del consumidor.",
  },
  {
    slug: "business",
    name: "Negocios",
    categories: ["business"],
    blurb: "Actividad manufacturera (PMI) y ventas de cemento.",
  },
  {
    slug: "construction",
    name: "Construcción",
    categories: [],
    blurb:
      "Permisos y actividad de construcción. Las fuentes oficiales de esta sección están en integración.",
  },
  {
    slug: "tourism",
    name: "Turismo",
    categories: ["tourism"],
    blurb: "Pasajeros aéreos y ocupación hotelera.",
  },
  {
    slug: "energy",
    name: "Energía",
    categories: ["energy"],
    blurb: "Precio y consumo de la electricidad.",
  },
  {
    slug: "trade",
    name: "Comercio",
    categories: ["trade"],
    blurb: "Exportaciones e importaciones de mercancía.",
  },
  {
    slug: "housing",
    name: "Vivienda",
    categories: [],
    blurb:
      "Precios, ventas y financiamiento de vivienda. Las fuentes oficiales de esta sección están en integración.",
  },
  {
    slug: "government",
    name: "Gobierno",
    categories: ["economy", "demographics"],
    blurb:
      "Producto nacional, ingreso personal y demografía publicados por agencias gubernamentales.",
  },
];

const BY_SLUG = new Map(SECTIONS.map((section) => [section.slug, section]));

export function getSection(slug) {
  return BY_SLUG.get(slug) || null;
}

/** Route for a section page. "overview" is the dashboard homepage itself. */
export function sectionPath(slug) {
  return slug === "overview" ? "/dashboard/" : `/dashboard/${slug}/`;
}

/** Registry indicators filed under a section, in registry order. */
export function listSectionIndicators(section) {
  if (!section) return [];
  return listIndicators().filter((indicator) =>
    section.categories.includes(indicator.category),
  );
}

/** The section an indicator belongs to (for breadcrumbs and cross-links). */
export function sectionForIndicator(indicator) {
  if (!indicator) return null;
  return (
    SECTIONS.find((section) => section.categories.includes(indicator.category)) ||
    null
  );
}
