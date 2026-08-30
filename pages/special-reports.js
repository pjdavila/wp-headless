import { gql, useQuery } from "@apollo/client";
import { print } from "graphql";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SeoHead from "../components/SeoHead";
import { BreadcrumbJsonLd } from "../components/JsonLd";
import SpecialReportRow from "../components/SpecialReportRow";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import { POST_LIST_FRAGMENT } from "../fragments/PostListFragment";
import styles from "../styles/special-reports.module.css";

const PAGE_TITLE = "Special Reports";
const PAGE_DESCRIPTION =
  "In-depth reporting from Caribbean Business, edition by edition. Each collection gathers the stories behind one industry.";

const PARENT_SLUG = "special-reports";
const PARENT_URI = "/category/special-reports/";
const POSTS_PER_ROW = 5;
const REVALIDATE_SECONDS = 300;

const WP_URL = (
  process.env.NEXT_PUBLIC_WORDPRESS_URL || "https://cms.vnmedia.co/cbusiness"
).replace(/\/+$/, "");

// Only standard WPGraphQL fields here: a single plugin-provided field would
// fail the whole query and leave the page with no rows at all.
const SPECIAL_REPORTS_QUERY = gql`
  ${POST_LIST_FRAGMENT}
  query GetSpecialReports($slug: ID!, $postsPerRow: Int!) {
    category(id: $slug, idType: SLUG) {
      id
      name
      uri
      children(first: 50) {
        nodes {
          id
          name
          slug
          uri
          posts(
            first: $postsPerRow
            where: { orderby: { field: DATE, order: DESC } }
          ) {
            nodes {
              ...PostListFragment
            }
          }
        }
      }
      posts(
        first: $postsPerRow
        where: { orderby: { field: DATE, order: DESC } }
      ) {
        nodes {
          ...PostListFragment
        }
      }
    }
  }
`;

export default function SpecialReportsPage({ rows = [], fallbackRow = null, failed = false }) {
  const siteDataQuery = useQuery(SITE_DATA_QUERY) || {};
  const headerMenuDataQuery = useQuery(HEADER_MENU_QUERY) || {};

  const siteData = siteDataQuery?.data?.generalSettings || {};
  const menuItems = headerMenuDataQuery?.data?.primaryMenuItems?.nodes || [];
  const categories = headerMenuDataQuery?.data?.categories?.nodes || [];
  const { title: siteTitle, description: siteDescription } = siteData;

  const visibleRows = rows.length > 0 ? rows : fallbackRow ? [fallbackRow] : [];

  return (
    <>
      <SeoHead
        title={PAGE_TITLE}
        description={PAGE_DESCRIPTION}
        url="/special-reports/"
      />
      <BreadcrumbJsonLd
        items={[{ name: "Home", url: "/" }, { name: PAGE_TITLE }]}
      />

      <Header
        siteTitle={siteTitle}
        siteDescription={siteDescription}
        menuItems={menuItems}
        categories={categories}
      />

      <main className={`container ${styles.page}`}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>{PAGE_TITLE}</h1>
          <p className={styles.pageDescription}>{PAGE_DESCRIPTION}</p>
        </div>

        {failed ? (
          <div className={styles.errorState}>
            <p>We couldn&apos;t load the special reports right now.</p>
            <p className={styles.errorHint}>Please try again in a few minutes.</p>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No special reports have been published yet.</p>
          </div>
        ) : (
          <div className={styles.rows}>
            {visibleRows.map((row) => (
              <SpecialReportRow
                key={row.key}
                title={row.name}
                categoryUri={row.uri}
                posts={row.posts}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}

SpecialReportsPage.queries = [
  { query: SITE_DATA_QUERY },
  { query: HEADER_MENU_QUERY },
];

async function fetchSpecialReports() {
  const res = await fetch(`${WP_URL}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: print(SPECIAL_REPORTS_QUERY),
      variables: { slug: PARENT_SLUG, postsPerRow: POSTS_PER_ROW },
    }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }

  return json.data?.category || null;
}

export async function getStaticProps(context) {
  const { getNextStaticProps } = await import("@faustwp/core");

  let rows = [];
  let fallbackRow = null;
  let failed = false;

  try {
    const category = await fetchSpecialReports();

    // Editions are discovered from WordPress, never hardcoded: a new
    // subcategory appears here on the next revalidation, with no code change.
    // Subcategories without posts are dropped so they leave no empty row.
    rows = (category?.children?.nodes || [])
      .map((child) => ({
        key: child.id,
        name: child.name,
        uri: child.uri,
        posts: child.posts?.nodes || [],
      }))
      .filter((row) => row.posts.length > 0);

    // No subcategory has posts (or there are none yet): show the parent
    // category's own latest articles instead of an empty page.
    const parentPosts = category?.posts?.nodes || [];
    if (rows.length === 0 && parentPosts.length > 0) {
      fallbackRow = {
        key: category?.id || PARENT_SLUG,
        name: category?.name || PAGE_TITLE,
        uri: category?.uri || PARENT_URI,
        posts: parentPosts,
      };
    }
  } catch (e) {
    console.error("Special Reports fetch error:", e?.message);
    failed = true;
  }

  const faustProps = await getNextStaticProps(context, {
    Page: SpecialReportsPage,
    revalidate: REVALIDATE_SECONDS,
  });

  return {
    ...faustProps,
    props: {
      ...(faustProps.props || {}),
      rows,
      fallbackRow,
      failed,
    },
    revalidate: REVALIDATE_SECONDS,
  };
}
