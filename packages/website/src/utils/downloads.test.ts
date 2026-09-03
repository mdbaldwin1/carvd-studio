import { describe, it, expect, vi, beforeEach } from "vitest";
import { websiteAnalytics } from "../analytics/analytics";
import {
  getMacDownloadUrl,
  getWindowsDownloadUrl,
  getTrackedDownloadUrl,
  getDownloadHref,
  getMacDownloadInfo,
  getWindowsDownloadInfo,
  fetchLatestVersion,
  _resetCache,
  captureDownloadClick,
} from "./downloads";

vi.mock("../analytics/analytics", () => ({
  websiteAnalytics: { capture: vi.fn() },
}));

beforeEach(() => {
  _resetCache();
  vi.restoreAllMocks();
});

describe("downloads", () => {
  describe("getMacDownloadUrl", () => {
    it("returns the Apple Silicon URL for a given version", () => {
      expect(getMacDownloadUrl("1.2.3", "arm64")).toBe(
        "https://github.com/mdbaldwin1/carvd-studio/releases/download/v1.2.3/Carvd.Studio-1.2.3-arm64.dmg",
      );
    });

    it("returns the Intel URL for a given version", () => {
      expect(getMacDownloadUrl("1.2.3", "x64")).toBe(
        "https://github.com/mdbaldwin1/carvd-studio/releases/download/v1.2.3/Carvd.Studio-1.2.3-x64.dmg",
      );
    });
  });

  describe("getWindowsDownloadUrl", () => {
    it("returns correct URL for a given version", () => {
      expect(getWindowsDownloadUrl("1.2.3")).toBe(
        "https://github.com/mdbaldwin1/carvd-studio/releases/download/v1.2.3/Carvd.Studio.Setup.1.2.3.exe",
      );
    });
  });

  describe("getTrackedDownloadUrl", () => {
    it("returns an architecture-specific tracked macOS endpoint", () => {
      expect(getTrackedDownloadUrl("macos-x64", "download-page")).toBe(
        "/api/download?platform=macos-x64&source=download-page",
      );
    });

    it("encodes custom source values", () => {
      expect(getTrackedDownloadUrl("windows", "home hero")).toBe(
        "/api/download?platform=windows&source=home%20hero",
      );
    });
  });

  describe("getDownloadHref", () => {
    it("uses direct asset URL on localhost", () => {
      const href = getDownloadHref(
        {
          url: "https://github.com/example/mac.dmg",
          trackedUrl: "/api/download?platform=macos&source=website",
          platform: "macos",
          fileName: "mac.dmg",
          fileExtension: ".dmg",
          minOsVersion: "macOS 10.15+",
        },
        "download-hero-card",
        "localhost",
      );

      expect(href).toBe("https://github.com/example/mac.dmg");
    });

    it("uses tracked redirect on non-local hosts", () => {
      const href = getDownloadHref(
        {
          url: "https://github.com/example/win.exe",
          trackedUrl: "/api/download?platform=windows&source=website",
          platform: "windows",
          fileName: "win.exe",
          fileExtension: ".exe",
          minOsVersion: "Windows 10+",
        },
        "download-hero-card",
        "carvd-studio.com",
      );

      expect(href).toContain("/api/download");
      expect(href).toContain("platform=windows");
      expect(href).toContain("source=download-hero-card");
    });
  });

  describe("captureDownloadClick", () => {
    it("captures the platform and stable location without affecting navigation", () => {
      captureDownloadClick("macos", "download-hero-card");

      expect(websiteAnalytics.capture).toHaveBeenCalledWith(
        "download_clicked",
        {
          platform: "macos",
          location: "download-hero-card",
        },
      );
    });

    it("contains analytics failures", () => {
      vi.mocked(websiteAnalytics.capture).mockImplementationOnce(() => {
        throw new Error("offline");
      });

      expect(() =>
        captureDownloadClick("windows", "download-cta-footer"),
      ).not.toThrow();
    });
  });

  describe("getMacDownloadInfo", () => {
    it("returns complete Intel download info", () => {
      const info = getMacDownloadInfo("0.1.0", "x64");
      expect(info).toEqual({
        url: "https://github.com/mdbaldwin1/carvd-studio/releases/download/v0.1.0/Carvd.Studio-0.1.0-x64.dmg",
        trackedUrl: "/api/download?platform=macos-x64&source=website",
        platform: "macos-x64",
        fileName: "Carvd.Studio-0.1.0-x64.dmg",
        fileExtension: ".dmg",
        minOsVersion: "macOS 10.15+",
        architectureLabel: "Intel",
      });
    });
  });

  describe("getWindowsDownloadInfo", () => {
    it("returns complete download info", () => {
      const info = getWindowsDownloadInfo("0.1.0");
      expect(info).toEqual({
        url: "https://github.com/mdbaldwin1/carvd-studio/releases/download/v0.1.0/Carvd.Studio.Setup.0.1.0.exe",
        trackedUrl: "/api/download?platform=windows&source=website",
        platform: "windows",
        fileName: "Carvd.Studio.Setup.0.1.0.exe",
        fileExtension: ".exe",
        minOsVersion: "Windows 10+",
      });
    });
  });

  describe("fetchLatestVersion", () => {
    it("fetches version from GitHub API", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tag_name: "v2.0.0" }),
      } as Response);

      const version = await fetchLatestVersion();
      expect(version).toBe("2.0.0");
      expect(fetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/mdbaldwin1/carvd-studio/releases/latest",
      );
    });

    it("strips v prefix from tag name", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tag_name: "v3.1.4" }),
      } as Response);

      expect(await fetchLatestVersion()).toBe("3.1.4");
    });

    it("returns fallback version on network error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
        new Error("Network error"),
      );

      const version = await fetchLatestVersion();
      expect(version).toBe("0.1.0");
    });

    it("returns fallback version on non-OK response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const version = await fetchLatestVersion();
      expect(version).toBe("0.1.0");
    });

    it("caches the result after first successful fetch", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ tag_name: "v1.0.0" }),
      } as Response);

      await fetchLatestVersion();
      await fetchLatestVersion();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("re-fetches after cache reset", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ tag_name: "v1.0.0" }),
      } as Response);

      await fetchLatestVersion();
      _resetCache();
      await fetchLatestVersion();

      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });
});
