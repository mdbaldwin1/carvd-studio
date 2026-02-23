const SITE_URL = "https://carvd-studio.com";

export function createOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Carvd Studio",
    url: SITE_URL,
    email: "support@carvd-studio.com",
  };
}

export function createSoftwareAppSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Carvd Studio",
    applicationCategory: "DesignApplication",
    operatingSystem: "macOS, Windows",
    description:
      "Design furniture in 3D, generate optimized cut lists, and track material costs.",
    offers: {
      "@type": "Offer",
      price: "59.99",
      priceCurrency: "USD",
    },
  };
}

export function createWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Carvd Studio",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/docs?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function createFAQSchema(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function createBreadcrumbSchema(
  items: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}
