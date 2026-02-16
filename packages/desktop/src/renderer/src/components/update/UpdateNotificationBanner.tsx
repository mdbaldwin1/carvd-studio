import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Download, RefreshCw, X } from 'lucide-react';

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate?: string;
}

interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
}

const toastBase =
  'fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 py-3 px-5 rounded-md text-[13px] shadow-[0_4px_16px_var(--color-overlay)] z-10003 animate-toast-in whitespace-nowrap text-white';

const actionBtnClass =
  'flex items-center py-1.5 px-3.5 ml-1 bg-white/20 border border-white/30 text-inherit text-[13px] font-semibold rounded-sm cursor-pointer whitespace-nowrap shrink-0 hover:bg-white/30 hover:border-white/50';

const dismissBtnClass =
  'flex items-center justify-center bg-transparent border-none text-inherit cursor-pointer p-1 ml-1 rounded-sm opacity-70 shrink-0 hover:opacity-100 hover:bg-white/15';

const changelogLinkClass = 'text-inherit underline underline-offset-2 opacity-90 cursor-pointer hover:opacity-100';

export function UpdateNotificationBanner() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justUpdated, setJustUpdated] = useState<{
    previousVersion: string;
    currentVersion: string;
  } | null>(null);

  useEffect(() => {
    // Listen for update available
    const cleanupAvailable = window.electronAPI.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      setDismissed(false);
      setError(null);
    });

    // Listen for download progress
    const cleanupProgress = window.electronAPI.onUpdateDownloadProgress((progress) => {
      setDownloadProgress(progress);
    });

    // Listen for update downloaded
    const cleanupDownloaded = window.electronAPI.onUpdateDownloaded((info) => {
      setDownloading(false);
      setDownloadProgress(null);
      setUpdateReady(true);
      setUpdateInfo((prev) => (prev ? { ...prev, version: info.version } : null));
    });

    // Listen for update errors
    const cleanupError = window.electronAPI.onUpdateError((err) => {
      setError(err.message);
      setDownloading(false);
      setDownloadProgress(null);
    });

    // Listen for post-update notification (app was just updated)
    const cleanupJustInstalled = window.electronAPI.onUpdateJustInstalled?.((info) => {
      setJustUpdated(info);
      setDismissed(false);
    });

    return () => {
      cleanupAvailable();
      cleanupProgress();
      cleanupDownloaded();
      cleanupError();
      cleanupJustInstalled?.();
    };
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      await window.electronAPI.downloadUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download update');
      setDownloading(false);
    }
  };

  const handleInstall = async () => {
    await window.electronAPI.quitAndInstall();
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  // Don't show if dismissed or nothing to show
  if (dismissed || (!updateInfo && !error && !justUpdated)) {
    return null;
  }

  // Post-update toast
  if (justUpdated && !updateInfo && !error) {
    return (
      <div className={`${toastBase} bg-success`}>
        <CheckCircle className="icon-sm shrink-0" />
        <div className="flex items-center gap-1">
          <span className="font-semibold">Updated to v{justUpdated.currentVersion}</span>
          {' \u00b7 '}
          <a
            className={changelogLinkClass}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.electronAPI?.openExternal?.('https://carvd-studio.com/changelog');
            }}
          >
            See what&apos;s new
          </a>
        </div>
        <button className={dismissBtnClass} aria-label="Dismiss" onClick={handleDismiss}>
          <X className="icon-sm" />
        </button>
      </div>
    );
  }

  // Error toast
  if (error) {
    return (
      <div className={`${toastBase} bg-danger`}>
        <AlertCircle className="icon-sm shrink-0" />
        <div className="flex items-center gap-1">
          <span className="font-semibold">Update Error</span>
          {' \u00b7 '}
          <span className="opacity-90">{error}</span>
        </div>
        <button className={dismissBtnClass} aria-label="Dismiss" onClick={handleDismiss}>
          <X className="icon-sm" />
        </button>
      </div>
    );
  }

  // Update ready toast
  if (updateReady) {
    return (
      <div className={`${toastBase} bg-success`}>
        <RefreshCw className="icon-sm shrink-0" />
        <div className="flex items-center gap-1">
          <span className="font-semibold">v{updateInfo?.version} ready</span>
          {' \u00b7 '}
          <a
            className={changelogLinkClass}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.electronAPI?.openExternal?.('https://carvd-studio.com/changelog');
            }}
          >
            What&apos;s new
          </a>
        </div>
        <button className={actionBtnClass} onClick={handleInstall}>
          Restart & Update
        </button>
      </div>
    );
  }

  // Downloading toast
  if (downloading && downloadProgress) {
    return (
      <div className={`${toastBase} bg-primary flex-wrap`}>
        <Download className="icon-sm shrink-0 animate-pulse" />
        <div className="flex items-center gap-1">
          <span className="font-semibold">Downloading update...</span>
          <span className="ml-2 opacity-90">{downloadProgress.percent.toFixed(0)}%</span>
        </div>
        <div className="w-full h-[3px] bg-white/20 rounded-full overflow-hidden basis-full">
          <div
            className="h-full bg-white transition-[width] duration-300 ease-out"
            data-testid="progress-bar"
            style={{ width: `${downloadProgress.percent}%` }}
          />
        </div>
      </div>
    );
  }

  // Update available toast
  return (
    <div className={`${toastBase} bg-primary`}>
      <Download className="icon-sm shrink-0" />
      <div className="flex items-center gap-1">
        <span className="font-semibold">v{updateInfo?.version} available</span>
        {' \u00b7 '}
        <a
          className={changelogLinkClass}
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.electronAPI?.openExternal?.('https://carvd-studio.com/changelog');
          }}
        >
          What&apos;s new
        </a>
      </div>
      <button className={actionBtnClass} onClick={handleDownload}>
        Download
      </button>
      <button className={dismissBtnClass} aria-label="Dismiss" onClick={handleDismiss}>
        <X className="icon-sm" />
      </button>
    </div>
  );
}
