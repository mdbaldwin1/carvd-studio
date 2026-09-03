import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HomePage from "../../src/pages/HomePage";
import { captureDownloadClick } from "../../src/utils/downloads";

// Mock the downloads utility
vi.mock("../../src/utils/downloads", () => ({
  captureDownloadClick: vi.fn(),
  getTrackedDownloadUrl: (platform: string, source = "website") =>
    `/api/download?platform=${platform}&source=${encodeURIComponent(source)}`,
  getDownloadHref: (download: { platform: string }, source = "website") =>
    `/api/download?platform=${download.platform}&source=${encodeURIComponent(
      source,
    )}`,
  useDownloadInfo: () => ({
    loading: false,
    version: "0.1.0",
    macArm64Download: {
      url: "https://github.com/test/repo/releases/download/v0.1.0/Carvd.Studio-0.1.0-arm64.dmg",
      platform: "macos-arm64",
      fileName: "Carvd.Studio-0.1.0-arm64.dmg",
      fileExtension: ".dmg",
      minOsVersion: "macOS 12+",
      architectureLabel: "Apple Silicon",
    },
    macX64Download: {
      url: "https://github.com/test/repo/releases/download/v0.1.0/Carvd.Studio-0.1.0-x64.dmg",
      platform: "macos-x64",
      fileName: "Carvd.Studio-0.1.0-x64.dmg",
      fileExtension: ".dmg",
      minOsVersion: "macOS 12+",
      architectureLabel: "Intel",
    },
    windowsDownload: {
      url: "https://github.com/test/repo/releases/download/v0.1.0/Carvd.Studio.Setup.0.1.0.exe",
      platform: "windows",
      fileName: "Carvd.Studio.Setup.0.1.0.exe",
      fileExtension: ".exe",
      minOsVersion: "Windows 10+",
    },
    linuxDownload: {
      url: "https://github.com/test/repo/releases/download/v0.1.0/Carvd.Studio-0.1.0-x86_64.AppImage",
      platform: "linux",
      fileName: "Carvd.Studio-0.1.0-x86_64.AppImage",
      fileExtension: ".AppImage",
      minOsVersion: "64-bit Linux",
      architectureLabel: "x64",
    },
  }),
}));

const renderHomePage = () => {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
};

