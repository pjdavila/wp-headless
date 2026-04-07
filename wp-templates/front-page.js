import React from "react";
import { gql, useQuery } from "@apollo/client";
import Header from "../components/Header";
import SeoHead from "../components/SeoHead";
import { WebSiteJsonLd } from "../components/JsonLd";
import Footer from "../components/Footer";
import FeaturedHero from "../components/FeaturedHero";
import ExploreCategories from "../components/ExploreCategories";
import SectionBlock from "../components/SectionBlock";
import MobileBanner from "../components/ads/MobileBanner";
import SidebarStoryCard from "../components/SidebarStoryCard";
import MarketWatchlist from "../components/MarketWatchlist";
import SidebarBanner from "../components/ads/SidebarBanner";
import InterstitialAd from "../components/ads/InterstitialAd";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import { POST_LIST_FRAGMENT } from "../fragments/PostListFragment";
import { getNextStaticProps } from "@faustwp/core";
import styles from "../styles/front-page.module.css";

const HOMEPAGE_QUERY = gql`
  ${POST_LIST_FRAGMENT}
  query GetHomepagePosts {
    posts(first: 20, where: { orderby: { field: DATE, order: DESC } }) {
      nodes {
        ...PostListFragment
      }
    }
  }
`;

const FEATURED_POSTS_QUERY = gql`
  ${POST_LIST_FRAGMENT}
  query GetFeaturedPosts {
    posts(
      first: 10
      where: { tag: "destacado", orderby: { field: DATE, order: DESC } }
    ) {
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

  const { data, loading, error } = useQuery(HOMEPAGE_QUERY);
  const { data: featuredData } = useQuery(FEATURED_POSTS_QUERY);
  const siteDataQuery = useQuery(SITE_DATA_QUERY) || {};
  const headerMenuDataQuery = useQuery(HEADER_MENU_QUERY) || {};

  const siteData = siteDataQuery?.data?.generalSettings || {};
  const menuItems = headerMenuDataQuery?.data?.primaryMenuItems?.nodes || [];
  const categories = headerMenuDataQuery?.data?.categories?.nodes || [];
  const { title: siteTitle } = siteData;

  const allPosts = data?.posts?.nodes || [];
  const featuredPosts = featuredData?.posts?.nodes || [];
  const heroPosts = allPosts.slice(0, 5);
  const recentPosts = allPosts.slice(0, 8);

  const categoryGroups = {};
  const skipSlugs = ["uncategorized", "sin-categoria"];
  for (const post of allPosts) {
    const cats = post.categories?.nodes || [];
    for (const cat of cats) {
      if (skipSlugs.includes(cat.slug)) continue;
      if (!categoryGroups[cat.slug]) {
        categoryGroups[cat.slug] = { name: cat.name, uri: cat.uri, posts: [] };
      }
      if (categoryGroups[cat.slug].posts.length < 3) {
        categoryGroups[cat.slug].posts.push(post);
      }
    }
  }

  const sections = Object.values(categoryGroups).filter((g) => g.posts.length > 0);

  return (
    <>
      <SeoHead
        title={null}
        description="Business, technology, marketing, and finance news from the Caribbean. Your premium source for business insights."
        ogImage={heroPosts[0]?.featuredImage?.node?.sourceUrl}
        url="/"
        imageAlt={heroPosts[0]?.title || "Caribbean Business"}
      />
      <WebSiteJsonLd />

      <Header
        siteTitle={siteTitle}
        menuItems={menuItems}
        categories={categories}
      />

      <main className="container">
        <FeaturedHero posts={allPosts} sliderPosts={featuredPosts} />

        <ExploreCategories categories={categories} posts={allPosts} />

        <div className={styles.layout}>
          <div className={styles.mainContent}>
            {sections.map((section, index) => (
              <React.Fragment key={section.name}>
                <SectionBlock
                  title={section.name}
                  categoryUri={section.uri}
                  posts={section.posts}
                />
                {(index + 1) % 2 === 0 && <MobileBanner />}
              </React.Fragment>
            ))}

            {sections.length === 0 && !loading && allPosts.length > 5 && (
              <SectionBlock
                title="Latest News"
                posts={allPosts.slice(5, 11)}
              />
            )}
          </div>

          <aside className={styles.sidebar}>
            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarTitle}>Most Recent</h3>
              <div className={styles.recentList}>
                {recentPosts.map((post, i) => (
                  <SidebarStoryCard key={post.id} post={post} index={i} />
                ))}
              </div>
            </div>

            <MarketWatchlist />

            <SidebarBanner />
          </aside>
        </div>
      </main>

      <InterstitialAd />
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
    query: HOMEPAGE_QUERY,
  },
  {
    query: FEATURED_POSTS_QUERY,
  },
  {
    query: SITE_DATA_QUERY,
  },
  {
    query: HEADER_MENU_QUERY,
  },
];
