import Link from "next/link";
import Image from "next/image";
import styles from "../styles/featured-hero.module.css";

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function MiniCard({ post }) {
  const cat = post.categories?.nodes?.find(
    (c) => c.slug !== "uncategorized" && c.slug !== "sin-categoria"
  ) || post.categories?.nodes?.[0];
  const imgSrc = post.featuredImage?.node?.sourceUrl;

  return (
    <article className={styles.miniCard}>
      {imgSrc && (
        <Link href={post.uri} className={styles.miniThumbWrap}>
          <Image
            src={imgSrc}
            alt={post.featuredImage.node.altText || post.title}
            fill
            sizes="100px"
            className={styles.miniThumb}
          />
        </Link>
      )}
      <div className={styles.miniBody}>
        {cat && (
          <Link href={cat.uri} className={styles.miniBadge}>
            <span className={styles.miniBadgeDot} />
            {cat.name}
          </Link>
        )}
        <h3 className={styles.miniTitle}>
          <Link href={post.uri} className={styles.miniTitleLink}>
            {post.title}
          </Link>
        </h3>
        <div className={styles.miniMeta}>
          {post.author?.node?.name && (
            <span className={styles.miniAuthor}>Por {post.author.node.name}</span>
          )}
          {post.date && (
            <time dateTime={post.date} suppressHydrationWarning>
              {formatDate(post.date)}
            </time>
          )}
        </div>
      </div>
    </article>
  );
}

export default function FeaturedHero({ posts }) {
  if (!posts || posts.length === 0) return null;

  const main = posts[0];
  const sideCards = posts.slice(1, 5);
  const mainCategory = main.categories?.nodes?.find(
    (c) => c.slug !== "uncategorized" && c.slug !== "sin-categoria"
  ) || main.categories?.nodes?.[0];
  const mainImg = main.featuredImage?.node?.sourceUrl;

  return (
    <section className={styles.hero}>
      <div className={styles.featured}>
        <Link href={main.uri} className={styles.featuredLink}>
          {mainImg && (
            <Image
              src={mainImg}
              alt={main.featuredImage.node.altText || main.title}
              fill
              sizes="(max-width: 768px) 100vw, 65vw"
              className={styles.featuredImg}
              priority
            />
          )}
          <div className={styles.featuredOverlay} />
          <div className={styles.featuredContent}>
            {mainCategory && (
              <span className={styles.featuredBadge}>
                <span className={styles.featuredBadgeDot} />
                {mainCategory.name}
              </span>
            )}
            <h1 className={styles.featuredTitle}>{main.title}</h1>
            <div className={styles.featuredMeta}>
              {main.author?.node?.name && (
                <span className={styles.featuredAuthor}>Por {main.author.node.name}</span>
              )}
              {main.date && (
                <time dateTime={main.date} suppressHydrationWarning>
                  {formatDate(main.date)}
                </time>
              )}
            </div>
          </div>
        </Link>
      </div>

      {sideCards.length > 0 && (
        <div className={styles.sideColumn}>
          {sideCards.map((post) => (
            <MiniCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}
