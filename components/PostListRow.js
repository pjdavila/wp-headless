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
      {imgSrc && (
        <Link href={uri} className={styles.thumbWrap} aria-label={title}>
          <Image
            src={imgSrc}
            alt={imgAlt}
            fill
            sizes="(max-width: 640px) 100vw, 200px"
            className={styles.thumb}
          />
        </Link>
      )}
      <div className={styles.body}>
        {category && (
          <Link href={category.uri} className={styles.badge}>
            {category.name}
          </Link>
        )}
        <h3 className={styles.title}>
          <Link href={uri} className={styles.titleLink}>
            {title}
          </Link>
        </h3>
        {excerpt && (
          <div
            className={styles.excerpt}
            dangerouslySetInnerHTML={{ __html: excerpt }}
          />
        )}
        <div className={styles.meta}>
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
        </div>
      </div>
    </article>
  );
}
