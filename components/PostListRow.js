import Link from "next/link";
import Image from "next/image";
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
  const imgSrc = featuredImage?.node?.sourceUrl;
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
                <span>{author.node.name}</span>
              </>
            )}
          </span>
        </span>
      </Link>
    </article>
  );
}
