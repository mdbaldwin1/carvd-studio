import { test, expect } from "@playwright/test";

test.describe("Pricing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pricing");
  });

  test.describe("Hero Section", () => {
    test("displays page headline", async ({ page }) => {
      await expect(page.locator("h1")).toContainText("Own It Forever");
      await expect(page.locator("h1")).toContainText("Pay Once");
    });

    test("displays value proposition badge", async ({ page }) => {
      await expect(
        page.locator("text=Less Than 6 Months").first(),
      ).toContainText("Less Than 6 Months");
    });
  });

  test.describe("Pricing Card", () => {
    test("displays price", async ({ page }) => {
      await expect(page.locator("text=$59.99").first()).toBeVisible();
    });

    test("displays one-time payment messaging", async ({ page }) => {
      await expect(page.locator("text=one-time payment").first()).toBeVisible();
    });

    test("displays feature checklist", async ({ page }) => {
      // The main pricing card checklist has 12 items
      const pricingCardChecklist = page
        .locator('ul[class*="space-y-4"]')
        .first();
      await expect(pricingCardChecklist.locator("li")).toHaveCount(12);
    });

    test("displays key features in checklist", async ({ page }) => {
      await expect(
        page.locator("text=Full 3D furniture design studio"),
      ).toBeVisible();
      await expect(
        page.locator("text=Intelligent cut list optimizer"),
      ).toBeVisible();
      await expect(page.locator("text=Free lifetime updates")).toBeVisible();
      await expect(
        page.locator("text=Install on up to 3 devices"),
      ).toBeVisible();
    });

    test("displays CTA buttons", async ({ page }) => {
      await expect(
        page.locator("text=Download Free Trial").first(),
      ).toBeVisible();
      await expect(page.locator("text=Buy License").first()).toBeVisible();
    });

    test("displays trust signals", async ({ page }) => {
      await expect(
        page.locator("text=30-day money-back guarantee").first(),
      ).toBeVisible();
      await expect(page.locator("text=Instant download")).toBeVisible();
      await expect(page.locator("text=Secure checkout")).toBeVisible();
    });
  });

  test.describe("Value Comparison Section", () => {
    test("displays break-even heading", async ({ page }) => {
      await expect(
        page.locator("text=The Break-Even Point? 6 Months."),
      ).toBeVisible();
    });

    test("displays subscription vs one-time comparison", async ({ page }) => {
      await expect(
        page.locator("text=Monthly Subscription").first(),
      ).toBeVisible();
      await expect(page.locator("text=$10/mo").first()).toBeVisible();
    });

    test("displays savings callout", async ({ page }) => {
      await expect(page.locator("text=Save $540 over 5 years")).toBeVisible();
    });
  });

  test.describe("ROI Calculator Section", () => {
    test("displays ROI heading", async ({ page }) => {
      await expect(
        page.locator("text=How It Could Pay For Itself"),
      ).toBeVisible();
    });

    test("displays hypothetical example disclaimer", async ({ page }) => {
      // "hypothetical example" appears twice - use first()
      await expect(
        page.locator("text=hypothetical example").first(),
      ).toBeVisible();
    });

    test("displays material savings value", async ({ page }) => {
      await expect(page.locator("text=$80").first()).toBeVisible();
    });

    test("displays time savings value", async ({ page }) => {
      await expect(page.locator("text=$125")).toBeVisible();
    });

    test("displays mistake avoidance value", async ({ page }) => {
      await expect(page.locator("text=$200")).toBeVisible();
    });

    test("displays total potential value with disclaimer", async ({ page }) => {
      await expect(page.locator("text=Potential Value:")).toBeVisible();
      await expect(page.locator("text=$405")).toBeVisible();
      await expect(page.locator("text=Your results will vary")).toBeVisible();
    });
  });

  test.describe("Competitor Comparison Section", () => {
    test("displays comparison heading", async ({ page }) => {
      await expect(
        page.locator("text=How We Compare to Other Software"),
      ).toBeVisible();
    });

    test("displays competitor comparison table", async ({ page }) => {
      await expect(page.locator("table")).toBeVisible();
    });

    test("lists competitors", async ({ page }) => {
      await expect(page.locator("text=SketchUp Pro")).toBeVisible();
      await expect(page.locator("text=Fusion 360").first()).toBeVisible();
      await expect(page.locator("text=Cabinet Vision").first()).toBeVisible();
    });

    test("highlights Carvd Studio in comparison", async ({ page }) => {
      await expect(page.locator("text=Carvd Studio").first()).toBeVisible();
    });
  });

  test.describe("FAQ Section", () => {
    test("displays FAQ heading", async ({ page }) => {
      await expect(page.locator("text=Your Questions, Answered")).toBeVisible();
    });

    test("displays FAQ questions", async ({ page }) => {
      await expect(
        page.locator("text=Is this really a one-time payment?"),
      ).toBeVisible();
      await expect(page.locator("text=Do I get future updates?")).toBeVisible();
      await expect(
        page.locator("text=What if I'm not satisfied?"),
      ).toBeVisible();
      await expect(
        page.locator("text=Can I use it on multiple computers?"),
      ).toBeVisible();
      await expect(page.locator("text=Will it work offline?")).toBeVisible();
      await expect(page.locator("text=What if I need help?")).toBeVisible();
    });
  });
});
