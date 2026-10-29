/**
 * Tab layout of "The Great Puerto Rico Dashboard" prototype (server-only:
 * the section reads and side panels carry economic figures, so they are
 * served exclusively through the authenticated
 * /api/economy/fixed-snapshot route).
 *
 * Block types rendered by components/dashboard/board/BoardPage.js:
 *   { type: "grid", ids: [chartId…], cls? }   chart cards
 *   { type: "label", text }                  small uppercase label row
 *   { type: "tiles", set, cls }              an extra KPI tile row
 *   { type: "pipeline" }                     the "in the pipeline" grid
 *
 * Side panel types: feed (latest releases), news (announced investments by
 * industry), facts (title + rows), projects (news with a location + facts).
 *
 * The Metodología tab is rendered by the client from the merged board, so
 * it lists the live/fixed origin of every series.
 */

export const PAGES = [
  {
    key: "pulse",
    tiles: { set: "pulse", cls: "n10" },
    panel: { type: "feed" },
    sections: [
      {
        t: { en: "Output and growth", es: "Producción y crecimiento" },
        read: {
          en: "Activity has been flat for two years. The official growth figure arrives once a year, which is the gap a nowcast would fill.",
          es: "La actividad lleva dos años plana. La cifra oficial de crecimiento llega una vez al año, y ese es el vacío que llenaría un estimado mensual.",
        },
        blocks: [
          { type: "grid", ids: ["eai", "eai_yoy", "gnp", "gdp_bea"] },
          {
            type: "label",
            text: {
              en: "The four components of the index",
              es: "Los cuatro componentes del índice",
            },
          },
          {
            type: "grid",
            ids: ["c_jobs", "c_cement", "c_gas", "c_elec"],
            cls: "c4",
          },
        ],
      },
      {
        t: { en: "Labor market", es: "Mercado laboral" },
        read: {
          en: "Unemployment is off its record low while payrolls sit near their high. Hospitality is carrying job growth.",
          es: "El desempleo se alejó de su mínimo histórico mientras el empleo sigue cerca de su máximo. El turismo sostiene el crecimiento del empleo.",
        },
        blocks: [{ type: "grid", ids: ["ur", "jobs", "sectors"] }],
      },
      {
        t: { en: "Prices and consumers", es: "Precios y consumidores" },
        read: {
          en: "Inflation quadrupled in a year. Spending is holding in dollars, and bankruptcies are edging up.",
          es: "La inflación se cuadruplicó en un año. El gasto se sostiene en dólares y las quiebras suben poco a poco.",
        },
        blocks: [
          { type: "grid", ids: ["cpi", "retail", "retail_sector", "bankr"] },
        ],
      },
      {
        t: { en: "Public finances", es: "Finanzas públicas" },
        read: {
          en: "Revenues beat the certified projection for fiscal 2026. Collections for the new fiscal year have not been published yet.",
          es: "Los recaudos superaron la proyección certificada del año fiscal 2026. Los del nuevo año fiscal aún no se han publicado.",
        },
        blocks: [{ type: "grid", ids: ["gf", "sut"] }],
      },
      {
        t: { en: "More live indicators", es: "Más indicadores en vivo" },
        read: {
          en: "Monthly series from the site's live data layer that the prototype snapshot did not include.",
          es: "Series mensuales de la capa de datos en vivo del sitio que el prototipo no incluía.",
        },
        blocks: [{ type: "grid", ids: ["live_pmi", "live_cpi"] }],
      },
      {
        t: {
          en: "Real estate and construction",
          es: "Bienes raíces y construcción",
        },
        read: {
          en: "Prices are up double digits on thin sales, credit is growing, and most reconstruction money is still unspent. The full module is under the Real estate tab.",
          es: "Los precios suben a doble dígito con pocas ventas, el crédito crece y la mayor parte del dinero de reconstrucción sigue sin gastarse. El módulo completo está en la pestaña Bienes raíces.",
        },
        blocks: [{ type: "grid", ids: ["hpi", "constr_jobs"] }],
      },
      {
        t: { en: "People", es: "Población" },
        read: {
          en: "Fewer and older residents every year. This is the slow variable behind every other chart.",
          es: "Menos residentes y de mayor edad cada año. Es la variable lenta detrás de todas las demás gráficas.",
        },
        blocks: [
          { type: "tiles", set: "people", cls: "n4" },
          { type: "grid", ids: ["pop"] },
        ],
      },
      {
        t: { en: "In the pipeline", es: "En preparación" },
        read: {
          en: "Modules planned for the public beta. No numbers are shown until a source is connected and validated.",
          es: "Módulos previstos para la versión beta pública. No se muestran cifras hasta conectar y validar la fuente.",
        },
        blocks: [{ type: "pipeline" }],
      },
    ],
  },
  {
    key: "life",
    tiles: { set: "life", cls: "n6" },
    panel: {
      type: "news",
      industry: "life_sciences",
      title: { en: "Announced investments", es: "Inversiones anunciadas" },
    },
    sections: [
      {
        t: { en: "Jobs and pay", es: "Empleo y paga" },
        blocks: [{ type: "grid", ids: ["mfg_jobs", "ls_jobs", "ls_pay"] }],
      },
      {
        t: { en: "Trade", es: "Comercio exterior" },
        blocks: [
          {
            type: "grid",
            ids: ["trade", "live_trade", "exp_sector", "exp_dest"],
          },
        ],
      },
    ],
  },
  {
    key: "energy",
    tiles: { set: "energy", cls: "n6" },
    panel: {
      type: "facts",
      title: { en: "Reliability, 2025", es: "Confiabilidad, 2025" },
      rows: [
        [
          "SAIDI",
          {
            en: "36 outage hours per customer, excluding major events; 23 more hours from major events",
            es: "36 horas sin servicio por cliente, sin eventos mayores; 23 horas más por eventos mayores",
          },
          "EIA-861",
        ],
        [
          "SAIFI",
          {
            en: "Almost 16 interruptions per customer",
            es: "Casi 16 interrupciones por cliente",
          },
          "EIA-861",
        ],
        [
          "2021–25",
          {
            en: "Average of 29 outage hours a year, against about 2 on the U.S. mainland",
            es: "Promedio de 29 horas al año, frente a unas 2 en EE. UU. continental",
          },
          "EIA",
        ],
        [
          "DOE",
          {
            en: "$925 million obligated and $255 million disbursed from the Energy Resilience Fund; up to $350 million in grants canceled in January 2026",
            es: "$925 millones obligados y $255 millones desembolsados del Fondo de Resiliencia Energética; hasta $350 millones en subvenciones canceladas en enero de 2026",
          },
          "GAO-26-107772",
        ],
      ],
    },
    sections: [
      {
        t: { en: "Price and demand", es: "Precio y demanda" },
        blocks: [
          {
            type: "grid",
            ids: [
              "price",
              "live_elec_price",
              "sales_sector",
              "live_elec_use",
              "gen_m",
            ],
          },
        ],
      },
      {
        t: { en: "Supply and reconstruction", es: "Oferta y reconstrucción" },
        blocks: [{ type: "grid", ids: ["genmix", "capacity", "fedgrid"] }],
      },
    ],
  },
  {
    key: "tourism",
    tiles: { set: "tourism", cls: "n6" },
    panel: {
      type: "facts",
      title: { en: "2025 in review", es: "Balance de 2025" },
      rows: [
        [
          "SJU",
          {
            en: "6.8 million arriving passengers, up 3%",
            es: "6.8 millones de pasajeros llegando, 3% más",
          },
          "Discover Puerto Rico",
        ],
        [
          "$1.99B",
          {
            en: "Lodging revenue: hotels $1.26 billion, short-term rentals $733 million",
            es: "Ingresos de alojamiento: hoteles $1,260 millones, alquileres a corto plazo $733 millones",
          },
          "Discover Puerto Rico",
        ],
        [
          "ADR",
          {
            en: "Hotel average daily rate of $297",
            es: "Tarifa diaria promedio hotelera de $297",
          },
          "Discover Puerto Rico",
        ],
        [
          "1.83M",
          {
            en: "Cruise passengers in fiscal 2026 through May, already past the fiscal 2019 record of 1.81 million",
            es: "Pasajeros de crucero en el año fiscal 2026 hasta mayo, ya sobre el récord de 1.81 millones del año fiscal 2019",
          },
          "Discover Puerto Rico",
        ],
      ],
    },
    sections: [
      {
        t: { en: "Arrivals and bookings", es: "Llegadas y reservas" },
        blocks: [{ type: "grid", ids: ["pax", "pace"] }],
      },
      {
        t: { en: "Lodging", es: "Alojamiento" },
        blocks: [
          { type: "grid", ids: ["lodging", "nights", "occ", "roomtax"] },
        ],
      },
      {
        t: { en: "Jobs", es: "Empleo" },
        blocks: [{ type: "grid", ids: ["lh_jobs"] }],
      },
    ],
  },
  {
    key: "auto",
    tiles: { set: "auto", cls: "n6" },
    panel: {
      type: "facts",
      title: {
        en: "GUIA’s 2026 scenarios",
        es: "Escenarios de GUIA para 2026",
      },
      rows: [
        [
          "112,000",
          {
            en: "Optimistic scenario set in January",
            es: "Escenario optimista fijado en enero",
          },
          "GUIA",
        ],
        [
          "108,000",
          {
            en: "Base scenario set in January",
            es: "Escenario base fijado en enero",
          },
          "GUIA",
        ],
        [
          "100,500",
          {
            en: "Pessimistic scenario, adopted as the forecast in August",
            es: "Escenario pesimista, adoptado como pronóstico en agosto",
          },
          "GUIA",
        ],
        [
          "9,011",
          {
            en: "Vehicles repossessed in the first half of 2025",
            es: "Vehículos reposeídos en la primera mitad de 2025",
          },
          "GUIA",
        ],
      ],
    },
    sections: [
      {
        t: { en: "Sales", es: "Ventas" },
        blocks: [{ type: "grid", ids: ["auto_m", "auto_a"] }],
      },
      {
        t: { en: "Market mix", es: "Composición del mercado" },
        blocks: [{ type: "grid", ids: ["brands", "electrified"] }],
      },
    ],
  },
  {
    key: "re",
    tiles: { set: "re", cls: "n6" },
    panel: {
      type: "projects",
      title: { en: "Projects and key facts", es: "Proyectos y datos clave" },
      match: "Esencia|Hard Rock",
      rows: [
        [
          "R3",
          {
            en: "7,003 homes delivered under the CDBG-DR repair and reconstruction program by May 2026",
            es: "7,003 viviendas entregadas por el programa R3 de reparación y reconstrucción a mayo de 2026",
          },
          "Departamento de la Vivienda",
        ],
        [
          "$663",
          {
            en: "HUD fair market rent for a two-bedroom in the San Juan metro, FY2026",
            es: "Renta justa de mercado de HUD para dos habitaciones en el área metro de San Juan, AF2026",
          },
          "HUD",
        ],
        [
          "53%",
          {
            en: "Short-term rentals’ share of all lodging nights on offer in 2025",
            es: "Participación de los alquileres a corto plazo en las noches de alojamiento ofrecidas en 2025",
          },
          "Discover Puerto Rico",
        ],
      ],
    },
    sections: [
      {
        t: { en: "Prices and activity", es: "Precios y actividad" },
        blocks: [
          { type: "grid", ids: ["hpi", "constr_jobs", "cement", "invest"] },
        ],
      },
      {
        t: {
          en: "Permits, credit and recovery funds",
          es: "Permisos, crédito y fondos de recuperación",
        },
        blocks: [{ type: "grid", ids: ["permits", "loans", "forecl", "cdbg"] }],
      },
    ],
  },
];

