import { useState } from "react";
import { useQuery } from "@apollo/client";
import Link from "next/link";
import Header from "../Header";
import Footer from "../Footer";
import SeoHead from "../SeoHead";
import VideoModal from "../VideoModal";
import PlayIcon from "./PlayIcon";
import { videoPath } from "../../lib/videoUrl";
import { formatDuration, formatDate, getThumb } from "../../lib/videoDisplay";
import { VIDEO_ARCHIVES, archivePageHref } from "../../lib/videoArchiveConfig";
import { SITE_DATA_QUERY } from "../../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../../queries/MenuQueries";
import styles from "../../styles/videos-page.module.css";

/** Page numbers to show: first, last, and a window around the current one. */
function pageItems(page, totalPages) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages]
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);
  const items = [];
  sorted.forEach((n, index) => {
    if (index > 0 && n - sorted[index - 1] > 1) items.push("gap-" + n);
    items.push(n);
  });
  return items;
}

function Pagination({ kind, page, totalPages }) {
  if (totalPages <= 1) return null;
  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <ul className={styles.paginationList}>
        <li>
          {page > 1 ? (
            <Link href={archivePageHref(kind, page - 1)} className={styles.pageLink} rel="prev">
              &larr; Previous
            </Link>
          ) : (
            <span className={styles.pageDisabled} aria-hidden="true">
              &larr; Previous
            </span>
          )}
        </li>
        {pageItems(page, totalPages).map((item) =>
          typeof item === "string" ? (
            <li key={item} className={styles.pageGap} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={item}>
              {item === page ? (
                <span className={styles.pageCurrent} aria-current="page">
                  {item}
                </span>
              ) : (
                <Link
                  href={archivePageHref(kind, item)}
                  className={styles.pageLink}
                  aria-label={`Page ${item}`}
                >
                  {item}
                </Link>
              )}
            </li>
          ),
        )}
        <li>
          {page < totalPages ? (
            <Link href={archivePageHref(kind, page + 1)} className={styles.pageLink} rel="next">
              Next &rarr;
            </Link>
          ) : (
            <span className={styles.pageDisabled} aria-hidden="true">
              Next &rarr;
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}

function RegularGrid({ videos }) {
  return (
    <div className={styles.videoGrid}>
      {videos.map((v) => {
        const thumb = getThumb(v, 480);
        return (
          <Link key={v.mediaid} href={videoPath(v)} className={styles.gridCard}>
            <div className={styles.gridThumbWrap}>
              {thumb && <img src={thumb} alt={v.title} className={styles.gridThumb} loading="lazy" referrerPolicy="no-referrer" />}
              <div className={styles.gridPlayOverlay}>
                <PlayIcon className={styles.gridPlayIcon} />
              </div>
              {v.duration > 0 && (
                <span className={styles.durationBadge}>{formatDuration(v.duration)}</span>
              )}
            </div>
            <div className={styles.gridBody}>
              <h2 className={styles.gridTitle}>{v.title}</h2>
              <div className={styles.gridMeta}>
                {v.pubDate && <time dateTime={v.pubDate}>{formatDate(v.pubDate)}</time>}
                {v.duration > 0 && (
                  <>
                    <span className={styles.gridMetaSep}>&middot;</span>
                    <span>{formatDuration(v.duration)}</span>
                  </>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function ShortsGrid({ videos }) {
  const [activeIndex, setActiveIndex] = useState(null);
  return (
    <>
      <div className={styles.shortsArchiveGrid}>
        {videos.map((v, i) => {
          const thumb = getThumb(v, 480);
          return (
            <button
              key={v.mediaid}
              type="button"
              className={styles.shortCard}
              onClick={() => setActiveIndex(i)}
              aria-label={`Play ${v.title}`}
            >
              <div className={styles.shortThumbWrap}>
                {thumb && <img src={thumb} alt="" className={styles.shortThumb} loading="lazy" referrerPolicy="no-referrer" />}
                <div className={styles.shortPlayOverlay}>
                  <PlayIcon className={styles.gridPlayIcon} />
                </div>
                {v.duration > 0 && (
                  <span className={styles.durationBadge}>{formatDuration(v.duration)}</span>
                )}
              </div>
              <div className={styles.shortBody}>
                <h2 className={styles.shortTitle}>{v.title}</h2>
                {v.pubDate && (
                  <time className={styles.shortDate} dateTime={v.pubDate}>
                    {formatDate(v.pubDate)}
                  </time>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {activeIndex !== null && (
        <VideoModal
          variant="shorts"
          videos={videos}
          startIndex={activeIndex}
          onClose={() => setActiveIndex(null)}
        />
      )}
    </>
  );
}

/**
 * Paginated archive of every regular video (/videos/archive/) or every
 * short (/videos/shorts/). Data comes from getVideoArchiveStaticProps.
 */
export default function VideoArchivePage({ kind, videos = [], page = 1, totalPages = 1, total = 0 }) {
  const siteDataQuery = useQuery(SITE_DATA_QUERY) || {};
  const headerMenuQuery = useQuery(HEADER_MENU_QUERY) || {};
  const siteData = siteDataQuery?.data?.generalSettings || {};
  const menuItems = headerMenuQuery?.data?.primaryMenuItems?.nodes || [];
  const categories = headerMenuQuery?.data?.categories?.nodes || [];

  const config = VIDEO_ARCHIVES[kind];
  const unit = kind === "shorts" ? "shorts" : "videos";
  const pageSuffix = page > 1 ? ` – Page ${page}` : "";

  return (
    <>
      <SeoHead
        title={`${config.title}${pageSuffix}`}
        description={config.description}
        url={archivePageHref(kind, page)}
      />

      <Header siteTitle={siteData.title} menuItems={menuItems} categories={categories} />

      <main className={`container ${styles.page}`}>
        <div className={styles.archiveHead}>
          <Link href="/videos/" className={styles.backLink}>
            &larr; Videos
          </Link>
          <h1 className={styles.pageTitle}>{config.title}</h1>
          {total > 0 && (
            <p className={styles.archiveMeta}>
              {total} {unit}
              {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ""}
            </p>
          )}
        </div>

        {videos.length === 0 ? (
          <div className={styles.emptyState}>No videos available at this time.</div>
        ) : kind === "shorts" ? (
          <ShortsGrid key={page} videos={videos} />
        ) : (
          <RegularGrid videos={videos} />
        )}

        <Pagination kind={kind} page={page} totalPages={totalPages} />
      </main>

      <Footer />
    </>
  );
}

VideoArchivePage.queries = [{ query: SITE_DATA_QUERY }, { query: HEADER_MENU_QUERY }];
