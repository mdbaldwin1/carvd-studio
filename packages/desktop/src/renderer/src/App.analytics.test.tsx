import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { analytics } from './utils/analytics';

const mocks = vi.hoisted(() => ({
  loadProject: vi.fn(),
  newProject: vi.fn(),
  setLicenseMode: vi.fn(),
  getAnalyticsConsent: vi.fn().mockResolvedValue('unknown'),
  getHasCompletedWelcome: vi.fn().mockResolvedValue(false)
}));

vi.mock('./hooks/useKeyboardShortcuts', () => ({ useKeyboardShortcuts: () => undefined }));
vi.mock('./hooks/useDevTools', () => ({ useDevTools: () => undefined }));
vi.mock('./hooks/useAutoRecovery', () => ({
  useAutoRecovery: () => ({
    hasRecovery: false,
    recoveryInfo: null,
    restoreRecovery: vi.fn(),
    discardRecovery: vi.fn()
  })
}));
vi.mock('./hooks/useLibraryImportCheck', () => ({
  useLibraryImportCheck: () => ({
    showImportDialog: false,
    missingStocks: [],
    missingAssemblies: [],
    handleImport: vi.fn(),
    handleSkip: vi.fn()
  })
}));
vi.mock('./hooks/useAssemblyEditing', () => ({
  useAssemblyEditing: () => ({
    isEditingAssembly: false,
    editingAssemblyName: '',
    showExitDialog: false,
    isCreatingNew: false,
    startEditing: vi.fn(),
    startCreatingNew: vi.fn(),
    saveAndExit: vi.fn(),
    discardAndExit: vi.fn(),
    requestExit: vi.fn(),
    cancelExit: vi.fn()
  })
}));
vi.mock('./hooks/useTemplateEditing', () => ({
  useTemplateEditing: () => ({
    isEditingTemplate: false,
    editingTemplateName: '',
    editingTemplateDescription: '',
    isCreatingNewTemplate: false,
    showSaveDialog: false,
    showDiscardDialog: false,
    showNewTemplateSetupDialog: false,
    startEditing: vi.fn(),
    startCreatingNew: vi.fn(),
    confirmNewTemplateSetup: vi.fn(),
    cancelNewTemplateSetup: vi.fn(),
    saveTemplate: vi.fn(),
    saveAndExit: vi.fn(),
    requestDiscard: vi.fn(),
    discardAndExit: vi.fn(),
    cancelDialog: vi.fn()
  })
}));
vi.mock('./hooks/useFileOperations', () => ({
  useFileOperations: () => ({
    UnsavedChangesDialogComponent: () => null,
    FileRecoveryModalComponent: () => null,
    handleNew: vi.fn(),
    handleOpen: vi.fn(),
    handleOpenRecent: vi.fn(),
    handleRelocateFile: vi.fn(),
    handleSave: vi.fn(),
    handleGoHome: vi.fn()
  })
}));
vi.mock('./hooks/useAutoSave', () => ({ useAutoSave: () => undefined }));
vi.mock('./hooks/useLicenseStatus', () => ({
  useLicenseStatus: () => ({
    mode: 'trial',
    hasFullAccess: true,
    trial: null,
    shouldShowBanner: false,
    shouldShowExpiredModal: false,
    acknowledgeExpired: vi.fn(),
    refresh: vi.fn(),
    isLoading: false
  })
}));
vi.mock('./hooks/useAppSettings', () => ({
  useAppSettings: () => ({
    settings: {
      theme: 'dark',
      showHotkeyHints: true,
      defaultUnits: 'imperial',
      defaultGridSize: 0.25,
      confirmBeforeDelete: true,
      snapSensitivity: 'normal',
      liveGridSnap: false,
      snapToOrigin: true,
      dimensionSnapSameTypeOnly: false,
      stockConstraints: { constrainDimensions: true, constrainGrain: true, constrainColor: true, preventOverlap: false }
    },
    isLoading: false,
    updateSettings: vi.fn()
  })
}));
vi.mock('./hooks/useStockLibrary', () => ({
  useStockLibrary: () => ({ stocks: [], addStock: vi.fn(), updateStock: vi.fn(), deleteStock: vi.fn() })
}));
vi.mock('./hooks/useAssemblyLibrary', () => ({
  useAssemblyLibrary: () => ({
    assemblies: [],
    updateAssembly: vi.fn(),
    deleteAssembly: vi.fn(),
    duplicateAssembly: vi.fn()
  })
}));
vi.mock('./hooks/useMenuCommands', () => ({ useMenuCommands: () => undefined }));
vi.mock('./store/projectStore', () => {
  const state = {
    loadProject: mocks.loadProject,
    newProject: mocks.newProject,
    filePath: null,
    projectName: '',
    setProjectName: vi.fn(),
    isDirty: false,
    markDirty: vi.fn(),
    parts: [],
    groups: [],
    confirmDeleteParts: vi.fn(),
    confirmDeleteGroups: vi.fn()
  };
  const useProjectStore = (selector: (value: typeof state) => unknown) => selector(state);
  useProjectStore.getState = () => state;
  return { useProjectStore };
});
vi.mock('./store/uiStore', () => ({
  useUIStore: (selector: (value: Record<string, unknown>) => unknown) =>
    selector({
      pendingDeletePartIds: null,
      pendingDeleteGroupIds: null,
      cancelDeleteParts: vi.fn(),
      cancelDeleteGroups: vi.fn(),
      openCutListModal: vi.fn(),
      cutListModalOpen: false,
      saveAssemblyModalOpen: false
    })
}));
vi.mock('./store/licenseStore', () => ({ useLicenseStore: () => mocks.setLicenseMode }));
vi.mock('./store/assemblyEditingStore', () => ({ useAssemblyEditingStore: { setState: vi.fn() } }));
vi.mock('./components/assembly/AssemblyEditingExitDialog', () => ({ AssemblyEditingExitDialog: () => null }));
vi.mock('./components/common/AppHorizontalLogo', () => ({ AppHorizontalLogo: () => null }));
vi.mock('./components/common/ConfirmDialog', () => ({ ConfirmDialog: () => null }));
vi.mock('./components/layout/AppSidebar', () => ({ AppSidebar: () => null }));
vi.mock('./components/layout/ContextMenu', () => ({ ContextMenu: () => null }));
vi.mock('./components/layout/UndoRedoButtons', () => ({ UndoRedoButtons: () => null }));
vi.mock('./components/licensing/TrialBanner', () => ({ TrialBanner: () => null }));
vi.mock('./components/licensing/TrialExpiredModal', () => ({ TrialExpiredModal: () => null }));
vi.mock('./components/parts-list/ImportToLibraryDialog', () => ({ ImportToLibraryDialog: () => null }));
vi.mock('./components/project/NewProjectDialog', () => ({ NewProjectDialog: () => null }));
vi.mock('./components/project/StartScreen', () => ({
  StartScreen: ({
    onStartTutorial,
    onViewAllTemplates
  }: {
    onStartTutorial: (project: never) => void;
    onViewAllTemplates: () => void;
  }) => (
    <>
      <button
        type="button"
        onClick={() =>
          onStartTutorial({
            name: 'Template',
            units: 'metric',
            parts: [],
            stocks: [],
            groups: [],
            groupMembers: [],
            assemblies: []
          } as never)
        }
      >
        start template tutorial
      </button>
      <button type="button" onClick={onViewAllTemplates}>
        view templates
      </button>
    </>
  )
}));
vi.mock('./components/properties/PropertiesPanel', () => ({ PropertiesPanel: () => null }));
vi.mock('./components/template/TemplateEditingExitDialog', () => ({
  TemplateDiscardDialog: () => null,
  TemplateSaveDialog: () => null,
  TemplateSetupDialog: () => null
}));
vi.mock('./components/template/TemplatesScreen', () => ({
  TemplatesScreen: ({ onStartTutorial }: { onStartTutorial: (project: never) => void }) => (
    <button
      type="button"
      onClick={() =>
        onStartTutorial({
          name: 'Template',
          units: 'imperial',
          parts: [],
          stocks: [],
          groups: [],
          groupMembers: [],
          assemblies: []
        } as never)
      }
    >
      start templates-screen tutorial
    </button>
  )
}));
vi.mock('./components/update/UpdateNotificationBanner', () => ({ UpdateNotificationBanner: () => null }));
vi.mock('./components/workspace/CanvasWithDrop', () => ({ CanvasWithDrop: () => null }));
vi.mock('./components/workspace/SelectionBox', () => ({ SelectionBox: () => null }));
vi.mock('./components/tutorial/WelcomeTutorial', () => ({
  WelcomeTutorial: ({ onComplete }: { onComplete: () => void }) => (
    <button type="button" onClick={onComplete}>
      complete or skip welcome tutorial
    </button>
  )
}));
vi.mock('./utils/analytics', () => ({ analytics: { capture: vi.fn() } }));

