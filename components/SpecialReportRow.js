import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import StoryCard from "./StoryCard";
import styles from "../styles/special-report-row.module.css";

function ChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

/**
 * One Special Reports edition: a header with the subcategory name plus a link to
 * its full archive, and a horizontally scrollable row of story cards.
 *
 * Deliberately separate from SectionBlock (used on the front page) so the
 * homepage layout is not put at risk by the arrow controls added here. The
 * scroll behaviour is the same CSS scroll-snap track the homepage rows use;
 * the desktop arrows just drive it programmatically.
 */
export default function SpecialReportRow({ title, categoryUri, posts = [] }) {
  const trackRef = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 1);
    // A track that is not overflowing reports maxScroll <= 0, which correctly
    // leaves both arrows disabled.
    setAtEnd(el.scrollLeft >= maxScroll - 1);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);

    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows, posts.length]);

  const scrollByStep = useCallback((direction) => {
    const el = trackRef.current;
    if (!el) return;
    const firstCard = el.firstElementChild;
    const gap = parseFloat(window.getComputedStyle(el).columnGap) || 0;
    const step = firstCard
      ? firstCard.getBoundingClientRect().width + gap
      : el.clientWidth;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  }, []);

  if (!posts || posts.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.actions}>
          {categoryUri && (
            <Link href={categoryUri} className={styles.viewAll}>
              View all articles →
            </Link>
          )}
          <div className={styles.arrows}>
            <button
              type="button"
              className={styles.arrow}
              onClick={() => scrollByStep(-1)}
              disabled={atStart}
              aria-label={`Scroll ${title} backward`}
            >
              <ChevronLeft />
            </button>
            <button
              type="button"
              className={styles.arrow}
              onClick={() => scrollByStep(1)}
              disabled={atEnd}
              aria-label={`Scroll ${title} forward`}
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      </div>

      <div className={styles.track} ref={trackRef}>
        {posts.map((post) => (
          <StoryCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
