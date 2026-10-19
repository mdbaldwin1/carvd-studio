import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { checkForUpdates, showMessageBox } = vi.hoisted(() => ({
  checkForUpdates: vi.fn(),
  showMessageBox: vi.fn()
}));

vi.mock('electron-updater', () => ({ default: { autoUpdater: { checkForUpdates } } }));
vi.mock('electron', () => ({
  BrowserWindow: { getAllWindows: vi.fn(() => []) },
  dialog: { showMessageBox },
  app: { getVersion: () => '1.3.0' }
}));
vi.mock('electron-log', () => ({
  default: { transports: { file: {} }, info: vi.fn(), error: vi.fn() }
}));
vi.mock('./store', () => ({ getLastKnownVersion: vi.fn(), setLastKnownVersion: vi.fn() }));

import { checkForUpdatesManual } from './updater';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NODE_ENV', 'production');
});

afterEach(() => vi.unstubAllEnvs());

describe('manual update checks', () => {
  it.each(['1.0.4', '1.3.0', '1.4.0'])('reports no eligible update when the feed offers %s', async (version) => {
    checkForUpdates.mockResolvedValue({ isUpdateAvailable: false, updateInfo: { version } });

    await checkForUpdatesManual();

    expect(showMessageBox).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        message: "You're up to date!",
        detail: 'No newer update is available for Carvd Studio 1.3.0.'
      })
    );
  });

  it('leaves eligible update presentation to the update-available event', async () => {
    checkForUpdates.mockResolvedValue({ isUpdateAvailable: true, updateInfo: { version: '1.4.0' } });

    await checkForUpdatesManual();

    expect(showMessageBox).not.toHaveBeenCalled();
  });

  it('does not claim an unavailable check proved the app is current', async () => {
    checkForUpdates.mockResolvedValue(null);

    await checkForUpdatesManual();

    expect(showMessageBox).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Update checking is unavailable for this build.' })
    );
  });

  it('reports a failed check', async () => {
    checkForUpdates.mockRejectedValue(new Error('offline'));

    await checkForUpdatesManual();

    expect(showMessageBox).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Update Check Failed', type: 'error' })
    );
  });

  it('explains development mode without contacting the update feed', async () => {
    vi.stubEnv('NODE_ENV', 'development');

    await checkForUpdatesManual();

    expect(checkForUpdates).not.toHaveBeenCalled();
    expect(showMessageBox).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Update checking is disabled in development mode.' })
    );
  });
});
