import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { toast as sonnerToast } from 'sonner';
import { generateThumbnail } from './projectStore';
import { useLicenseStore } from './licenseStore';
import { getFeatureLimits, getBlockedMessage } from '../utils/featureLimits';

// Track toast timeout for cleanup (module-level, not in store state since it's not serializable)
let toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  action?: ToastAction;
  duration?: number;
}

interface UIState {
  // Context menu
  contextMenu: {
    x: number;
    y: number;
    type: 'part' | 'background' | 'guide';
    worldPosition?: { x: number; y: number; z: number };
    guideId?: string;
  } | null;

  // Toast notifications
  toast: { message: string; id: string } | null;

  // Pending delete confirmation
  pendingDeletePartIds: string[] | null;

  // Modal visibility
  cutListModalOpen: boolean;
  saveAssemblyModalOpen: boolean;
  selectedSidebarStockId: string | null;

  // Manual thumbnail capture
  manualThumbnail: {
    data: string;
    width: number;
    height: number;
    generatedAt: string;
    manuallySet: boolean;
  } | null;

  // Actions - Context menu
  openContextMenu: (menu: {
    x: number;
    y: number;
    type: 'part' | 'background' | 'guide';
    worldPosition?: { x: number; y: number; z: number };
    guideId?: string;
  }) => void;
  closeContextMenu: () => void;

  // Actions - Toast
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info', options?: ToastOptions) => void;
  clearToast: () => void;

  // Actions - Delete confirmation
  requestDeleteParts: (ids: string[]) => void;
  cancelDeleteParts: () => void;

  // Actions - Modals
  openCutListModal: () => void;
  closeCutListModal: () => void;
  openSaveAssemblyModal: () => void;
  closeSaveAssemblyModal: () => void;
  setSelectedSidebarStockId: (stockId: string | null) => void;
  toggleSelectedSidebarStockId: (stockId: string) => void;

  // Actions - Thumbnail
  captureManualThumbnail: () => Promise<boolean>;
  clearManualThumbnail: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  contextMenu: null,
  toast: null,
  pendingDeletePartIds: null,
  cutListModalOpen: false,
  saveAssemblyModalOpen: false,
  selectedSidebarStockId: null,
  manualThumbnail: null,

  openContextMenu: (menu) => set({ contextMenu: menu }),
  closeContextMenu: () => set({ contextMenu: null }),

  showToast: (message, type, options) => {
    // Clear any existing toast timer to prevent timer accumulation
    if (toastTimeoutId !== null) {
      clearTimeout(toastTimeoutId);
      toastTimeoutId = null;
    }
    const id = uuidv4();
    set({ toast: { message, id } });

    const resolvedOptions: ToastOptions | undefined = options?.action
      ? {
          ...options,
          action: {
            ...options.action,
            onClick: (event?: unknown) => {
              if (event && typeof event === 'object') {
                const maybeEvent = event as { preventDefault?: () => void; stopPropagation?: () => void };
                maybeEvent.preventDefault?.();
                maybeEvent.stopPropagation?.();
              }
              options.action?.onClick();
            }
          }
        }
      : options;

    const toastDuration = resolvedOptions?.duration;
    const sonnerOptions = { ...resolvedOptions, id };

    // Render via Sonner
    if (type === 'error') {
      sonnerToast.error(message, sonnerOptions);
    } else if (type === 'success') {
      sonnerToast.success(message, sonnerOptions);
    } else if (type === 'warning') {
      sonnerToast.warning(message, sonnerOptions);
    } else if (type === 'info') {
      sonnerToast.info(message, sonnerOptions);
    } else {
      sonnerToast(message, sonnerOptions);
    }

    // Auto-clear store state for non-persistent toasts.
    // Persistent toasts (duration: Infinity) stay until manually dismissed.
    const isPersistent = typeof toastDuration === 'number' && !Number.isFinite(toastDuration);
    if (!isPersistent) {
      const clearAfterMs = typeof toastDuration === 'number' && toastDuration > 0 ? toastDuration : 2000;
      toastTimeoutId = setTimeout(() => {
        const current = get().toast;
        if (current?.id === id) {
          set({ toast: null });
        }
        toastTimeoutId = null;
      }, clearAfterMs);
    }
  },
  clearToast: () => {
    const currentToastId = get().toast?.id;
    if (currentToastId) {
      sonnerToast.dismiss(currentToastId);
    } else {
      sonnerToast.dismiss();
    }
    set({ toast: null });
  },

  requestDeleteParts: (ids) => {
    if (ids.length === 0) return;
    set({ pendingDeletePartIds: ids });
  },
  cancelDeleteParts: () => set({ pendingDeletePartIds: null }),

  openCutListModal: () => set({ cutListModalOpen: true }),
  closeCutListModal: () => set({ cutListModalOpen: false }),

  openSaveAssemblyModal: () => {
    const { licenseMode } = useLicenseStore.getState();
    const limits = getFeatureLimits(licenseMode);
    if (!limits.canUseAssemblies) {
      get().showToast(getBlockedMessage('useAssemblies'), 'warning');
      return;
    }
    set({ saveAssemblyModalOpen: true });
  },
  closeSaveAssemblyModal: () => set({ saveAssemblyModalOpen: false }),
  setSelectedSidebarStockId: (stockId) => set({ selectedSidebarStockId: stockId }),
  toggleSelectedSidebarStockId: (stockId) =>
    set((state) => ({
      selectedSidebarStockId: state.selectedSidebarStockId === stockId ? null : stockId
    })),

  captureManualThumbnail: async () => {
    const thumbnailData = await generateThumbnail();
    if (thumbnailData) {
      set({
        manualThumbnail: {
          data: thumbnailData,
          width: 400,
          height: 300,
          generatedAt: new Date().toISOString(),
          manuallySet: true
        }
      });
      get().showToast('Thumbnail captured', 'success');
      return true;
    }
    get().showToast('Failed to capture thumbnail', 'error');
    return false;
  },
  clearManualThumbnail: () => set({ manualThumbnail: null })
}));
