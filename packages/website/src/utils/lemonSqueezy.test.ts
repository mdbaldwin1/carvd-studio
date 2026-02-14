import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to test the module with different env configurations
// so we'll use dynamic imports and mock the env

describe("lemonSqueezy", () => {
  const originalNavigator = window.navigator;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    // Restore navigator
    Object.defineProperty(window, "navigator", {
      value: originalNavigator,
      writable: true,
    });
  });

  describe("detectPlatform", () => {
    it('returns macos when user agent contains "mac"', async () => {
      Object.defineProperty(window, "navigator", {
        value: {
          userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        writable: true,
      });

      const { detectPlatform } = await import("./lemonSqueezy");
      expect(detectPlatform()).toBe("macos");
    });

    it('returns windows when user agent does not contain "mac"', async () => {
      Object.defineProperty(window, "navigator", {
        value: {
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        writable: true,
      });

      const { detectPlatform } = await import("./lemonSqueezy");
      expect(detectPlatform()).toBe("windows");
    });

    it("returns windows for Linux user agent", async () => {
      Object.defineProperty(window, "navigator", {
        value: {
          userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        },
        writable: true,
      });

      const { detectPlatform } = await import("./lemonSqueezy");
      expect(detectPlatform()).toBe("windows");
    });

    it("is case insensitive for mac detection", async () => {
      Object.defineProperty(window, "navigator", {
        value: {
          userAgent: "Mozilla/5.0 (MAC; Intel Mac OS X)",
        },
        writable: true,
      });

      const { detectPlatform } = await import("./lemonSqueezy");
      expect(detectPlatform()).toBe("macos");
    });
  });

  describe("getCheckoutUrl", () => {
    it("returns checkout URL when VITE_LEMON_SQUEEZY_CHECKOUT_URL is configured", async () => {
      vi.stubEnv(
        "VITE_LEMON_SQUEEZY_CHECKOUT_URL",
        "https://store.lemonsqueezy.com/checkout/buy/123",
      );

      const { getCheckoutUrl } = await import("./lemonSqueezy");
      expect(getCheckoutUrl()).toBe(
        "https://store.lemonsqueezy.com/checkout/buy/123",
      );
    });

    it("returns /pricing when checkout URL is not configured", async () => {
      vi.stubEnv("VITE_LEMON_SQUEEZY_CHECKOUT_URL", "");

      const { getCheckoutUrl } = await import("./lemonSqueezy");
      expect(getCheckoutUrl()).toBe("/pricing");
    });

    it("returns /pricing when env vars are undefined", async () => {
      vi.stubEnv(
        "VITE_LEMON_SQUEEZY_CHECKOUT_URL",
        undefined as unknown as string,
      );

      const { getCheckoutUrl } = await import("./lemonSqueezy");
      expect(getCheckoutUrl()).toBe("/pricing");
    });
  });

  describe("isLemonSqueezyConfigured", () => {
    it("returns true when CHECKOUT_URL is set", async () => {
      vi.stubEnv(
        "VITE_LEMON_SQUEEZY_CHECKOUT_URL",
        "https://store.lemonsqueezy.com/checkout/buy/123",
      );

      const { isLemonSqueezyConfigured } = await import("./lemonSqueezy");
      expect(isLemonSqueezyConfigured()).toBe(true);
    });

    it("returns false when checkout URL is not configured", async () => {
      vi.stubEnv("VITE_LEMON_SQUEEZY_CHECKOUT_URL", "");

      const { isLemonSqueezyConfigured } = await import("./lemonSqueezy");
      expect(isLemonSqueezyConfigured()).toBe(false);
    });
  });
});
