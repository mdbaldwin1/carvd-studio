import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import SEO from "../src/components/SEO";
import {
  createOrganizationSchema,
  createSoftwareAppSchema,
  createFAQSchema,
  createBreadcrumbSchema,
} from "../src/utils/jsonLd";

// Helper to find metadata in both container and document.head
// React 19 hoists <title>, <meta>, and <link> to document.head
function findMeta(container: HTMLElement, selector: string): Element | null {
  return (
    container.querySelector(selector) ?? document.head.querySelector(selector)
  );
}

function findAllMeta(container: HTMLElement, selector: string): Element[] {
  const fromContainer = Array.from(container.querySelectorAll(selector));
  const fromHead = Array.from(document.head.querySelectorAll(selector));
  return [...fromContainer, ...fromHead];
}

function getTitle(container: HTMLElement): string | undefined {
  const titleEl = findMeta(container, "title");
  return titleEl?.textContent ?? (document.title || undefined);
}

// Helper to render SEO within a page-like context
function renderSEO(props: Parameters<typeof SEO>[0]) {
  return render(
    <MemoryRouter>
      <div>
        <SEO {...props} />
        <p>Page content</p>
      </div>
    </MemoryRouter>,
  );
}

describe("SEO Component", () => {
  it("renders title element", () => {
    const { container } = renderSEO({ title: "Features" });
    const title = getTitle(container);
    expect(title).toBe("Features | Carvd Studio");
  });

  it("renders default title when no title prop given", () => {
    const { container } = renderSEO({});
    const title = getTitle(container);
    expect(title).toBe("Carvd Studio - Woodworking Design Software");
  });

  it("does not double-append site name if already included", () => {
    const { container } = renderSEO({
      title: "Carvd Studio - Woodworking Design Software",
    });
    const title = getTitle(container);
    expect(title).toBe("Carvd Studio - Woodworking Design Software");
  });

  it("renders meta description", () => {
    const { container } = renderSEO({
      description: "Test description for the page.",
    });
    const meta = findMeta(container, 'meta[name="description"]');
    expect(meta?.getAttribute("content")).toBe(
      "Test description for the page.",
    );
  });

  it("renders canonical link", () => {
    const { container } = renderSEO({ path: "/features" });
    const link = findMeta(container, 'link[rel="canonical"]');
    expect(link?.getAttribute("href")).toBe(
      "https://carvd-studio.com/features",
    );
  });

  it("renders Open Graph tags", () => {
    const { container } = renderSEO({
      title: "Test Page",
      description: "A test page",
      path: "/test",
    });
    const ogTitle = findMeta(container, 'meta[property="og:title"]');
    const ogDesc = findMeta(container, 'meta[property="og:description"]');
    const ogUrl = findMeta(container, 'meta[property="og:url"]');
    expect(ogTitle?.getAttribute("content")).toBe("Test Page | Carvd Studio");
    expect(ogDesc?.getAttribute("content")).toBe("A test page");
    expect(ogUrl?.getAttribute("content")).toBe(
      "https://carvd-studio.com/test",
    );
  });

  it("renders Twitter card tags", () => {
    const { container } = renderSEO({ title: "Test" });
    const card = findMeta(container, 'meta[name="twitter:card"]');
    expect(card?.getAttribute("content")).toBe("summary_large_image");
  });

  it("renders noindex meta when noindex is true", () => {
    const { container } = renderSEO({ noindex: true });
    const robots = findMeta(container, 'meta[name="robots"]');
    expect(robots?.getAttribute("content")).toBe("noindex, nofollow");
  });

  it("does not render noindex meta by default", () => {
    const { container } = renderSEO({});
    const robots = findMeta(container, 'meta[name="robots"]');
    expect(robots).toBeNull();
  });

  it("renders JSON-LD script when jsonLd is provided", () => {
    const schema = { "@context": "https://schema.org", "@type": "Test" };
    const { container } = renderSEO({ jsonLd: schema });
    const scripts = findAllMeta(
      container,
      'script[type="application/ld+json"]',
    );
    expect(scripts.length).toBeGreaterThan(0);
    expect(JSON.parse(scripts[0].textContent!)).toEqual(schema);
  });

  it("renders multiple JSON-LD scripts when array is provided", () => {
    const schemas = [
      { "@context": "https://schema.org", "@type": "Org" },
      { "@context": "https://schema.org", "@type": "App" },
    ];
    const { container } = renderSEO({ jsonLd: schemas });
    const scripts = findAllMeta(
      container,
      'script[type="application/ld+json"]',
    );
    expect(scripts).toHaveLength(2);
  });

  it("does not render JSON-LD script when not provided", () => {
    const { container } = renderSEO({});
    const scripts = findAllMeta(
      container,
      'script[type="application/ld+json"]',
    );
    expect(scripts).toHaveLength(0);
  });
});

