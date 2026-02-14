import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getMacDownloadUrl,
  getWindowsDownloadUrl,
  getMacDownloadInfo,
  getWindowsDownloadInfo,
  fetchLatestVersion,
  _resetCache,
} from "./downloads";

beforeEach(() => {
  _resetCache();
  vi.restoreAllMocks();
});

describe("downloads", () => {
  describe("getMacDownloadUrl", () => {
    it("returns correct URL for a given version", () => {
      expect(getMacDownloadUrl("1.2.3")).toBe(
        "https://github.com/mdbaldwin1/carvd-studio/releases/download/v1.2.3/Carvd.Studio-1.2.3-arm64.dmg",
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

  describe("getMacDownloadInfo", () => {
    it("returns complete download info", () => {
      const info = getMacDownloadInfo("0.1.0");
      expect(info).toEqual({
        url: "https://github.com/mdbaldwin1/carvd-studio/releases/download/v0.1.0/Carvd.Studio-0.1.0-arm64.dmg",
        platform: "macos",
        fileName: "Carvd.Studio-0.1.0-arm64.dmg",
        fileExtension: ".dmg",
        minOsVersion: "macOS 10.15+",
      });
    });
  });

  describe("getWindowsDownloadInfo", () => {
    it("returns complete download info", () => {
      const info = getWindowsDownloadInfo("0.1.0");
      expect(info).toEqual({
        url: "https://github.com/mdbaldwin1/carvd-studio/releases/download/v0.1.0/Carvd.Studio.Setup.0.1.0.exe",
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
