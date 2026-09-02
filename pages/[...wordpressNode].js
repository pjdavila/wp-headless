import { getWordPressProps, WordPressTemplate } from "@faustwp/core";
import { fetchAuthorProfile } from "../lib/authorProfile";

export default function Page(props) {
  return <WordPressTemplate {...props} />;
}

export async function getStaticProps(ctx) {
  const result = await getWordPressProps({ ctx });

  const segments = ctx?.params?.wordpressNode || [];

  // Author profile fields live behind a WordPress plugin, so they are fetched
  // separately and are allowed to come back null (see lib/authorProfile.js).
  if (segments[0] === "author" && result?.props) {
    result.props.authorProfile = await fetchAuthorProfile(
      `/${segments.join("/")}/`,
    );

    // Faust's default ISR window is 15 minutes. Author profiles are edited in
    // the WordPress user screen and the editor expects to see the change on the
    // site shortly after saving, so shorten it for these pages only. Set here
    // rather than in wp-templates/author.js: a getStaticProps exported from a
    // template file is never called — this catch-all page is the real one.
    result.revalidate = 60;
  } else if (result?.props) {
    // Article pages end with an author card that also needs the plugin
    // profile fields. The post query has already run server-side, so the
    // author URI can be pulled out of the Apollo state without another round
    // trip. The cache holds many Users (related/recent story cards), so the
    // lookup must start from this post's own cache record — found via the
    // ROOT_QUERY `post(...)` field keyed by the seed node's databaseId — and
    // follow its `author` field, never a cache-wide User search.
    const apolloState = result.props.__APOLLO_STATE__ || {};
    const seedId = result.props.__SEED_NODE__?.databaseId;
    const rootQuery = apolloState.ROOT_QUERY || {};

    let authorUri = null;
    for (const [field, value] of Object.entries(rootQuery)) {
      if (!field.startsWith("post(") || !value?.__ref) continue;
      // The id variable may be serialized as a number or a string.
      if (
        seedId &&
        !field.includes(`"id":${seedId},`) &&
        !field.includes(`"id":"${seedId}"`)
      )
        continue;

      const postEntry = apolloState[value.__ref];
      let authorNode = postEntry?.author?.node;
      if (authorNode?.__ref) authorNode = apolloState[authorNode.__ref];

      if (authorNode?.uri) {
        authorUri = authorNode.uri;
        break;
      }
    }

    if (authorUri) {
      result.props.authorProfile = await fetchAuthorProfile(authorUri);
    }
  }

  return result;
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: "blocking",
  };
}
