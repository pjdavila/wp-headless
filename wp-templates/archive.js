import { gql, useQuery } from "@apollo/client";
import Header from "../components/Header";
import SeoHead from "../components/SeoHead";
import { BreadcrumbJsonLd } from "../components/JsonLd";
import Footer from "../components/Footer";
import StoryCard from "../components/StoryCard";
import SidebarStoryCard from "../components/SidebarStoryCard";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import { POST_LIST_FRAGMENT } from "../fragments/PostListFragment";
import { getNextStaticProps } from "@faustwp/core";
import { useState } from "react";
import styles from "../styles/archive.module.css";

const BATCH_SIZE = 9;

const ARCHIVE_QUERY = gql`
  ${POST_LIST_FRAGMENT}
  query GetArchive($uri: String!, $first: Int!, $after: String) {
    nodeByUri(uri: $uri) {
      archiveType: __typename
      ... on Category {
        name
        description
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
      ... on Tag {
        name
        description
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
    }
  }
`;

const RECENT_POSTS_QUERY = gql`
  ${POST_LIST_FRAGMENT}
  query GetRecentPostsArchive {
    posts(first: 6, where: { orderby: { field: DATE, order: DESC } }) {
      nodes {
        ...PostListFragment
      }
    }
  }
`;

export default function ArchivePage(props) {
  const currentUri = props.__SEED_NODE__.uri;
  const {
    data,
    loading,
    error,
    fetchMore,
  } = useQuery(ARCHIVE_QUERY, {
    variables: { first: BATCH_SIZE, after: null, uri: currentUri },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-and-network",
  });

  const siteDataQuery = useQuery(SITE_DATA_QUERY) || {};
  const headerMenuDataQuery = useQuery(HEADER_MENU_QUERY) || {};
  const { data: recentData } = useQuery(RECENT_POSTS_QUERY);

  if (loading && !data)
    return (
      <>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
          <span>Loading articles...</span>
        </div>
      </>
    );

  if (error)
    return (
      <div className={styles.errorState}>
        <p>Error loading articles.</p>
      </div>
    );

  const siteData = siteDataQuery?.data?.generalSettings || {};
  const menuItems = headerMenuDataQuery?.data?.primaryMenuItems?.nodes || [];
  const categories = headerMenuDataQuery?.data?.categories?.nodes || [];
  const { title: siteTitle, description: siteDescription } = siteData;
  const { archiveType, name, description, posts } = data?.nodeByUri || {};
  const postNodes = posts?.nodes || [];

  const categoryName = name || "Archive";
  const archiveLabel = archiveType === "Tag" ? "Tag" : "";

  const currentCategorySlug = currentUri?.replace(/\//g, "").replace("category", "");
  const recentPosts = (recentData?.posts?.nodes || [])
    .filter((p) => {
      const cats = p.categories?.nodes || [];
      return !cats.some((c) => c.slug === currentCategorySlug);
    })
    .slice(0, 6);

  const loadMorePosts = async () => {
    await fetchMore({
      variables: {
        first: BATCH_SIZE,
        after: posts.pageInfo.endCursor,
        uri: currentUri,
      },
      updateQuery: (prevResult, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prevResult;

        return {
          nodeByUri: {
            ...fetchMoreResult.nodeByUri,
            posts: {
              ...fetchMoreResult.nodeByUri.posts,
              nodes: [
                ...prevResult.nodeByUri.posts.nodes,
                ...fetchMoreResult.nodeByUri.posts.nodes,
              ],
            },
          },
        };
      },
    });
  };

  return (
    <>
      <SeoHead
        title={categoryName}
        description={description || `Articles about ${categoryName} on Caribbean Business.`}
        url={currentUri}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: categoryName },
        ]}
      />

      <Header
        siteTitle={siteTitle}
        siteDescription={siteDescription}
        menuItems={menuItems}
        categories={categories}
      />

      <main className="container">
        <div className={styles.sectionHeader}>
          {archiveLabel && (
            <span className={styles.archiveLabel}>{archiveLabel}</span>
          )}
          <h1 className={styles.sectionTitle}>{categoryName}</h1>
          {description && (
            <p className={styles.sectionDescription}>{description}</p>
          )}
          <div className={styles.postCount}>
            {postNodes.length} article{postNodes.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className={styles.layout}>
          <div className={styles.mainContent}>
            {postNodes.length > 0 ? (
              <div className={styles.grid}>
                {postNodes.map((post) => (
                  <StoryCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>No articles found in this section.</p>
              </div>
            )}

            {posts?.pageInfo?.hasNextPage && (
              <div className={styles.loadMoreContainer}>
                <LoadMoreButton onClick={loadMorePosts} loading={loading} />
              </div>
            )}
          </div>

          <aside className={styles.sidebar}>
            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarTitle}>Most Recent</h3>
              <div className={styles.sidebarList}>
                {recentPosts.map((post, i) => (
                  <SidebarStoryCard key={post.id} post={post} index={i} />
                ))}
              </div>
            </div>

          </aside>
        </div>
      </main>

      <Footer />
    </>
  );
}

export async function getStaticProps(context) {
  return getNextStaticProps(context, {
    Page: ArchivePage,
    revalidate: 60,
  });
}

function LoadMoreButton({ onClick, loading }) {
  const [localLoading, setLocalLoading] = useState(false);
  const isLoading = loading || localLoading;

  const handleClick = async () => {
    setLocalLoading(true);
    await onClick();
    setLocalLoading(false);
  };

  return (
    <button
      type="button"
      className={styles.loadMoreButton}
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <span className={styles.btnSpinner} />
          Loading...
        </>
      ) : (
        "Load more articles"
      )}
    </button>
  );
}

ArchivePage.queries = [
  {
    query: ARCHIVE_QUERY,
    variables: ({ uri }) => ({
      uri,
      first: BATCH_SIZE,
      after: null,
    }),
  },
  {
    query: SITE_DATA_QUERY,
  },
  {
    query: HEADER_MENU_QUERY,
  },
  {
    query: RECENT_POSTS_QUERY,
  },
];
