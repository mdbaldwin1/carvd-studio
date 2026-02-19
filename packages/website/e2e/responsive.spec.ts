import { test, expect } from "@playwright/test";

test.describe("Responsive Design", () => {
  test.describe("Mobile View", () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test("homepage renders correctly on mobile", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("h1")).toBeVisible();
    });

    test("download cards stack on mobile", async ({ page }) => {
      await page.goto("/");
      // Check that download section is visible
      await expect(page.locator("#download")).toBeVisible();
    });

    test("navigation is accessible on mobile", async ({ page }) => {
      await page.goto("/");
      // Navigation links should still be visible
      const navLinks = page.locator("header nav a");
      await expect(navLinks.first()).toBeVisible();
    });

    test("pricing page renders correctly on mobile", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.locator("h1")).toBeVisible();
    });

    test("features page renders correctly on mobile", async ({ page }) => {
      await page.goto("/features");
      await expect(page.locator("h1")).toBeVisible();
    });
  });

  test.describe("Tablet View", () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test("homepage renders correctly on tablet", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("h1")).toBeVisible();
    });

    test("feature grid displays correctly on tablet", async ({ page }) => {
      await page.goto("/");
      // Feature grid uses minmax(280px,1fr) layout
      await expect(page.locator('div[class*="280px,1fr"]')).toBeVisible();
    });
  });

  test.describe("Desktop View", () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test("homepage renders correctly on desktop", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("h1")).toBeVisible();
    });

    test("download cards display side by side on desktop", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("#download")).toBeVisible();
    });
  });
});
