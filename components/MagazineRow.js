import Link from "next/link";
import Image from "next/image";
import StoryCard from "./StoryCard";
import styles from "../styles/magazine-row.module.css";

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function HeroCard({ post }) {
  const { title, uri, excerpt, date, featuredImage, author, categories } = post;
  const category = categories?.nodes?.[0];
  const imgSrc = featuredImage?.node?.sourceUrl;
  const imgAlt = featuredImage?.node?.altText || title;

  return (
    <article className={styles.hero}>
      {imgSrc && (
        <Link href={uri} className={styles.heroImageWrap} aria-label={title}>
          <Image
            src={imgSrc}
            alt={imgAlt}
            fill
            sizes="(max-width: 768px) 100vw, 60vw"
            className={styles.heroImage}
            priority={false}
          />
        </Link>
      )}
      <div className={styles.heroContent}>
        {category && (
          <Link href={category.uri} className={styles.heroBadge}>
            {category.name}
          </Link>
        )}
        <h2 className={styles.heroTitle}>
          <Link href={uri} className={styles.heroTitleLink}>
            {title}
          </Link>
        </h2>
        {excerpt && (
          <div
            className={styles.heroExcerpt}
            dangerouslySetInnerHTML={{ __html: excerpt }}
          />
        )}
        <div className={styles.heroMeta}>
          {author?.node?.name && <span>{author.node.name}</span>}
          {date && (
            <>
              {author?.node?.name && <span className={styles.dot}>·</span>}
              <time dateTime={date} suppressHydrationWarning>
                {formatDate(date)}
              </time>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export default function MagazineRow({ posts }) {
  if (!posts || posts.length === 0) return null;
  const [hero, ...rest] = posts;
  const grid = rest.slice(0, 4);

  return (
    <div className={styles.row}>
      <HeroCard post={hero} />
      {grid.length > 0 && (
        <div className={styles.subgrid}>
          {grid.map((p) => (
            <StoryCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
