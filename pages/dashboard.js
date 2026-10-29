import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useQuery } from "@apollo/client";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SeoHead from "../components/SeoHead";
import AuthModal from "../components/AuthModal";
import BoardView from "../components/dashboard/board/BoardView";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import { useEconomyApi } from "../lib/useEconomyApi";
import { buildBoard } from "../lib/economy/board/model";
import { SERIES_FETCH_IDS } from "../lib/economy/board/liveMap";
import {
  DEFAULT_TAB,
  tabFromSlug,
  slugForTab,
} from "../lib/economy/board/tabs";
import { useBoardLocale } from "../lib/economy/board/i18n";

/**
 * /dashboard/ — "The Great Puerto Rico Dashboard".
 *
 * Members-only by decision: the served HTML carries no economic values.
 * Both the fixed prototype snapshot (/api/economy/fixed-snapshot/) and the
 * live data layer (/api/economy/overview/ + /api/economy/series/<id>/) load
 * client-side with a Firebase ID token; the page is noindex and excluded
 * from every sitemap. Anonymous visitors get the login gate.
 *
 * Hybrid data: live indicators win; everything else is the fixed snapshot,
 * always flagged "Dato fijo · recopilado … · sin validación editorial".
 * The ES/EN toggle only affects the dashboard (Header/Footer stay as-is).
 */

function loadBoard(get) {
  return Promise.all([
    get("/api/economy/fixed-snapshot/"),
    get("/api/economy/overview/"),
    ...SERIES_FETCH_IDS.map((id) => get(`/api/economy/series/${id}/`)),
  ]);
}

export default function DashboardPage() {
  const router = useRouter();
  const siteDataQuery = useQuery(SITE_DATA_QUERY) || {};
  const headerMenuDataQuery = useQuery(HEADER_MENU_QUERY) || {};
  const siteData = siteDataQuery?.data?.generalSettings || {};
  const menuItems = headerMenuDataQuery?.data?.primaryMenuItems?.nodes || [];
  const categories = headerMenuDataQuery?.data?.categories?.nodes || [];

  const [lang, setLang] = useBoardLocale();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const tabParam = Array.isArray(router.query.tab)
    ? router.query.tab[0]
    : router.query.tab;
  const tab = tabFromSlug(tabParam || DEFAULT_TAB);

  const selectTab = useCallback(
    (key) => {
      const query = key === DEFAULT_TAB ? {} : { tab: slugForTab(key) };
      router.replace({ pathname: "/dashboard/", query }, undefined, {
        shallow: true,
        scroll: false,
      });
      window.scrollTo({ top: 0 });
    },
    [router],
  );

  const { status, data, sessionExpired, retry } = useEconomyApi(loadBoard);

  const board = useMemo(() => {
    if (status !== "ready" || !data) return null;
    const [fixed, overview, ...series] = data;
    const seriesById = {};
    SERIES_FETCH_IDS.forEach((id, index) => {
      seriesById[id] = series[index];
    });
    return buildBoard({ fixed, overview, seriesById });
  }, [status, data]);

  useEffect(() => {
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = "es";
    };
  }, [lang]);

  return (
    <>
      <SeoHead
        title="The Great Puerto Rico Dashboard · Tablero Económico"
        description="Tablero económico de Puerto Rico: indicadores clave, tendencias y fuentes. Exclusivo para usuarios registrados."
        url="/dashboard/"
        noIndex
      />

      <Header
        siteTitle={siteData.title}
        menuItems={menuItems}
        categories={categories}
      />

      <BoardView
        status={status}
        board={board}
        sessionExpired={sessionExpired}
        onRetry={retry}
        onLogin={() => setAuthModalOpen(true)}
        tab={tab}
        onTab={selectTab}
        lang={lang}
        onLang={setLang}
      />

      <Footer />

      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
    </>
  );
}
