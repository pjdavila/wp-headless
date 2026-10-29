import { useCallback, useEffect, useState } from "react";

/**
 * Dashboard-scoped ES/EN copy for /dashboard/ (UI strings only — no
 * economic figures live here; those arrive from the authenticated APIs).
 * The site Header/Footer are not translated.
 */
export const UI = {
  tagline: {
    es: "Todos los datos públicos de la economía de Puerto Rico en un solo lugar: al día, con fuente y explicados.",
    en: "Every public number on Puerto Rico’s economy in one place: current, sourced and explained.",
  },
  prototype: { es: "Prototipo", en: "Prototype" },
  langGroup: { es: "Idioma del tablero", en: "Dashboard language" },
  tabsLabel: { es: "Secciones del tablero", en: "Dashboard sections" },
  tabs: {
    pulse: { es: "Pulso", en: "Pulse" },
    life: { es: "Ciencias vivas", en: "Life sciences" },
    energy: { es: "Energía", en: "Energy" },
    tourism: { es: "Turismo", en: "Tourism" },
    auto: { es: "Automotriz", en: "Automotive" },
    re: { es: "Bienes raíces", en: "Real estate" },
    method: { es: "Metodología", en: "Sources & method" },
  },
  briefTag: { es: "Resumen", en: "Brief" },
  briefNote: {
    es: "Texto fijo redactado por IA con las series del prototipo · pendiente de revisión editorial",
    en: "Fixed text drafted by AI from the prototype’s series · editor review pending",
  },
  latestReleases: { es: "Últimas publicaciones", en: "Latest releases" },
  rangeLabel: {
    es: "Rango de series mensuales",
    en: "Range for monthly series",
  },
  ranges: {
    "2y": { es: "2 años", en: "2 years" },
    "5y": { es: "5 años", en: "5 years" },
    max: { es: "Máx", en: "Max" },
  },
  table: { es: "Tabla", en: "Table" },
  period: { es: "Periodo", en: "Period" },
  projection: { es: "proyección", en: "projection" },
  openIndicator: { es: "Abrir ficha del indicador", en: "Open indicator page" },
  close: { es: "Cerrar", en: "Close" },
  source: { es: "Fuente", en: "Source" },
  whatItMeans: {
    es: "Qué significa · borrador de IA",
    en: "What it means · AI draft",
  },
  whatItMeansLiveNote: {
    es: "Esta nota se redactó con el dato fijo del prototipo; la gráfica ya muestra datos en vivo y las cifras pueden diferir.",
    en: "This note was drafted from the prototype’s fixed data; the chart now shows live data and the figures may differ.",
  },
  noteFlag: {
    es: "(Nota redactada con datos fijos del prototipo; las cifras en vivo pueden diferir).",
    en: "(Note drafted from the prototype’s fixed data; live figures may differ.)",
  },
  fixedCiteNote: {
    es: "Dato fijo sin validación editorial",
    en: "Fixed data, not editorially validated",
  },
  cite: { es: "Citar", en: "Cite this" },
  copyCite: { es: "Copiar cita", en: "Copy citation" },
  copied: { es: "Copiada", en: "Copied" },
  via: { es: "Vía", en: "Via" },
  dataCollected: { es: "Datos recopilados el", en: "Data collected" },
  dataRetrieved: { es: "Datos recuperados el", en: "Data retrieved" },
  fullIndicator: {
    es: "Ver ficha completa del indicador ↗",
    en: "Open full indicator page ↗",
  },
  fresh: {
    current: { es: "Al día", en: "Current" },
    aging: { es: "Envejeciendo", en: "Aging" },
    stale: { es: "Rezagado", en: "Stale" },
    discontinued: { es: "Descontinuado", en: "Discontinued" },
  },
  origin: {
    live: { es: "En vivo", en: "Live" },
    fixed: { es: "Dato fijo", en: "Fixed data" },
    mixed: { es: "Mixto", en: "Mixed" },
    none: { es: "Sin datos", en: "No data" },
  },
  liveMarker: {
    es: "En vivo · {src} · actualizado {date}",
    en: "Live · {src} · updated {date}",
  },
  liveMarkerShort: { es: "En vivo · {date}", en: "Live · {date}" },
  fixedMarker: {
    es: "Dato fijo · recopilado {date} · sin validación editorial",
    en: "Fixed data · collected {date} · not editorially validated",
  },
  fixedMarkerShort: { es: "Dato fijo · {date}", en: "Fixed data · {date}" },
  mixedMarker: {
    es: "Mezcla datos en vivo ({live}) y datos fijos (recopilados {date}, sin validación editorial)",
    en: "Mixes live data ({live}) and fixed data (collected {date}, not editorially validated)",
  },
  refreshFailed: {
    es: "la última actualización falló; se muestra el último dato válido",
    en: "the latest refresh failed; showing the last valid data",
  },
  emptyLive: {
    es: "La fuente en vivo de este indicador todavía no tiene datos. No mostramos cifras estimadas.",
    en: "This indicator’s live source has no data yet. We do not show estimated figures.",
  },
  legendTitle: {
    es: "Cómo leer el origen de cada cifra",
    en: "How to read where each figure comes from",
  },
  legendLive: {
    es: "En vivo: viene de la capa de datos del sitio, con su fuente oficial y fecha de actualización.",
    en: "Live: comes from the site’s data layer, with its official source and update date.",
  },
  legendFixed: {
    es: "Dato fijo: recopilado por IA el {date} para el prototipo y sin validación editorial. No citar sin verificar.",
    en: "Fixed data: collected by AI on {date} for the prototype and not editorially validated. Do not cite without checking.",
  },
  vsYearAgo: { es: "{x} interanual", en: "{x} vs. year ago" },
  upFrom: { es: "sube desde {x} hace un año", en: "up from {x} a year ago" },
  downFrom: {
    es: "baja desde {x} hace un año",
    en: "down from {x} a year ago",
  },
  sameAs: { es: "igual que hace un año ({x})", en: "same as a year ago ({x})" },
  method: {
    whatTitle: { es: "Qué es este tablero", en: "What this dashboard is" },
    whatRead: {
      es: "Una versión del prototipo que combina los indicadores en vivo de la capa de datos del sitio con un conjunto fijo de cifras públicas recopiladas por IA. Cada cifra indica si es en vivo o fija.",
      en: "A version of the prototype that combines live indicators from the site’s data layer with a fixed set of public figures collected by AI. Every figure says whether it is live or fixed.",
    },
    freshTitle: { es: "El sello de frescura", en: "The freshness stamp" },
    freshRead: {
      es: "Cada cifra lleva el periodo que cubre, su fuente y un estado. Un dato mensual está al día por unos tres meses y rezagado después de siete; uno anual está al día por veinte meses.",
      en: "Every number carries the period it covers, its source and a status. Monthly data is current for about three months and stale after seven; annual data is current for twenty months.",
    },
    seriesTitle: {
      es: "Series en este tablero",
      en: "Series in this dashboard",
    },
    seriesRead: {
      es: "Cada gráfica, con el origen de sus datos (en vivo o fijo), la fuente, el último periodo y su estado.",
      en: "Every chart, with where its data comes from (live or fixed), the source, the latest period and its status.",
    },
    liveTitle: {
      es: "Indicadores de la capa de datos en vivo",
      en: "Indicators in the live data layer",
    },
    liveRead: {
      es: "Estado actual de cada indicador en vivo. Los que están pendientes o con error usan el dato fijo del prototipo cuando existe.",
      en: "Current status of every live indicator. Pending or failing ones fall back to the prototype’s fixed data when it exists.",
    },
    colIndicator: { es: "Indicador", en: "Indicator" },
    colOrigin: { es: "Origen", en: "Origin" },
    colSource: { es: "Fuente", en: "Source" },
    colLatest: { es: "Último dato", en: "Latest data" },
    colStatus: { es: "Estado", en: "Status" },
    colUpdated: { es: "Actualizado", en: "Updated" },
    open: { es: "Abrir ↗", en: "Open ↗" },
    liveStatus: {
      ok: { es: "Operando", en: "Running" },
      error: {
        es: "Error en la última actualización",
        en: "Latest refresh failed",
      },
      pending: { es: "Pendiente", en: "Pending" },
    },
    usedIn: { es: "Usado en el tablero", en: "Used on the board" },
    yes: { es: "Sí", en: "Yes" },
    no: { es: "No", en: "No" },
  },
  footer: {
    es: "Las cifras marcadas como “Dato fijo” fueron recopiladas por agentes de IA de fuentes públicas el {date} y no tienen validación editorial; no citar sin verificar. Las cifras “En vivo” provienen de la capa de datos del sitio y su fuente oficial.",
    en: "Figures marked “Fixed data” were collected by AI agents from public sources on {date} and are not editorially validated; do not cite without checking. “Live” figures come from the site’s data layer and their official source.",
  },
  states: {
    loading: { es: "Cargando indicadores…", en: "Loading indicators…" },
    gateTitle: {
      es: "Este tablero es exclusivo para usuarios registrados",
      en: "This dashboard is for registered users only",
    },
    gateText: {
      es: "Inicia sesión o crea una cuenta gratis para ver los indicadores económicos de Puerto Rico.",
      en: "Sign in or create a free account to see Puerto Rico’s economic indicators.",
    },
    expiredText: {
      es: "Tu sesión expiró. Inicia sesión de nuevo para ver los indicadores.",
      en: "Your session expired. Sign in again to see the indicators.",
    },
    login: { es: "Iniciar sesión", en: "Sign in" },
    errorTitle: {
      es: "No pudimos cargar el tablero",
      en: "We couldn’t load the dashboard",
    },
    errorText: {
      es: "Hubo un problema al obtener los datos. Inténtalo de nuevo.",
      en: "There was a problem fetching the data. Please try again.",
    },
    retry: { es: "Reintentar", en: "Retry" },
  },
};

/** Fill "{name}" placeholders in a template string. */
export function fill(template, values) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) =>
    values[key] != null ? values[key] : "",
  );
}

const STORAGE_KEY = "cb-dashboard-lang";

/**
 * Dashboard language, Spanish by default and remembered in localStorage.
 * The server render always uses Spanish; a stored English choice applies
 * right after hydration.
 */
export function useBoardLocale() {
  const [lang, setLangState] = useState("es");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "es") setLangState(stored);
    } catch {
      // Storage unavailable (private mode): keep the default.
    }
  }, []);

  const setLang = useCallback((next) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage failures; the choice still applies to this visit.
    }
  }, []);

  return [lang, setLang];
}
