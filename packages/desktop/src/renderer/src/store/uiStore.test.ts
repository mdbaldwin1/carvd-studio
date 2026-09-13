import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUIStore } from './uiStore';
import { useLicenseStore } from './licenseStore';

// Mock sonner (vi.hoisted ensures the variable is available when vi.mock is hoisted)
const { mockSonnerToast } = vi.hoisted(() => {
  const fn = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn()
  });
  return { mockSonnerToast: fn };
});
vi.mock('sonner', () => ({
  toast: mockSonnerToast
}));

// Mock generateThumbnail from projectStore
vi.mock('./projectStore', async () => {
  const actual = await vi.importActual('./projectStore');
  return {
    ...actual,
    generateThumbnail: vi.fn()
  };
});

// Import after mock setup
import { generateThumbnail } from './projectStore';
const mockGenerateThumbnail = generateThumbnail as ReturnType<typeof vi.fn>;

// Helper to reset store state before each test
const resetStore = () => {
  useUIStore.setState({
    contextMenu: null,
    toast: null,
    pendingDeletePartIds: null,
    cutListModalOpen: false,
    saveAssemblyModalOpen: false,
    manualThumbnail: null
  });
};

describe('uiStore', () => {
  beforeEach(() => {
    resetStore();
    mockSonnerToast.mockClear();
    mockSonnerToast.success.mockClear();
    mockSonnerToast.error.mockClear();
    mockSonnerToast.warning.mockClear();
    mockSonnerToast.info.mockClear();
    mockSonnerToast.dismiss.mockClear();
  });

  // ============================================================
  // Context Menu
  // ============================================================

  describe('context menu', () => {
    describe('openContextMenu', () => {
      it('opens context menu with part data', () => {
        const store = useUIStore.getState();
        const menuData = {
          type: 'part' as const,
          x: 100,
          y: 200,
          partId: 'part-123'
        };

        store.openContextMenu(menuData);

        expect(useUIStore.getState().contextMenu).toEqual(menuData);
      });

      it('opens context menu with guide data', () => {
        const store = useUIStore.getState();
        const menuData = {
          type: 'guide' as const,
          x: 150,
          y: 250,
          guideId: 'guide-456'
        };

        store.openContextMenu(menuData);

        expect(useUIStore.getState().contextMenu).toEqual(menuData);
      });
    });

    describe('closeContextMenu', () => {
      it('closes the context menu', () => {
        const store = useUIStore.getState();
        store.openContextMenu({
          type: 'part',
          x: 100,
          y: 200
        });

        store.closeContextMenu();

        expect(useUIStore.getState().contextMenu).toBeNull();
      });
    });
  });

  // ============================================================
  // Toast Notifications
  // ============================================================

  describe('toast notifications', () => {
    describe('showToast', () => {
      it('sets toast message', () => {
        const store = useUIStore.getState();

        store.showToast('Test notification');

        const toast = useUIStore.getState().toast;
        expect(toast?.message).toBe('Test notification');
        expect(toast?.id).toBeDefined();
      });

      it('replaces existing toast', () => {
        const store = useUIStore.getState();
        store.showToast('First message');
        const firstToastId = useUIStore.getState().toast?.id;

        store.showToast('Second message');

        const toast = useUIStore.getState().toast;
        expect(toast?.message).toBe('Second message');
        expect(toast?.id).not.toBe(firstToastId);
      });

      it('calls sonner toast for default type', () => {
        useUIStore.getState().showToast('Default message');

        expect(mockSonnerToast).toHaveBeenCalledWith(
          'Default message',
          expect.objectContaining({ id: expect.any(String) })
        );
        expect(mockSonnerToast.success).not.toHaveBeenCalled();
        expect(mockSonnerToast.error).not.toHaveBeenCalled();
        expect(mockSonnerToast.warning).not.toHaveBeenCalled();
        expect(mockSonnerToast.info).not.toHaveBeenCalled();
      });

      it('calls sonner toast.success for success type', () => {
        useUIStore.getState().showToast('Saved!', 'success');

        expect(mockSonnerToast.success).toHaveBeenCalledWith(
          'Saved!',
          expect.objectContaining({ id: expect.any(String) })
        );
        expect(mockSonnerToast).not.toHaveBeenCalledWith('Saved!', expect.anything());
      });

      it('calls sonner toast.error for error type', () => {
        useUIStore.getState().showToast('Failed!', 'error');

        expect(mockSonnerToast.error).toHaveBeenCalledWith(
          'Failed!',
          expect.objectContaining({ id: expect.any(String) })
        );
        expect(mockSonnerToast).not.toHaveBeenCalledWith('Failed!', expect.anything());
      });

      it('calls sonner toast.warning for warning type', () => {
        useUIStore.getState().showToast('Blocked', 'warning');

        expect(mockSonnerToast.warning).toHaveBeenCalledWith(
          'Blocked',
          expect.objectContaining({ id: expect.any(String) })
        );
      });

      it('calls sonner toast.info for info type', () => {
        useUIStore.getState().showToast('FYI', 'info');

        expect(mockSonnerToast.info).toHaveBeenCalledWith('FYI', expect.objectContaining({ id: expect.any(String) }));
      });
    });

    describe('clearToast', () => {
      it('clears the toast', () => {
        const store = useUIStore.getState();
        store.showToast('Test message');

        store.clearToast();

        expect(useUIStore.getState().toast).toBeNull();
      });
    });
  });

  // ============================================================
  // Delete Confirmation
  // ============================================================

  describe('delete confirmation', () => {
    describe('requestDeleteParts', () => {
      it('sets pending delete parts', () => {
        const store = useUIStore.getState();

        store.requestDeleteParts(['part-1', 'part-2']);

        expect(useUIStore.getState().pendingDeletePartIds).toEqual(['part-1', 'part-2']);
      });

      it('does nothing for empty array', () => {
        const store = useUIStore.getState();

        store.requestDeleteParts([]);

        expect(useUIStore.getState().pendingDeletePartIds).toBeNull();
      });
    });

    describe('cancelDeleteParts', () => {
      it('clears pending delete list', () => {
        const store = useUIStore.getState();
        store.requestDeleteParts(['part-1']);

        store.cancelDeleteParts();

        expect(useUIStore.getState().pendingDeletePartIds).toBeNull();
      });
    });
  });

  // ============================================================
  // Modal Visibility
  // ============================================================

  describe('modal visibility', () => {
    describe('openCutListModal', () => {
      it('opens the cut list modal', () => {
        const store = useUIStore.getState();

        store.openCutListModal();

        expect(useUIStore.getState().cutListModalOpen).toBe(true);
      });
    });

    describe('closeCutListModal', () => {
      it('closes the cut list modal', () => {
        const store = useUIStore.getState();
        store.openCutListModal();

        store.closeCutListModal();

        expect(useUIStore.getState().cutListModalOpen).toBe(false);
      });
    });

    describe('openSaveAssemblyModal', () => {
      it('opens the save assembly modal', () => {
        const store = useUIStore.getState();
        expect(store.saveAssemblyModalOpen).toBe(false);

        store.openSaveAssemblyModal();

        expect(useUIStore.getState().saveAssemblyModalOpen).toBe(true);
      });
    });

    describe('closeSaveAssemblyModal', () => {
      it('closes the save assembly modal', () => {
        const store = useUIStore.getState();
        store.openSaveAssemblyModal();

        store.closeSaveAssemblyModal();

        expect(useUIStore.getState().saveAssemblyModalOpen).toBe(false);
      });
    });
  });

  // ============================================================
  // Thumbnail Actions
  // ============================================================

  describe('thumbnail actions', () => {
    describe('clearManualThumbnail', () => {
      it('clears the manual thumbnail', () => {
        useUIStore.setState({
          manualThumbnail: {
            data: 'base64data',
            width: 400,
            height: 300,
            generatedAt: new Date().toISOString(),
            manuallySet: true
          }
        });
        const store = useUIStore.getState();

        store.clearManualThumbnail();

        expect(useUIStore.getState().manualThumbnail).toBeNull();
      });
    });

    describe('captureManualThumbnail', () => {
      it('captures thumbnail and stores it on success', async () => {
        mockGenerateThumbnail.mockResolvedValue('base64-thumbnail-data');

        const result = await useUIStore.getState().captureManualThumbnail();

        expect(result).toBe(true);
        const thumbnail = useUIStore.getState().manualThumbnail;
        expect(thumbnail).not.toBeNull();
        expect(thumbnail!.data).toBe('base64-thumbnail-data');
        expect(thumbnail!.width).toBe(400);
        expect(thumbnail!.height).toBe(300);
        expect(thumbnail!.manuallySet).toBe(true);
        expect(thumbnail!.generatedAt).toBeDefined();
      });

      it('shows success toast on capture', async () => {
        mockGenerateThumbnail.mockResolvedValue('base64-data');

        await useUIStore.getState().captureManualThumbnail();

        expect(useUIStore.getState().toast?.message).toBe('Thumbnail captured');
      });

      it('returns false and shows error toast when generateThumbnail returns null', async () => {
        mockGenerateThumbnail.mockResolvedValue(null);

        const result = await useUIStore.getState().captureManualThumbnail();

        expect(result).toBe(false);
        expect(useUIStore.getState().manualThumbnail).toBeNull();
        expect(useUIStore.getState().toast?.message).toBe('Failed to capture thumbnail');
      });
    });
  });

  // ============================================================
  // License-gated modal (openSaveAssemblyModal)
  // ============================================================

  describe('license-gated modals', () => {
    it('blocks save assembly modal in free mode', () => {
      useLicenseStore.setState({ licenseMode: 'free' });

      useUIStore.getState().openSaveAssemblyModal();

      expect(useUIStore.getState().saveAssemblyModalOpen).toBe(false);
      expect(useUIStore.getState().toast?.message).toContain('license');
    });

    it('allows save assembly modal in trial mode', () => {
      useLicenseStore.setState({ licenseMode: 'trial' });

      useUIStore.getState().openSaveAssemblyModal();

      expect(useUIStore.getState().saveAssemblyModalOpen).toBe(true);
    });

    it('allows save assembly modal in licensed mode', () => {
      useLicenseStore.setState({ licenseMode: 'licensed' });

      useUIStore.getState().openSaveAssemblyModal();

      expect(useUIStore.getState().saveAssemblyModalOpen).toBe(true);
    });
  });

  // ============================================================
  // Context menu: background and guide types
  // ============================================================

  describe('context menu types', () => {
    it('opens context menu with background type and world position', () => {
      useUIStore.getState().openContextMenu({
        type: 'background',
        x: 50,
        y: 75,
        worldPosition: { x: 10, y: 0, z: 20 }
      });

      const menu = useUIStore.getState().contextMenu;
      expect(menu?.type).toBe('background');
      expect(menu?.worldPosition).toEqual({ x: 10, y: 0, z: 20 });
    });

    it('opens context menu with guide type and guideId', () => {
      useUIStore.getState().openContextMenu({
        type: 'guide',
        x: 200,
        y: 300,
        guideId: 'guide-1'
      });

      const menu = useUIStore.getState().contextMenu;
      expect(menu?.type).toBe('guide');
      expect(menu?.guideId).toBe('guide-1');
    });
  });

  // ============================================================
  // Toast auto-clear timer behavior
  // ============================================================

  describe('toast timer behavior', () => {
    it('auto-clears toast after timeout', async () => {
      vi.useFakeTimers();

      useUIStore.getState().showToast('Auto clear test');
      expect(useUIStore.getState().toast).not.toBeNull();

      vi.advanceTimersByTime(2000);

      expect(useUIStore.getState().toast).toBeNull();

      vi.useRealTimers();
    });

    it('does not clear toast if a different toast was shown before timeout', () => {
      vi.useFakeTimers();

      useUIStore.getState().showToast('First');
      vi.advanceTimersByTime(1000);

      useUIStore.getState().showToast('Second');
      vi.advanceTimersByTime(1000);

      // First timer fires, but toast ID changed — should NOT clear
      expect(useUIStore.getState().toast?.message).toBe('Second');

      vi.advanceTimersByTime(1000);

      // Second timer fires — should clear
      expect(useUIStore.getState().toast).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('modals and pending deletes', () => {
    it('opens and closes the cut list', () => {
      useUIStore.getState().openCutListModal();
      expect(useUIStore.getState().cutListModalOpen).toBe(true);
      useUIStore.getState().closeCutListModal();
      expect(useUIStore.getState().cutListModalOpen).toBe(false);
    });

    it('opens the issues list on a particular part when asked', () => {
      // Clicking an issue is meant to land on the part it belongs to.
      useUIStore.getState().openIssuesModal('part-7');
      expect(useUIStore.getState().issuesModalOpen).toBe(true);
      expect(useUIStore.getState().issuesModalFocusPartId).toBe('part-7');
    });

    it('opens the issues list on nothing in particular otherwise', () => {
      useUIStore.getState().openIssuesModal();
      expect(useUIStore.getState().issuesModalFocusPartId).toBeNull();
    });

    it('forgets the focused part when the issues list closes', () => {
      useUIStore.getState().openIssuesModal('part-7');
      useUIStore.getState().closeIssuesModal();
      expect(useUIStore.getState().issuesModalOpen).toBe(false);
      expect(useUIStore.getState().issuesModalFocusPartId).toBeNull();
    });

    it('calls off a pending delete', () => {
      useUIStore.getState().requestDeleteParts(['p1']);
      useUIStore.getState().cancelDeleteParts();
      // Null rather than an empty list: nothing is pending at all.
      expect(useUIStore.getState().pendingDeletePartIds).toBeNull();

      useUIStore.getState().requestDeleteGroups(['g1']);
      useUIStore.getState().cancelDeleteGroups();
      expect(useUIStore.getState().pendingDeleteGroupIds).toBeNull();
    });

    it('ignores a delete request for nothing', () => {
      useUIStore.setState({ pendingDeletePartIds: null, pendingDeleteGroupIds: null });
      useUIStore.getState().requestDeleteParts([]);
      useUIStore.getState().requestDeleteGroups([]);
      expect(useUIStore.getState().pendingDeletePartIds).toBeNull();
      expect(useUIStore.getState().pendingDeleteGroupIds).toBeNull();
    });
  });

  describe('the stock highlighted in the sidebar', () => {
    it('selects one', () => {
      useUIStore.getState().setSelectedSidebarStockId('stock-1');
      expect(useUIStore.getState().selectedSidebarStockId).toBe('stock-1');
    });

    it('clears it when the same one is picked again', () => {
      useUIStore.getState().setSelectedSidebarStockId('stock-1');
      useUIStore.getState().toggleSelectedSidebarStockId('stock-1');
      expect(useUIStore.getState().selectedSidebarStockId).toBeNull();
    });

    it('moves the highlight when a different one is picked', () => {
      useUIStore.getState().setSelectedSidebarStockId('stock-1');
      useUIStore.getState().toggleSelectedSidebarStockId('stock-2');
      expect(useUIStore.getState().selectedSidebarStockId).toBe('stock-2');
    });
  });

  describe('a toast with something to press', () => {
    it('runs the action without letting the click reach what is behind it', () => {
      const onClick = vi.fn();
      const preventDefault = vi.fn();
      const stopPropagation = vi.fn();
      useUIStore.getState().showToast('Deleted', 'success', { action: { label: 'Undo', onClick } });

      const options = mockSonnerToast.success.mock.calls.at(-1)?.[1];
      options?.action?.onClick({ preventDefault, stopPropagation });

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
    });

    it('runs the action even when handed no event at all', () => {
      const onClick = vi.fn();
      useUIStore.getState().showToast('Deleted', 'success', { action: { label: 'Undo', onClick } });
      const options = mockSonnerToast.success.mock.calls.at(-1)?.[1];
      options?.action?.onClick();
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});