describe("JSON-LD Helpers", () => {
  describe("createOrganizationSchema", () => {
    it("returns valid Organization schema", () => {
      const schema = createOrganizationSchema();
      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("Organization");
      expect(schema.name).toBe("Carvd Studio");
      expect(schema.url).toBe("https://carvd-studio.com");
    });
  });

  describe("createSoftwareAppSchema", () => {
    it("returns valid SoftwareApplication schema", () => {
      const schema = createSoftwareAppSchema();
      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("SoftwareApplication");
      expect(schema.name).toBe("Carvd Studio");
      expect(schema.applicationCategory).toBe("DesignApplication");
      expect(schema.operatingSystem).toBe("macOS, Windows");
      expect(schema.offers.price).toBe("59.99");
      expect(schema.offers.priceCurrency).toBe("USD");
    });
  });

  describe("createFAQSchema", () => {
    it("returns valid FAQPage schema", () => {
      const items = [
        { question: "Q1?", answer: "A1" },
        { question: "Q2?", answer: "A2" },
      ];
      const schema = createFAQSchema(items);
      expect(schema["@type"]).toBe("FAQPage");
      expect(schema.mainEntity).toHaveLength(2);
      expect(schema.mainEntity[0]["@type"]).toBe("Question");
      expect(schema.mainEntity[0].name).toBe("Q1?");
      expect(schema.mainEntity[0].acceptedAnswer.text).toBe("A1");
    });
  });

  describe("createBreadcrumbSchema", () => {
    it("returns valid BreadcrumbList schema", () => {
      const items = [
        { name: "Docs", path: "/docs" },
        { name: "Quick Start", path: "/docs/quick-start" },
      ];
      const schema = createBreadcrumbSchema(items);
      expect(schema["@type"]).toBe("BreadcrumbList");
      expect(schema.itemListElement).toHaveLength(2);
      expect(schema.itemListElement[0].position).toBe(1);
      expect(schema.itemListElement[0].name).toBe("Docs");
      expect(schema.itemListElement[0].item).toBe(
        "https://carvd-studio.com/docs",
      );
      expect(schema.itemListElement[1].position).toBe(2);
    });
  });
});

