import Link from "next/link";
import Image from "next/image";
import { normalizeImageUrl } from "../lib/normalizeImageUrl";
import { isOptimizableImageUrl, safeImageUrl } from "../lib/imageHosts";
import styles from "../styles/special-reports-widget.module.css";

const MAX_POSTS = 5;

/**
 * Newest edition = the subcategory that holds the most recently published
 * article. Names are month-based ("August: Hospitals"), so neither alphabetical
 * order nor term creation order can be trusted; the edition is never hardcoded
 * so a new one published in WordPress simply wins on the next revalidation.
 */
export function pickLatestEdition(editions = []) {
  let best = null;
  let bestTime = -Infinity;

  for (const edition of editions) {
    const posts = (edition?.posts?.nodes || []).filter(Boolean);
    if (posts.length === 0) continue;

    const latest = posts.reduce((max, post) => {
      const time = post?.date ? new Date(post.date).getTime() : NaN;
      return Number.isFinite(time) && time > max ? time : max;
    }, -Infinity);

    if (latest > bestTime) {
      bestTime = latest;
      best = edition;
    }
  }

  return best;
}

function Thumb({ post }) {
  const rawSrc = normalizeImageUrl(post?.featuredImage?.node?.sourceUrl);
  const src = safeImageUrl(rawSrc);
  const alt = post?.featuredImage?.node?.altText || post?.title || "";

  if (!src) {
    // An article without a featured image still gets a thumb-sized block so the
    // row keeps its alignment with the rest of the list.
    return <span className={`${styles.thumbWrap} ${styles.thumbEmpty}`} aria-hidden="true" />;
  }

  return (
    <span className={styles.thumbWrap}>
      {isOptimizableImageUrl(src) ? (
        <Image src={src} alt={alt} fill sizes="64px" className={styles.thumb} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className={styles.thumb} loading="lazy" />
      )}
    </span>
  );
}

/**
 * Sidebar widget for the most recent Special Reports edition: the edition name,
 * a link to its archive, and its five latest articles as compact
 * thumbnail + headline rows. Renders nothing when there is no edition or the
 * edition has no articles, so it never leaves a gap in the sidebar.
 */
export default function SpecialReportsWidget({ editions = [] }) {
  const edition = pickLatestEdition(editions);
  const posts = (edition?.posts?.nodes || []).filter((p) => p?.uri).slice(0, MAX_POSTS);

  if (!edition || posts.length === 0) return null;

  return (
    <section className={styles.widget} aria-labelledby="special-reports-widget-title">
      <div className={styles.header}>
        <span className={styles.eyebrow}>Special Reports</span>
        <h3 className={styles.title} id="special-reports-widget-title">
          {edition.name}
        </h3>
        {edition.uri && (
          <Link href={edition.uri} className={styles.viewAll}>
            View full edition
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        )}
      </div>

      <ul className={styles.list}>
        {posts.map((post) => (
          <li key={post.id || post.uri} className={styles.row}>
            <Link href={post.uri} className={styles.rowLink}>
              <Thumb post={post} />
              <span className={styles.headline}>{post.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
