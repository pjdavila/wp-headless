import { gql } from "@apollo/client";
import Image from "next/image";
import SeoHead from "../components/SeoHead";
import { ArticleJsonLd, BreadcrumbJsonLd } from "../components/JsonLd";
import Link from "next/link";
import Footer from "../components/Footer";
import Header from "../components/Header";
import ShareMenu from "../components/ShareMenu";
import PhotoGallery from "../components/PhotoGallery";
import StoryCard from "../components/StoryCard";
import SidebarStoryCard from "../components/SidebarStoryCard";
import SidebarHalfPage from "../components/ads/SidebarHalfPage";
import ArticleAudioPlayer from "../components/ArticleAudioPlayer";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import { POST_LIST_FRAGMENT } from "../fragments/PostListFragment";
import { useFaustQuery } from "@faustwp/core";
import { estimateReadingTime } from "../utils/readingTime";
import { useTrackView, useRecommendations } from "../lib/useRecombee";
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
      modified
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
      articulos {
        audioUrl
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
  return new Date(dateStr).toLocaleDateString("en-US", {
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

function ArticleContent({ content }) {
  if (!content) return null;
  const parts = content.split(/<\/p>/i);
  const paragraphs = parts.filter((p) => p.trim().length > 0);

  const splitAt = Math.min(2, paragraphs.length);
  const before = paragraphs.slice(0, splitAt).map((p) => p + "</p>").join("");
  const after = paragraphs.slice(splitAt).map((p) => p + "</p>").join("");

  return (
    <>
      <div className={styles.articleBody} dangerouslySetInnerHTML={{ __html: before }} />
      <div className={styles.articleBody} dangerouslySetInnerHTML={{ __html: after }} />
    </>
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
  const navCategories = headerMenuDataQuery?.categories?.nodes || [];
  const { title: siteTitle } = siteData;

  const post = contentQuery?.post || {};
  const { title, content, date, modified, uri, featuredImage, author, categories } = post;
  const audioUrl = post?.articulos?.audioUrl?.trim();
  const category = categories?.nodes?.find((c) => c.slug !== "uncategorized") || categories?.nodes?.[0];
  const readTime = estimateReadingTime(content);
  const imgSrc = featuredImage?.node?.sourceUrl;

  const fallbackRelated = (category?.posts?.nodes || []).filter(
    (p) => p.id !== post.id && p.title !== title
  ).slice(0, 3);

  const postSlug = uri ? uri.replace(/^\/|\/$/g, "") : "";
  useTrackView(postSlug);
  const { items: recombeeItems } = useRecommendations({
    type: "item-to-item",
    itemId: postSlug,
    count: 3,
    enabled: !!postSlug,
  });

  const recombeeFormatted = recombeeItems.map((r) => ({
    id: r.id,
    title: r.title,
    excerpt: r.excerpt,
    uri: r.uri,
    date: r.date,
    featuredImage: r.imageUrl ? { node: { sourceUrl: r.imageUrl, altText: r.title } } : null,
    categories: r.category ? { nodes: [{ name: r.category, uri: r.categoryUri }] } : { nodes: [] },
  }));

  let relatedPosts;
  if (recombeeFormatted.length >= 3) {
    relatedPosts = recombeeFormatted;
  } else if (recombeeFormatted.length > 0) {
    const recIds = new Set(recombeeFormatted.map((r) => r.uri));
    const fillers = fallbackRelated.filter((p) => !recIds.has(p.uri));
    relatedPosts = [...recombeeFormatted, ...fillers].slice(0, 3);
  } else {
    relatedPosts = fallbackRelated;
  }

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
        articleModified={modified}
        articleAuthor={author?.node?.name}
        articleSection={category?.name}
        imageAlt={featuredImage?.node?.altText || title}
      />
      <ArticleJsonLd
        title={title}
        description={post.excerpt || content}
        url={uri}
        imageUrl={imgSrc}
        datePublished={date}
        dateModified={modified}
        authorName={author?.node?.name}
        categoryName={category?.name}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          ...(category ? [{ name: category.name, url: category.uri }] : []),
          { name: title },
        ]}
      />

      <Header siteTitle={siteTitle} menuItems={menuItems} categories={navCategories} />

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
                {readTime} min read
              </span>
            </div>

            <h1 className={styles.articleTitle}>{title}</h1>

            {audioUrl && <ArticleAudioPlayer src={audioUrl} title={title} />}

            <ArticleContent content={content} />

            {galleryImages.length > 1 && (
              <PhotoGallery images={galleryImages} />
            )}

            <ShareMenu url={pageUrl} title={title} />

            {relatedPosts.length > 0 && (
              <section className={styles.relatedSection}>
                <h2 className={styles.relatedTitle}>Related Articles</h2>
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
              <h3 className={styles.sidebarTitle}>Most Recent</h3>
              {recentPosts.map((p, i) => (
                <SidebarStoryCard key={p.id} post={p} index={i} />
              ))}
            </div>
            <SidebarHalfPage />
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