// Integration tests: verify pages include SEO component
describe("Page SEO Integration", () => {
  // Mock downloads for pages that need it
  vi.mock("../src/utils/downloads", () => ({
    useDownloadInfo: () => ({
      loading: false,
      version: "0.1.0",
      macDownload: {
        url: "#",
        platform: "macos",
        fileName: "test.dmg",
        fileExtension: ".dmg",
        minOsVersion: "macOS 10.15+",
      },
      windowsDownload: {
        url: "#",
        platform: "windows",
        fileName: "test.exe",
        fileExtension: ".exe",
        minOsVersion: "Windows 10+",
      },
    }),
  }));

  const pagesWithSEO = [
    {
      name: "HomePage",
      path: "/",
      import: () => import("../src/pages/HomePage"),
      expectedTitle: "Carvd Studio - Woodworking Design Software",
      hasJsonLd: true,
    },
    {
      name: "FeaturesPage",
      path: "/features",
      import: () => import("../src/pages/FeaturesPage"),
      expectedTitle: "Features | Carvd Studio",
      hasJsonLd: false,
    },
    {
      name: "PricingPage",
      path: "/pricing",
      import: () => import("../src/pages/PricingPage"),
      expectedTitle: "Pricing | Carvd Studio",
      hasJsonLd: true,
    },
    {
      name: "DownloadPage",
      path: "/download",
      import: () => import("../src/pages/DownloadPage"),
      expectedTitle: "Download | Carvd Studio",
      hasJsonLd: false,
    },
    {
      name: "SupportPage",
      path: "/support",
      import: () => import("../src/pages/SupportPage"),
      expectedTitle: "Support | Carvd Studio",
      hasJsonLd: true,
    },
    {
      name: "ChangelogPage",
      path: "/changelog",
      import: () => import("../src/pages/ChangelogPage"),
      expectedTitle: "Changelog | Carvd Studio",
      hasJsonLd: false,
    },
    {
      name: "NotFoundPage",
      path: "/404",
      import: () => import("../src/pages/NotFoundPage"),
      expectedTitle: "Page Not Found | Carvd Studio",
      hasJsonLd: false,
    },
  ];

  for (const page of pagesWithSEO) {
    it(`${page.name} sets the page title`, async () => {
      const mod = await page.import();
      const Page = mod.default;
      const { container } = render(
        <MemoryRouter initialEntries={[page.path]}>
          <Page />
        </MemoryRouter>,
      );
      const title = getTitle(container);
      expect(title).toBe(page.expectedTitle);
    });

    it(`${page.name} renders a meta description`, async () => {
      const mod = await page.import();
      const Page = mod.default;
      const { container } = render(
        <MemoryRouter initialEntries={[page.path]}>
          <Page />
        </MemoryRouter>,
      );
      const meta = findMeta(container, 'meta[name="description"]');
      expect(meta).toBeTruthy();
      expect(meta?.getAttribute("content")).toBeTruthy();
      expect(meta?.getAttribute("content")?.length).toBeGreaterThan(20);
    });

    it(`${page.name} renders a canonical link`, async () => {
      const mod = await page.import();
      const Page = mod.default;
      const { container } = render(
        <MemoryRouter initialEntries={[page.path]}>
          <Page />
        </MemoryRouter>,
      );
      const link = findMeta(container, 'link[rel="canonical"]');
      expect(link).toBeTruthy();
      expect(link?.getAttribute("href")).toMatch(
        /^https:\/\/carvd-studio\.com/,
      );
    });

    if (page.hasJsonLd) {
      it(`${page.name} renders JSON-LD structured data`, async () => {
        const mod = await page.import();
        const Page = mod.default;
        const { container } = render(
          <MemoryRouter initialEntries={[page.path]}>
            <Page />
          </MemoryRouter>,
        );
        const scripts = findAllMeta(
          container,
          'script[type="application/ld+json"]',
        );
        expect(scripts.length).toBeGreaterThan(0);
        for (const script of scripts) {
          expect(() => JSON.parse(script.textContent!)).not.toThrow();
        }
      });
    }
  }

  it("NotFoundPage has noindex meta", async () => {
    const mod = await import("../src/pages/NotFoundPage");
    const Page = mod.default;
    const { container } = render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );
    const robots = findMeta(container, 'meta[name="robots"]');
    expect(robots?.getAttribute("content")).toBe("noindex, nofollow");
  });

  // Docs page integration test
  it("DocsIndexPage renders SEO metadata", async () => {
    const mod = await import("../src/pages/docs/DocsIndexPage");
    const layoutMod = await import("../src/pages/docs/DocsLayout");
    const Page = mod.default;
    const Layout = layoutMod.default;
    const { container } = render(
      <MemoryRouter initialEntries={["/docs"]}>
        <Routes>
          <Route path="/docs" element={<Layout />}>
            <Route index element={<Page />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    const title = getTitle(container);
    expect(title).toBe("Documentation | Carvd Studio");
  });

  it("QuickStartPage renders breadcrumb JSON-LD", async () => {
    const mod = await import("../src/pages/docs/QuickStartPage");
    const layoutMod = await import("../src/pages/docs/DocsLayout");
    const Page = mod.default;
    const Layout = layoutMod.default;
    const { container } = render(
      <MemoryRouter initialEntries={["/docs/quick-start"]}>
        <Routes>
          <Route path="/docs" element={<Layout />}>
            <Route path="quick-start" element={<Page />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    const scripts = findAllMeta(
      container,
      'script[type="application/ld+json"]',
    );
    expect(scripts.length).toBeGreaterThan(0);
    const jsonLd = JSON.parse(scripts[0].textContent!);
    expect(jsonLd["@type"]).toBe("BreadcrumbList");
    expect(jsonLd.itemListElement).toHaveLength(2);
  });
});
