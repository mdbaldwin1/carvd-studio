import { describe, it, expect } from "vitest";
import { docPages, getNavSections, getPrevNext } from "./docsNavConfig";

describe("docsNavConfig", () => {
  describe("docPages", () => {
    it("has 16 doc pages", () => {
      expect(docPages).toHaveLength(16);
    });

    it("all pages have slug, title, and section", () => {
      docPages.forEach((page) => {
        expect(page.slug).toBeTruthy();
        expect(page.title).toBeTruthy();
        expect(page.section).toBeTruthy();
      });
    });

    it("all slugs are unique", () => {
      const slugs = docPages.map((p) => p.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });
  });

  describe("getNavSections", () => {
    it("returns 4 sections", () => {
      const sections = getNavSections();
      expect(sections).toHaveLength(4);
    });

    it("has correct section titles in order", () => {
      const sections = getNavSections();
      expect(sections.map((s) => s.title)).toEqual([
        "Getting Started",
        "Core Features",
        "Advanced Features",
        "Reference",
      ]);
    });

    it("Getting Started has 3 pages", () => {
      const sections = getNavSections();
      expect(sections[0].pages).toHaveLength(3);
    });

    it("Core Features has 4 pages", () => {
      const sections = getNavSections();
      expect(sections[1].pages).toHaveLength(4);
    });

    it("Advanced Features has 4 pages", () => {
      const sections = getNavSections();
      expect(sections[2].pages).toHaveLength(4);
    });

    it("Reference has 5 pages", () => {
      const sections = getNavSections();
      expect(sections[3].pages).toHaveLength(5);
    });
  });

  describe("getPrevNext", () => {
    it("first page has no prev", () => {
      const { prev, next } = getPrevNext("quick-start");
      expect(prev).toBeNull();
      expect(next).not.toBeNull();
      expect(next!.slug).toBe("interface");
    });

    it("last page has no next", () => {
      const { prev, next } = getPrevNext("faq");
      expect(prev).not.toBeNull();
      expect(prev!.slug).toBe("troubleshooting");
      expect(next).toBeNull();
    });

    it("middle page has both prev and next", () => {
      const { prev, next } = getPrevNext("groups");
      expect(prev).not.toBeNull();
      expect(prev!.slug).toBe("stock");
      expect(next).not.toBeNull();
      expect(next!.slug).toBe("cut-lists");
    });

    it("unknown slug returns null for both", () => {
      const { prev, next } = getPrevNext("nonexistent");
      expect(prev).toBeNull();
      expect(next).toBeNull();
    });
  });
});
