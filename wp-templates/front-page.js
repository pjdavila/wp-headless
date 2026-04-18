import React from "react";
import { gql, useQuery } from "@apollo/client";
import Header from "../components/Header";
import SeoHead from "../components/SeoHead";
import { WebSiteJsonLd } from "../components/JsonLd";
import Footer from "../components/Footer";
import FeaturedHero from "../components/FeaturedHero";
import SectionBlock from "../components/SectionBlock";
import RecommendedCarousel from "../components/RecommendedCarousel";
import FeaturedCategoryBlock from "../components/FeaturedCategoryBlock";
import FeaturedVideosWidget from "../components/FeaturedVideosWidget";
import SidebarStoryCard from "../components/SidebarStoryCard";
import MarketWatchlist from "../components/MarketWatchlist";
import NewsletterWidget from "../components/NewsletterWidget";
import AdServerSlot from "../components/AdServerSlot";
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
    business: posts(first: 3, where: { categoryName: "cbusiness-category", orderby: { field: DATE, order: DESC } }) {
      nodes { ...PostListFragment }
    }
    economy: posts(first: 3, where: { categoryName: "cbusiness-economy", orderby: { field: DATE, order: DESC } }) {
      nodes { ...PostListFragment }
    }
    energyOil: posts(first: 3, where: { categoryName: "cbusiness-energy-oil", orderby: { field: DATE, order: DESC } }) {
      nodes { ...PostListFragment }
    }
    jobsLabor: posts(first: 3, where: { categoryName: "cbusiness-jobs-labor", orderby: { field: DATE, order: DESC } }) {
      nodes { ...PostListFragment }
    }
    crypto: posts(first: 3, where: { categoryName: "crypto", orderby: { field: DATE, order: DESC } }) {
      nodes { ...PostListFragment }
    }
    mediaEntertainment: posts(first: 3, where: { categoryName: "cbusiness-media-entertainment", orderby: { field: DATE, order: DESC } }) {
      nodes { ...PostListFragment }
    }
    techAi: posts(first: 3, where: { categoryName: "cbusiness-tech-ai", orderby: { field: DATE, order: DESC } }) {
      nodes { ...PostListFragment }
    }
    oyeComoFue: posts(first: 5, where: { categoryName: "oye-como-fue", orderby: { field: DATE, order: DESC } }) {
      nodes { ...PostListFragment }
    }
    queMiImporta: posts(first: 5, where: { categoryName: "que-mi-importa", orderby: { field: DATE, order: DESC } }) {
      nodes { ...PostListFragment }
    }
    leadPosts: posts(first: 4, where: { tag: "lead", orderby: { field: DATE, order: DESC } }) {
      nodes { ...PostListFragment }
    }
  }
`;

const FEATURED_POSTS_QUERY = gql`
  ${POST_LIST_FRAGMENT}
  query GetFeaturedPosts {
    posts(
      first: 3
      where: { tag: "portada", orderby: { field: DATE, order: DESC } }
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
  const oyeComoFuePosts = data?.oyeComoFue?.nodes || [];
  const queMiImportaPosts = data?.queMiImporta?.nodes || [];
  const leadPosts = data?.leadPosts?.nodes || [];

  const CATEGORY_MAP = [
    { key: "business", name: "Business", uri: "/category/news/cbusiness-category/" },
    { key: "economy", name: "Economy", uri: "/category/news/cbusiness-economy/" },
    { key: "energyOil", name: "Energy & Oil", uri: "/category/news/cbusiness-energy-oil/" },
    { key: "jobsLabor", name: "Jobs & Labor", uri: "/category/news/cbusiness-jobs-labor/" },
    { key: "crypto", name: "Crypto", uri: "/category/news/crypto/" },
    { key: "mediaEntertainment", name: "Media & Entertainment", uri: "/category/news/cbusiness-media-entertainment/" },
    { key: "techAi", name: "Tech & AI", uri: "/category/news/cbusiness-tech-ai/" },
  ];

  const sections = CATEGORY_MAP
    .map((cat) => ({
      name: cat.name,
      uri: cat.uri,
      posts: data?.[cat.key]?.nodes || [],
    }))
    .filter((g) => g.posts.length > 0);

  const latestNewsPosts = allPosts.slice(5, 11);

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
        <FeaturedHero posts={allPosts} sliderPosts={featuredPosts} sideCardPosts={leadPosts} />

        <div className={styles.layout}>
          <div className={styles.mainContent}>
            {latestNewsPosts.length > 0 && (
              <section className={styles.recommendedSection}>
                <h2 className={styles.recommendedTitle}>Latest News</h2>
                <RecommendedCarousel posts={latestNewsPosts} />
              </section>
            )}

            {queMiImportaPosts.length > 0 && (
              <FeaturedCategoryBlock
                title="A Mi Que Me Importa"
                categoryUri="/category/que-mi-importa/"
                posts={queMiImportaPosts}
              />
            )}

            {(() => {
              const hasEconomy = sections.some((s) => s.name === "Economy");
              return sections.map((section) => (
                <React.Fragment key={section.name}>
                  <SectionBlock
                    title={section.name}
                    categoryUri={section.uri}
                    posts={section.posts}
                  />
                  {section.name === "Economy" && <FeaturedVideosWidget />}
                  {!hasEconomy && section.name === "Business" && (
                    <FeaturedVideosWidget />
                  )}
                </React.Fragment>
              ));
            })()}

            {sections.length > 0 &&
              !sections.some((s) => s.name === "Economy" || s.name === "Business") && (
                <FeaturedVideosWidget />
              )}

            {sections.length === 0 && !loading && allPosts.length > 5 && (
              <SectionBlock
                title="Latest News"
                posts={allPosts.slice(5, 11)}
              />
            )}
          </div>

          <aside className={styles.sidebar}>
            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarTitle}>Oye Como Fue</h3>
              <div className={styles.recentList}>
                {oyeComoFuePosts.map((post) => (
                  <SidebarStoryCard key={post.id} post={post} />
                ))}
              </div>
            </div>

            <div className={styles.sidebarAdSlot}>
              <AdServerSlot zone="161655" width={300} height={250} />
            </div>

            <NewsletterWidget />

            <MarketWatchlist />

          </aside>
        </div>
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
