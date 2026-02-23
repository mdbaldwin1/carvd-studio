import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import DownloadPage from "../../src/pages/DownloadPage";

// Mock the downloads utility
vi.mock("../../src/utils/downloads", () => ({
  getTrackedDownloadUrl: (platform: "macos" | "windows", source = "website") =>
    `/api/download?platform=${platform}&source=${encodeURIComponent(source)}`,
  getDownloadHref: (
    download: { platform: "macos" | "windows" },
    source = "website",
  ) =>
    `/api/download?platform=${download.platform}&source=${encodeURIComponent(
      source,
    )}`,
  useDownloadInfo: () => ({
    loading: false,
    version: "0.1.0",
    macDownload: {
      url: "https://github.com/test/repo/releases/download/v0.1.0/Carvd.Studio-0.1.0-arm64.dmg",
      platform: "macos",
      fileName: "Carvd.Studio-0.1.0-arm64.dmg",
      fileExtension: ".dmg",
      minOsVersion: "macOS 10.15+",
    },
    windowsDownload: {
      url: "https://github.com/test/repo/releases/download/v0.1.0/Carvd.Studio.Setup.0.1.0.exe",
      platform: "windows",
      fileName: "Carvd.Studio.Setup.0.1.0.exe",
      fileExtension: ".exe",
      minOsVersion: "Windows 10+",
    },
  }),
}));

const renderDownloadPage = () => {
  return render(
    <BrowserRouter>
      <DownloadPage />
    </BrowserRouter>,
  );
};

