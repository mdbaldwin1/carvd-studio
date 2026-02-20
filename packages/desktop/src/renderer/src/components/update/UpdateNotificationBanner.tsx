import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Download, RefreshCw, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert';
import { Button } from '@renderer/components/ui/button';

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

const bannerBase =
  'fixed bottom-6 left-1/2 z-10003 w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 shadow-[0_4px_16px_var(--color-overlay)]';

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

  const openChangelog = () => {
    window.electronAPI?.openExternal?.('https://carvd-studio.com/changelog');
  };

  // Don't show if dismissed or nothing to show
  if (dismissed || (!updateInfo && !error && !justUpdated)) {
    return null;
  }

  // Post-update toast
  if (justUpdated && !updateInfo && !error) {
    return (
      <Alert className={`${bannerBase} border-success/40 bg-success text-white`}>
        <AlertDescription className="mt-0 flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-3">
            <CheckCircle className="icon-sm shrink-0" />
            <div className="flex items-center gap-1">
              <span className="font-semibold">Updated to v{justUpdated.currentVersion}</span>
              {' \u00b7 '}
              <Button variant="link" size="xs" className="h-auto p-0 text-white underline" onClick={openChangelog}>
                See what&apos;s new
              </Button>
            </div>
          </div>
          <Button variant="ghost" size="icon-xs" aria-label="Dismiss" className="text-white/80" onClick={handleDismiss}>
            <X className="icon-sm" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Error toast
  if (error) {
    return (
      <Alert variant="destructive" className={bannerBase}>
        <AlertDescription className="mt-0 flex items-center justify-between gap-3 text-inherit">
          <div className="flex items-center gap-3">
            <AlertCircle className="icon-sm shrink-0" />
            <div className="flex items-center gap-1">
              <span className="font-semibold">Update Error</span>
              {' \u00b7 '}
              <span className="opacity-90">{error}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Dismiss"
            className="text-inherit hover:bg-danger/10"
            onClick={handleDismiss}
          >
            <X className="icon-sm" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Update ready toast
  if (updateReady) {
    return (
      <Alert className={`${bannerBase} border-success/40 bg-success text-white`}>
        <AlertDescription className="mt-0 flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-3">
            <RefreshCw className="icon-sm shrink-0" />
            <div className="flex items-center gap-1">
              <span className="font-semibold">v{updateInfo?.version} ready</span>
              {' \u00b7 '}
              <Button variant="link" size="xs" className="h-auto p-0 text-white underline" onClick={openChangelog}>
                What&apos;s new
              </Button>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="border-white/30 bg-white/20 text-white"
            onClick={handleInstall}
          >
            Restart & Update
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Downloading toast
  if (downloading && downloadProgress) {
    return (
      <Alert className={`${bannerBase} border-accent-hover bg-primary text-white`}>
        <AlertTitle className="flex items-center gap-2 text-white">
          <Download className="icon-sm shrink-0 animate-pulse" />
          <span className="font-semibold">Downloading update...</span>
          <span className="ml-2 opacity-90">{downloadProgress.percent.toFixed(0)}%</span>
        </AlertTitle>
        <AlertDescription className="mt-2 text-white">
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full bg-white transition-[width] duration-300 ease-out"
              data-testid="progress-bar"
              style={{ width: `${downloadProgress.percent}%` }}
            />
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Update available toast
  return (
    <Alert className={`${bannerBase} border-accent-hover bg-primary text-white`}>
      <AlertDescription className="mt-0 flex items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-3">
          <Download className="icon-sm shrink-0" />
          <div className="flex items-center gap-1">
            <span className="font-semibold">v{updateInfo?.version} available</span>
            {' \u00b7 '}
            <Button variant="link" size="xs" className="h-auto p-0 text-white underline" onClick={openChangelog}>
              What&apos;s new
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="border-white/30 bg-white/20 text-white"
            onClick={handleDownload}
          >
            Download
          </Button>
          <Button variant="ghost" size="icon-xs" aria-label="Dismiss" className="text-white/80" onClick={handleDismiss}>
            <X className="icon-sm" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
