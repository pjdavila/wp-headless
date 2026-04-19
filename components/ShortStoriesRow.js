import { useEffect, useState } from "react";
import VideoModal from "./VideoModal";
import styles from "../styles/shortStoriesRow.module.css";

const TWENTY_FOUR_H_MS = 24 * 60 * 60 * 1000;

function pickThumb(video) {
  const sized = (video.images || []).find((i) => i.width >= 320);
  return sized?.src || video.image || "";
}

export default function ShortStoriesRow() {
  const [videos, setVideos] = useState([]);
  const [activeIndex, setActiveIndex] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/shorts-playlist")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const cutoff = Date.now() - TWENTY_FOUR_H_MS;
        const recent = (data.videos || [])
          .filter((v) => v.pubDate && new Date(v.pubDate).getTime() >= cutoff)
          .slice(0, 5);
        setVideos(recent);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!videos.length) return null;

  return (
    <>
      <section className={styles.section} aria-label="Latest short videos">
        <h2 className={styles.heading}>Shorts</h2>
        <ul className={styles.row}>
          {videos.map((v, i) => (
            <li key={v.mediaid} className={styles.item}>
              <button
                type="button"
                className={styles.btn}
                onClick={() => setActiveIndex(i)}
                aria-label={`Play short: ${v.title}`}
              >
                <span className={styles.ring}>
                  <span className={styles.thumbWrap}>
                    {pickThumb(v) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pickThumb(v)}
                        alt=""
                        className={styles.thumb}
                        loading="lazy"
                      />
                    ) : null}
                  </span>
                </span>
                <span className={styles.title}>{v.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {activeIndex !== null && (
        <VideoModal
          videos={videos}
          startIndex={activeIndex}
          variant="shorts"
          onClose={() => setActiveIndex(null)}
        />
      )}
    </>
  );
}
