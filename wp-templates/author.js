import { gql, useQuery } from "@apollo/client";
import { useState } from "react";
import Image from "next/image";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SeoHead from "../components/SeoHead";
import { BreadcrumbJsonLd, ProfilePageJsonLd } from "../components/JsonLd";
import StoryCard from "../components/StoryCard";
import SidebarStoryCard from "../components/SidebarStoryCard";
import SidebarHalfPage from "../components/ads/SidebarHalfPage";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import { POST_LIST_FRAGMENT } from "../fragments/PostListFragment";
import { normalizeImageUrl } from "../lib/normalizeImageUrl";
import { isOptimizableImageUrl, safeImageUrl } from "../lib/imageHosts";
import archiveStyles from "../styles/archive.module.css";
import styles from "../styles/author.module.css";

const BATCH_SIZE = 9;

/**
 * Only core WPGraphQL fields are queried here so the page keeps working when
 * the `cb-author-profiles` WordPress plugin is not installed. The extra
 * profile fields arrive as the `authorProfile` prop (see lib/authorProfile.js).
 */
const AUTHOR_QUERY = gql`
  ${POST_LIST_FRAGMENT}
  query GetAuthor($uri: String!, $first: Int!, $after: String) {
    nodeByUri(uri: $uri) {
      __typename
      ... on User {
        id
        databaseId
        name
        firstName
        lastName
        slug
        uri
        description
        posts(
          first: $first
          after: $after
          where: { orderby: { field: DATE, order: DESC } }
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
    }
  }
`;

const RECENT_POSTS_QUERY = gql`
  ${POST_LIST_FRAGMENT}
  query GetRecentPostsAuthor {
    posts(first: 6, where: { orderby: { field: DATE, order: DESC } }) {
      nodes {
        ...PostListFragment
      }
    }
  }
`;

function initialsFrom(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function MailIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.65h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.75V21h-4v-5.6c0-1.34-.03-3.06-1.9-3.06-1.9 0-2.2 1.45-2.2 2.96V21H9z" />
    </svg>
  );
}

