import { gql } from "@apollo/client";
import Image from "next/image";
import SeoHead from "../components/SeoHead";
import Link from "next/link";
import Footer from "../components/Footer";
import Header from "../components/Header";
import ShareMenu from "../components/ShareMenu";
import PhotoGallery from "../components/PhotoGallery";
import StoryCard from "../components/StoryCard";
import SidebarStoryCard from "../components/SidebarStoryCard";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import { POST_LIST_FRAGMENT } from "../fragments/PostListFragment";
import { useFaustQuery } from "@faustwp/core";
import { estimateReadingTime } from "../utils/readingTime";
import styles from "../styles/single.module.css";

const POST_QUERY = gql`
  ${POST_LIST_FRAGMENT}
  query GetPost($databaseId: ID!, $asPreview: Boolean = false) {
    post(id: $databaseId, idType: DATABASE_ID, asPreview: $asPreview) {
      id
      title
      content
      excerpt
      uri
      date
      featuredImage {
        node {
          sourceUrl
          altText
        }
      }
      author {
        node {
          name
          avatar {
            url
          }
        }
      }
      categories {
        nodes {
          name
          slug
          uri
          posts(first: 4, where: { orderby: { field: DATE, order: DESC } }) {
            nodes {
              ...PostListFragment
            }
          }
        }
      }
    }
  }
`;

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

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function extractImagesFromContent(html) {
  if (!html) return [];
  const regex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi;
  const images = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    images.push({ sourceUrl: match[1], altText: match[2] || "" });
  }
  return images;
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export default function Component(props) {
  if (props.loading) {
    return <>Loading...</>;
  }

  const contentQuery = useFaustQuery(POST_QUERY) || {};
  const siteDataQuery = useFaustQuery(SITE_DATA_QUERY) || {};
  const headerMenuDataQuery = useFaustQuery(HEADER_MENU_QUERY) || {};

  const recentData = useFaustQuery(RECENT_POSTS_QUERY) || {};

  const siteData = siteDataQuery?.generalSettings || {};
  const menuItems = headerMenuDataQuery?.primaryMenuItems?.nodes || [];
  const { title: siteTitle } = siteData;

  const post = contentQuery?.post || {};
  const { title, content, date, uri, featuredImage, author, categories } = post;
  const category = categories?.nodes?.find((c) => c.slug !== "uncategorized") || categories?.nodes?.[0];
  const readTime = estimateReadingTime(content);
  const imgSrc = featuredImage?.node?.sourceUrl;

  const relatedPosts = (category?.posts?.nodes || []).filter(
    (p) => p.id !== post.id && p.title !== title
  ).slice(0, 3);

  const galleryImages = extractImagesFromContent(content);

  const recentPosts = (recentData?.posts?.nodes || []).slice(0, 6);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const pageUrl = uri ? `${siteUrl}${uri}` : siteUrl;

  return (
    <>
      <SeoHead
        title={title}
        description={post.excerpt || content}
        ogImage={imgSrc}
        ogType="article"
        url={uri}
        articlePublished={date}
        articleAuthor={author?.node?.name}
      />

      <Header siteTitle={siteTitle} menuItems={menuItems} />

      <main className="container">
        <div className={styles.layout}>
          <article className={styles.articleMain}>
            {imgSrc && (
              <div className={styles.heroImage}>
                <Image
                  src={imgSrc}
                  alt={featuredImage.node.altText || title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 800px"
                  className={styles.heroImg}
                  priority
                />
              </div>
            )}

            <div className={styles.metaBar}>
              {category && (
                <Link href={category.uri} className={styles.categoryBadge}>
                  {category.name}
                </Link>
              )}
              {author?.node?.name && (
                <>
                  <span className={styles.metaDot}>·</span>
                  <span className={styles.metaItem}>
                    <span className={styles.authorName}>{author.node.name}</span>
                  </span>
                </>
              )}
              {date && (
                <>
                  <span className={styles.metaDot}>·</span>
                  <time className={styles.metaItem} dateTime={date} suppressHydrationWarning>
                    {formatDate(date)}
                  </time>
                </>
              )}
              <span className={styles.metaDot}>·</span>
              <span className={`${styles.metaItem} ${styles.readingTime}`}>
                <ClockIcon />
                {readTime} min de lectura
              </span>
            </div>

            <h1 className={styles.articleTitle}>{title}</h1>

            <div
              className={styles.articleBody}
              dangerouslySetInnerHTML={{ __html: content }}
            />

            {galleryImages.length > 1 && (
              <PhotoGallery images={galleryImages} />
            )}

            <ShareMenu url={pageUrl} title={title} />

            {relatedPosts.length > 0 && (
              <section className={styles.relatedSection}>
                <h2 className={styles.relatedTitle}>Artículos Relacionados</h2>
                <div className={styles.relatedGrid}>
                  {relatedPosts.map((p) => (
                    <StoryCard key={p.id} post={p} />
                  ))}
                </div>
              </section>
            )}
          </article>

          <aside className={styles.sidebar}>
            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarTitle}>Lo Más Reciente</h3>
              {recentPosts.map((p, i) => (
                <SidebarStoryCard key={p.id} post={p} index={i} />
              ))}
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </>
  );
}

Component.queries = [
  {
    query: POST_QUERY,
    variables: ({ databaseId }, ctx) => ({
      databaseId,
      asPreview: ctx?.asPreview,
    }),
  },
  {
    query: SITE_DATA_QUERY,
  },
  {
    query: HEADER_MENU_QUERY,
  },
  {
    query: RECENT_POSTS_QUERY,
  },
];
