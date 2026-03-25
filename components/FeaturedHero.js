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

export default function FeaturedHero({ posts }) {
  if (!posts || posts.length === 0) return null;

  const main = posts[0];
  const secondary = posts.slice(1, 5);
  const mainCategory = main.categories?.nodes?.[0];

  return (
    <section className={styles.hero}>
      <div className={styles.mainStory}>
        {mainCategory && (
          <Link href={mainCategory.uri} className={styles.badge}>
            {mainCategory.name}
          </Link>
        )}
        <h1 className={styles.mainTitle}>
          <Link href={main.uri} className={styles.mainTitleLink}>
            {main.title}
          </Link>
        </h1>
        {main.excerpt && (
          <div
            className={styles.mainExcerpt}
            dangerouslySetInnerHTML={{ __html: main.excerpt }}
          />
        )}
        <div className={styles.mainMeta}>
          {main.author?.node?.name && (
            <span className={styles.author}>{main.author.node.name}</span>
          )}
          {main.date && <time dateTime={main.date} suppressHydrationWarning>{formatDate(main.date)}</time>}
        </div>
      </div>

      {secondary.length > 0 && (
        <div className={styles.secondaryGrid}>
          {secondary.map((post) => {
            const cat = post.categories?.nodes?.[0];
            const imgSrc = post.featuredImage?.node?.sourceUrl;
            return (
              <article key={post.id} className={styles.secondaryCard}>
                {imgSrc && (
                  <Link href={post.uri} className={styles.secondaryImgWrap}>
                    <Image
                      src={imgSrc}
                      alt={post.featuredImage.node.altText || post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 300px"
                      className={styles.secondaryImg}
                    />
                  </Link>
                )}
                <div className={styles.secondaryBody}>
                  {cat && (
                    <Link href={cat.uri} className={styles.secondaryBadge}>
                      {cat.name}
                    </Link>
                  )}
                  <h3 className={styles.secondaryTitle}>
                    <Link href={post.uri} className={styles.secondaryTitleLink}>
                      {post.title}
                    </Link>
                  </h3>
                  <div className={styles.secondaryMeta}>
                    {post.date && (
                      <time dateTime={post.date} suppressHydrationWarning>{formatDate(post.date)}</time>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
