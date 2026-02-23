import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SITE_URL = "https://carvd-studio.com";
const today = new Date().toISOString().slice(0, 10);

const root = process.cwd();
const docsConfigPath = join(root, "src/pages/docs/docsNavConfig.ts");
const sitemapPath = join(root, "public/sitemap.xml");

function extractDocSlugs(configSource) {
  const matches = configSource.matchAll(/slug:\s*"([^"]+)"/g);
  const slugs = Array.from(matches, (match) => match[1]);
  return Array.from(new Set(slugs));
}

function xmlEscape(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

const coreRoutes = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/features", changefreq: "monthly", priority: "0.8" },
  { path: "/pricing", changefreq: "monthly", priority: "0.9" },
  { path: "/docs", changefreq: "weekly", priority: "0.7" },
  { path: "/download", changefreq: "monthly", priority: "0.8" },
  { path: "/support", changefreq: "monthly", priority: "0.6" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/changelog", changefreq: "weekly", priority: "0.6" },
];

const docsConfigSource = readFileSync(docsConfigPath, "utf8");
const docsRoutes = extractDocSlugs(docsConfigSource).map((slug) => ({
  path: `/docs/${slug}`,
  changefreq: "monthly",
  priority: "0.6",
}));

const routes = [...coreRoutes, ...docsRoutes];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (route) => `  <url>
    <loc>${xmlEscape(`${SITE_URL}${route.path}`)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

writeFileSync(sitemapPath, xml, "utf8");
console.log(`[sitemap] Generated ${routes.length} URLs at ${sitemapPath}`);
