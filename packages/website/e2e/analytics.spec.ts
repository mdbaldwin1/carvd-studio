import { expect, test } from "@playwright/test";
import { gunzipSync } from "node:zlib";

test.use({
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
});

function decodedPayloads(payloads: Buffer[]): string {
  return payloads
    .map((payload) => {
      if (payload[0] === 0x1f && payload[1] === 0x8b)
        return gunzipSync(payload).toString("utf8");
      const body = payload.toString("utf8");
      const encoded = new URLSearchParams(body).get("data");
      return encoded ? Buffer.from(encoded, "base64").toString("utf8") : body;
    })
    .join("\n");
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
      .poll(() => decodedPayloads(payloads), { timeout: 15_000 })
      .toContain("$pageview");
    await page.goto("/");
    await page.locator("#download a").filter({ hasText: "macOS" }).click();
    await expect
      .poll(() => decodedPayloads(payloads), { timeout: 15_000 })
      .toContain("download_clicked");
    await page.goto("/pricing");
    const popupPromise = page.waitForEvent("popup");
    await page
      .getByRole("link", { name: /buy license/i })
      .first()
      .click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(/store\.example\.test/);

    await expect
      .poll(() => decodedPayloads(payloads), { timeout: 15_000 })
      .toContain("checkout_started");
    const payload = decodedPayloads(payloads);
    expect(payload).toContain("download_clicked");
    expect(payload).toContain("macos");
    expect(payload).toContain("home");
    expect(payload).toContain("checkout_started");
    expect(payload).toContain("desktop_license");
    expect(payload).toContain("pricing-card");
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
