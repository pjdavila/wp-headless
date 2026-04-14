import Link from "next/link";
import Image from "next/image";
import styles from "../styles/featured-category-block.module.css";

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function FeaturedCategoryBlock({ title, categoryUri, posts = [] }) {
  if (posts.length === 0) return null;

  const [hero, ...sideItems] = posts;
  const heroImg = hero.featuredImage?.node?.sourceUrl;
  const heroAlt = hero.featuredImage?.node?.altText || hero.title;
  const heroCategory = hero.categories?.nodes?.[0];

  return (
    <section className={styles.section}>
      {title && (
        <h2 className={styles.sectionTitle}>
          {categoryUri ? <Link href={categoryUri}>{title}</Link> : title}
        </h2>
      )}

      <div className={styles.grid}>
        <Link href={hero.uri} className={styles.heroCard}>
          {heroImg && (
            <Image
              src={heroImg}
              alt={heroAlt}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className={styles.heroImage}
            />
          )}
          <div className={styles.heroOverlay} />
          <div className={styles.heroContent}>
            {heroCategory && (
              <span className={styles.badge}>{heroCategory.name}</span>
            )}
            <h3 className={styles.heroTitle}>{hero.title}</h3>
            {hero.excerpt && (
              <div
                className={styles.heroExcerpt}
                dangerouslySetInnerHTML={{ __html: hero.excerpt }}
              />
            )}
            <div className={styles.heroMeta}>
              {hero.author?.node?.name && (
                <span className={styles.author}>{hero.author.node.name}</span>
              )}
              {hero.date && (
                <time dateTime={hero.date} suppressHydrationWarning>
                  {formatDate(hero.date)}
                </time>
              )}
            </div>
          </div>
        </Link>

        {sideItems.length > 0 && (
          <div className={styles.sideList}>
            {sideItems.map((post) => {
              const img = post.featuredImage?.node?.sourceUrl;
              const alt = post.featuredImage?.node?.altText || post.title;
              const cat = post.categories?.nodes?.[0];

              return (
                <article key={post.id} className={styles.sideCard}>
                  {img && (
                    <Link href={post.uri} className={styles.thumbWrap}>
                      <Image
                        src={img}
                        alt={alt}
                        fill
                        sizes="100px"
                        className={styles.thumb}
                      />
                    </Link>
                  )}
                  <div className={styles.sideBody}>
                    {cat && (
                      <Link href={cat.uri || "#"} className={styles.sideBadge}>
                        {cat.name}
                      </Link>
                    )}
                    <h4 className={styles.sideTitle}>
                      <Link href={post.uri} className={styles.sideTitleLink}>
                        {post.title}
                      </Link>
                    </h4>
                    <div className={styles.sideMeta}>
                      {post.author?.node?.name && (
                        <span>{post.author.node.name}</span>
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
            })}
          </div>
        )}
      </div>
    </section>
  );
}
