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
  }

  return result;
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: "blocking",
  };
}
