/**
 * Hybrid mapping between "The Great Puerto Rico Dashboard" prototype and the
 * site's live economic data layer (lib/economy/indicators.js).
 *
 * - LIVE_SOURCES: named live series (indicator id + optional sub-series and
 *   transform). Ids only — no values.
 * - SERIES_LIVE: prototype series id → live source. Every chart that plots
 *   that series uses the live data when the source has usable observations;
 *   otherwise it keeps the fixed snapshot value with the "Dato fijo" marker.
 *   Series not listed here are fixed (no live counterpart exists yet).
 * - TILE_LIVE: KPI tile id → live source + how to phrase its value/delta.
 * - CHART_FIXED_ONLY: charts that must stay on the fixed snapshot even when
 *   their series has a live counterpart (different definition).
 * - CHART_LIVE_COPY: title/subtitle to use when the chart is drawn from live
 *   data whose definition differs from the prototype's source.
 *
 * Live sources with no usable data (pending, error with no history) never
 * replace fixed values, and live-only charts ("live:*" refs) render an empty
 * state instead of an estimate.
 */

export const LIVE_SOURCES = {
  unemployment: { indicator: "unemployment-rate" },
  payroll: { indicator: "employment-by-industry", series: "total-nonfarm" },
  manufacturing: {
    indicator: "employment-by-industry",
    series: "manufacturing",
  },
  construction: { indicator: "employment-by-industry", series: "construction" },
  leisure: {
    indicator: "employment-by-industry",
    series: "leisure-hospitality",
  },
  cpi_yoy: { indicator: "cpi-inflation", transform: "yoyPct" },
  ivu: { indicator: "ivu-collections" },
  pmi: { indicator: "pmi" },
  cement: { indicator: "cement-sales" },
  elec_price_commercial: { indicator: "commercial-electricity-price" },
  elec_consumption: { indicator: "electricity-consumption" },
  airport: { indicator: "airport-passengers" },
  hotel_occupancy: { indicator: "hotel-occupancy" },
  exports: { indicator: "exports-vs-imports", series: "exports" },
  imports: { indicator: "exports-vs-imports", series: "imports" },
  population: { indicator: "population" },
  income: { indicator: "median-household-income" },
  poverty: { indicator: "poverty-rate" },
  gnp: { indicator: "gnp-growth", periodKey: "fy" },
};

/** Live indicators the board needs the full /series/ payload for. */
export const SERIES_FETCH_IDS = [
  "employment-by-industry",
  "exports-vs-imports",
  "population",
  "median-household-income",
  "poverty-rate",
];

export const SERIES_LIVE = {
  unemployment_rate: "unemployment",
  nonfarm_employment: "payroll",
  manufacturing_employment: "manufacturing",
  construction_employment: "construction",
  leisure_hospitality_employment: "leisure",
  eai_cement_sales: "cement",
  sut_general_fund_monthly: "ivu",
  tour_sju_pax_total_asur: "airport",
  tour_hotel_occupancy: "hotel_occupancy",
  population: "population",
  real_gnp_growth_fy: "gnp",
  // Live-only refs used by the extra charts in lib/economy/prototype/pages.js.
  "live:pmi": "pmi",
  "live:cpi_yoy": "cpi_yoy",
  "live:exports": "exports",
  "live:imports": "imports",
  "live:elec_price_commercial": "elec_price_commercial",
  "live:elec_consumption": "elec_consumption",
};

const MONTH_LABEL = (es, en) => ({
  es: `${es}, {month}`,
  en: `${en}, {month}`,
});

/**
 * delta: "yoy" (signed % vs. a year earlier), "fromYearAgo" (level a year
 * earlier, for rates), or "none".
 */