export default function AuthorPage(props) {
  const currentUri = props.__SEED_NODE__?.uri;
  const profile = props.authorProfile || null;

  const { data, loading, error, fetchMore } = useQuery(AUTHOR_QUERY, {
    variables: { uri: currentUri, first: BATCH_SIZE, after: null },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-and-network",
  });

  const siteDataQuery = useQuery(SITE_DATA_QUERY) || {};
  const headerMenuDataQuery = useQuery(HEADER_MENU_QUERY) || {};
  const { data: recentData } = useQuery(RECENT_POSTS_QUERY);

  if (loading && !data)
    return (
      <div className={archiveStyles.loadingState}>
        <div className={archiveStyles.loadingSpinner} />
        <span>Loading articles...</span>
      </div>
    );

  if (error)
    return (
      <div className={archiveStyles.errorState}>
        <p>Error loading articles.</p>
      </div>
    );

  const siteData = siteDataQuery?.data?.generalSettings || {};
  const menuItems = headerMenuDataQuery?.data?.primaryMenuItems?.nodes || [];
  const categories = headerMenuDataQuery?.data?.categories?.nodes || [];
  const { title: siteTitle, description: siteDescription } = siteData;

  const author = data?.nodeByUri || {};
  const authorName = author?.name || "Author";
  const bio = author?.description?.trim() || "";
  const posts = author?.posts;
  const postNodes = posts?.nodes || [];

  // The WordPress plugin lets an editor paste any external photo URL, not just
  // a Media Library attachment. next/image throws on hosts that are not in the
  // remotePatterns allowlist, which would take the whole profile page down, so
  // unlisted (but still http/https) hosts fall back to a plain <img>.
  const photoUrl = safeImageUrl(normalizeImageUrl(profile?.photoUrl));
  const photoIsOptimizable = isOptimizableImageUrl(photoUrl);
  const jobTitle = profile?.jobTitle || null;
  const publicEmail = profile?.publicEmail || null;
  const linkedinUrl = profile?.linkedinUrl || null;

  const authorPostUris = new Set(postNodes.map((p) => p.uri));
  const recentPosts = (recentData?.posts?.nodes || [])
    .filter((p) => !authorPostUris.has(p.uri))
    .slice(0, 6);

  const loadMorePosts = async () => {
    await fetchMore({
      variables: {
        uri: currentUri,
        first: BATCH_SIZE,
        after: posts.pageInfo.endCursor,
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

  const seoDescription =
    bio || `Articles by ${authorName} on Caribbean Business.`;

  return (
    <>
      <SeoHead
        title={authorName}
        description={seoDescription}
        ogImage={photoUrl || undefined}
        imageAlt={authorName}
        url={author?.uri || currentUri}
      />
      <ProfilePageJsonLd
        name={authorName}
        url={author?.uri || currentUri}
        description={bio}
        imageUrl={photoUrl}
        jobTitle={jobTitle}
        email={publicEmail}
        sameAs={linkedinUrl ? [linkedinUrl] : []}
      />
      <BreadcrumbJsonLd
        items={[{ name: "Home", url: "/" }, { name: authorName }]}
      />

      <Header
        siteTitle={siteTitle}
        siteDescription={siteDescription}
        menuItems={menuItems}
        categories={categories}
      />

      <main className="container">
        <header className={styles.profile}>
          <div className={styles.avatarWrap}>
            {photoUrl && photoIsOptimizable ? (
              <Image
                src={photoUrl}
                alt={authorName}
                fill
                sizes="128px"
                className={styles.avatarImg}
                priority
              />
            ) : photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt={authorName}
                className={styles.avatarImgRaw}
                loading="eager"
              />
            ) : (
              <span className={styles.avatarInitials} aria-hidden="true">
                {initialsFrom(authorName)}
              </span>
            )}
          </div>

          <div className={styles.profileBody}>
            <span className={styles.eyebrow}>Author</span>
            <h1 className={styles.name}>{authorName}</h1>
            {jobTitle && <p className={styles.jobTitle}>{jobTitle}</p>}
            {bio && <p className={styles.bio}>{bio}</p>}

            {(publicEmail || linkedinUrl) && (
              <div className={styles.contact}>
                {publicEmail && (
                  <a
                    className={styles.contactLink}
                    href={`mailto:${publicEmail}`}
                  >
                    <MailIcon />
                    {publicEmail}
                  </a>
                )}
                {linkedinUrl && (
                  <a
                    className={styles.contactLink}
                    href={linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer me"
                  >
                    <LinkedInIcon />
                    LinkedIn
                  </a>
                )}
              </div>
            )}

            <div className={styles.postCount}>
              {postNodes.length}
              {posts?.pageInfo?.hasNextPage ? "+" : ""} article
              {postNodes.length !== 1 ? "s" : ""}
            </div>
          </div>
        </header>

        <div className={archiveStyles.layout}>
          <div className={archiveStyles.mainContent}>
            <h2 className={styles.listHeading}>Latest by {authorName}</h2>

            {postNodes.length > 0 ? (
              <div className={archiveStyles.grid}>
                {postNodes.map((post) => (
                  <StoryCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className={archiveStyles.emptyState}>
                <p>This author has not published any articles yet.</p>
              </div>
            )}

            {posts?.pageInfo?.hasNextPage && (
              <div className={archiveStyles.loadMoreContainer}>
                <LoadMoreButton onClick={loadMorePosts} />
              </div>
            )}
          </div>

          <aside className={archiveStyles.sidebar}>
            <div className={archiveStyles.sidebarSection}>
              <h3 className={archiveStyles.sidebarTitle}>Most Recent</h3>
              <div className={archiveStyles.sidebarList}>
                {recentPosts.map((post, i) => (
                  <SidebarStoryCard key={post.id} post={post} index={i} />
                ))}
              </div>
            </div>
            <SidebarHalfPage />
          </aside>
        </div>
      </main>

      <Footer />
    </>
  );
}

// Deliberately does not use the `loading` flag from the page-level useQuery:
// with `cache-and-network` + `notifyOnNetworkStatusChange` that flag is already
// true during the background revalidation fired on hydration, which would make
// the server (enabled) and client (disabled) markup disagree. `localLoading`
// tracks the only state this button actually cares about — its own click.
function LoadMoreButton({ onClick }) {
  const [localLoading, setLocalLoading] = useState(false);
  const isLoading = localLoading;

  const handleClick = async () => {
    setLocalLoading(true);
    try {
      await onClick();
    } finally {
      // Always clear it: a failed fetchMore would otherwise leave the button
      // disabled forever with no way to retry.
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

AuthorPage.queries = [
  {
    query: AUTHOR_QUERY,
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
