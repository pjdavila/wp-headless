import { gql, useQuery } from "@apollo/client";
import { useState } from "react";
import { useRouter } from "next/router";
import { getNextStaticProps } from "@faustwp/core";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SeoHead from "../components/SeoHead";
import { BreadcrumbJsonLd } from "../components/JsonLd";
import StoryCard from "../components/StoryCard";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import { POST_LIST_FRAGMENT } from "../fragments/PostListFragment";
import archiveStyles from "../styles/archive.module.css";
import styles from "../styles/latest-news.module.css";

const BATCH_SIZE = 12;

const SEARCH_QUERY = gql`
  ${POST_LIST_FRAGMENT}
  query SearchPosts($search: String!, $first: Int!, $after: String) {
    posts(
      first: $first
      after: $after
      where: { search: $search, orderby: { field: DATE, order: DESC } }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ...PostListFragment
      }
    }
  }
`;

export default function SearchPage() {
  const router = useRouter();
  const q = typeof router.query.q === "string" ? router.query.q : "";

  const { data, loading, error, fetchMore } = useQuery(SEARCH_QUERY, {
    variables: { search: q, first: BATCH_SIZE, after: null },
    skip: !q,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-and-network",
  });

  const siteDataQuery = useQuery(SITE_DATA_QUERY) || {};
  const headerMenuDataQuery = useQuery(HEADER_MENU_QUERY) || {};

  const siteData = siteDataQuery?.data?.generalSettings || {};
  const menuItems = headerMenuDataQuery?.data?.primaryMenuItems?.nodes || [];
  const categories = headerMenuDataQuery?.data?.categories?.nodes || [];
  const { title: siteTitle, description: siteDescription } = siteData;

  const posts = data?.posts?.nodes || [];
  const pageInfo = data?.posts?.pageInfo;

  const loadMore = async () => {
    if (!pageInfo?.endCursor) return;
    await fetchMore({
      variables: { search: q, first: BATCH_SIZE, after: pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          posts: {
            ...fetchMoreResult.posts,
            nodes: [...prev.posts.nodes, ...fetchMoreResult.posts.nodes],
          },
        };
      },
    });
  };

  return (
    <>
      <SeoHead
        title={q ? `Resultados para «${q}»` : "Buscar"}
        description={
          q
            ? `Resultados de búsqueda para «${q}» en Caribbean Business.`
            : "Busca noticias de negocios, economía y tecnología en Caribbean Business."
        }
        url="/search"
        noIndex
      />
      <BreadcrumbJsonLd
        items={[{ name: "Home", url: "/" }, { name: "Buscar" }]}
      />

      <Header
        siteTitle={siteTitle}
        siteDescription={siteDescription}
        menuItems={menuItems}
        categories={categories}
      />

      <main className="container">
        <div className={archiveStyles.sectionHeader}>
          <span className={archiveStyles.archiveLabel}>Búsqueda</span>
          <h1 className={archiveStyles.sectionTitle}>
            {q ? `Resultados para «${q}»` : "Buscar"}
          </h1>
          {q && !loading && (
            <p className={archiveStyles.sectionDescription}>
              {posts.length} resultado{posts.length !== 1 ? "s" : ""}
              {pageInfo?.hasNextPage ? "+" : ""}
            </p>
          )}
        </div>

        {!q ? (
          <div className={archiveStyles.emptyState}>
            <p>Escribe un término en la barra de búsqueda para comenzar.</p>
          </div>
        ) : loading && posts.length === 0 ? (
          <div className={archiveStyles.loadingState}>
            <div className={archiveStyles.loadingSpinner} />
            <span>Buscando…</span>
          </div>
        ) : error ? (
          <div className={archiveStyles.errorState}>
            <p>Ocurrió un error al buscar. Inténtalo de nuevo.</p>
          </div>
        ) : posts.length === 0 ? (
          <div className={archiveStyles.emptyState}>
            <p>No se encontraron resultados para «{q}».</p>
          </div>
        ) : (
          <div className={styles.layoutFull}>
            <div className={styles.mainContent}>
              <div className={styles.gridLayout}>
                {posts.map((p) => (
                  <StoryCard key={p.id} post={p} />
                ))}
              </div>

              {pageInfo?.hasNextPage && (
                <div className={archiveStyles.loadMoreContainer}>
                  <LoadMoreButton onClick={loadMore} loading={loading} />
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}

function LoadMoreButton({ onClick, loading }) {
  const [localLoading, setLocalLoading] = useState(false);
  const isLoading = loading || localLoading;

  const handleClick = async () => {
    setLocalLoading(true);
    try {
      await onClick();
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <button
      type="button"
      className={archiveStyles.loadMoreButton}
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <span className={archiveStyles.btnSpinner} />
          Cargando…
        </>
      ) : (
        "Cargar más resultados"
      )}
    </button>
  );
}

export async function getStaticProps(context) {
  return getNextStaticProps(context, {
    Page: SearchPage,
    revalidate: 60,
  });
}

SearchPage.queries = [
  { query: SITE_DATA_QUERY },
  { query: HEADER_MENU_QUERY },
];
