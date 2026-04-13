import { useState, useEffect, useRef, useCallback } from "react";
import StoryCard from "./StoryCard";
import styles from "../styles/recommended-carousel.module.css";

function useVisibleCount() {
  const [count, setCount] = useState(3);

  useEffect(() => {
    function update() {
      if (window.innerWidth <= 640) setCount(1);
      else if (window.innerWidth <= 1024) setCount(2);
      else setCount(3);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return count;
}

export default function RecommendedCarousel({ posts = [] }) {
  const total = posts.length;
  const visibleCount = useVisibleCount();
  const [index, setIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef(null);

  const cloneCount = visibleCount;
  const clonedPosts = total > 0
    ? [...posts.slice(-cloneCount), ...posts, ...posts.slice(0, cloneCount)]
    : [];

  const goTo = useCallback((newIndex) => {
    setIsTransitioning(true);
    setIndex(newIndex);
  }, []);

  const next = useCallback(() => goTo(index + 1), [index, goTo]);
  const prev = useCallback(() => goTo(index - 1), [index, goTo]);

  useEffect(() => {
    if (paused || total === 0) return;
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [paused, next, total]);

  const handleTransitionEnd = useCallback(() => {
    if (index >= total) {
      setIsTransitioning(false);
      setIndex(0);
    } else if (index < 0) {
      setIsTransitioning(false);
      setIndex(total - 1);
    }
  }, [index, total]);

  useEffect(() => {
    if (!isTransitioning && trackRef.current) {
      const frame = requestAnimationFrame(() => {
        setIsTransitioning(true);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [isTransitioning]);

  if (total === 0) return null;

  const slidePercent = 100 / visibleCount;
  const translateX = (index + cloneCount) * slidePercent;

  return (
    <div
      className={styles.carousel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        className={styles.track}
        style={{
          transform: `translateX(-${translateX}%)`,
          transition: isTransitioning ? "transform 0.5s ease" : "none",
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {clonedPosts.map((post, i) => (
          <div
            key={`${post.id}-${i}`}
            className={styles.slide}
            style={{ flex: `0 0 ${slidePercent}%` }}
          >
            <StoryCard post={post} />
          </div>
        ))}
      </div>

      <button
        className={`${styles.arrow} ${styles.arrowLeft}`}
        onClick={prev}
        aria-label="Previous"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        className={`${styles.arrow} ${styles.arrowRight}`}
        onClick={next}
        aria-label="Next"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 6 15 12 9 18" />
        </svg>
      </button>

      <div className={styles.dots}>
        {posts.map((_, i) => (
          <button
            key={i}
            className={`${styles.dot} ${((index % total) + total) % total === i ? styles.dotActive : ""}`}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
