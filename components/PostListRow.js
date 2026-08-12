import Link from "next/link";
import Image from "next/image";
import AuthorByline from "./AuthorByline";
import { normalizeImageUrl } from "../lib/normalizeImageUrl";
import styles from "../styles/post-list-row.module.css";

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PostListRow({ post }) {
  const { title, uri, excerpt, date, featuredImage, author, categories } = post;
  const category = categories?.nodes?.[0];
  const imgSrc = normalizeImageUrl(featuredImage?.node?.sourceUrl);
  const imgAlt = featuredImage?.node?.altText || title;

  return (
    <article className={styles.row}>
      <Link href={uri} className={styles.rowLink} aria-label={title}>
        {imgSrc && (
          <span className={styles.thumbWrap}>
            <Image
              src={imgSrc}
              alt={imgAlt}
              fill
              sizes="(max-width: 640px) 100vw, 200px"
              className={styles.thumb}
            />
          </span>
        )}
        <span className={styles.body}>
          {category && <span className={styles.badge}>{category.name}</span>}
          <h3 className={styles.title}>{title}</h3>
          {excerpt && (
            <span
              className={styles.excerpt}
              dangerouslySetInnerHTML={{ __html: excerpt }}
            />
          )}
          <span className={styles.meta}>
            {date && (
              <time dateTime={date} suppressHydrationWarning>
                {formatDate(date)}
              </time>
            )}
            {author?.node?.name && (
              <>
                <span className={styles.dot}>·</span>
                {/* Plain text: the whole row is already a link. */}
                <AuthorByline author={author} asLink={false} />
              </>
            )}
          </span>
        </span>
      </Link>
    </article>
  );
}
