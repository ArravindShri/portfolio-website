import { Helmet } from 'react-helmet-async';

/**
 * Per-page meta tag manager. Drop a <SEO /> as the first child of any
 * page component to set the title, description, canonical, OG, and
 * Twitter card tags. Crawlers that execute JS see the rewritten head;
 * crawlers that don't fall back to the defaults baked into index.html.
 */
export default function SEO({ title, description, path, type = 'website', image }) {
  const siteUrl = 'https://arravindportfolio.tech';
  const fullUrl = `${siteUrl}${path || ''}`;
  const defaultImage = `${siteUrl}/og-default.png`;
  const siteName = 'Shri Arravindhar — Data & BI Portfolio';

  const fullTitle = title ? `${title} | Shri Arravindhar` : siteName;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image || defaultImage} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image || defaultImage} />

      {/* Additional */}
      <meta name="author" content="Arravind Shri" />
      <meta name="robots" content="index, follow" />
    </Helmet>
  );
}
