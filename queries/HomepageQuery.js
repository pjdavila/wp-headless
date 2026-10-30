import { gql } from "@apollo/client";
import { HEADER_CATEGORY_FIELDS } from "./MenuQueries";

// Fields the homepage blocks actually render (StoryCard, FeaturedHero,
// SectionBlock, FeaturedListBlock, FeaturedCategoryBlock, AuthorByline,
// SeoHead). Leaner than PostListFragment on purpose: no tags, author avatar
// or author slug, which nothing on the homepage displays.
const HOMEPAGE_POST_FIELDS = gql`
  fragment HomepagePostFields on Post {
    id
    title
    uri
    excerpt
    date
    featuredImage {
      node {
        sourceUrl
        altText
      }
    }
    author {
      node {
        name
        uri
      }
    }
    categories {
      nodes {
        name
        slug
        uri
      }
    }
  }
`;

// Everything the homepage needs, in ONE request to WordPress (the server is
// slow and low on resources). Standard WPGraphQL fields only: a single
// plugin-provided field that the server does not know would fail the whole
// query, and the homepage with it.
export const HOMEPAGE_QUERY = gql`
  ${HOMEPAGE_POST_FIELDS}
  ${HEADER_CATEGORY_FIELDS}
  query GetHomepage {
    generalSettings {
      title
      description
    }
    categories(first: 100) {
      nodes {
        ...HeaderCategoryFields
      }
    }
    # 11 = the most the page shows from this list (hero, Latest News
    # carousel, and the fallback block of posts 6-11).
    posts(first: 11, where: { orderby: { field: DATE, order: DESC } }) {
      nodes {
        ...HomepagePostFields
      }
    }
    featured: posts(
      first: 3
      where: { tag: "portada", orderby: { field: DATE, order: DESC } }
    ) {
      nodes {
        ...HomepagePostFields
      }
    }
    leadPosts: posts(
      first: 4
      where: { tag: "lead", orderby: { field: DATE, order: DESC } }
    ) {
      nodes {
        ...HomepagePostFields
      }
    }
    business: posts(
      first: 4
      where: {
        categoryName: "cbusiness-category"
        orderby: { field: DATE, order: DESC }
      }
    ) {
      nodes {
        ...HomepagePostFields
      }
    }
    economy: posts(
      first: 4
      where: {
        categoryName: "cbusiness-economy"
        orderby: { field: DATE, order: DESC }
      }
    ) {
      nodes {
        ...HomepagePostFields
      }
    }
    energyOil: posts(
      first: 4
      where: {
        categoryName: "cbusiness-energy-oil"
        orderby: { field: DATE, order: DESC }
      }
    ) {
      nodes {
        ...HomepagePostFields
      }
    }
    jobsLabor: posts(
      first: 4
      where: {
        categoryName: "cbusiness-jobs-labor"
        orderby: { field: DATE, order: DESC }
      }
    ) {
      nodes {
        ...HomepagePostFields
      }
    }
    crypto: posts(
      first: 4
      where: { categoryName: "crypto", orderby: { field: DATE, order: DESC } }
    ) {
      nodes {
        ...HomepagePostFields
      }
    }
    mediaEntertainment: posts(
      first: 4
      where: {
        categoryName: "cbusiness-media-entertainment"
        orderby: { field: DATE, order: DESC }
      }
    ) {
      nodes {
        ...HomepagePostFields
      }
    }
    techAi: posts(
      first: 4
      where: {
        categoryName: "cbusiness-tech-ai"
        orderby: { field: DATE, order: DESC }
      }
    ) {
      nodes {
        ...HomepagePostFields
      }
    }
    queMiImporta: posts(
      first: 5
      where: {
        categoryName: "que-mi-importa"
        orderby: { field: DATE, order: DESC }
      }
    ) {
      nodes {
        ...HomepagePostFields
      }
    }
    # Special Reports sidebar widget. One flat list of the newest articles
    # across every edition ("categoryName" includes subcategories) instead of
    # a nested posts lookup per edition, which grew with every new edition.
    # The newest edition and its posts are picked from this list in
    # lib/homepageData.js. The parent id tells editions apart from the other
    # categories a post may carry.
    specialReports: category(id: "special-reports", idType: SLUG) {
      id
    }
    specialReportPosts: posts(
      first: 20
      where: {
        categoryName: "special-reports"
        orderby: { field: DATE, order: DESC }
      }
    ) {
      nodes {
        id
        title
        uri
        date
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        categories {
          nodes {
            id
            name
            uri
            parentId
          }
        }
      }
    }
  }
`;
