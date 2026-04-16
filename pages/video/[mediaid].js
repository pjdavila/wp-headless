import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { gql, useQuery } from "@apollo/client";
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import SeoHead from "../../components/SeoHead";
import SidebarStoryCard from "../../components/SidebarStoryCard";
import { SITE_DATA_QUERY } from "../../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../../queries/MenuQueries";
import { POST_LIST_FRAGMENT } from "../../fragments/PostListFragment";
import styles from "../../styles/video-detail.module.css";

const RECENT_POSTS_QUERY = gql`
  ${POST_LIST_FRAGMENT}
  query GetRecentPosts {
    posts(first: 6, where: { orderby: { field: DATE, order: DESC } }) {
      nodes {
        ...PostListFragment
      }
    }
  }
`;

function formatDuration(seconds) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("es-PR", {
    year: "numeric",
    month: "long",
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

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export default function VideoDetailPage() {
  const router = useRouter();
  const { mediaid } = router.query;

  const [video, setVideo] = useState(null);
  const [otherVideos, setOtherVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const siteDataQuery = useQuery(SITE_DATA_QUERY) || {};
  const headerMenuQuery = useQuery(HEADER_MENU_QUERY) || {};
  const recentQuery = useQuery(RECENT_POSTS_QUERY) || {};

  const siteData = siteDataQuery?.data?.generalSettings || {};
  const menuItems = headerMenuQuery?.data?.primaryMenuItems?.nodes || [];
  const categories = headerMenuQuery?.data?.categories?.nodes || [];
  const { title: siteTitle } = siteData;
  const recentPosts = (recentQuery?.data?.posts?.nodes || []).slice(0, 6);

  useEffect(() => {
    if (!mediaid) return;
    let cancelled = false;
    setLoading(true);
    setError(false);

    Promise.all([
      fetch("/api/astro-playlist").then((r) => r.json()).catch(() => ({ videos: [] })),
      fetch("/api/cbtv-playlist").then((r) => r.json()).catch(() => ({ videos: [] })),
      fetch("/api/shorts-playlist").then((r) => r.json()).catch(() => ({ videos: [] })),
      fetch("/api/featured-video-playlist").then((r) => r.json()).catch(() => ({ videos: [] })),
    ])
      .then(([metro, cbtv, shorts, featured]) => {
        if (cancelled) return;
        const allVideos = [...(metro.videos || []), ...(cbtv.videos || []), ...(shorts.videos || []), ...(featured.videos || [])];
        const seen = new Set();
        const unique = allVideos.filter((v) => {
          if (seen.has(v.mediaid)) return false;
          seen.add(v.mediaid);
          return true;
        });
        const found = unique.find((v) => v.mediaid === mediaid);
        if (found) {
          setVideo(found);
          setOtherVideos(unique.filter((v) => v.mediaid !== mediaid).slice(0, 3));
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [mediaid]);

  if (loading || !mediaid) {
    return (
      <>
        <SeoHead title="Video" description="Loading video..." />
        <Header siteTitle={siteTitle} menuItems={menuItems} categories={categories} />
        <main className="container">
          <div className={styles.loading}>Loading...</div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !video) {
    return (
      <>
        <SeoHead title="Video Not Found" description="The requested video was not found." />
        <Header siteTitle={siteTitle} menuItems={menuItems} categories={categories} />
        <main className="container">
          <div className={styles.error}>
            <h1 className={styles.errorTitle}>Video Not Found</h1>
            <p className={styles.errorText}>The requested video could not be found.</p>
            <Link href="/" className={styles.backLink}>
              &larr; Back to Home
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const thumbSrc = video.images?.find((img) => img.width >= 720)?.src || video.image;

  return (
    <>
      <SeoHead
        title={video.title}
        description={video.title}
        ogImage={thumbSrc}
        ogType="video.other"
        url={`/video/${mediaid}`}
        imageAlt={video.title}
      />

      <Header siteTitle={siteTitle} menuItems={menuItems} categories={categories} />

      <main className="container">
        <div className={styles.layout}>
          <div className={styles.main}>
            <div className={styles.playerWrap}>
              <iframe
                className={styles.playerIframe}
                src={`https://astrovms.com/embed/${mediaid}`}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={video.title}
              />
            </div>

            <div className={styles.metaBar}>
              <span className={styles.badge}>Video</span>
              <span className={styles.metaDot}>&middot;</span>
              <span className={styles.metaItem}>Caribbean Business</span>
              {video.pubDate && (
                <>
                  <span className={styles.metaDot}>&middot;</span>
                  <time className={styles.metaItem} dateTime={video.pubDate}>
                    {formatDate(video.pubDate)}
                  </time>
                </>
              )}
              {video.duration > 0 && (
                <>
                  <span className={styles.metaDot}>&middot;</span>
                  <span className={`${styles.metaItem} ${styles.durationItem}`}>
                    <ClockIcon />
                    {formatDuration(video.duration)}
                  </span>
                </>
              )}
            </div>

            <h1 className={styles.videoTitle}>{video.title}</h1>

            {video.description && (
              <p className={styles.description}>{video.description}</p>
            )}

            {otherVideos.length > 0 && (
              <section className={styles.relatedSection}>
                <h2 className={styles.relatedTitle}>More Videos</h2>
                <div className={styles.relatedGrid}>
                  {otherVideos.map((v) => {
                    const vThumb = v.images?.find((img) => img.width >= 480)?.src || v.image;
                    return (
                      <Link
                        key={v.mediaid}
                        href={`/video/${v.mediaid}`}
                        className={styles.relatedCard}
                      >
                        <div className={styles.relatedThumbWrap}>
                          {vThumb && (
                            <img
                              src={vThumb}
                              alt={v.title}
                              className={styles.relatedThumb}
                              loading="lazy"
                            />
                          )}
                          <div className={styles.relatedPlayOverlay}>
                            <PlayIcon className={styles.relatedPlayIcon} />
                          </div>
                          {v.duration > 0 && (
                            <span className={styles.relatedDuration}>
                              {formatDuration(v.duration)}
                            </span>
                          )}
                        </div>
                        <h3 className={styles.relatedCardTitle}>{v.title}</h3>
                        <span className={styles.relatedCardMeta}>Caribbean Business</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          <aside className={styles.sidebar}>
            {recentPosts.length > 0 && (
              <div className={styles.sidebarSection}>
                <h3 className={styles.sidebarTitle}>Most Recent</h3>
                {recentPosts.map((p, i) => (
                  <SidebarStoryCard key={p.id} post={p} index={i} />
                ))}
              </div>
            )}
          </aside>
        </div>
      </main>

      <Footer />
    </>
  );
}
