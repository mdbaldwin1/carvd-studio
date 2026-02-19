import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("homepage loads successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Carvd Studio/);
    await expect(page.locator("h1")).toContainText("Stop Wasting Wood");
  });

  test("can navigate to features page", async ({ page }) => {
    await page.goto("/");
    await page.click('a[href="/features"]');
    await expect(page).toHaveURL("/features");
    await expect(page.locator("h1")).toContainText("Every Tool You Need");
  });

  test("can navigate to pricing page", async ({ page }) => {
    await page.goto("/");
    await page.click('a[href="/pricing"]');
    await expect(page).toHaveURL("/pricing");
    await expect(page.locator("h1")).toContainText("Own It Forever");
  });

  test("can navigate to docs page", async ({ page }) => {
    await page.goto("/");
    await page.click('a[href="/docs"]');
    await expect(page).toHaveURL("/docs");
  });

  test("brand link returns to homepage", async ({ page }) => {
    await page.goto("/features");
    await page.click('header a[href="/"]');
    await expect(page).toHaveURL("/");
  });

  test("404 page shows for unknown routes", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");
    await expect(page.locator("text=404")).toBeVisible();
    await expect(page.locator("text=Page Not Found")).toBeVisible();
  });

  test("can navigate back to home from 404 page", async ({ page }) => {
    await page.goto("/unknown-page");
    await page.click("text=Back to Home");
    await expect(page).toHaveURL("/");
  });
});

test.describe("Footer Navigation", () => {
  test("privacy policy link works", async ({ page }) => {
    await page.goto("/");
    await page.click('a[href="/privacy"]');
    await expect(page).toHaveURL("/privacy");
  });

  test("terms of service link works", async ({ page }) => {
    await page.goto("/");
    await page.click('a[href="/terms"]');
    await expect(page).toHaveURL("/terms");
  });
});
