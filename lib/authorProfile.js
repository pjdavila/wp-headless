const WP_URL = (
  process.env.NEXT_PUBLIC_WORDPRESS_URL || "https://cms.vnmedia.co/cbusiness"
).replace(/\/+$/, "");

const AUTHOR_PROFILE_QUERY = `
  query CBAuthorProfile($uri: String!) {
    nodeByUri(uri: $uri) {
      ... on User {
        cbAuthorProfile {
          photoUrl
          jobTitle
          publicEmail
          linkedinUrl
        }
      }
    }
  }
`;

/**
 * Fetch the extra author profile fields (photo, job title, public email,
 * LinkedIn) that the `cb-author-profiles` WordPress plugin adds to the schema.
 *
 * These fields do not exist in vanilla WPGraphQL, so the query fails outright
 * when the plugin is not installed. That is expected: we swallow the error and
 * return `null` so the author page still renders with the core fields.
 *
 * @param {string} uri Author archive URI, e.g. "/author/philipe/".
 * @returns {Promise<null | {photoUrl: string|null, jobTitle: string|null, publicEmail: string|null, linkedinUrl: string|null}>}
 */
export async function fetchAuthorProfile(uri) {
  if (!uri) return null;

  try {
    const res = await fetch(`${WP_URL}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: AUTHOR_PROFILE_QUERY,
        variables: { uri },
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const json = await res.json();

    // The plugin is not installed (unknown field) or the request was rejected.
    if (json?.errors?.length) return null;

    const profile = json?.data?.nodeByUri?.cbAuthorProfile;
    if (!profile) return null;

    return {
      photoUrl: profile.photoUrl || null,
      jobTitle: profile.jobTitle || null,
      publicEmail: profile.publicEmail || null,
      linkedinUrl: profile.linkedinUrl || null,
    };
  } catch (err) {
    return null;
  }
}
