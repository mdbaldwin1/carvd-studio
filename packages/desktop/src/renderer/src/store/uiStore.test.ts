import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './uiStore';

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

      it('opens context menu with group data', () => {
        const store = useUIStore.getState();
        const menuData = {
          type: 'group' as const,
          x: 150,
          y: 250,
          groupId: 'group-456'
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
          y: 200,
          partId: 'part-123'
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
  });
});
