import { beforeEach, describe, expect, it, vi } from "vitest";

const posthog = vi.hoisted(() => ({ init: vi.fn(), capture: vi.fn() }));

vi.mock("posthog-js", () => ({ default: posthog }));

describe("website analytics", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("initializes PostHog once with explicit privacy-safe settings", async () => {
    vi.stubEnv("VITE_POSTHOG_KEY", "public-key");
    vi.stubEnv("VITE_POSTHOG_HOST", "https://us.i.posthog.com");
    const { initializeWebsiteAnalytics } = await import("./analytics");

    initializeWebsiteAnalytics();
    initializeWebsiteAnalytics();

    expect(posthog.init).toHaveBeenCalledTimes(1);
    expect(posthog.init).toHaveBeenCalledWith("public-key", {
      api_host: "https://us.i.posthog.com",
      autocapture: false,
      disable_session_recording: true,
      capture_pageview: false,
      advanced_disable_flags: true,
      persistence: "localStorage",
      request_batching: true,
    });
  });

  it.each([
    ["", "https://us.i.posthog.com"],
    ["public-key", ""],
  ])(
    "does nothing when a required PostHog setting is blank",
    async (key, host) => {
      vi.stubEnv("VITE_POSTHOG_KEY", key);
      vi.stubEnv("VITE_POSTHOG_HOST", host);
      const { initializeWebsiteAnalytics, websiteAnalytics } =
        await import("./analytics");

      initializeWebsiteAnalytics();
      websiteAnalytics.capture("download_clicked", {
        platform: "macos",
        location: "download-hero-card",
      });

      expect(posthog.init).not.toHaveBeenCalled();
      expect(posthog.capture).not.toHaveBeenCalled();
    },
  );

  it("contains PostHog capture failures", async () => {
    vi.stubEnv("VITE_POSTHOG_KEY", "public-key");
    vi.stubEnv("VITE_POSTHOG_HOST", "https://us.i.posthog.com");
    posthog.capture.mockImplementationOnce(() => {
      throw new Error("offline");
    });
    const { initializeWebsiteAnalytics, websiteAnalytics } =
      await import("./analytics");

    initializeWebsiteAnalytics();

    expect(() =>
      websiteAnalytics.capture("checkout_started", {
        product: "desktop_license",
        location: "pricing-card",
      }),
    ).not.toThrow();
  });
});
