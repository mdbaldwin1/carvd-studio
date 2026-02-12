/**
 * Download URL utilities for Carvd Studio installers
 *
 * Downloads are hosted on GitHub Releases.
 * Configure via environment variables to avoid hardcoding.
 */

const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO || 'mdbaldwin1/carvd-studio';
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.1.0';

export interface DownloadInfo {
  url: string;
  platform: 'macos' | 'windows';
  fileName: string;
  fileExtension: string;
  minOsVersion: string;
}

/**
 * Get download URL for macOS installer (.dmg)
 */
export function getMacDownloadUrl(): string {
  return `https://github.com/${GITHUB_REPO}/releases/latest/download/Carvd.Studio-${APP_VERSION}.dmg`;
}

/**
 * Get download URL for Windows installer (.exe)
 */
export function getWindowsDownloadUrl(): string {
  return `https://github.com/${GITHUB_REPO}/releases/latest/download/Carvd.Studio.Setup.${APP_VERSION}.exe`;
}

/**
 * Get full download info for macOS
 */
export function getMacDownloadInfo(): DownloadInfo {
  return {
    url: getMacDownloadUrl(),
    platform: 'macos',
    fileName: `Carvd.Studio-${APP_VERSION}.dmg`,
    fileExtension: '.dmg',
    minOsVersion: 'macOS 10.15+',
  };
}

/**
 * Get full download info for Windows
 */
export function getWindowsDownloadInfo(): DownloadInfo {
  return {
    url: getWindowsDownloadUrl(),
    platform: 'windows',
    fileName: `Carvd.Studio.Setup.${APP_VERSION}.exe`,
    fileExtension: '.exe',
    minOsVersion: 'Windows 10+',
  };
}

/**
 * Get current app version
 */
export function getAppVersion(): string {
  return APP_VERSION;
}
