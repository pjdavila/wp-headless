import { useQuery } from "@apollo/client";
import Link from "next/link";
import Image from "next/image";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SeoHead from "../components/SeoHead";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import styles from "../styles/videos-page.module.css";

function formatDuration(seconds) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function PlayIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function getThumb(video, minWidth) {
  return video.images?.find((img) => img.width >= minWidth)?.src || video.image;
}

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
  if (videos.length === 0) return null;

  const [hero, ...rest] = videos;
  const heroThumb = getThumb(hero, 720);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <Image
            src="/cb-videos-logo.webp"
            alt="CB Videos"
            width={240}
            height={56}
            className={styles.sectionTitleLogo}
            priority
          />
        </h2>
      </div>
      <div className={styles.featuredGrid}>
        <Link href={`/video/${hero.mediaid}`} className={styles.featuredMain}>
          <div className={styles.featuredThumbWrap}>
            {heroThumb && (
              <img src={heroThumb} alt={hero.title} className={styles.featuredThumb} />
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
                <Link key={v.mediaid} href={`/video/${v.mediaid}`} className={styles.sideCard}>
                  <div className={styles.sideThumbWrap}>
                    {thumb && (
                      <img src={thumb} alt={v.title} className={styles.sideThumb} loading="lazy" />
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
      </div>
      <div className={styles.videoGrid}>
        {videos.map((v) => {
          const thumb = getThumb(v, 480);
          return (
            <Link key={v.mediaid} href={`/video/${v.mediaid}`} className={styles.gridCard}>
              <div className={styles.gridThumbWrap}>
                {thumb && (
                  <img src={thumb} alt={v.title} className={styles.gridThumb} loading="lazy" />
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
            <Link key={v.mediaid} href={`/video/${v.mediaid}`} className={styles.podcastCard}>
              <div className={styles.podcastThumbWrap}>
                {thumb && (
                  <img src={thumb} alt={v.title} className={styles.podcastThumb} loading="lazy" />
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
  if (videos.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Short Videos</h2>
      </div>
      <div className={styles.shortsRow}>
        {videos.map((v) => {
          const thumb = getThumb(v, 480);
          return (
            <Link key={v.mediaid} href={`/video/${v.mediaid}`} className={styles.shortCard}>
              <div className={styles.shortThumbWrap}>
                {thumb && (
                  <img src={thumb} alt={v.title} className={styles.shortThumb} loading="lazy" />
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
            </Link>
          );
        })}
      </div>
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

const CBTV_PLAYLIST_URL =
  "https://astrovms.com/api/v2/playlists/4f09e496-05a8-4600-acad-8ff9b7334189";
const SHORTS_PLAYLIST_URL =
  "https://astrovms.com/api/v2/playlists/114eca46-0831-4b00-9c14-74a99e16951d";

function normalizePlaylist(data) {
  return (data.playlist || []).map((item) => ({
    mediaid: item.mediaid,
    title: item.title,
    image: item.image,
    images: item.images || [],
    duration: item.duration || 0,
    link: item.link,
    tags: item.tags || "",
    pubDate: item.pubdate ? new Date(item.pubdate * 1000).toISOString() : null,
    description: item.description || "",
  }));
}

export async function getStaticProps(context) {
  const { getNextStaticProps } = await import("@faustwp/core");

  let videos = [];
  let shortsVideos = [];

  const fetchPlaylist = async (url) => {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return normalizePlaylist(await res.json());
  };

  const [cbtvResult, shortsResult] = await Promise.allSettled([
    fetchPlaylist(CBTV_PLAYLIST_URL),
    fetchPlaylist(SHORTS_PLAYLIST_URL),
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