describe("HomePage", () => {
  describe("rendering", () => {
    it("renders without crashing", () => {
      expect(() => renderHomePage()).not.toThrow();
    });

    it("renders hero headline", () => {
      renderHomePage();
      expect(screen.getByText(/Stop Wasting Wood/i)).toBeInTheDocument();
      expect(screen.getByText(/Start Building Smarter/i)).toBeInTheDocument();
    });

    it("renders hero subtitle", () => {
      renderHomePage();
      expect(
        screen.getByText(/Professional furniture design software/i),
      ).toBeInTheDocument();
    });

    it("renders trial messaging", () => {
      renderHomePage();
      // Multiple places may have this text, so use getAllByText
      const trialTexts = screen.getAllByText(/14-day free trial/i);
      expect(trialTexts.length).toBeGreaterThan(0);
    });
  });

  describe("navigation", () => {
    it("renders navigation links in header", () => {
      renderHomePage();
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

    it("renders brand link", () => {
      renderHomePage();
      const header = screen.getByRole("banner");
      expect(
        within(header).getByRole("link", { name: /carvd studio/i }),
      ).toBeInTheDocument();
    });

    it("renders download button in nav", () => {
      renderHomePage();
      const header = screen.getByRole("banner");
      expect(
        within(header).getByRole("link", { name: /download/i }),
      ).toBeInTheDocument();
    });
  });

  describe("download section", () => {
    it("records the platform and stable location before the download link navigates", () => {
      renderHomePage();

      fireEvent.click(screen.getAllByRole("link", { name: /macOS/i })[0]);

      expect(captureDownloadClick).toHaveBeenCalledWith(
        "macos-arm64",
        "home-hero-card",
      );
    });

    it("renders download section heading", () => {
      renderHomePage();
      expect(screen.getByText(/Download Carvd Studio/i)).toBeInTheDocument();
    });

    it("renders macOS download card", () => {
      renderHomePage();
      // macOS appears in badge and download card - use download-specific content
      expect(screen.getByText("Apple Silicon")).toBeInTheDocument();
      expect(screen.getByText("Intel")).toBeInTheDocument();
    });

    it("renders Windows download card", () => {
      renderHomePage();
      // Windows appears in badge and download card - use download-specific content
      const exeInstallerText = screen.getByText(/\.exe installer/i);
      expect(exeInstallerText).toBeInTheDocument();
      // Find the download card containing .exe and verify Windows is there
      const downloadCard = exeInstallerText.closest("a");
      expect(downloadCard).toHaveTextContent(/Windows/i);
    });

    it("renders a tracked Linux AppImage download card", () => {
      renderHomePage();
      const appImageText = screen.getByText(/\.AppImage download/i);
      const linuxLink = appImageText.closest("a");

      expect(linuxLink).toHaveTextContent(/Linux/i);
      expect(linuxLink).toHaveAttribute(
        "href",
        expect.stringContaining("platform=linux"),
      );
    });

    it("has correct macOS download href", () => {
      renderHomePage();
      // Find the download card by the .dmg installer text
      const macLinks = screen.getAllByRole("link", { name: /macOS/i });
      expect(macLinks[0]).toHaveAttribute(
        "href",
        expect.stringContaining("platform=macos-arm64"),
      );
      expect(macLinks[1]).toHaveAttribute(
        "href",
        expect.stringContaining("platform=macos-x64"),
      );
    });

    it("has correct Windows download href", () => {
      renderHomePage();
      // Find the download card by the .exe installer text
      const exeInstallerText = screen.getByText(/\.exe installer/i);
      const winLink = exeInstallerText.closest("a");
      expect(winLink).toHaveAttribute(
        "href",
        expect.stringContaining("/api/download"),
      );
      expect(winLink).toHaveAttribute(
        "href",
        expect.stringContaining("platform=windows"),
      );
    });

    it("displays system requirements", () => {
      renderHomePage();
      expect(screen.getAllByText(/macOS 12\+/i)).toHaveLength(2);
      expect(screen.getByText(/Windows 10\+/i)).toBeInTheDocument();
      expect(screen.getByText(/64-bit Linux/i)).toBeInTheDocument();
    });

    it("displays version badge", () => {
      renderHomePage();
      expect(screen.getByText(/Version 0\.1\.0/i)).toBeInTheDocument();
    });
  });

  describe("features section", () => {
    it("renders feature cards", () => {
      renderHomePage();
      expect(
        screen.getByText(/See It Before You Build It/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Cut Lists That Save You Money/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Know Your Costs Before You Quote/i),
      ).toBeInTheDocument();
    });

    it("renders stats section", () => {
      renderHomePage();
      expect(screen.getByText(/Material Waste/i)).toBeInTheDocument();
      expect(screen.getByText(/Project Planning/i)).toBeInTheDocument();
      expect(screen.getByText(/Projects & Designs/i)).toBeInTheDocument();
    });
  });

  describe("use cases section", () => {
    it("renders use case cards", () => {
      renderHomePage();
      expect(screen.getByText(/Custom Cabinet Shops/i)).toBeInTheDocument();
      expect(screen.getByText(/Furniture Makers/i)).toBeInTheDocument();
      expect(screen.getByText(/DIY Enthusiasts/i)).toBeInTheDocument();
    });
  });

  describe("comparison section", () => {
    it("renders pricing comparison table", () => {
      renderHomePage();
      expect(screen.getByText(/The Math Is Simple/i)).toBeInTheDocument();
      expect(screen.getByText(/\$59\.99 once/i)).toBeInTheDocument();
    });
  });

  describe("CTA section", () => {
    it("renders final CTA", () => {
      renderHomePage();
      expect(screen.getByText(/Ready to Build Smarter/i)).toBeInTheDocument();
    });

    it("renders buy button", () => {
      renderHomePage();
      expect(
        screen.getByRole("link", { name: /buy license/i }),
      ).toBeInTheDocument();
    });
  });

  describe("footer", () => {
    it("renders footer links", () => {
      renderHomePage();
      expect(
        screen.getByRole("link", { name: /privacy policy/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /terms of service/i }),
      ).toBeInTheDocument();
    });

    it("renders copyright", () => {
      renderHomePage();
      expect(screen.getByText(/© 2026 Carvd Studio/i)).toBeInTheDocument();
    });

    it("renders support link", () => {
      renderHomePage();
      expect(
        screen.getByRole("link", { name: /support/i }),
      ).toBeInTheDocument();
    });
  });
});
