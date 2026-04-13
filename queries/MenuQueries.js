import { gql } from "@apollo/client";

export const HEADER_MENU_QUERY = gql`
  query GetHeaderMenu {
    primaryMenuItems: menuItems(where: { location: PRIMARY }) {
      nodes {
        id
        uri
        path
        label
        parentId
        cssClasses
        menu {
          node {
            name
          }
        }
      }
    }
    categories(first: 100) {
      nodes {
        name
        slug
        uri
        parentId
        children(first: 50) {
          nodes {
            name
            slug
            uri
          }
        }
      }
    }
  }
`;
