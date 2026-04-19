import Head from "next/head";

const SITE_NAME = "Caribbean Business";
const TWITTER_HANDLE = "@cbusinesspr";
const DEFAULT_DESCRIPTION =
  "Business, technology, marketing, and finance news from the Caribbean. Your premium source for business insights.";
const DEFAULT_OG_IMAGE = "https://cms.vnmedia.co/cbusiness/wp-content/uploads/2026/03/bj-caribe-og-default.png";

export default function SeoHead({
  title,
  description,
  ogImage,
  ogType = "website",
  url,
  articlePublished,
  articleModified,
  articleAuthor,
  articleSection,
  imageAlt,
  noIndex = false,
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const metaDescription = stripHtml(description) || DEFAULT_DESCRIPTION;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const canonicalUrl = url ? `${siteUrl}${url}` : siteUrl;
  const imageUrl = ogImage || DEFAULT_OG_IMAGE;
  const imgAlt = imageAlt || title || SITE_NAME;
  const imgPath = imageUrl.split("?")[0];
  const imageType = imgPath.endsWith(".png")
    ? "image/png"
    : imgPath.endsWith(".webp")
      ? "image/webp"
      : imgPath.endsWith(".svg")
        ? "image/svg+xml"
        : "image/jpeg";

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <link rel="canonical" href={canonicalUrl} />

      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={imgAlt} />
      <meta property="og:image:type" content={imageType} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={imgAlt} />

      {ogType === "article" && articlePublished && (
        <meta property="article:published_time" content={articlePublished} />
      )}
      {ogType === "article" && articleModified && (
        <meta property="article:modified_time" content={articleModified} />
      )}
      {ogType === "article" && articleAuthor && (
        <meta property="article:author" content={articleAuthor} />
      )}
      {ogType === "article" && articleSection && (
        <meta property="article:section" content={articleSection} />
      )}

      {ogImage && (
        <link
          rel="preload"
          as="image"
          href={ogImage}
          imageSizes="(max-width: 1024px) 100vw, 800px"
        />
      )}
    </Head>
  );
}

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}
