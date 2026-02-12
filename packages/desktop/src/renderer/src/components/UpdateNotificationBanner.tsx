import { useEffect, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
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

    return () => {
      cleanupAvailable();
      cleanupProgress();
      cleanupDownloaded();
      cleanupError();
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

  // Don't show banner if dismissed or no update info
  if (dismissed || (!updateInfo && !error)) {
    return null;
  }

  return (
    <div className="update-notification-banner">
      <div className="update-notification-content">
        {error ? (
          <>
            <div className="update-notification-icon update-notification-error">
              <X className="icon-sm" />
            </div>
            <div className="update-notification-text">
              <div className="update-notification-title">Update Error</div>
              <div className="update-notification-message">{error}</div>
            </div>
          </>
        ) : updateReady ? (
          <>
            <div className="update-notification-icon update-notification-ready">
              <RefreshCw className="icon-sm" />
            </div>
            <div className="update-notification-text">
              <div className="update-notification-title">Update Ready</div>
              <div className="update-notification-message">Version {updateInfo?.version} is ready to install</div>
            </div>
            <button className="btn btn-primary" onClick={handleInstall}>
              Restart & Update
            </button>
          </>
        ) : downloading && downloadProgress ? (
          <>
            <div className="update-notification-icon update-notification-downloading">
              <Download className="icon-sm animate-pulse" />
            </div>
            <div className="update-notification-text">
              <div className="update-notification-title">Downloading Update...</div>
              <div className="update-notification-progress">
                <div className="update-notification-progress-bar" style={{ width: `${downloadProgress.percent}%` }} />
              </div>
              <div className="update-notification-message">{downloadProgress.percent.toFixed(0)}% complete</div>
            </div>
          </>
        ) : (
          <>
            <div className="update-notification-icon update-notification-available">
              <Download className="icon-sm" />
            </div>
            <div className="update-notification-text">
              <div className="update-notification-title">Update Available</div>
              <div className="update-notification-message">Version {updateInfo?.version} is available</div>
            </div>
            <button className="btn btn-primary" onClick={handleDownload}>
              Download
            </button>
            <button className="btn btn-ghost" onClick={handleDismiss}>
              <X className="icon-sm" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
