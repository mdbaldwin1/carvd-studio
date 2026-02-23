const SITE_NAME = "Carvd Studio";
const SITE_URL = "https://carvd-studio.com";
const DEFAULT_DESCRIPTION =
  "Design furniture in 3D, generate optimized cut lists, and track material costs. One-time purchase, no subscription. Works offline.";
const OG_IMAGE = `${SITE_URL}/branding/og-image-1200x630.png`;
const OG_IMAGE_WIDTH = "1200";
const OG_IMAGE_HEIGHT = "630";
const OG_IMAGE_ALT = "Carvd Studio workspace showing 3D woodworking design";

interface SEOProps {
  /** Page-specific title. Will be appended with "| Carvd Studio" unless it already contains it. */
  title?: string;
  /** Page-specific meta description. */
  description?: string;
  /** URL path for canonical link (e.g., "/features"). */
  path?: string;
  /** Set to true for pages that should not be indexed (e.g., 404). */
  noindex?: boolean;
  /** Optional JSON-LD structured data object(s). */
  jsonLd?: object | object[];
}

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  noindex = false,
  jsonLd,
}: SEOProps) {
  const fullTitle = title
    ? title.includes(SITE_NAME)
      ? title
      : `${title} | ${SITE_NAME}`
    : `${SITE_NAME} - Woodworking Design Software`;

  const normalizedPath =
    path === "/" ? "/" : `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;
  const canonicalUrl = `${SITE_URL}${normalizedPath}`;

  const jsonLdItems = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:alt" content={OG_IMAGE_ALT} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content={OG_IMAGE_WIDTH} />
      <meta property="og:image:height" content={OG_IMAGE_HEIGHT} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={OG_IMAGE} />
      <meta name="twitter:image:alt" content={OG_IMAGE_ALT} />

      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {jsonLdItems.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}
