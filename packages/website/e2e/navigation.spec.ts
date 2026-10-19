import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Navigation should remain testable when optional third-party resources hang.
  // Local styles, screenshots and application requests still load normally.
  await page.route(
    /^https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|va\.vercel-scripts\.com)\//,
    (route) => route.abort(),
  );
});

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

  test("joinery guides link the modeled workflow to fabrication limits", async ({
    page,
  }) => {
    await page.goto("/docs/joinery");
    await expect(
      page.getByRole("heading", { name: "Custom Cuts & Joinery", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Dowels, biscuits & loose tenons" }),
    ).toBeVisible();
    await expect(
      page.getByText(/does not produce CNC toolpaths or G-code/),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Cut List Generation", exact: true })
      .last()
      .click();
    await expect(page).toHaveURL("/docs/cut-lists");
    await expect(page.getByText(/After purchase — component/)).toBeVisible();
    await expect(
      page.getByText(/Custom items belong to the project/),
    ).toBeVisible();
  });

  test("brand link returns to homepage", async ({ page }) => {
    await page.goto("/features");
    await page.click('header a[href="/"]');
    await expect(page).toHaveURL("/");
  });

  test("joint recipes keep wide tables inside the mobile reading column", async ({
    page,
    isMobile,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/docs/joint-recipes#cutter-sampler", {
      waitUntil: "domcontentloaded",
    });
    const sampler = page.locator("#cutter-sampler");
    await expect(sampler.getByRole("table")).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(390);
    await sampler.scrollIntoViewIfNeeded();
    const screenshot = sampler.getByRole("img");
    await screenshot.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        screenshot.evaluate((image: HTMLImageElement) => image.naturalWidth),
      )
      .toBeGreaterThan(0);
    const tableRegion = sampler.getByRole("region", {
      name: "Cutter sampler machining dimensions",
    });
    if (isMobile) {
      // Mobile coverage verifies scroll containment; desktop browsers also
      // exercise hardware-keyboard input.
      await tableRegion.evaluate((region) => {
        region.scrollLeft = region.scrollWidth;
      });
    } else {
      await tableRegion.focus();
      await expect(tableRegion).toBeFocused();
      await page.keyboard.press("ArrowRight", { delay: 100 });
    }
    await expect
      .poll(() => tableRegion.evaluate((region) => region.scrollLeft))
      .toBeGreaterThan(0);
    expect(await page.evaluate(() => window.scrollX)).toBe(0);
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
