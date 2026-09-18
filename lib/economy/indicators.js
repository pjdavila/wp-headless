/**
 * Central indicator registry for the Puerto Rico Economic Dashboard.
 *
 * New indicators are added HERE, by configuration — not with new pages or new
 * code. Each entry carries its display metadata plus the provider wiring the
 * ingestion pipeline needs (`provider` + `providerConfig`).
 *
 * The 15 MVP indicators come from the product brief. Entries with
 * `mvp: false` are supplemental series ingested for upcoming features
 * (Census ACS feeds the future municipal map) and are not part of the MVP
 * sections.
 */

/** @type {import("./types").Indicator[]} */
export const INDICATORS = [
  // ---------------------------------------------------------------- ECONOMY
  {
    id: "gnp-growth",
    name: "Gross National Product (Real Growth)",
    shortName: "GNP Growth",
    description:
      "Annual real growth of Puerto Rico's gross national product, the island's headline measure of economic output.",
    category: "economy",
    unit: "percent",
    frequency: "annual",
    geography: "Puerto Rico",
    source: "Junta de Planificación",
    sourceUrl: "https://jp.pr.gov/informe-economico-al-gobernador",
    methodology:
      "Real (inflation-adjusted) annual GNP growth from the Junta de Planificación's Informe Económico al Gobernador / Apéndice Estadístico. Published only as an annual PDF with no machine-readable feed; values are transcribed into lib/economy/manual/gnp-growth.csv and ingested through the standard pipeline (see lib/economy/manual/README.md).",
    higherIs: "positive",
    seasonallyAdjusted: false,
    stalenessDays: 400,
    refreshDays: 60,
    provider: "planning-board",
    mvp: true,
  },
  {
    id: "personal-income",
    name: "Personal Income",
    shortName: "Personal Income",
    description:
      "Total income received by Puerto Rico residents from all sources: wages, supplements, proprietors' income, dividends, interest, rent and transfer receipts.",
    category: "economy",
    unit: "millions of USD",
    frequency: "annual",
    geography: "Puerto Rico",
    source: "U.S. Bureau of Economic Analysis",
    sourceUrl:
      "https://www.bea.gov/data/income-saving/personal-income-by-state",
    methodology:
      "BEA Regional dataset (GeoFips 72000), personal income summary, in current dollars. BEA reports in thousands of dollars; the adapter converts to millions.",
    higherIs: "positive",
    seasonallyAdjusted: false,
    stalenessDays: 400,
    refreshDays: 60,
    provider: "bea",
    providerConfig: {
      // BEA has added Puerto Rico tables to the Regional dataset over time;
      // the adapter tries these in order until one returns data.
      tables: ["SAINC1", "SQINC1"],
      lineCode: "1", // personal income
      geoFips: "72000",
    },
    mvp: true,
  },

  // -------------------------------------------------------------------- JOBS
  {
    id: "unemployment-rate",
    name: "Unemployment Rate",
    shortName: "Unemployment",
    description:
      "Share of the Puerto Rico labor force that is jobless, available for work and actively seeking work.",
    category: "jobs",
    unit: "percent",
    frequency: "monthly",
    geography: "Puerto Rico",
    source: "U.S. Bureau of Labor Statistics",
    sourceUrl: "https://www.bls.gov/lau/",
    methodology:
      "Local Area Unemployment Statistics (LAUS), seasonally adjusted. BLS series LASST720000000000003.",
    higherIs: "negative",
    seasonallyAdjusted: true,
    stalenessDays: 90,
    refreshDays: 25,
    provider: "bls",
    providerConfig: { seriesIds: ["LASST720000000000003"] },
    mvp: true,
  },
  {
    id: "labor-force",
    name: "Labor Force",
    shortName: "Labor Force",
    description:
      "Number of Puerto Rico residents who are employed or actively looking for work.",
    category: "jobs",
    unit: "people",
    frequency: "monthly",
    geography: "Puerto Rico",
    source: "U.S. Bureau of Labor Statistics",
    sourceUrl: "https://www.bls.gov/lau/",
    methodology:
      "Local Area Unemployment Statistics (LAUS), seasonally adjusted. BLS series LASST720000000000006.",
    higherIs: "positive",
    seasonallyAdjusted: true,
    stalenessDays: 90,
    refreshDays: 25,
    provider: "bls",
    providerConfig: { seriesIds: ["LASST720000000000006"] },
    mvp: true,
  },
  {
    id: "total-employment",
    name: "Total Employment",
    shortName: "Employment",
    description:
      "Number of employed Puerto Rico residents according to the household survey.",
    category: "jobs",
    unit: "people",
    frequency: "monthly",
    geography: "Puerto Rico",
    source: "U.S. Bureau of Labor Statistics",
    sourceUrl: "https://www.bls.gov/lau/",
    methodology:
      "Local Area Unemployment Statistics (LAUS) household survey, seasonally adjusted. BLS series LASST720000000000005.",
    higherIs: "positive",
    seasonallyAdjusted: true,
    stalenessDays: 90,
    refreshDays: 25,
    provider: "bls",
    providerConfig: { seriesIds: ["LASST720000000000005"] },
    mvp: true,
  },
  {
    id: "employment-by-industry",
    name: "Employment by Industry",
    shortName: "Jobs by Industry",
    description:
      "Nonfarm payroll employment in Puerto Rico by major industry supersector, from the establishment survey: total nonfarm plus 11 industry supersectors.",
    category: "jobs",
    unit: "thousands of jobs",
    frequency: "monthly",
    geography: "Puerto Rico",
    source: "U.S. Bureau of Labor Statistics",
    sourceUrl: "https://www.bls.gov/sae/",
    methodology:
      "State and Area Employment (SM series), all employees in thousands by NAICS supersector. State-level supersector detail is published not seasonally adjusted, so every series in this indicator is NSA — never compare them with SA indicators point-to-point.",
    higherIs: "positive",
    seasonallyAdjusted: false,
    stalenessDays: 90,
    refreshDays: 25,
    provider: "bls",
    providerConfig: {
      primarySeries: "total-nonfarm",
      series: [
        {
          key: "total-nonfarm",
          id: "SMU72000000000000001",
          label: "Total Nonfarm",
        },
        {
          key: "mining-logging",
          id: "SMU72000001000000001",
          label: "Mining & Logging",
        },
        {
          key: "construction",
          id: "SMU72000002000000001",
          label: "Construction",
        },
        {
          key: "manufacturing",
          id: "SMU72000003000000001",
          label: "Manufacturing",
        },
        {
          key: "trade-transport-utilities",
          id: "SMU72000004000000001",
          label: "Trade, Transportation & Utilities",
        },
        {
          key: "information",
          id: "SMU72000005000000001",
          label: "Information",
        },
        {
          key: "financial-activities",
          id: "SMU72000005500000001",
          label: "Financial Activities",
        },
        {
          key: "professional-business",
          id: "SMU72000006000000001",
          label: "Professional & Business Services",
        },
        {
          key: "education-health",
          id: "SMU72000006500000001",
          label: "Education & Health Services",
        },
        {
          key: "leisure-hospitality",
          id: "SMU72000007000000001",
          label: "Leisure & Hospitality",
        },
        {
          key: "other-services",
          id: "SMU72000008000000001",
          label: "Other Services",
        },
        { key: "government", id: "SMU72000009000000001", label: "Government" },
      ],
    },
    mvp: true,
  },

  // ---------------------------------------------------------------- CONSUMER
  {
    id: "cpi-inflation",
    name: "Consumer Price Index (Inflation)",
    shortName: "CPI",
    description:
      "Puerto Rico consumer price index; the island's headline inflation measure.",
    category: "consumer",
    unit: "index",
    frequency: "monthly",
    geography: "Puerto Rico",
    source: "Instituto de Estadísticas de Puerto Rico",
    sourceUrl: "https://indicadores.pr/dataset/indice-de-precios-al-consumidor",
    methodology:
      "All-items CPI ('Todos los artículos y servicios' column) compiled by the Departamento del Trabajo y Recursos Humanos and distributed by the Instituto de Estadísticas on its indicadores.pr open-data portal (dataset 'indice-de-precios-al-consumidor', current monthly CSV resource, history back to 1984). BLS does not publish a current CPI for Puerto Rico.",
    higherIs: "negative",
    seasonallyAdjusted: false,
    stalenessDays: 90,
    refreshDays: 25,
    provider: "estadisticas-pr",
    providerConfig: {
      ckan: {
        dataset: "indice-de-precios-al-consumidor",
        resources: [
          { match: "ipc", column: "Todos los artículos y servicios" },
        ],
      },
    },
    mvp: true,
  },
  {
    id: "ivu-collections",
    name: "IVU Collections",
    shortName: "IVU",
    description:
      "Monthly collections of Puerto Rico's sales and use tax (IVU), a high-frequency proxy for consumer spending.",
    category: "consumer",
    unit: "millions of USD",
    frequency: "monthly",
    geography: "Puerto Rico",
    source: "Departamento de Hacienda",
    sourceUrl:
      "https://hacienda.pr.gov/inversionistas/estadisticas-y-recaudos-statistics-and-revenues/ingresos-del-impuesto-sobre-ventas-y-uso-ivu-sales-and-use-tax-sut-revenues",
    methodology:
      "Total monthly IVU (sales and use tax) collections from Hacienda's 'Distribución Mensual Recaudos IVU' fiscal-year PDFs. Published as PDF tables with changing file URLs and no machine-readable feed; values are transcribed into lib/economy/manual/ivu-collections.csv and ingested through the standard pipeline (see lib/economy/manual/README.md).",
    higherIs: "positive",
    seasonallyAdjusted: false,
    stalenessDays: 90,
    refreshDays: 25,
    provider: "hacienda",
    mvp: true,
  },

  // ---------------------------------------------------------------- BUSINESS
  {
    id: "pmi",
    name: "Manufacturing PMI",
    shortName: "PMI",
    description:
      "Puerto Rico Manufacturing Purchasing Managers' Index; readings above 50 indicate expansion.",
    category: "business",
    unit: "index",
    frequency: "monthly",
    geography: "Puerto Rico",
    source: "Instituto de Estadísticas de Puerto Rico",
    sourceUrl:
      "https://indicadores.pr/dataset/puerto-rico-manufacturing-purchasing-managers-index",
    methodology:
      "Headline Puerto Rico Manufacturing Purchasing Managers' Index (PRM-PMI) from the Instituto de Estadísticas' indicadores.pr open-data portal (dataset 'puerto-rico-manufacturing-purchasing-managers-index', current CSV resource).",
    higherIs: "positive",
    seasonallyAdjusted: true,
    stalenessDays: 90,
    refreshDays: 25,
    provider: "estadisticas-pr",
    providerConfig: {
      ckan: {
        dataset: "puerto-rico-manufacturing-purchasing-managers-index",
        resources: [{ match: "archivo-de-datos", column: "PMI" }],
      },
    },
    mvp: true,
  },
  {
    id: "cement-sales",
    name: "Cement Sales",
    shortName: "Cement Sales",
    description:
      "Monthly cement sales in Puerto Rico, a classic real-time proxy for construction activity.",
    category: "business",
    unit: "thousands of bags",
    frequency: "monthly",
    geography: "Puerto Rico",
    source: "Instituto de Estadísticas de Puerto Rico",
    sourceUrl:
      "https://indicadores.pr/dataset/produccion-y-venta-de-bolsas-cemento",
    methodology:
      "Cement sales ('Sales' column) from the Instituto de Estadísticas' indicadores.pr open-data portal (dataset 'produccion-y-venta-de-bolsas-cemento', current CSV resource). The portal publishes bags; the adapter divides by 1,000 to match the thousands-of-bags unit.",
    higherIs: "positive",
    seasonallyAdjusted: false,
    stalenessDays: 90,
    refreshDays: 25,
    provider: "estadisticas-pr",
    providerConfig: {
      ckan: {
        dataset: "produccion-y-venta-de-bolsas-cemento",
        resources: [{ match: "datos_cemento", column: "Sales" }],
        valueScale: 0.001,
      },
    },
    mvp: true,
  },

  // ------------------------------------------------------------------ ENERGY
  {
    id: "commercial-electricity-price",
    name: "Commercial Electricity Price",
    shortName: "Electricity Price",
    description:
      "Average retail price of electricity sold to commercial customers in Puerto Rico.",
    category: "energy",
    unit: "cents per kWh",
    frequency: "monthly",
    geography: "Puerto Rico",
    source: "U.S. Energy Information Administration",
    sourceUrl: "https://www.eia.gov/electricity/data/browser/",
    methodology:
      "EIA-861M retail sales, average price to commercial customers (sector COM), state PR, monthly.",
    higherIs: "negative",
    seasonallyAdjusted: false,
    stalenessDays: 90,
    refreshDays: 25,
    provider: "eia",
    providerConfig: { sector: "COM", metric: "price" },
    mvp: true,
  },
  {
    id: "electricity-consumption",
    name: "Electricity Consumption",
    shortName: "Electricity Use",
    description:
      "Total retail electricity sales in Puerto Rico across all sectors, a proxy for overall economic activity.",
    category: "energy",
    unit: "million kWh",
    frequency: "monthly",
    geography: "Puerto Rico",
    source: "U.S. Energy Information Administration",
    sourceUrl: "https://www.eia.gov/electricity/data/browser/",
    methodology:
      "EIA-861M retail sales, total sales to ultimate customers (sector ALL), state PR, monthly.",
    higherIs: "neutral",
    seasonallyAdjusted: false,
    stalenessDays: 90,
    refreshDays: 25,
    provider: "eia",
    providerConfig: { sector: "ALL", metric: "sales" },
    mvp: true,
  },

  // ----------------------------------------------------------------- TOURISM
  {
    id: "airport-passengers",
    name: "Airport Passengers",
    shortName: "Passengers",
    description:
      "Monthly passenger traffic through Puerto Rico's airports, a leading indicator for tourism.",
    category: "tourism",
    unit: "passengers",
    frequency: "monthly",
    geography: "Puerto Rico",
    source: "Instituto de Estadísticas de Puerto Rico (BTS Form 41 / T-100)",
    sourceUrl:
      "https://indicadores.pr/dataset/vuelos-pasajeros-aereos-y-carga-puerto-rico",
    methodology:
      "Total monthly passengers (arriving + departing) at Puerto Rico airports, from U.S. Bureau of Transportation Statistics Form 41 / T-100 data compiled by the Instituto de Estadísticas on its indicadores.pr open-data portal (dataset 'vuelos-pasajeros-aereos-y-carga-puerto-rico', 'Todos los vuelos' CSV resource). The adapter sums the 'Núm. pasajeros salientes' and 'Núm. pasajeros entrantes' columns.",
    higherIs: "positive",
    seasonallyAdjusted: false,
    stalenessDays: 90,
    refreshDays: 25,
    provider: "estadisticas-pr",
    providerConfig: {
      ckan: {
        dataset: "vuelos-pasajeros-aereos-y-carga-puerto-rico",
        resources: [
          {
            match: "ts_intl",
            // The file's "Núm." prefix arrives as mojibake depending on the
            // publisher's encoding, so match the unprefixed tail instead.
            columns: ["pasajeros salientes", "pasajeros entrantes"],
            matchMode: "endsWith",
          },
        ],
      },
    },
    mvp: true,
  },
  {
    id: "hotel-occupancy",
    name: "Hotel Occupancy",
    shortName: "Hotel Occupancy",
    description:
      "Share of available hotel rooms in Puerto Rico that were occupied.",
    category: "tourism",
    unit: "percent",
    frequency: "monthly",
    geography: "Puerto Rico",
    source: "Puerto Rico Tourism Company",
    sourceUrl: "https://tourism.pr.gov/statistics-2",
    methodology:
      "Hotel occupancy rate from the Tourism Company's monthly 'Selected Lodging Properties' report. Published only as a PDF with no machine-readable feed; values are transcribed into lib/economy/manual/hotel-occupancy.csv and ingested through the standard pipeline (see lib/economy/manual/README.md).",
    higherIs: "positive",
    seasonallyAdjusted: false,
    stalenessDays: 90,
    refreshDays: 25,
    provider: "tourism",
    mvp: true,
  },

  // ------------------------------------------------------------------- TRADE
  {
    id: "exports-vs-imports",
    name: "Exports vs Imports",
    shortName: "Trade",
    description:
      "Puerto Rico's merchandise exports and imports; the balance is a key external-sector gauge.",
    category: "trade",
    unit: "millions of USD",
    frequency: "monthly",
    geography: "Puerto Rico",
    source: "Instituto de Estadísticas de Puerto Rico",
    sourceUrl: "https://indicadores.pr/dataset/comercio-externo",
    methodology:
      "Total merchandise exports and imports ('Total' column of the x_naics and m_naics NAICS breakdowns) from the Instituto de Estadísticas' indicadores.pr open-data portal (dataset 'comercio-externo', compiled from U.S. Census foreign-trade microdata for PR). The portal publishes current dollars; the adapter divides by 1,000,000 to match the millions-of-USD unit.",
    higherIs: "neutral",
    seasonallyAdjusted: false,
    stalenessDays: 90,
    refreshDays: 25,
    provider: "estadisticas-pr",
    providerConfig: {
      series: [
        { key: "exports", label: "Exports" },
        { key: "imports", label: "Imports" },
      ],
      primarySeries: "exports",
      ckan: {
        dataset: "comercio-externo",
        resources: [
          { match: "x_naics", column: "Total", series: "exports" },
          { match: "m_naics", column: "Total", series: "imports" },
        ],
        valueScale: 0.000001,
      },
    },
    mvp: true,
  },

  // ------------------------------------- SUPPLEMENTAL (Census ACS, not MVP)
  // Ingested now so the future municipal map (78 municipios) has the state
  // series and a tested adapter; `for=county:*&in=state:72` is the documented
  // municipal extension in lib/economy/providers/census.js.
  {
    id: "population",
    name: "Population",
    shortName: "Population",
    description: "Resident population of Puerto Rico.",
    category: "demographics",
    unit: "people",
    frequency: "annual",
    geography: "Puerto Rico",
    source: "U.S. Census Bureau (ACS 5-Year)",
    sourceUrl: "https://data.census.gov/",
    methodology:
      "American Community Survey 5-year estimates, table B01003 (total population).",
    higherIs: "neutral",
    seasonallyAdjusted: false,
    stalenessDays: 400,
    refreshDays: 90,
    provider: "census",
    providerConfig: { variable: "B01003_001E" },
    mvp: false,
  },
  {
    id: "median-household-income",
    name: "Median Household Income",
    shortName: "Household Income",
    description: "Median annual household income in Puerto Rico.",
    category: "demographics",
    unit: "USD",
    frequency: "annual",
    geography: "Puerto Rico",
    source: "U.S. Census Bureau (ACS 5-Year)",
    sourceUrl: "https://data.census.gov/",
    methodology:
      "American Community Survey 5-year estimates, table B19013 (median household income in the past 12 months).",
    higherIs: "positive",
    seasonallyAdjusted: false,
    stalenessDays: 400,
    refreshDays: 90,
    provider: "census",
    providerConfig: { variable: "B19013_001E" },
    mvp: false,
  },
  {
    id: "poverty-rate",
    name: "Poverty Rate",
    shortName: "Poverty",
    description:
      "Share of the Puerto Rico population with income below the poverty level.",
    category: "demographics",
    unit: "percent",
    frequency: "annual",
    geography: "Puerto Rico",
    source: "U.S. Census Bureau (ACS 5-Year)",
    sourceUrl: "https://data.census.gov/",
    methodology:
      "American Community Survey 5-year estimates, table B17001: population below poverty (B17001_002E) divided by population for whom poverty status is determined (B17001_001E).",
    higherIs: "negative",
    seasonallyAdjusted: false,
    stalenessDays: 400,
    refreshDays: 90,
    provider: "census",
    providerConfig: {
      compute: "ratio",
      numerator: "B17001_002E",
      denominator: "B17001_001E",
      scale: 100,
    },
    mvp: false,
  },
];

const BY_ID = new Map(INDICATORS.map((indicator) => [indicator.id, indicator]));

export function getIndicator(id) {
  return BY_ID.get(id) || null;
}

export function listIndicators({ mvpOnly = false } = {}) {
  return mvpOnly ? INDICATORS.filter((indicator) => indicator.mvp) : INDICATORS;
}
