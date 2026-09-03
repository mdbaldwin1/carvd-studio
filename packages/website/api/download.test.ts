import { beforeEach, describe, expect, it, vi } from "vitest";
import handler from "./download";

const release = {
  tag_name: "v1.2.3",
  assets: [
    {
      name: "Carvd.Studio-1.2.3-arm64.dmg",
      browser_download_url: "https://example.test/apple-silicon.dmg",
    },
    {
      name: "Carvd.Studio-1.2.3-x64.dmg",
      browser_download_url: "https://example.test/intel.dmg",
    },
    {
      name: "Carvd.Studio.Setup.1.2.3.exe",
      browser_download_url: "https://example.test/windows.exe",
    },
    {
      name: "Carvd.Studio-1.2.3-x86_64.AppImage",
      browser_download_url: "https://example.test/linux.AppImage",
    },
    {
      name: "Carvd.Studio-1.2.3-amd64.deb",
      browser_download_url: "https://example.test/linux.deb",
    },
  ],
};

describe("download redirect", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => release,
    } as Response);
  });

  it.each([
    ["macos-arm64", "https://example.test/apple-silicon.dmg"],
    ["macos-x64", "https://example.test/intel.dmg"],
    ["windows", "https://example.test/windows.exe"],
    ["linux", "https://example.test/linux.AppImage"],
  ])(
    "redirects %s to its matching release artifact",
    async (platform, expected) => {
      const response = await handler(
        new Request(
          `https://carvd-studio.com/api/download?platform=${platform}`,
        ),
      );

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe(expected);
    },
  );

  it("keeps legacy macOS requests compatible with Apple Silicon", async () => {
    const response = await handler(
      new Request("https://carvd-studio.com/api/download?platform=macos"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "https://example.test/apple-silicon.dmg",
    );
  });
});
