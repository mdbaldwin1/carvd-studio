import { expect, test } from "@playwright/test";
import { gunzipSync } from "node:zlib";

test.use({
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
});

type CapturedEvent = { event: string; properties: Record<string, unknown> };

function capturedEvents(payloads: Buffer[]): CapturedEvent[] {
  return payloads.flatMap((payload) => {
    if (payload[0] === 0x1f && payload[1] === 0x8b)
      payload = gunzipSync(payload);
    const body = payload.toString("utf8");
    const encoded = new URLSearchParams(body).get("data");
    const decoded = encoded
      ? Buffer.from(encoded, "base64").toString("utf8")
      : body;
    try {
      const parsed = JSON.parse(decoded) as
        | CapturedEvent
        | { batch?: CapturedEvent[] };
      return "batch" in parsed && Array.isArray(parsed.batch)
        ? parsed.batch
        : "event" in parsed
          ? [parsed]
          : [];
    } catch {
      return [];
    }
  });
}

test.describe("explicit website analytics", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Network payload contract is browser-independent",
  );
  test.beforeEach(async ({ page }) => {
    // PostHog intentionally drops navigator.webdriver traffic as bot activity.
    // This suite validates the production browser path, so present a normal browser signal.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", {
        configurable: true,
        get: () => false,
      });
      Object.defineProperty(navigator, "userAgentData", {
        configurable: true,
        get: () => ({
          brands: [{ brand: "Google Chrome", version: "147" }],
          mobile: false,
          platform: "macOS",
        }),
      });
    });
  });

  test("records route, download, and checkout events with catalog properties", async ({
    page,
    context,
  }) => {
    const payloads: Buffer[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST")
        payloads.push(request.postDataBuffer() ?? Buffer.alloc(0));
    });
    await page.route("**/*", async (route) => {
      const request = route.request();
      if (
        request.method() === "POST" &&
        request.url().startsWith("http://localhost:4173/")
      ) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: request.url().includes("/flags/")
            ? JSON.stringify({ featureFlags: {}, featureFlagPayloads: {} })
            : "{}",
        });
        return;
      }
      await route.continue();
    });
    await context.route("https://github.com/**", (route) => route.abort());
    await context.route("https://store.example.test/**", (route) =>
      route.fulfill({ status: 200, body: "checkout" }),
    );

    await page.goto("/");
    expect(await page.evaluate(() => navigator.webdriver)).toBe(false);
    await page
      .getByLabel("Main navigation")
      .getByRole("link", { name: "Features" })
      .click();
    await expect(page).toHaveURL("/features");
    await expect
      .poll(
        () =>
          capturedEvents(payloads).some(
            ({ event, properties }) =>
              event === "$pageview" &&
              String(properties.$current_url).endsWith("/features"),
          ),
        { timeout: 15_000 },
      )
      .toBe(true);
    await page.goto("/");
    await page.locator("#download a").filter({ hasText: "macOS" }).click();
    await expect
      .poll(
        () =>
          capturedEvents(payloads).some(
            ({ event }) => event === "download_clicked",
          ),
        { timeout: 15_000 },
      )
      .toBe(true);
    await page.goto("/pricing");
    const popupPromise = page.waitForEvent("popup");
    await page
      .getByRole("link", { name: /buy license/i })
      .first()
      .click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(/store\.example\.test/);

    await expect
      .poll(
        () =>
          capturedEvents(payloads).some(
            ({ event }) => event === "checkout_started",
          ),
        { timeout: 15_000 },
      )
      .toBe(true);
    const events = capturedEvents(payloads);
    const pageview = events.find(
      ({ event, properties }) =>
        event === "$pageview" &&
        String(properties.$current_url).endsWith("/features"),
    );
    expect(pageview).toBeDefined();
    expect(new URL(String(pageview?.properties.$current_url)).pathname).toBe(
      "/features",
    );
    const download = events.find(({ event }) => event === "download_clicked");
    expect({
      platform: download?.properties.platform,
      location: download?.properties.location,
    }).toEqual({ platform: "macos", location: "home-hero-card" });
    const checkout = events.find(({ event }) => event === "checkout_started");
    expect({
      product: checkout?.properties.product,
      location: checkout?.properties.location,
    }).toEqual({ product: "desktop_license", location: "pricing-card" });
  });

  test("aborted analytics delivery never blocks normal navigation", async ({
    page,
  }) => {
    await page.route("**/*", (route) =>
      route.request().method() === "POST" &&
      route.request().url().includes("/e/")
        ? route.abort()
        : route.continue(),
    );
    await page.goto("/");
    await page
      .getByLabel("Main navigation")
      .getByRole("link", { name: "Features" })
      .click();
    await expect(page).toHaveURL("/features");
    await expect(
      page.getByRole("heading", { name: /every tool you need/i }),
    ).toBeVisible();
  });
});