/**
 * Chart specs for live indicators the prototype snapshot did not include.
 * Their series refs ("live:*") resolve only against the live data layer
 * (lib/economy/board/liveMap.js); with no live data they render an honest
 * empty state — there is no fixed fallback.
 */
export const LIVE_ONLY_CHARTS = {
  live_pmi: {
    kind: "line",
    fmt: "idx",
    liveOnly: true,
    t: {
      en: "Manufacturing purchasing managers' index (PMI)",
      es: "Índice de gerentes de compras de manufactura (PMI)",
    },
    sub: {
      en: "Index · monthly, seasonally adjusted · above 50 means expansion",
      es: "Índice · mensual, ajustado estacionalmente · sobre 50 indica expansión",
    },
    series: [{ ref: "live:pmi", n: { en: "PMI", es: "PMI" } }],
  },
  live_cpi: {
    kind: "line",
    fmt: "pct",
    signed: true,
    liveOnly: true,
    t: {
      en: "Consumer prices, change from a year earlier",
      es: "Precios al consumidor, cambio interanual",
    },
    sub: {
      en: "Percent · monthly CPI, all items",
      es: "Por ciento · IPC mensual, todos los artículos",
    },
    series: [{ ref: "live:cpi_yoy", n: { en: "Inflation", es: "Inflación" } }],
  },
  live_trade: {
    kind: "line",
    fmt: "usdM",
    liveOnly: true,
    t: {
      en: "Merchandise exports and imports, monthly",
      es: "Exportaciones e importaciones de mercancía, mensual",
    },
    sub: {
      en: "Millions of dollars · monthly",
      es: "Millones de dólares · mensual",
    },
    series: [
      { ref: "live:exports", n: { en: "Exports", es: "Exportaciones" } },
      { ref: "live:imports", n: { en: "Imports", es: "Importaciones" } },
    ],
  },
  live_elec_price: {
    kind: "line",
    fmt: "cents",
    liveOnly: true,
    t: {
      en: "Commercial electricity price, monthly",
      es: "Precio comercial de la electricidad, mensual",
    },
    sub: {
      en: "Cents per kWh · monthly",
      es: "Centavos por kWh · mensual",
    },
    series: [
      {
        ref: "live:elec_price_commercial",
        n: { en: "Commercial", es: "Comercial" },
      },
    ],
  },
  live_elec_use: {
    kind: "line",
    fmt: "int",
    liveOnly: true,
    t: {
      en: "Electricity consumption, monthly",
      es: "Consumo de electricidad, mensual",
    },
    sub: {
      en: "Millions of kWh · monthly",
      es: "Millones de kWh · mensual",
    },
    series: [
      { ref: "live:elec_consumption", n: { en: "Consumption", es: "Consumo" } },
    ],
  },
};
