import Link from "next/link";
import Image from "next/image";
import styles from "../styles/explore-categories.module.css";

export default function ExploreCategories({ categories, posts }) {
  if (!categories || categories.length === 0) return null;

  const skipSlugs = ["uncategorized", "sin-categoria"];
  const filtered = categories.filter((c) => !skipSlugs.includes(c.slug));

  const categoryImages = {};
  for (const post of posts || []) {
    const imgSrc = post.featuredImage?.node?.sourceUrl;
    if (!imgSrc) continue;
    const cats = post.categories?.nodes || [];
    for (const cat of cats) {
      if (!categoryImages[cat.slug]) {
        categoryImages[cat.slug] = {
          src: imgSrc,
          alt: post.featuredImage.node.altText || cat.name,
        };
      }
    }
  }

  const items = filtered.map((cat) => ({
    name: cat.name,
    uri: cat.uri,
    slug: cat.slug,
    image: categoryImages[cat.slug] || null,
  }));

  if (items.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Explore Categories</h2>
      </div>
      <div className={styles.grid}>
        {items.map((item) => (
          <Link key={item.slug} href={item.uri} className={styles.card}>
            <div className={styles.cardInner}>
              {item.image && (
                <Image
                  src={item.image.src}
                  alt={item.image.alt}
                  fill
                  sizes="(max-width: 640px) 50vw, 200px"
                  className={styles.cardImg}
                />
              )}
              <div className={styles.cardOverlay} />
              <span className={styles.cardLabel}>{item.name}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
