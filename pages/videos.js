import { useState, useEffect } from "react";
import { useQuery } from "@apollo/client";
import Link from "next/link";
import Image from "next/image";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SeoHead from "../components/SeoHead";
import VideoModal from "../components/VideoModal";
import { videoPath } from "../lib/videoUrl";
import { formatDuration, formatDate, getThumb } from "../lib/videoDisplay";
import { ASTRO_PLAYLISTS, fetchPlaylist } from "../lib/astroPlaylist";
import { archivePageHref } from "../lib/videoArchiveConfig";
import PlayIcon from "../components/videos/PlayIcon";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import styles from "../styles/videos-page.module.css";

function categorizeVideos(videos) {
  const regular = [];
  const finishline = [];
  const shorts = [];

  for (const v of videos) {
    const tag = (v.tags || "").toLowerCase().trim();
    if (tag.includes("shorts") || tag.includes("short")) {
      shorts.push(v);
    } else if (tag.includes("thefinishline") || tag.includes("finishline")) {
      finishline.push(v);
    } else {
      regular.push(v);
    }
  }

  return { regular, finishline, shorts };
}

function FeaturedSection({ videos }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  if (videos.length === 0) return null;

  const [hero, ...rest] = videos;
  const heroThumb = getThumb(hero, 720);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <Image
            src={isDark ? "/cb-videos-logo-dark.webp" : "/cb-videos-logo.webp"}
            alt="CB Videos"
            width={240}
            height={56}
            className={styles.sectionTitleLogo}
            priority
          />
        </h2>
        <Link href={archivePageHref("archive", 1)} className={styles.viewAll}>
          View all videos &rarr;
        </Link>
      </div>
      <div className={styles.featuredGrid}>
        <Link href={videoPath(hero)} className={styles.featuredMain}>
          <div className={styles.featuredThumbWrap}>
            {heroThumb && (
              <img src={heroThumb} alt={hero.title} className={styles.featuredThumb} referrerPolicy="no-referrer" />
            )}
            <div className={styles.featuredOverlay} />
            <div className={styles.playOverlay}>
              <PlayIcon className={styles.playIcon} />
            </div>
          </div>
          <div className={styles.featuredContent}>
            <span className={styles.badge}>Video</span>
            <h3 className={styles.featuredTitle}>{hero.title}</h3>
            <div className={styles.featuredMeta}>
              {hero.pubDate && <time dateTime={hero.pubDate}>{formatDate(hero.pubDate)}</time>}
              {hero.duration > 0 && (
                <>
                  <span className={styles.metaSep}>&middot;</span>
                  <span>{formatDuration(hero.duration)}</span>
                </>
              )}
            </div>
          </div>
        </Link>

        {rest.length > 0 && (
          <div className={styles.featuredSide}>
            {rest.slice(0, 4).map((v) => {
              const thumb = getThumb(v, 320);
              return (
                <Link key={v.mediaid} href={videoPath(v)} className={styles.sideCard}>
                  <div className={styles.sideThumbWrap}>
                    {thumb && (
                      <img src={thumb} alt={v.title} className={styles.sideThumb} loading="lazy" referrerPolicy="no-referrer" />
                    )}
                    <div className={styles.sidePlayOverlay}>
                      <PlayIcon className={styles.sidePlayIcon} />
                    </div>
                    {v.duration > 0 && (
                      <span className={styles.durationBadge}>{formatDuration(v.duration)}</span>
                    )}
                  </div>
                  <div className={styles.sideBody}>
                    <h4 className={styles.sideTitle}>{v.title}</h4>
                    <div className={styles.sideMeta}>
                      {v.pubDate && <time dateTime={v.pubDate}>{formatDate(v.pubDate)}</time>}
                      {v.duration > 0 && (
                        <>
                          <span className={styles.sideMetaSep}>&middot;</span>
                          <span>{formatDuration(v.duration)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

    </section>
  );
}

function MoreVideosSection({ videos }) {
  if (videos.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>More Videos</h2>
        <Link href={archivePageHref("archive", 1)} className={styles.viewAll}>
          View all videos &rarr;
        </Link>
      </div>
      <div className={styles.videoGrid}>
        {videos.map((v) => {
          const thumb = getThumb(v, 480);
          return (
            <Link key={v.mediaid} href={videoPath(v)} className={styles.gridCard}>
              <div className={styles.gridThumbWrap}>
                {thumb && (
                  <img src={thumb} alt={v.title} className={styles.gridThumb} loading="lazy" referrerPolicy="no-referrer" />
                )}
                <div className={styles.gridPlayOverlay}>
                  <PlayIcon className={styles.gridPlayIcon} />
                </div>
                {v.duration > 0 && (
                  <span className={styles.durationBadge}>{formatDuration(v.duration)}</span>
                )}
              </div>
              <div className={styles.gridBody}>
                <h3 className={styles.gridTitle}>{v.title}</h3>
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
    </section>
  );
}

function FinishlineSection({ videos }) {
  if (videos.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>The Finishline</h2>
      </div>
      <div className={styles.podcastGrid}>
        {videos.map((v) => {
          const thumb = getThumb(v, 480);
          return (
            <Link key={v.mediaid} href={videoPath(v)} className={styles.podcastCard}>
              <div className={styles.podcastThumbWrap}>
                {thumb && (
                  <img src={thumb} alt={v.title} className={styles.podcastThumb} loading="lazy" referrerPolicy="no-referrer" />
                )}
                <div className={styles.podcastPlayOverlay}>
                  <PlayIcon className={styles.podcastPlayIcon} />
                </div>
                {v.duration > 0 && (
                  <span className={styles.durationBadge}>{formatDuration(v.duration)}</span>
                )}
              </div>
              <div className={styles.podcastBody}>
                <h3 className={styles.podcastTitle}>{v.title}</h3>
                {v.description && <p className={styles.podcastDesc}>{v.description}</p>}
                <div className={styles.podcastMeta}>
                  {v.pubDate && <time dateTime={v.pubDate}>{formatDate(v.pubDate)}</time>}
                  {v.duration > 0 && (
                    <>
                      <span className={styles.sideMetaSep}>&middot;</span>
                      <span>{formatDuration(v.duration)}</span>
                    </>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ShortsSection({ videos }) {
  const [activeIndex, setActiveIndex] = useState(null);

  if (videos.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Short Videos</h2>
        <Link href={archivePageHref("shorts", 1)} className={styles.viewAll}>
          View all shorts &rarr;
        </Link>
      </div>
      <div className={styles.shortsRow}>
        {videos.map((v, i) => {
          const thumb = getThumb(v, 480);
          return (
            <button
              key={v.mediaid}
              type="button"
              className={styles.shortCard}
              onClick={() => setActiveIndex(i)}
              aria-label={`Reproducir ${v.title}`}
            >
              <div className={styles.shortThumbWrap}>
                {thumb && (
                  <img src={thumb} alt={v.title} className={styles.shortThumb} loading="lazy" referrerPolicy="no-referrer" />
                )}
                <div className={styles.shortPlayOverlay}>
                  <PlayIcon className={styles.gridPlayIcon} />
                </div>
                {v.duration > 0 && (
                  <span className={styles.durationBadge}>{formatDuration(v.duration)}</span>
                )}
              </div>
              <div className={styles.shortBody}>
                <h3 className={styles.shortTitle}>{v.title}</h3>
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
    </section>
  );
}

export default function VideosPage({ videos = [], shortsVideos = [] }) {
  const siteDataQuery = useQuery(SITE_DATA_QUERY) || {};
  const headerMenuQuery = useQuery(HEADER_MENU_QUERY) || {};

  const siteData = siteDataQuery?.data?.generalSettings || {};
  const menuItems = headerMenuQuery?.data?.primaryMenuItems?.nodes || [];
  const categories = headerMenuQuery?.data?.categories?.nodes || [];

  const { regular, finishline } = categorizeVideos(videos);
  const heroVideos = regular.slice(0, 5);
  const moreVideos = regular.slice(5);

  return (
    <>
      <SeoHead
        title="Videos"
        description="Watch the latest business videos, The Finishline podcast, and short clips from Caribbean Business."
        url="/videos"
      />

      <Header
        siteTitle={siteData.title}
        menuItems={menuItems}
        categories={categories}
      />

      <main className={`container ${styles.page}`}>
        {videos.length === 0 && shortsVideos.length === 0 ? (
          <div className={styles.emptyState}>No videos available at this time.</div>
        ) : (
          <>
            <FeaturedSection videos={heroVideos} />
            <FinishlineSection videos={finishline} />
            <ShortsSection videos={shortsVideos} />
            <MoreVideosSection videos={moreVideos} />
          </>
        )}
      </main>

      <Footer />
    </>
  );
}

VideosPage.queries = [
  { query: SITE_DATA_QUERY },
  { query: HEADER_MENU_QUERY },
];

export async function getStaticProps(context) {
  const { getNextStaticProps } = await import("@faustwp/core");

  let videos = [];
  let shortsVideos = [];

  const [cbtvResult, shortsResult] = await Promise.allSettled([
    fetchPlaylist(ASTRO_PLAYLISTS.cbtv),
    fetchPlaylist(ASTRO_PLAYLISTS.shorts),
  ]);

  if (cbtvResult.status === "fulfilled") videos = cbtvResult.value;
  else console.error("CB TV playlist fetch error:", cbtvResult.reason?.message);

  if (shortsResult.status === "fulfilled") shortsVideos = shortsResult.value;
  else console.error("Shorts playlist fetch error:", shortsResult.reason?.message);

  const faustProps = await getNextStaticProps(context, {
    Page: VideosPage,
    revalidate: 60,
  });

  return {
    ...faustProps,
    props: {
      ...(faustProps.props || {}),
      videos,
      shortsVideos,
    },
    revalidate: 60,
  };
}
