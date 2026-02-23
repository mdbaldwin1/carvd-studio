import { useUIStore } from '@renderer/store/uiStore';

function isMacPlatform(): boolean {
  return window.navigator.userAgent.toUpperCase().includes('MAC');
}

export async function revealInFileManager(filePath: string): Promise<void> {
  try {
    const result = await window.electronAPI.showItemInFolder(filePath);
    if (!result.success) {
      useUIStore.getState().showToast('Unable to reveal file in file manager', 'error');
    }
  } catch {
    useUIStore.getState().showToast('Unable to reveal file in file manager', 'error');
  }
}

export function showSavedFileToast(message: string, filePath: string): void {
  const actionLabel = isMacPlatform() ? 'Show in Finder' : 'Show in File Explorer';
  useUIStore.getState().showToast(message, 'success', {
    duration: Number.POSITIVE_INFINITY,
    action: {
      label: actionLabel,
      onClick: () => {
        void revealInFileManager(filePath);
        useUIStore.getState().clearToast();
      }
    }
  });
}
