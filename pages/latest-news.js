import { gql, useQuery } from "@apollo/client";
import { useEffect, useState } from "react";
import { getNextStaticProps } from "@faustwp/core";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SeoHead from "../components/SeoHead";
import { BreadcrumbJsonLd } from "../components/JsonLd";
import StoryCard from "../components/StoryCard";
import SidebarStoryCard from "../components/SidebarStoryCard";
import PostListRow from "../components/PostListRow";
import MagazineRow from "../components/MagazineRow";
import LatestNewsToolbar from "../components/LatestNewsToolbar";
import AdServerSlot from "../components/AdServerSlot";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import { POST_LIST_FRAGMENT } from "../fragments/PostListFragment";
import archiveStyles from "../styles/archive.module.css";
import styles from "../styles/latest-news.module.css";

const BATCH_SIZE = 12;
const STORAGE_KEY = "bj-latest-view";

const LATEST_NEWS_QUERY = gql`
  ${POST_LIST_FRAGMENT}
  query GetLatestNews($first: Int!, $after: String) {
    posts(first: $first, after: $after, where: { orderby: { field: DATE, order: DESC } }) {
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

function chunkBy(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export default function LatestNewsPage() {
  const [view, setView] = useState("grid");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "grid" || stored === "list" || stored === "magazine") {
        setView(stored);
      }
    } catch (e) {}
  }, []);

  const handleViewChange = (next) => {
    setView(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {}
  };

  const { data, loading, error, fetchMore } = useQuery(LATEST_NEWS_QUERY, {
    variables: { first: BATCH_SIZE, after: null },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-and-network",
  });

  const siteDataQuery = useQuery(SITE_DATA_QUERY) || {};
  const headerMenuDataQuery = useQuery(HEADER_MENU_QUERY) || {};

  const siteData = siteDataQuery?.data?.generalSettings || {};
  const menuItems = headerMenuDataQuery?.data?.primaryMenuItems?.nodes || [];
  const categories = headerMenuDataQuery?.data?.categories?.nodes || [];
  const { title: siteTitle, description: siteDescription } = siteData;

  const allPosts = data?.posts?.nodes || [];
  const pageInfo = data?.posts?.pageInfo;
  const showSidebar = view !== "magazine";
  const recentPosts = showSidebar ? allPosts.slice(0, 6) : [];
  const posts = showSidebar ? allPosts.slice(6) : allPosts;

  const loadMore = async () => {
    if (!pageInfo?.endCursor) return;
    await fetchMore({
      variables: { first: BATCH_SIZE, after: pageInfo.endCursor },
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
        title="Latest News — Caribbean Business"
        description="All the latest business, economy, and tech news from the Caribbean, in chronological order."
        url="/latest-news"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Latest News" },
        ]}
      />

      <Header
        siteTitle={siteTitle}
        siteDescription={siteDescription}
        menuItems={menuItems}
        categories={categories}
      />

      <main className="container">
        <div className={archiveStyles.sectionHeader}>
          <span className={archiveStyles.archiveLabel}>News</span>
          <h1 className={archiveStyles.sectionTitle}>Latest News</h1>
          <p className={archiveStyles.sectionDescription}>
            Every story, newest first. Switch between grid, list, and magazine layouts.
          </p>
        </div>

        <div className={styles.toolbar}>
          <span className={styles.toolbarMeta}>
            {allPosts.length} article{allPosts.length !== 1 ? "s" : ""}
          </span>
          <LatestNewsToolbar view={view} onChange={handleViewChange} />
        </div>

        {loading && posts.length === 0 ? (
          <div className={archiveStyles.loadingState}>
            <div className={archiveStyles.loadingSpinner} />
            <span>Loading articles...</span>
          </div>
        ) : error ? (
          <div className={archiveStyles.errorState}>
            <p>Error loading articles.</p>
          </div>
        ) : (
          <div className={showSidebar ? styles.layoutWithSidebar : styles.layoutFull}>
            <div className={styles.mainContent}>
              {posts.length === 0 ? (
                <div className={archiveStyles.emptyState}>
                  <p>No articles found.</p>
                </div>
              ) : view === "grid" ? (
                <div className={styles.gridLayout}>
                  {posts.map((p) => (
                    <StoryCard key={p.id} post={p} />
                  ))}
                </div>
              ) : view === "list" ? (
                <div className={styles.listLayout}>
                  {posts.map((p) => (
                    <PostListRow key={p.id} post={p} />
                  ))}
                </div>
              ) : (
                <div className={styles.magazineLayout}>
                  {chunkBy(posts, 5).map((group, i) => (
                    <MagazineRow key={group[0]?.id || i} posts={group} />
                  ))}
                </div>
              )}

              {pageInfo?.hasNextPage && (
                <div className={archiveStyles.loadMoreContainer}>
                  <LoadMoreButton onClick={loadMore} loading={loading} />
                </div>
              )}
            </div>

            {showSidebar && (
              <aside className={styles.sidebar}>
                <div className={styles.sidebarSection}>
                  <h3 className={styles.sidebarTitle}>Most Recent</h3>
                  <div className={styles.sidebarList}>
                    {recentPosts.map((post, i) => (
                      <SidebarStoryCard key={post.id} post={post} index={i} />
                    ))}
                  </div>
                </div>

                <div className={styles.sidebarAdSlot}>
                  <AdServerSlot zone="161655" width={300} height={250} />
                </div>
              </aside>
            )}
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
          Loading...
        </>
      ) : (
        "Load more articles"
      )}
    </button>
  );
}

export async function getStaticProps(context) {
  return getNextStaticProps(context, {
    Page: LatestNewsPage,
    revalidate: 60,
  });
}

LatestNewsPage.queries = [
  {
    query: LATEST_NEWS_QUERY,
    variables: { first: BATCH_SIZE, after: null },
  },
  { query: SITE_DATA_QUERY },
  { query: HEADER_MENU_QUERY },
];
