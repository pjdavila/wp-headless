import Link from "next/link";

/**
 * Renders a post byline. Links to the author profile page when the author URI
 * is available; otherwise falls back to plain text.
 *
 * Pass `asLink={false}` when the byline sits inside another <Link> (nested
 * anchors are invalid HTML).
 */
export default function AuthorByline({
  author,
  className,
  prefix = "",
  asLink = true,
}) {
  const name = author?.node?.name;
  if (!name) return null;

  const uri = author?.node?.uri;

  if (asLink && uri) {
    return (
      <Link href={uri} className={className}>
        {prefix}
        {name}
      </Link>
    );
  }

  return (
    <span className={className}>
      {prefix}
      {name}
    </span>
  );
}
