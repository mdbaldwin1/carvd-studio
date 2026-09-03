import { useUIStore } from '@renderer/store/uiStore';

export function getRevealActionLabel(userAgent: string): string {
  const normalized = userAgent.toUpperCase();
  if (normalized.includes('MAC')) return 'Show in Finder';
  if (normalized.includes('WINDOWS')) return 'Show in File Explorer';
  return 'Show in Folder';
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
  const actionLabel = getRevealActionLabel(window.navigator.userAgent);
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
