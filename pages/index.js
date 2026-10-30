import { addApolloState, getApolloClient } from "@faustwp/core";
import FrontPage from "../components/FrontPage";
import { HOMEPAGE_QUERY } from "../queries/HomepageQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import {
  buildHomepageProps,
  HOMEPAGE_REVALIDATE_SECONDS,
} from "../lib/homepageData";

export default function HomePage({ homepage }) {
  return <FrontPage homepage={homepage} />;
}

// The WordPress server is slow and has few resources, so a homepage rebuild
// makes exactly ONE GraphQL request. Faust's getWordPressProps is skipped on
// purpose: it adds a "seed" request just to discover that "/" uses the
// front-page template, then one request per template query.
//
// Any failure (network error, GraphQL error, or an unusable response) is
// thrown, never swallowed. During an ISR background rebuild that keeps the
// last good homepage served instead of caching a broken one.
export async function getStaticProps() {
  const client = getApolloClient();
  const { data } = await client.query({
    query: HOMEPAGE_QUERY,
    fetchPolicy: "no-cache",
  });
  const homepage = buildHomepageProps(data);

  // Seed the browser's Apollo cache with the site settings and header
  // categories from the same response. Pages that still read these queries
  // in the browser (e.g. after navigating from the homepage) then find them
  // cached and do not ask WordPress again.
  client.writeQuery({
    query: SITE_DATA_QUERY,
    data: { generalSettings: data.generalSettings },
  });
  client.writeQuery({
    query: HEADER_MENU_QUERY,
    data: { categories: data.categories },
  });

  return {
    ...addApolloState(client, { props: { homepage } }),
    revalidate: HOMEPAGE_REVALIDATE_SECONDS,
  };
}
