import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import styles from "../styles/photo-gallery.module.css";

export default function PhotoGallery({ images }) {
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const close = useCallback(() => setLightboxIndex(-1), []);

  const prev = useCallback(() => {
    setLightboxIndex((i) => (i > 0 ? i - 1 : images.length - 1));
  }, [images]);

  const next = useCallback(() => {
    setLightboxIndex((i) => (i < images.length - 1 ? i + 1 : 0));
  }, [images]);

  useEffect(() => {
    if (lightboxIndex < 0) return;
    const handler = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, close, prev, next]);

  if (!images || images.length === 0) return null;

  return (
    <>
      <div className={styles.grid}>
        {images.map((img, i) => (
          <button
            key={i}
            className={styles.thumb}
            onClick={() => setLightboxIndex(i)}
            aria-label={`View image ${i + 1}`}
          >
            <Image
              src={img.sourceUrl}
              alt={img.altText || `Image ${i + 1}`}
              fill
              sizes="(max-width: 768px) 50vw, 200px"
              className={styles.thumbImg}
            />
          </button>
        ))}
      </div>

      {lightboxIndex >= 0 && (
        <div className={styles.lightbox} onClick={close}>
          <div className={styles.lightboxInner} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={close} aria-label="Close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {images.length > 1 && (
              <button className={styles.navBtn} data-dir="prev" onClick={prev} aria-label="Previous">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}

            <div className={styles.lightboxImgWrap}>
              <Image
                src={images[lightboxIndex].sourceUrl}
                alt={images[lightboxIndex].altText || ""}
                fill
                sizes="90vw"
                className={styles.lightboxImg}
              />
            </div>

            {images.length > 1 && (
              <button className={styles.navBtn} data-dir="next" onClick={next} aria-label="Next">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}

            <div className={styles.counter}>
              {lightboxIndex + 1} / {images.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
