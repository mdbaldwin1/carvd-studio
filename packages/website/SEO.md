# Website SEO Operations

This document captures ongoing SEO operations for `@carvd/website`.

## What Is Automated

- `sitemap.xml` is generated at build time from route definitions.
  - Command: `npm run generate:sitemap --workspace=@carvd/website`
  - Trigger: `prebuild` runs automatically before `npm run build`.
- `robots.txt` points crawlers to the sitemap and disallows `/api/`.
- Global SEO metadata is managed in:
  - `src/components/SEO.tsx`
  - `index.html` (fallback tags for initial HTML)

## Open Graph Image

- Primary OG/Twitter image: `/branding/og-image-1200x630.png`
- Recommended dimensions: `1200x630`
- To regenerate from current hero screenshot:

```bash
sips -c 630 1200 packages/website/public/screenshots/hero-workspace.png \
  --out packages/website/public/branding/og-image-1200x630.png
```

## Search Structured Data

- Home page includes `WebSite` JSON-LD with `SearchAction`.
- Search target URL format:
  - `https://carvd-studio.com/docs?search={search_term_string}`

## Post-Deploy SEO Checklist (Manual)

1. Verify production `sitemap.xml` is reachable.
   - `https://carvd-studio.com/sitemap.xml`
2. Verify production `robots.txt` is reachable.
   - `https://carvd-studio.com/robots.txt`
3. Google Search Console:
   - Open `Indexing -> Sitemaps`
   - Submit `https://carvd-studio.com/sitemap.xml`
4. Bing Webmaster Tools:
   - Open `Sitemaps`
   - Submit `https://carvd-studio.com/sitemap.xml`
5. Validate social preview image:
   - LinkedIn Post Inspector
   - X Card Validator
   - Facebook Sharing Debugger
