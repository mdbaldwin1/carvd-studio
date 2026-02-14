/**
 * Download URL utilities for Carvd Studio installers
 *
 * Downloads are hosted on GitHub Releases.
 * The latest version is fetched dynamically from the GitHub API,
 * so the website never needs redeploying for new desktop releases.
 */

import { useState, useEffect } from "react";

const GITHUB_REPO = "mdbaldwin1/carvd-studio";
const FALLBACK_VERSION = "0.1.0";

export interface DownloadInfo {
  url: string;
  platform: "macos" | "windows";
  fileName: string;
  fileExtension: string;
  minOsVersion: string;
}

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
export function getMacDownloadUrl(version: string): string {
  return `https://github.com/${GITHUB_REPO}/releases/download/v${version}/Carvd.Studio-${version}-arm64.dmg`;
}

/**
 * Get download URL for Windows installer (.exe)
 */
export function getWindowsDownloadUrl(version: string): string {
  return `https://github.com/${GITHUB_REPO}/releases/download/v${version}/Carvd.Studio.Setup.${version}.exe`;
}

/**
 * Get full download info for macOS
 */
export function getMacDownloadInfo(version: string): DownloadInfo {
  return {
    url: getMacDownloadUrl(version),
    platform: "macos",
    fileName: `Carvd.Studio-${version}-arm64.dmg`,
    fileExtension: ".dmg",
    minOsVersion: "macOS 10.15+",
  };
}

/**
 * Get full download info for Windows
 */
export function getWindowsDownloadInfo(version: string): DownloadInfo {
  return {
    url: getWindowsDownloadUrl(version),
    platform: "windows",
    fileName: `Carvd.Studio.Setup.${version}.exe`,
    fileExtension: ".exe",
    minOsVersion: "Windows 10+",
  };
}

export interface UseDownloadInfoResult {
  loading: boolean;
  version: string;
  macDownload: DownloadInfo;
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
    macDownload: getMacDownloadInfo(version),
    windowsDownload: getWindowsDownloadInfo(version),
  };
}

/** Reset the cached version (for testing) */
export function _resetCache(): void {
  cachedVersion = null;
}
