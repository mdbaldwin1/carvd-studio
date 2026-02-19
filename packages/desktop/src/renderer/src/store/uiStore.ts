import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { toast as sonnerToast } from 'sonner';
import { generateThumbnail } from './projectStore';
import { useLicenseStore } from './licenseStore';
import { getFeatureLimits, getBlockedMessage } from '../utils/featureLimits';

// Track toast timeout for cleanup (module-level, not in store state since it's not serializable)
let toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

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
  showToast: (message: string, type?: 'success' | 'error') => void;
  clearToast: () => void;

  // Actions - Delete confirmation
  requestDeleteParts: (ids: string[]) => void;
  cancelDeleteParts: () => void;

  // Actions - Modals
  openCutListModal: () => void;
  closeCutListModal: () => void;
  openSaveAssemblyModal: () => void;
  closeSaveAssemblyModal: () => void;

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
  manualThumbnail: null,

  openContextMenu: (menu) => set({ contextMenu: menu }),
  closeContextMenu: () => set({ contextMenu: null }),

  showToast: (message, type?) => {
    // Clear any existing toast timer to prevent timer accumulation
    if (toastTimeoutId !== null) {
      clearTimeout(toastTimeoutId);
      toastTimeoutId = null;
    }
    const id = uuidv4();
    set({ toast: { message, id } });

    // Render via Sonner
    if (type === 'error') {
      sonnerToast.error(message);
    } else if (type === 'success') {
      sonnerToast.success(message);
    } else {
      sonnerToast(message);
    }

    // Auto-clear store state after 2 seconds
    toastTimeoutId = setTimeout(() => {
      const current = get().toast;
      if (current?.id === id) {
        set({ toast: null });
      }
      toastTimeoutId = null;
    }, 2000);
  },
  clearToast: () => set({ toast: null }),

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
      get().showToast(getBlockedMessage('useAssemblies'));
      return;
    }
    set({ saveAssemblyModalOpen: true });
  },
  closeSaveAssemblyModal: () => set({ saveAssemblyModalOpen: false }),

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
      get().showToast('Thumbnail captured');
      return true;
    }
    get().showToast('Failed to capture thumbnail');
    return false;
  },
  clearManualThumbnail: () => set({ manualThumbnail: null })
}));