describe("DownloadPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders without crashing", () => {
      renderDownloadPage();
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: /Download Carvd Studio/i,
        }),
      ).toBeInTheDocument();
    });

    it("renders page heading", () => {
      renderDownloadPage();
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: /Download Carvd Studio/i,
        }),
      ).toBeInTheDocument();
    });

    it("renders version badge", () => {
      renderDownloadPage();
      expect(screen.getByText(/Version 0.1.0/i)).toBeInTheDocument();
    });
  });

  describe("download cards", () => {
    it("renders macOS download card", () => {
      renderDownloadPage();
      // "macOS" appears in download card, installation section, and system requirements
      expect(screen.getAllByText("macOS").length).toBeGreaterThan(0);
      expect(screen.getByText(".dmg installer")).toBeInTheDocument();
      expect(screen.getByText("macOS 10.15+")).toBeInTheDocument();
    });

    it("renders Windows download card", () => {
      renderDownloadPage();
      // "Windows" appears in download card, installation section, and system requirements
      expect(screen.getAllByText("Windows").length).toBeGreaterThan(0);
      expect(screen.getByText(".exe installer")).toBeInTheDocument();
      expect(screen.getByText("Windows 10+")).toBeInTheDocument();
    });

    it("has correct macOS download link", () => {
      renderDownloadPage();
      // Get all macOS links (download cards + CTA buttons)
      const macLinks = screen.getAllByRole("link", { name: /macOS/i });
      expect(macLinks[0]).toHaveAttribute(
        "href",
        expect.stringContaining("/api/download"),
      );
      expect(macLinks[0]).toHaveAttribute(
        "href",
        expect.stringContaining("platform=macos"),
      );
    });

    it("has correct Windows download link", () => {
      renderDownloadPage();
      // Get all Windows links (download cards + CTA buttons)
      const windowsLinks = screen.getAllByRole("link", { name: /Windows/i });
      expect(windowsLinks[0]).toHaveAttribute(
        "href",
        expect.stringContaining("/api/download"),
      );
      expect(windowsLinks[0]).toHaveAttribute(
        "href",
        expect.stringContaining("platform=windows"),
      );
    });
  });

  describe("installation instructions", () => {
    it("renders macOS installation section", () => {
      renderDownloadPage();
      expect(screen.getByText(/macOS Installation/i)).toBeInTheDocument();
    });

    it("renders Windows installation section", () => {
      renderDownloadPage();
      expect(screen.getByText(/Windows Installation/i)).toBeInTheDocument();
    });

    it("renders macOS security warning", () => {
      renderDownloadPage();
      expect(screen.getByText(/First launch on macOS/i)).toBeInTheDocument();
    });

    it("renders Windows SmartScreen warning", () => {
      renderDownloadPage();
      // There are multiple elements with Windows SmartScreen, check at least one exists
      const elements = screen.getAllByText(/Windows SmartScreen/i);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe("version history", () => {
    it("renders version history section", () => {
      renderDownloadPage();
      expect(screen.getByText(/Version History/i)).toBeInTheDocument();
    });

    it("renders current version entry", () => {
      renderDownloadPage();
      expect(screen.getByText(/v0.1.0/)).toBeInTheDocument();
      expect(screen.getByText(/Initial Release/i)).toBeInTheDocument();
    });
  });

  describe("system requirements", () => {
    it("renders system requirements section", () => {
      renderDownloadPage();
      expect(screen.getByText(/System Requirements/i)).toBeInTheDocument();
    });

    it("renders macOS requirements", () => {
      renderDownloadPage();
      expect(
        screen.getByText(/macOS 10.15 \(Catalina\) or later/i),
      ).toBeInTheDocument();
    });

    it("renders Windows requirements", () => {
      renderDownloadPage();
      expect(
        screen.getByText(/Windows 10 or later \(64-bit\)/i),
      ).toBeInTheDocument();
    });
  });

  describe("FAQ", () => {
    it("renders FAQ section", () => {
      renderDownloadPage();
      expect(
        screen.getByText(/Frequently Asked Questions/i),
      ).toBeInTheDocument();
    });

    it("renders safety question", () => {
      renderDownloadPage();
      expect(screen.getByText(/Is the download safe\?/i)).toBeInTheDocument();
    });

    it("renders trial question", () => {
      renderDownloadPage();
      expect(
        screen.getByText(/What's included in the free trial\?/i),
      ).toBeInTheDocument();
    });

    it("renders offline question", () => {
      renderDownloadPage();
      expect(
        screen.getByText(/Do I need an internet connection\?/i),
      ).toBeInTheDocument();
    });

    it("renders update question", () => {
      renderDownloadPage();
      expect(
        screen.getByText(/How do I update to a new version\?/i),
      ).toBeInTheDocument();
    });

    it("renders license transfer question", () => {
      renderDownloadPage();
      expect(
        screen.getByText(/Can I transfer my license to a new computer\?/i),
      ).toBeInTheDocument();
    });
  });

  describe("navigation", () => {
    it("renders navigation links in header", () => {
      renderDownloadPage();
      const header = screen.getByRole("banner");
      expect(
        within(header).getByRole("link", { name: /features/i }),
      ).toBeInTheDocument();
      expect(
        within(header).getByRole("link", { name: /pricing/i }),
      ).toBeInTheDocument();
      expect(
        within(header).getByRole("link", { name: /docs/i }),
      ).toBeInTheDocument();
    });

    it("renders brand link in header", () => {
      renderDownloadPage();
      const header = screen.getByRole("banner");
      expect(
        within(header).getByRole("link", { name: /carvd studio/i }),
      ).toBeInTheDocument();
    });
  });

  describe("footer", () => {
    it("renders footer links", () => {
      renderDownloadPage();
      const footer = screen.getByRole("contentinfo");
      expect(
        within(footer).getByRole("link", { name: /privacy policy/i }),
      ).toBeInTheDocument();
      expect(
        within(footer).getByRole("link", { name: /terms of service/i }),
      ).toBeInTheDocument();
      expect(
        within(footer).getByRole("link", { name: /documentation/i }),
      ).toBeInTheDocument();
    });

    it("renders copyright", () => {
      renderDownloadPage();
      expect(screen.getByText(/© 2026 Carvd Studio/i)).toBeInTheDocument();
    });
  });

  describe("CTA section", () => {
    it("renders CTA section", () => {
      renderDownloadPage();
      expect(
        screen.getByText(/Ready to start designing\?/i),
      ).toBeInTheDocument();
    });

    it("renders CTA download buttons", () => {
      renderDownloadPage();
      expect(
        screen.getByRole("link", { name: /Download for macOS/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Download for Windows/i }),
      ).toBeInTheDocument();
    });
  });
});