describe('App analytics consent sequencing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAnalyticsConsent.mockResolvedValue('unknown');
    mocks.getHasCompletedWelcome.mockResolvedValue(false);
    window.electronAPI = {
      getPlatform: vi.fn().mockResolvedValue('darwin'),
      checkLicenseValid: vi.fn().mockResolvedValue({ valid: false }),
      getLicenseData: vi.fn().mockResolvedValue(null),
      getHasCompletedWelcome: mocks.getHasCompletedWelcome,
      setHasCompletedWelcome: vi.fn().mockResolvedValue({ success: true }),
      getAnalyticsConsent: mocks.getAnalyticsConsent,
      setTitleBarOverlay: vi.fn()
    } as never;
    window.matchMedia = vi
      .fn()
      .mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  });

  it('waits for the actual welcome completion/skip callback before showing unknown consent', async () => {
    render(<App />);

    const tutorial = await screen.findByRole('button', { name: 'complete or skip welcome tutorial' });
    expect(screen.queryByRole('dialog', { name: 'Help improve Carvd Studio' })).not.toBeInTheDocument();
    expect(mocks.getAnalyticsConsent).not.toHaveBeenCalled();

    fireEvent.click(tutorial);

    await waitFor(() => {
      expect(mocks.getAnalyticsConsent).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('dialog', { name: 'Help improve Carvd Studio' })).toBeInTheDocument();
    });
    expect(analytics.capture).toHaveBeenCalledWith('onboarding_completed', { source: 'first_run' });
  });

  it('records template onboarding only after its tutorial completes', async () => {
    mocks.getHasCompletedWelcome.mockResolvedValue(true);
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'start template tutorial' }));
    fireEvent.click(await screen.findByRole('button', { name: 'complete or skip welcome tutorial' }));

    await waitFor(() => {
      expect(analytics.capture).toHaveBeenCalledWith('onboarding_completed', { source: 'template' });
    });
  });

  it('records template project creation before the start-screen tutorial begins', async () => {
    mocks.getHasCompletedWelcome.mockResolvedValue(true);
    mocks.getAnalyticsConsent.mockResolvedValue('granted');
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'start template tutorial' }));

    expect(mocks.loadProject).toHaveBeenCalledTimes(1);
    expect(analytics.capture).toHaveBeenCalledTimes(1);
    expect(analytics.capture).toHaveBeenCalledWith('project_created', { source: 'template', units: 'metric' });
  });

  it('records template project creation before the templates-screen tutorial begins', async () => {
    mocks.getHasCompletedWelcome.mockResolvedValue(true);
    mocks.getAnalyticsConsent.mockResolvedValue('granted');
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'view templates' }));
    fireEvent.click(await screen.findByRole('button', { name: 'start templates-screen tutorial' }));

    expect(mocks.loadProject).toHaveBeenCalledTimes(1);
    expect(analytics.capture).toHaveBeenCalledTimes(1);
    expect(analytics.capture).toHaveBeenCalledWith('project_created', { source: 'template', units: 'imperial' });
  });
});
