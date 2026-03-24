import { gql, useQuery } from "@apollo/client";
import Head from "next/head";
import Header from "../components/Header";
import EntryHeader from "../components/EntryHeader";
import Footer from "../components/Footer";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import { POST_LIST_FRAGMENT } from "../fragments/PostListFragment";
import PostListItem from "../components/PostListItem";
import { getNextStaticProps } from "@faustwp/core";
import styles from "../styles/front-page.module.css";

const POSTS_PER_PAGE = 10;

const BLOG_POSTS_QUERY = gql`
  ${POST_LIST_FRAGMENT}
  query GetBlogPosts($first: Int!) {
    posts(first: $first) {
      nodes {
        ...PostListFragment
      }
    }
  }
`;

export default function FrontPage(props) {
  if (props.loading) {
    return <>Loading...</>;
  }

  const { data, loading, error } = useQuery(BLOG_POSTS_QUERY, {
    variables: { first: POSTS_PER_PAGE },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const siteDataQuery = useQuery(SITE_DATA_QUERY) || {};
  const headerMenuDataQuery = useQuery(HEADER_MENU_QUERY) || {};

  const siteData = siteDataQuery?.data?.generalSettings || {};
  const menuItems = headerMenuDataQuery?.data?.primaryMenuItems?.nodes || {
    nodes: [],
  };
  const { title: siteTitle, description: siteDescription } = siteData;
  const posts = data?.posts?.nodes || [];

  return (
    <>
      <Head>
        <title>{siteTitle}</title>
      </Head>

      <Header
        siteTitle={siteTitle}
        siteDescription={siteDescription}
        menuItems={menuItems}
      />

      <main className="container">
        <EntryHeader title="Blog" />

        <section className={styles.blogList}>
          {loading && !data && <p>Loading posts...</p>}
          {error && <p>Error loading posts.</p>}
          {posts.length > 0
            ? posts.map((post) => <PostListItem key={post.id} post={post} />)
            : !loading && <p>No posts found.</p>}
        </section>
      </main>

      <Footer />
    </>
  );
}

export async function getStaticProps(context) {
  return getNextStaticProps(context, {
    Page: FrontPage,
    revalidate: 60,
  });
}

FrontPage.queries = [
  {
    query: BLOG_POSTS_QUERY,
    variables: () => ({
      first: POSTS_PER_PAGE,
    }),
  },
  {
    query: SITE_DATA_QUERY,
  },
  {
    query: HEADER_MENU_QUERY,
  },
];
