import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('downloads', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  describe('getMacDownloadUrl', () => {
    it('returns correct URL with default values', async () => {
      const { getMacDownloadUrl } = await import('./downloads');
      expect(getMacDownloadUrl()).toBe(
        'https://github.com/mdbaldwin1/carvd-studio/releases/latest/download/Carvd-Studio-1.0.0.dmg'
      );
    });

    it('uses custom repo from env', async () => {
      vi.stubEnv('VITE_GITHUB_REPO', 'customuser/custom-repo');
      vi.stubEnv('VITE_APP_VERSION', '2.0.0');
      const { getMacDownloadUrl } = await import('./downloads');
      expect(getMacDownloadUrl()).toBe(
        'https://github.com/customuser/custom-repo/releases/latest/download/Carvd-Studio-2.0.0.dmg'
      );
    });
  });

  describe('getWindowsDownloadUrl', () => {
    it('returns correct URL with default values', async () => {
      const { getWindowsDownloadUrl } = await import('./downloads');
      expect(getWindowsDownloadUrl()).toBe(
        'https://github.com/mdbaldwin1/carvd-studio/releases/latest/download/Carvd-Studio-Setup-1.0.0.exe'
      );
    });

    it('uses custom repo from env', async () => {
      vi.stubEnv('VITE_GITHUB_REPO', 'customuser/custom-repo');
      vi.stubEnv('VITE_APP_VERSION', '2.0.0');
      const { getWindowsDownloadUrl } = await import('./downloads');
      expect(getWindowsDownloadUrl()).toBe(
        'https://github.com/customuser/custom-repo/releases/latest/download/Carvd-Studio-Setup-2.0.0.exe'
      );
    });
  });

  describe('getMacDownloadInfo', () => {
    it('returns complete download info', async () => {
      const { getMacDownloadInfo } = await import('./downloads');
      const info = getMacDownloadInfo();
      expect(info).toEqual({
        url: 'https://github.com/mdbaldwin1/carvd-studio/releases/latest/download/Carvd-Studio-1.0.0.dmg',
        platform: 'macos',
        fileName: 'Carvd-Studio-1.0.0.dmg',
        fileExtension: '.dmg',
        minOsVersion: 'macOS 10.15+',
      });
    });
  });

  describe('getWindowsDownloadInfo', () => {
    it('returns complete download info', async () => {
      const { getWindowsDownloadInfo } = await import('./downloads');
      const info = getWindowsDownloadInfo();
      expect(info).toEqual({
        url: 'https://github.com/mdbaldwin1/carvd-studio/releases/latest/download/Carvd-Studio-Setup-1.0.0.exe',
        platform: 'windows',
        fileName: 'Carvd-Studio-Setup-1.0.0.exe',
        fileExtension: '.exe',
        minOsVersion: 'Windows 10+',
      });
    });
  });

  describe('getAppVersion', () => {
    it('returns default version', async () => {
      const { getAppVersion } = await import('./downloads');
      expect(getAppVersion()).toBe('1.0.0');
    });

    it('returns custom version from env', async () => {
      vi.stubEnv('VITE_APP_VERSION', '3.2.1');
      const { getAppVersion } = await import('./downloads');
      expect(getAppVersion()).toBe('3.2.1');
    });
  });
});
