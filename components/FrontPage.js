import React from "react";
import Header from "./Header";
import SeoHead from "./SeoHead";
import { WebSiteJsonLd } from "./JsonLd";
import Footer from "./Footer";
import FeaturedHero from "./FeaturedHero";
import SectionBlock from "./SectionBlock";
import FeaturedListBlock from "./FeaturedListBlock";
import RecommendedCarousel from "./RecommendedCarousel";
import ShortStoriesRow from "./ShortStoriesRow";
import FeaturedCategoryBlock from "./FeaturedCategoryBlock";
import FeaturedVideosWidget from "./FeaturedVideosWidget";
import MarketWatchlist from "./MarketWatchlist";
import NewsletterWidget from "./NewsletterWidget";
import PrintEditionWidget from "./PrintEditionWidget";
import EpaperBanner from "./EpaperBanner";
import SpecialReportsWidget from "./SpecialReportsWidget";
import AdServerSlot from "./AdServerSlot";
import FortyUnder40Promo from "./FortyUnder40Promo";
import styles from "../styles/front-page.module.css";

/**
 * Homepage. All data arrives as props from pages/index.js, which fetches it
 * from WordPress in a single request per rebuild (see
 * queries/HomepageQuery.js and lib/homepageData.js).
 */
export default function FrontPage({ homepage }) {
  const {
    siteTitle,
    categories = [],
    posts: allPosts = [],
    featuredPosts = [],
    leadPosts = [],
    queMiImportaPosts = [],
    sectionPosts = {},
    specialReportEditions = [],
  } = homepage || {};
  const heroPosts = allPosts.slice(0, 5);

  const CATEGORY_MAP = [
    {
      key: "business",
      name: "Business",
      uri: "/category/news/cbusiness-category/",
    },
    {
      key: "economy",
      name: "Economy",
      uri: "/category/news/cbusiness-economy/",
    },
    {
      key: "energyOil",
      name: "Energy & Oil",
      uri: "/category/news/cbusiness-energy-oil/",
    },
    {
      key: "jobsLabor",
      name: "Jobs & Labor",
      uri: "/category/news/cbusiness-jobs-labor/",
    },
    { key: "crypto", name: "Crypto", uri: "/category/news/crypto/" },
    {
      key: "mediaEntertainment",
      name: "Media & Entertainment",
      uri: "/category/news/cbusiness-media-entertainment/",
    },
    {
      key: "techAi",
      name: "Tech & AI",
      uri: "/category/news/cbusiness-tech-ai/",
    },
  ];

  const sections = CATEGORY_MAP.map((cat) => ({
    name: cat.name,
    uri: cat.uri,
    posts: sectionPosts[cat.key] || [],
  })).filter((g) => g.posts.length > 0);

  const latestNewsPosts = allPosts.slice(0, 6);

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

      <Header siteTitle={siteTitle} categories={categories} />

      <main className="container">
        <FeaturedHero
          posts={allPosts}
          sliderPosts={featuredPosts}
          sideCardPosts={leadPosts}
        />

        <div className={styles.layout}>
          <div className={styles.mainContent}>
            <ShortStoriesRow />

            <FortyUnder40Promo />

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
              return sections.map((section, index) => {
                const LayoutComponent =
                  index % 2 === 0 ? SectionBlock : FeaturedListBlock;
                return (
                  <React.Fragment key={section.name}>
                    <LayoutComponent
                      title={section.name}
                      categoryUri={section.uri}
                      posts={section.posts}
                    />
                    {section.name === "Economy" && <FeaturedVideosWidget />}
                    {!hasEconomy && section.name === "Business" && (
                      <FeaturedVideosWidget />
                    )}
                  </React.Fragment>
                );
              });
            })()}

            {sections.length > 0 &&
              !sections.some(
                (s) => s.name === "Economy" || s.name === "Business",
              ) && <FeaturedVideosWidget />}

            {sections.length === 0 && allPosts.length > 5 && (
              <SectionBlock title="Latest News" posts={allPosts.slice(5, 11)} />
            )}
          </div>

          <aside className={styles.sidebar}>
            <EpaperBanner />

            <SpecialReportsWidget editions={specialReportEditions} />

            <div className={styles.sidebarAdSlot}>
              <AdServerSlot zone="161655" width={300} height={250} />
            </div>

            <NewsletterWidget />

            <PrintEditionWidget />

            <MarketWatchlist />
          </aside>
        </div>
      </main>

      <Footer />
    </>
  );
}
