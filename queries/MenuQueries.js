import { gql } from "@apollo/client";

// Flat category list for the header nav. Dropdown children are rebuilt from
// `parentId` in components/Header.js instead of a nested `children` list:
// every nested list is an extra lookup on the WordPress server, once per
// category. Shared with the homepage query (queries/HomepageQuery.js), so the
// selection and the `first: 100` argument must stay identical in both or the
// Apollo cache entry the homepage seeds would not match this query.
export const HEADER_CATEGORY_FIELDS = gql`
  fragment HeaderCategoryFields on Category {
    id
    name
    slug
    uri
    parentId
  }
`;

export const HEADER_MENU_QUERY = gql`
  ${HEADER_CATEGORY_FIELDS}
  query GetHeaderMenu {
    categories(first: 100) {
      nodes {
        ...HeaderCategoryFields
      }
    }
  }
`;
