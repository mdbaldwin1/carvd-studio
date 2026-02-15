import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Download, RefreshCw, X } from 'lucide-react';
import './UpdateNotificationBanner.css';

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
      <div className="update-toast update-toast-success">
        <CheckCircle className="icon-sm update-toast-icon" />
        <div className="update-toast-text">
          <span className="update-toast-title">Updated to v{justUpdated.currentVersion}</span>
          {' \u00b7 '}
          <a
            className="update-changelog-link"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.electronAPI?.openExternal?.('https://carvd-studio.com/changelog');
            }}
          >
            See what&apos;s new
          </a>
        </div>
        <button className="update-toast-dismiss" onClick={handleDismiss}>
          <X className="icon-sm" />
        </button>
      </div>
    );
  }

  // Error toast
  if (error) {
    return (
      <div className="update-toast update-toast-error">
        <AlertCircle className="icon-sm update-toast-icon" />
        <div className="update-toast-text">
          <span className="update-toast-title">Update Error</span>
          {' \u00b7 '}
          <span className="update-toast-message">{error}</span>
        </div>
        <button className="update-toast-dismiss" onClick={handleDismiss}>
          <X className="icon-sm" />
        </button>
      </div>
    );
  }

  // Update ready toast
  if (updateReady) {
    return (
      <div className="update-toast update-toast-ready">
        <RefreshCw className="icon-sm update-toast-icon" />
        <div className="update-toast-text">
          <span className="update-toast-title">v{updateInfo?.version} ready</span>
          {' \u00b7 '}
          <a
            className="update-changelog-link"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.electronAPI?.openExternal?.('https://carvd-studio.com/changelog');
            }}
          >
            What&apos;s new
          </a>
        </div>
        <button className="update-toast-action" onClick={handleInstall}>
          Restart & Update
        </button>
      </div>
    );
  }

  // Downloading toast
  if (downloading && downloadProgress) {
    return (
      <div className="update-toast update-toast-downloading">
        <Download className="icon-sm update-toast-icon animate-pulse" />
        <div className="update-toast-text">
          <span className="update-toast-title">Downloading update...</span>
          <span className="update-toast-percent">{downloadProgress.percent.toFixed(0)}%</span>
        </div>
        <div className="update-toast-progress">
          <div className="update-toast-progress-bar" style={{ width: `${downloadProgress.percent}%` }} />
        </div>
      </div>
    );
  }

  // Update available toast
  return (
    <div className="update-toast update-toast-available">
      <Download className="icon-sm update-toast-icon" />
      <div className="update-toast-text">
        <span className="update-toast-title">v{updateInfo?.version} available</span>
        {' \u00b7 '}
        <a
          className="update-changelog-link"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.electronAPI?.openExternal?.('https://carvd-studio.com/changelog');
          }}
        >
          What&apos;s new
        </a>
      </div>
      <button className="update-toast-action" onClick={handleDownload}>
        Download
      </button>
      <button className="update-toast-dismiss" onClick={handleDismiss}>
        <X className="icon-sm" />
      </button>
    </div>
  );
}
