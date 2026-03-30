import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "../styles/featured-hero.module.css";

const SLIDE_INTERVAL = 5000;

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
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
            <span className={styles.miniAuthor}>By {post.author.node.name}</span>
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

function Slide({ post, isActive }) {
  const category = post.categories?.nodes?.find(
    (c) => c.slug !== "uncategorized" && c.slug !== "sin-categoria"
  ) || post.categories?.nodes?.[0];
  const imgSrc = post.featuredImage?.node?.sourceUrl;

  return (
    <div className={`${styles.slide} ${isActive ? styles.slideActive : ""}`}>
      <Link href={post.uri} className={styles.featuredLink}>
        {imgSrc && (
          <Image
            src={imgSrc}
            alt={post.featuredImage.node.altText || post.title}
            fill
            sizes="(max-width: 768px) 100vw, 65vw"
            className={styles.featuredImg}
            priority={isActive}
          />
        )}
        <div className={styles.featuredOverlay} />
        <div className={styles.featuredContent}>
          {category && (
            <span className={styles.featuredBadge}>
              <span className={styles.featuredBadgeDot} />
              {category.name}
            </span>
          )}
          <h2 className={styles.featuredTitle}>{post.title}</h2>
          <div className={styles.featuredMeta}>
            {post.author?.node?.name && (
              <span className={styles.featuredAuthor}>By {post.author.node.name}</span>
            )}
            {post.date && (
              <time dateTime={post.date} suppressHydrationWarning>
                {formatDate(post.date)}
              </time>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function FeaturedHero({ posts, sliderPosts }) {
  const hasTaggedPosts = sliderPosts && sliderPosts.length > 0;
  const slides = hasTaggedPosts ? sliderPosts : (posts || []).slice(0, 1);
  const sideCards = hasTaggedPosts
    ? (posts || []).slice(0, 4)
    : (posts || []).slice(1, 5);

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  const slideCount = slides.length;

  useEffect(() => {
    if (current >= slideCount) setCurrent(0);
  }, [slideCount, current]);

  const goTo = useCallback((index) => {
    setCurrent(index);
  }, []);

  useEffect(() => {
    if (paused || slideCount <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slideCount);
    }, SLIDE_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [paused, slideCount]);

  if ((!posts || posts.length === 0) && slides.length === 0) return null;

  return (
    <section className={styles.hero}>
      <div
        className={styles.featured}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {slides.map((post, i) => (
          <Slide key={post.id} post={post} isActive={i === current} />
        ))}

        {slideCount > 1 && (
          <div className={styles.dots}>
            {slides.map((_, i) => (
              <button
                key={i}
                className={`${styles.dot} ${i === current ? styles.dotActive : ""}`}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}

        {slideCount > 1 && (
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                animationDuration: `${SLIDE_INTERVAL}ms`,
                animationPlayState: paused ? "paused" : "running",
              }}
              key={current}
            />
          </div>
        )}
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