export const TILE_LIVE = {
  "pulse-pop": { source: "population", fmt: "compact", delta: "yoy" },
  "pulse-gnp": {
    source: "gnp",
    fmt: "pct",
    delta: "none",
    label: {
      es: "Crecimiento real del Producto Bruto, {period}",
      en: "Real GNP growth, {period}",
    },
  },
  "pulse-ur": { source: "unemployment", fmt: "pct", delta: "fromYearAgo" },
  "pulse-jobs": { source: "payroll", fmt: "k", delta: "yoy" },
  "pulse-cpi": { source: "cpi_yoy", fmt: "pct", delta: "fromYearAgo" },
  "pulse-pax": {
    source: "airport",
    fmt: "compact",
    delta: "yoy",
    label: MONTH_LABEL("Pasajeros aéreos", "Airport passengers"),
  },
  "people-income": { source: "income", fmt: "usd", delta: "none" },
  "people-poverty": { source: "poverty", fmt: "pct", delta: "none" },
  "life-mfg-jobs": {
    source: "manufacturing",
    fmt: "k",
    delta: "yoy",
    label: MONTH_LABEL("Empleos en manufactura", "Manufacturing jobs"),
  },
  "energy-price": {
    source: "elec_price_commercial",
    fmt: "cents",
    delta: "yoy",
    label: MONTH_LABEL(
      "Precio comercial de la electricidad",
      "Commercial electricity price",
    ),
    // The prototype tile opens the annual all-sectors chart; live opens the
    // monthly commercial one.
    open: "live_elec_price",
  },
  "tour-pax": {
    source: "airport",
    fmt: "compact",
    delta: "yoy",
    label: MONTH_LABEL("Pasajeros aéreos", "Airport passengers"),
  },
  "tour-lh": {
    source: "leisure",
    fmt: "k",
    delta: "yoy",
    label: MONTH_LABEL(
      "Empleos en recreación y alojamiento",
      "Leisure & hospitality jobs",
    ),
  },
  "re-constr": {
    source: "construction",
    fmt: "k",
    delta: "yoy",
    label: MONTH_LABEL("Empleos en construcción", "Construction jobs"),
  },
};

/** The "four components of the EAI" cards plot DDEC's own adjusted series. */
export const CHART_FIXED_ONLY = new Set(["c_cement"]);

const NSA_JOBS = {
  es: "Miles de empleos · mensual, sin ajuste estacional (BLS)",
  en: "Thousands of jobs · monthly, not seasonally adjusted (BLS)",
};

export const CHART_LIVE_COPY = {
  jobs: { sub: NSA_JOBS },
  sectors: { sub: NSA_JOBS },
  mfg_jobs: { sub: NSA_JOBS },
  lh_jobs: { sub: NSA_JOBS },
  constr_jobs: { sub: NSA_JOBS },
  cement: {
    sub: {
      es: "Miles de sacos de 94 lb · mensual, sin ajuste estacional",
      en: "Thousands of 94-lb bags · monthly, not seasonally adjusted",
    },
  },
  sut: {
    t: {
      es: "Recaudos totales del IVU",
      en: "Total sales and use tax (IVU) collections",
    },
    sub: {
      es: "Millones de dólares · año fiscal actual frente a los anteriores · total recaudado, no solo la parte del Fondo General",
      en: "Millions of dollars · current fiscal year against prior ones · total collections, not just the General Fund share",
    },
  },
  pax: {
    t: {
      es: "Pasajeros en los aeropuertos de Puerto Rico",
      en: "Passengers at Puerto Rico’s airports",
    },
    sub: {
      es: "Llegadas más salidas, todos los aeropuertos · mensual",
      en: "Arrivals plus departures, all airports · monthly",
    },
  },
  pop: {
    sub: {
      es: "Residentes · anual, estimado ACS de 5 años",
      en: "Residents · annual, ACS 5-year estimate",
    },
  },
};

/** Spanish names for live indicators (the registry is in English). */
export const LIVE_NAMES_ES = {
  "gnp-growth": "Producto Bruto (crecimiento real)",
  "personal-income": "Ingreso personal",
  "unemployment-rate": "Tasa de desempleo",
  "labor-force": "Fuerza laboral",
  "total-employment": "Empleo total",
  "employment-by-industry": "Empleo por industria",
  "cpi-inflation": "Índice de precios al consumidor",
  "ivu-collections": "Recaudos del IVU",
  pmi: "Índice de gerentes de compras (PMI)",
  "cement-sales": "Ventas de cemento",
  "commercial-electricity-price": "Precio comercial de la electricidad",
  "electricity-consumption": "Consumo de electricidad",
  "airport-passengers": "Pasajeros aéreos",
  "hotel-occupancy": "Ocupación hotelera",
  "exports-vs-imports": "Exportaciones e importaciones",
  population: "Población",
  "median-household-income": "Ingreso mediano del hogar",
  "poverty-rate": "Tasa de pobreza",
};

/** Closest dashboard tab for a live indicator category. */
export const TAB_FOR_CATEGORY = {
  economy: "pulse",
  jobs: "pulse",
  consumer: "pulse",
  business: "pulse",
  demographics: "pulse",
  tourism: "tourism",
  energy: "energy",
  trade: "life",
};
