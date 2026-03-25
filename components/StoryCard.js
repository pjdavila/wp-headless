import Link from "next/link";
import Image from "next/image";
import styles from "../styles/story-card.module.css";

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function StoryCard({ post }) {
  const { title, excerpt, uri, date, featuredImage, author, categories } = post;
  const category = categories?.nodes?.[0];
  const imgSrc = featuredImage?.node?.sourceUrl;
  const imgAlt = featuredImage?.node?.altText || title;

  return (
    <article className={styles.card}>
      {imgSrc && (
        <Link href={uri} className={styles.imageWrap}>
          <Image
            src={imgSrc}
            alt={imgAlt}
            fill
            sizes="(max-width: 768px) 100vw, 350px"
            className={styles.image}
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
          {author?.node?.name && (
            <span className={styles.author}>{author.node.name}</span>
          )}
          {date && <time dateTime={date} suppressHydrationWarning>{formatDate(date)}</time>}
        </div>
      </div>
    </article>
  );
}
