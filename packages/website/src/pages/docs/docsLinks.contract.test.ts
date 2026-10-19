import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { docPages, matchesDocSearch } from "./docsNavConfig";

const app = readFileSync(resolve("src/App.tsx"), "utf8");
const pageSource = (slug: string) => {
  const route = app.match(new RegExp(`path="${slug}" element=\\{<([A-Za-z]+)`));
  expect(route, `Missing route /docs/${slug}`).not.toBeNull();
  return readFileSync(resolve(`src/pages/docs/${route![1]}.tsx`), "utf8");
};

describe("published documentation destinations", () => {
  it("resolves every desktop help URL to a route and named anchor", () => {
    const desktop = readFileSync(
      resolve("../desktop/src/renderer/src/utils/docsLinks.ts"),
      "utf8",
    );
    const destinations = [
      ...desktop.matchAll(/\$\{DOCS_BASE_URL\}\/([\w-]+)(?:#([\w-]+))?/g),
    ];
    expect(destinations.length).toBeGreaterThan(20);
    for (const [, slug, anchor] of destinations) {
      expect(
        docPages.some((page) => page.slug === slug),
        slug,
      ).toBe(true);
      const source = pageSource(slug);
      if (anchor)
        expect(source, `${slug}#${anchor}`).toContain(`id="${anchor}"`);
    }
  });

  it("ships the screenshots referenced by every documentation page", () => {
    for (const { slug } of docPages) {
      for (const [, asset] of pageSource(slug).matchAll(
        /src="(\/screenshots\/[^"]+)"/g,
      )) {
        expect(existsSync(resolve(`public${asset}`)), asset).toBe(true);
      }
    }
  });

  it.each(["dowel", "socket", "bridle", "counterbore", "sliding", "spline"])(
    "finds a guide for %s",
    (query) => {
      expect(docPages.some((page) => matchesDocSearch(page, query))).toBe(true);
    },
  );
});
