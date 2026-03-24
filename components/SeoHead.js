import Head from "next/head";

const SITE_NAME = "Business Journal Caribe";
const DEFAULT_DESCRIPTION =
  "Noticias de negocios, tecnología, marketing y finanzas del Caribe. Tu fuente premium de información empresarial.";

export default function SeoHead({
  title,
  description,
  ogImage,
  ogType = "website",
  url,
  articlePublished,
  articleAuthor,
  noIndex = false,
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const metaDescription = stripHtml(description) || DEFAULT_DESCRIPTION;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const canonicalUrl = url ? `${siteUrl}${url}` : siteUrl;

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
      <meta property="og:locale" content="es_ES" />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {ogImage && <meta property="og:image:width" content="1200" />}
      {ogImage && <meta property="og:image:height" content="630" />}

      <meta name="twitter:card" content={ogImage ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}

      {ogType === "article" && articlePublished && (
        <meta property="article:published_time" content={articlePublished} />
      )}
      {ogType === "article" && articleAuthor && (
        <meta property="article:author" content={articleAuthor} />
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
