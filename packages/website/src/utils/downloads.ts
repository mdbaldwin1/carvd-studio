/**
 * Download URL utilities for Carvd Studio installers
 *
 * Downloads are hosted on GitHub Releases.
 * The latest version is fetched dynamically from the GitHub API,
 * so the website never needs redeploying for new desktop releases.
 */

import { useState, useEffect } from "react";
import { websiteAnalytics } from "../analytics/analytics";

const GITHUB_REPO = "mdbaldwin1/carvd-studio";
const FALLBACK_VERSION = "0.1.0";

export interface DownloadInfo {
  url: string;
  trackedUrl: string;
  platform: "macos-arm64" | "macos-x64" | "windows";
  fileName: string;
  fileExtension: string;
  minOsVersion: string;
  architectureLabel?: "Apple Silicon" | "Intel";
}

export type MacArchitecture = "arm64" | "x64";

/** Module-level cache for the fetched version */
let cachedVersion: string | null = null;

/**
 * Fetch the latest release version from the GitHub API.
 * Results are cached so subsequent calls return instantly.
 */
export async function fetchLatestVersion(): Promise<string> {
  if (cachedVersion) return cachedVersion;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cachedVersion = (data.tag_name as string).replace(/^v/, "");
    return cachedVersion;
  } catch {
    return FALLBACK_VERSION;
  }
}

/**
 * Get download URL for macOS installer (.dmg)
 */
export function getMacDownloadUrl(
  version: string,
  architecture: MacArchitecture,
): string {
  return `https://github.com/${GITHUB_REPO}/releases/download/v${version}/Carvd.Studio-${version}-${architecture}.dmg`;
}

/**
 * Get download URL for Windows installer (.exe)
 */
export function getWindowsDownloadUrl(version: string): string {
  return `https://github.com/${GITHUB_REPO}/releases/download/v${version}/Carvd.Studio.Setup.${version}.exe`;
}

export function getTrackedDownloadUrl(
  platform: DownloadInfo["platform"],
  source: string = "website",
): string {
  const encodedSource = encodeURIComponent(source);
  return `/api/download?platform=${platform}&source=${encodedSource}`;
}

export function getDownloadHref(
  download: DownloadInfo,
  source: string = "website",
  hostnameOverride?: string,
): string {
  const hostname = hostnameOverride ?? window.location.hostname;
  const isLocalDev =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

  if (isLocalDev) {
    return download.url;
  }

  return getTrackedDownloadUrl(download.platform, source);
}

export function captureDownloadClick(
  platform: DownloadInfo["platform"],
  location: string,
): void {
  try {
    websiteAnalytics.capture("download_clicked", { platform, location });
  } catch {
    // Analytics failures must not interrupt the browser's normal navigation.
  }
}

/**
 * Get full download info for macOS
 */
export function getMacDownloadInfo(
  version: string,
  architecture: MacArchitecture,
): DownloadInfo {
  const isAppleSilicon = architecture === "arm64";
  return {
    url: getMacDownloadUrl(version, architecture),
    trackedUrl: getTrackedDownloadUrl(`macos-${architecture}`),
    platform: `macos-${architecture}`,
    fileName: `Carvd.Studio-${version}-${architecture}.dmg`,
    fileExtension: ".dmg",
    minOsVersion: "macOS 12+",
    architectureLabel: isAppleSilicon ? "Apple Silicon" : "Intel",
  };
}

/**
 * Get full download info for Windows
 */
export function getWindowsDownloadInfo(version: string): DownloadInfo {
  return {
    url: getWindowsDownloadUrl(version),
    trackedUrl: getTrackedDownloadUrl("windows"),
    platform: "windows",
    fileName: `Carvd.Studio.Setup.${version}.exe`,
    fileExtension: ".exe",
    minOsVersion: "Windows 10+",
  };
}

export interface UseDownloadInfoResult {
  loading: boolean;
  version: string;
  macArm64Download: DownloadInfo;
  macX64Download: DownloadInfo;
  windowsDownload: DownloadInfo;
}

/**
 * React hook that fetches the latest version from GitHub and
 * returns download info for both platforms.
 */
export function useDownloadInfo(): UseDownloadInfoResult {
  const [version, setVersion] = useState<string>(FALLBACK_VERSION);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchLatestVersion().then((v) => {
      if (!cancelled) {
        setVersion(v);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    loading,
    version,
    macArm64Download: getMacDownloadInfo(version, "arm64"),
    macX64Download: getMacDownloadInfo(version, "x64"),
    windowsDownload: getWindowsDownloadInfo(version),
  };
}

/** Reset the cached version (for testing) */
export function _resetCache(): void {
  cachedVersion = null;
}
