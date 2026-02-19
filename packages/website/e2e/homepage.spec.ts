import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test.describe("Hero Section", () => {
    test("displays hero headline", async ({ page }) => {
      await expect(page.locator("h1")).toContainText("Stop Wasting Wood");
      await expect(page.locator("h1")).toContainText("Start Building Smarter");
    });

    test("displays hero subtitle with value proposition", async ({ page }) => {
      await expect(
        page.locator("p").filter({ hasText: "waste less material" }).first(),
      ).toContainText("waste less material");
    });

    test("displays CTA buttons", async ({ page }) => {
      await expect(
        page.locator("text=Download Free Trial").first(),
      ).toBeVisible();
      await expect(page.locator("text=See Pricing")).toBeVisible();
    });

    test("displays platform availability badge", async ({ page }) => {
      await expect(page.locator("text=macOS & Windows").first()).toContainText(
        "macOS & Windows",
      );
    });
  });

  test.describe("Download Section", () => {
    test("displays download section heading", async ({ page }) => {
      await expect(page.locator("text=Download Carvd Studio")).toBeVisible();
    });

    test("displays macOS download card", async ({ page }) => {
      const macCard = page.locator("#download a").filter({ hasText: "macOS" });
      await expect(macCard).toBeVisible();
      await expect(macCard).toContainText(".dmg installer");
      await expect(macCard).toContainText("macOS 10.15+");
    });

    test("displays Windows download card", async ({ page }) => {
      const winCard = page
        .locator("#download a")
        .filter({ hasText: "Windows" });
      await expect(winCard).toBeVisible();
      await expect(winCard).toContainText(".exe installer");
      await expect(winCard).toContainText("Windows 10+");
    });

    test("download links point to GitHub releases", async ({ page }) => {
      const macLink = page.locator("#download a").filter({ hasText: "macOS" });
      await expect(macLink).toHaveAttribute("href", /github\.com.*\.dmg/);

      const winLink = page
        .locator("#download a")
        .filter({ hasText: "Windows" });
      await expect(winLink).toHaveAttribute("href", /github\.com.*\.exe/);
    });

    test("displays version badge", async ({ page }) => {
      await expect(page.locator("text=/Version \\d+\\.\\d+\\.\\d+/")).toBeVisible();
    });
  });

  test.describe("Features Section", () => {
    test("displays feature cards", async ({ page }) => {
      await expect(
        page.locator("text=See It Before You Build It"),
      ).toBeVisible();
      await expect(
        page.locator("text=Cut Lists That Save You Money"),
      ).toBeVisible();
      await expect(page.locator("text=Your Designs Stay Yours")).toBeVisible();
      await expect(
        page.locator("text=Lightning Fast, Zero Bloat"),
      ).toBeVisible();
      await expect(page.locator("text=Professional-Grade Tools")).toBeVisible();
    });

    test("displays key feature titles", async ({ page }) => {
      await expect(
        page.locator("text=See It Before You Build It"),
      ).toBeVisible();
      await expect(
        page.locator("text=Cut Lists That Save You Money"),
      ).toBeVisible();
      await expect(
        page.locator("text=Know Your Costs Before You Quote"),
      ).toBeVisible();
    });
  });

  test.describe("Stats Section", () => {
    test("displays stats grid", async ({ page }) => {
      await expect(page.locator("text=Material Waste")).toBeVisible();
      await expect(page.locator("text=Project Planning")).toBeVisible();
      await expect(
        page.locator("text=Offline").or(page.locator("text=Offline & Private")),
      ).toBeVisible();
    });

    test("displays material waste stat", async ({ page }) => {
      await expect(page.locator("text=Less").first()).toBeVisible();
      await expect(page.locator("text=Material Waste")).toBeVisible();
    });

    test("displays project planning stat", async ({ page }) => {
      await expect(page.locator("text=Faster").first()).toBeVisible();
      await expect(page.locator("text=Project Planning")).toBeVisible();
    });
  });

  test.describe("Use Cases Section", () => {
    test("displays use case cards", async ({ page }) => {
      await expect(page.locator("text=Custom Cabinet Shops")).toBeVisible();
      await expect(page.locator("text=Furniture Makers")).toBeVisible();
      await expect(page.locator("text=DIY Enthusiasts")).toBeVisible();
    });

    test("displays target audience cards", async ({ page }) => {
      await expect(page.locator("text=Custom Cabinet Shops")).toBeVisible();
      await expect(page.locator("text=Furniture Makers")).toBeVisible();
      await expect(page.locator("text=DIY Enthusiasts")).toBeVisible();
    });
  });

  test.describe("Pricing Comparison Section", () => {
    test("displays comparison table", async ({ page }) => {
      await expect(page.locator("table").first()).toBeVisible();
    });

    test("highlights one-time payment value", async ({ page }) => {
      await expect(page.locator("text=$59.99 once")).toBeVisible();
    });
  });

  test.describe("Final CTA Section", () => {
    test("displays final CTA", async ({ page }) => {
      await expect(page.locator("text=Ready to Build Smarter")).toBeVisible();
    });

    test("displays buy license button", async ({ page }) => {
      await expect(page.locator("text=Buy License")).toBeVisible();
    });
  });
});
