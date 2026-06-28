import { Helmet } from 'react-helmet-async';

// Falls back to the 512x512 PWA icon since no dedicated OG art exists yet.
// When a richer 1200x630 share image is added under /public, swap it in.
const defaultImage = '/icon-512.png';
const siteName = 'מדברים BDSM | Talking BDSM';

/**
 * Get base URL for canonical and OG: from env or current origin.
 */
function getBaseUrl() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SITE_URL) {
    return import.meta.env.VITE_SITE_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

/**
 * SEO component: title, description, canonical, Open Graph, Twitter Card.
 * Use noindex for admin/login pages.
 */
function SEO({
  title,
  description,
  canonicalPath,
  image = defaultImage,
  noindex = false,
  // og:type defaults to 'website'; pages like blog posts should pass 'article'.
  ogType = 'website',
  // article-specific OG metadata (only emitted when ogType === 'article').
  articlePublishedTime,
  articleModifiedTime,
  articleAuthor,
  structuredData,
}) {
  const baseUrl = getBaseUrl();
  const canonicalUrl = baseUrl && canonicalPath != null
    ? `${baseUrl}${canonicalPath.startsWith('/') ? '' : '/'}${canonicalPath}`
    : null;
  const imageUrl = image.startsWith('http') ? image : (baseUrl ? `${baseUrl}${image.startsWith('/') ? '' : '/'}${image}` : null);
  // Support a single object or an array of JSON-LD documents on the page.
  const structuredDataArray = Array.isArray(structuredData)
    ? structuredData.filter(Boolean)
    : (structuredData ? [structuredData] : []);

  return (
    <Helmet>
      {title != null && <title>{title}</title>}
      {description != null && <meta name="description" content={description} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      {title != null && <meta property="og:title" content={title} />}
      {description != null && <meta property="og:description" content={description} />}
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="he_IL" />
      {imageUrl && <meta property="og:image" content={imageUrl} />}
      {ogType === 'article' && articlePublishedTime && (
        <meta property="article:published_time" content={articlePublishedTime} />
      )}
      {ogType === 'article' && articleModifiedTime && (
        <meta property="article:modified_time" content={articleModifiedTime} />
      )}
      {ogType === 'article' && articleAuthor && (
        <meta property="article:author" content={articleAuthor} />
      )}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      {title != null && <meta name="twitter:title" content={title} />}
      {description != null && <meta name="twitter:description" content={description} />}
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}

      {/* Structured data (JSON-LD): one <script> per document. */}
      {structuredDataArray.map((doc, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(doc)}
        </script>
      ))}
    </Helmet>
  );
}

export default SEO;
