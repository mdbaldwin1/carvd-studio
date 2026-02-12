import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { UpdateNotificationBanner } from './UpdateNotificationBanner';

describe('UpdateNotificationBanner', () => {
  let onUpdateAvailableCallback: ((info: { version: string }) => void) | null = null;
  let onUpdateDownloadProgressCallback:
    | ((progress: { percent: number; transferred: number; total: number }) => void)
    | null = null;
  let onUpdateDownloadedCallback: ((info: { version: string }) => void) | null = null;
  let onUpdateErrorCallback: ((err: { message: string }) => void) | null = null;
  let onUpdateJustInstalledCallback:
    | ((info: { previousVersion: string; currentVersion: string }) => void)
    | null = null;

  beforeAll(() => {
    window.electronAPI = {
      onUpdateAvailable: vi.fn((cb) => {
        onUpdateAvailableCallback = cb;
        return () => {
          onUpdateAvailableCallback = null;
        };
      }),
      onUpdateDownloadProgress: vi.fn((cb) => {
        onUpdateDownloadProgressCallback = cb;
        return () => {
          onUpdateDownloadProgressCallback = null;
        };
      }),
      onUpdateDownloaded: vi.fn((cb) => {
        onUpdateDownloadedCallback = cb;
        return () => {
          onUpdateDownloadedCallback = null;
        };
      }),
      onUpdateError: vi.fn((cb) => {
        onUpdateErrorCallback = cb;
        return () => {
          onUpdateErrorCallback = null;
        };
      }),
      onUpdateJustInstalled: vi.fn((cb) => {
        onUpdateJustInstalledCallback = cb;
        return () => {
          onUpdateJustInstalledCallback = null;
        };
      }),
      downloadUpdate: vi.fn(),
      quitAndInstall: vi.fn(),
      openExternal: vi.fn(),
      getPreference: vi.fn(),
      setPreference: vi.fn(),
      onMenuCommand: vi.fn(),
      removeMenuCommandListener: vi.fn()
    } as unknown as typeof window.electronAPI;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    onUpdateAvailableCallback = null;
    onUpdateDownloadProgressCallback = null;
    onUpdateDownloadedCallback = null;
    onUpdateErrorCallback = null;
    onUpdateJustInstalledCallback = null;
    vi.mocked(window.electronAPI.downloadUpdate).mockResolvedValue(undefined);
    vi.mocked(window.electronAPI.quitAndInstall).mockResolvedValue(undefined);
  });

  describe('initial state', () => {
    it('renders nothing when no update is available', () => {
      const { container } = render(<UpdateNotificationBanner />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('update available', () => {
    it('shows banner when update is available', () => {
      render(<UpdateNotificationBanner />);

      act(() => {
        onUpdateAvailableCallback?.({ version: '2.0.0' });
      });

      expect(screen.getByText('Update Available')).toBeInTheDocument();
      expect(screen.getByText(/Version 2.0.0 is available/)).toBeInTheDocument();
    });

    it('shows Download button when update is available', () => {
      render(<UpdateNotificationBanner />);

      act(() => {
        onUpdateAvailableCallback?.({ version: '2.0.0' });
      });

      expect(screen.getByText('Download')).toBeInTheDocument();
    });

    it('calls downloadUpdate when Download is clicked', async () => {
      render(<UpdateNotificationBanner />);

      act(() => {
        onUpdateAvailableCallback?.({ version: '2.0.0' });
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Download'));
      });

      expect(window.electronAPI.downloadUpdate).toHaveBeenCalled();
    });
  });

  describe('download progress', () => {
    it('shows download progress during download', async () => {
      render(<UpdateNotificationBanner />);

      act(() => {
        onUpdateAvailableCallback?.({ version: '2.0.0' });
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Download'));
      });

      act(() => {
        onUpdateDownloadProgressCallback?.({ percent: 50, transferred: 5000, total: 10000 });
      });

      expect(screen.getByText('Downloading Update...')).toBeInTheDocument();
      expect(screen.getByText('50% complete')).toBeInTheDocument();
    });

    it('shows progress bar with correct width', async () => {
      const { container } = render(<UpdateNotificationBanner />);

      act(() => {
        onUpdateAvailableCallback?.({ version: '2.0.0' });
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Download'));
      });

      act(() => {
        onUpdateDownloadProgressCallback?.({ percent: 75, transferred: 7500, total: 10000 });
      });

      const progressBar = container.querySelector('.update-notification-progress-bar') as HTMLElement;
      expect(progressBar?.style.width).toBe('75%');
    });
  });

  describe('update ready', () => {
    it('shows "Update Ready" when download completes', () => {
      render(<UpdateNotificationBanner />);

      act(() => {
        onUpdateAvailableCallback?.({ version: '2.0.0' });
      });

      act(() => {
        onUpdateDownloadedCallback?.({ version: '2.0.0' });
      });

      expect(screen.getByText('Update Ready')).toBeInTheDocument();
      expect(screen.getByText(/Version 2.0.0 is ready to install/)).toBeInTheDocument();
    });

    it('shows "Restart & Update" button when ready', () => {
      render(<UpdateNotificationBanner />);

      act(() => {
        onUpdateAvailableCallback?.({ version: '2.0.0' });
      });

      act(() => {
        onUpdateDownloadedCallback?.({ version: '2.0.0' });
      });

      expect(screen.getByText('Restart & Update')).toBeInTheDocument();
    });

    it('calls quitAndInstall when "Restart & Update" is clicked', async () => {
      render(<UpdateNotificationBanner />);

      act(() => {
        onUpdateAvailableCallback?.({ version: '2.0.0' });
      });

      act(() => {
        onUpdateDownloadedCallback?.({ version: '2.0.0' });
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Restart & Update'));
      });

      expect(window.electronAPI.quitAndInstall).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('shows error message on update error', () => {
      render(<UpdateNotificationBanner />);

      act(() => {
        onUpdateAvailableCallback?.({ version: '2.0.0' });
      });

      act(() => {
        onUpdateErrorCallback?.({ message: 'Network error' });
      });

      expect(screen.getByText('Update Error')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  describe('dismissing', () => {
    it('hides banner when dismiss button is clicked', () => {
      const { container } = render(<UpdateNotificationBanner />);

      act(() => {
        onUpdateAvailableCallback?.({ version: '2.0.0' });
      });

      // Find the dismiss X button (inside btn-ghost)
      const dismissButton = container.querySelector('.btn-ghost');
      fireEvent.click(dismissButton!);

      expect(screen.queryByText('Update Available')).not.toBeInTheDocument();
    });
  });

  describe('changelog link', () => {
    it('shows "What\'s new" link when update is available', () => {
      render(<UpdateNotificationBanner />);

      act(() => {
        onUpdateAvailableCallback?.({ version: '2.0.0' });
      });

      expect(screen.getByText("What's new")).toBeInTheDocument();
    });

    it('shows "What\'s new" link when update is ready', () => {
      render(<UpdateNotificationBanner />);

      act(() => {
        onUpdateAvailableCallback?.({ version: '2.0.0' });
      });

      act(() => {
        onUpdateDownloadedCallback?.({ version: '2.0.0' });
      });

      expect(screen.getByText("What's new")).toBeInTheDocument();
    });

    it('opens changelog URL when "What\'s new" is clicked', () => {
      render(<UpdateNotificationBanner />);

      act(() => {
        onUpdateAvailableCallback?.({ version: '2.0.0' });
      });

      fireEvent.click(screen.getByText("What's new"));

      expect(window.electronAPI.openExternal).toHaveBeenCalledWith(
        'https://carvd-studio.com/changelog'
      );
    });
  });

  describe('just updated', () => {
    it('shows just-updated toast with version', () => {
      render(<UpdateNotificationBanner />);

      act(() => {
        onUpdateJustInstalledCallback?.({
          previousVersion: '1.0.0',
          currentVersion: '2.0.0'
        });
      });

      expect(screen.getByText('Updated to v2.0.0')).toBeInTheDocument();
    });

    it('shows "See what\'s new" changelog link', () => {
      render(<UpdateNotificationBanner />);

      act(() => {
        onUpdateJustInstalledCallback?.({
          previousVersion: '1.0.0',
          currentVersion: '2.0.0'
        });
      });

      expect(screen.getByText("See what's new")).toBeInTheDocument();
    });

    it('opens changelog URL when link is clicked', () => {
      render(<UpdateNotificationBanner />);

      act(() => {
        onUpdateJustInstalledCallback?.({
          previousVersion: '1.0.0',
          currentVersion: '2.0.0'
        });
      });

      fireEvent.click(screen.getByText("See what's new"));

      expect(window.electronAPI.openExternal).toHaveBeenCalledWith(
        'https://carvd-studio.com/changelog'
      );
    });

    it('can be dismissed', () => {
      const { container } = render(<UpdateNotificationBanner />);

      act(() => {
        onUpdateJustInstalledCallback?.({
          previousVersion: '1.0.0',
          currentVersion: '2.0.0'
        });
      });

      const dismissButton = container.querySelector('.update-toast-dismiss');
      fireEvent.click(dismissButton!);

      expect(screen.queryByText('Updated to v2.0.0')).not.toBeInTheDocument();
    });

    it('cleans up listener on unmount', () => {
      const { unmount } = render(<UpdateNotificationBanner />);

      unmount();

      expect(onUpdateJustInstalledCallback).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('removes listeners on unmount', () => {
      const { unmount } = render(<UpdateNotificationBanner />);

      unmount();

      // Callbacks should be null after cleanup
      expect(onUpdateAvailableCallback).toBeNull();
    });
  });
});
