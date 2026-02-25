import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { SidebarProvider } from '@renderer/components/ui/sidebar';
import { Check, Library, Pencil, Save, Settings } from 'lucide-react';
import React, { Suspense, useEffect, useRef, useState } from 'react';
import { AssemblyEditingExitDialog } from './components/assembly/AssemblyEditingExitDialog';
import { AppHorizontalLogo } from './components/common/AppHorizontalLogo';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { AppSidebar } from './components/layout/AppSidebar';
import { ContextMenu } from './components/layout/ContextMenu';
import { UndoRedoButtons } from './components/layout/UndoRedoButtons';
import { TrialBanner } from './components/licensing/TrialBanner';
import { TrialExpiredModal } from './components/licensing/TrialExpiredModal';
import { ImportToLibraryDialog } from './components/parts-list/ImportToLibraryDialog';
import { NewProjectDialog } from './components/project/NewProjectDialog';
import { RecoveryDialog } from './components/project/RecoveryDialog';
import { StartScreen } from './components/project/StartScreen';
import { PropertiesPanel } from './components/properties/PropertiesPanel';
import {
  TemplateDiscardDialog,
  TemplateSaveDialog,
  TemplateSetupDialog
} from './components/template/TemplateEditingExitDialog';
import { Badge } from './components/ui/badge';
import { Separator } from './components/ui/separator';
import { Toaster } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';
import { UpdateNotificationBanner } from './components/update/UpdateNotificationBanner';
import { CanvasWithDrop } from './components/workspace/CanvasWithDrop';
import { SelectionBox } from './components/workspace/SelectionBox';
import {
  DEFAULT_PROJECT_GRID_SIZE,
  PROJECT_FILE_VERSION,
  TITLE_BAR_OVERLAY_COLORS,
  UNTITLED_PROJECT_NAME,
  UNTITLED_TEMPLATE_NAME
} from './constants/appDefaults';
import { useAppSettings } from './hooks/useAppSettings';
import { useAssemblyEditing } from './hooks/useAssemblyEditing';
import { useAssemblyLibrary } from './hooks/useAssemblyLibrary';
import { useAutoRecovery } from './hooks/useAutoRecovery';
import { useAutoSave } from './hooks/useAutoSave';
import { useDevTools } from './hooks/useDevTools';
import { useFileOperations } from './hooks/useFileOperations';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useLibraryImportCheck } from './hooks/useLibraryImportCheck';
import { useLicenseStatus } from './hooks/useLicenseStatus';
import { useMenuCommands } from './hooks/useMenuCommands';
import { useStockLibrary } from './hooks/useStockLibrary';
import { useTemplateEditing } from './hooks/useTemplateEditing';
import { useAssemblyEditingStore } from './store/assemblyEditingStore';
import { useLicenseStore } from './store/licenseStore';
import { useProjectStore } from './store/projectStore';
import { useUIStore } from './store/uiStore';
import { Project, Stock } from './types';
import { EXTERNAL_LINKS } from './utils/externalLinks';
import { logger } from './utils/logger';
import { generateSeedProject } from './utils/seedData';

// Lazy-loaded modal components (deferred until first use)
const LazyAboutModal = React.lazy(() =>
  import('./components/settings/AboutModal').then((m) => ({ default: m.AboutModal }))
);
const LazyAppSettingsModal = React.lazy(() =>
  import('./components/settings/AppSettingsModal').then((m) => ({ default: m.AppSettingsModal }))
);
const LazyCutListModalWrapper = React.lazy(() =>
  import('./components/stock/CutListModalWrapper').then((m) => ({ default: m.CutListModalWrapper }))
);
const LazyImportAppStateModal = React.lazy(() =>
  import('./components/project/ImportAppStateModal').then((m) => ({ default: m.ImportAppStateModal }))
);
const LazyLicenseActivationModal = React.lazy(() =>
  import('./components/licensing/LicenseActivationModal').then((m) => ({
    default: m.LicenseActivationModal
  }))
);
const LazyProjectSettingsModal = React.lazy(() =>
  import('./components/project/ProjectSettingsModal').then((m) => ({ default: m.ProjectSettingsModal }))
);
const LazySaveAssemblyModalWrapper = React.lazy(() =>
  import('./components/assembly/SaveAssemblyModalWrapper').then((m) => ({
    default: m.SaveAssemblyModalWrapper
  }))
);
const LazyStockLibraryModal = React.lazy(() =>
  import('./components/stock/StockLibraryModal').then((m) => ({ default: m.StockLibraryModal }))
);
const LazyTemplateBrowserModal = React.lazy(() =>
  import('./components/template/TemplateBrowserModal').then((m) => ({ default: m.TemplateBrowserModal }))
);
const LazyTemplatesScreen = React.lazy(() =>
  import('./components/template/TemplatesScreen').then((m) => ({ default: m.TemplatesScreen }))
);
const LazyWelcomeTutorial = React.lazy(() =>
  import('./components/tutorial/WelcomeTutorial').then((m) => ({ default: m.WelcomeTutorial }))
);

function App() {
  useKeyboardShortcuts();
  useDevTools(); // Dev tools for testing (only active in dev mode)

  // Auto-recovery for crash protection
  const { hasRecovery, recoveryInfo, restoreRecovery, discardRecovery } = useAutoRecovery();

  // Library import check - detects project items not in library
  const {
    showImportDialog,
    missingStocks,
    missingAssemblies,
    handleImport: handleLibraryImport,
    handleSkip: handleLibraryImportSkip
  } = useLibraryImportCheck();

  // Assembly editing mode
  const {
    isEditingAssembly,
    editingAssemblyName,
    showExitDialog: showAssemblyExitDialog,
    isCreatingNew: isCreatingNewAssembly,
    startEditing: startAssemblyEditing,
    startCreatingNew: startCreatingNewAssembly,
    saveAndExit: saveAssemblyAndExit,
    discardAndExit: discardAssemblyAndExit,
    requestExit: requestAssemblyExit,
    cancelExit: cancelAssemblyExit
  } = useAssemblyEditing();

  // Start screen state (defined early so it can be used in template editing callbacks)
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [showTemplatesScreen, setShowTemplatesScreen] = useState(false);

  // Track if assembly editing was initiated from the start screen (library modal)
  const assemblyEditingFromStartScreen = useRef(false);

  // Return to start screen when assembly editing ends if it was started from there
  useEffect(() => {
    if (!isEditingAssembly && assemblyEditingFromStartScreen.current) {
      assemblyEditingFromStartScreen.current = false;
      setShowStartScreen(true);
    }
  }, [isEditingAssembly]);

  // Template editing mode
  const {
    isEditingTemplate,
    editingTemplateName,
    editingTemplateDescription,
    isCreatingNewTemplate,
    showSaveDialog: showTemplateSaveDialog,
    showDiscardDialog: showTemplateDiscardDialog,
    showNewTemplateSetupDialog,
    startEditing: startTemplateEditing,
    startCreatingNew: startCreatingNewTemplate,
    confirmNewTemplateSetup,
    cancelNewTemplateSetup,
    saveTemplate: saveTemplateDirectly,
    saveAndExit: saveTemplateAndExit,
    requestDiscard: requestTemplateDiscard,
    discardAndExit: discardTemplateAndExit,
    cancelDialog: cancelTemplateDialog
  } = useTemplateEditing({
    onSaveComplete: () => {
      // After saving a template, return to the templates screen
      setShowTemplatesScreen(true);
      setShowStartScreen(false);
    },
    onDiscardComplete: () => {
      // After discarding, return to the templates screen
      setShowTemplatesScreen(true);
      setShowStartScreen(false);
    }
  });

  // File operations - now after editing hooks so we can route save commands appropriately
  const {
    UnsavedChangesDialogComponent,
    FileRecoveryModalComponent,
    handleNew,
    handleOpen,
    handleOpenRecent,
    handleRelocateFile,
    handleSave,
    handleGoHome
  } = useFileOperations({
    isEditingTemplate,
    onSaveTemplate: saveTemplateDirectly,
    isEditingAssembly,
    onSaveAssembly: saveAssemblyAndExit,
    onGoHome: () => {
      newProject(); // Reset project state to clear isDirty flag
      setShowStartScreen(true);
    }
  });

  // Auto-save - saves project automatically when changes are made (if enabled in settings)
  useAutoSave({
    onInitialSaveNeeded: handleSave,
    blocked: isEditingTemplate || isEditingAssembly || showStartScreen
  });

  // Platform detection for custom title bar
  const [platform, setPlatform] = useState<string>('');
  useEffect(() => {
    window.electronAPI.getPlatform().then(setPlatform);
  }, []);

  // Trial and license status
  const {
    mode: licenseMode,
    hasFullAccess,
    trial: trialStatus,
    shouldShowBanner: shouldShowTrialBanner,
    shouldShowExpiredModal,
    acknowledgeExpired,
    refresh: refreshLicenseStatus,
    isLoading: isLicenseLoading
  } = useLicenseStatus();

  // Sync license mode to project store for feature limit enforcement
  const setStoreLicenseMode = useLicenseStore((s) => s.setLicenseMode);
  useEffect(() => {
    setStoreLicenseMode(licenseMode);
  }, [licenseMode, setStoreLicenseMode]);

  // License management
  const [, setIsLicenseValid] = useState<boolean | null>(null); // null = checking, true = valid, false = invalid
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [licenseData, setLicenseData] = useState<{
    licenseEmail: string | null;
    licenseOrderId: string | null;
    licenseActivatedAt: string | null;
  }>({
    licenseEmail: null,
    licenseOrderId: null,
    licenseActivatedAt: null
  });

  // Check license on app start - now integrates with trial system
  useEffect(() => {
    const checkLicense = async () => {
      try {
        const result = await window.electronAPI.checkLicenseValid();
        const data = await window.electronAPI.getLicenseData();

        if (data) {
          setLicenseData({
            licenseEmail: data.email || null,
            licenseOrderId: data.orderId?.toString() || null,
            licenseActivatedAt: data.validatedAt ? new Date(data.validatedAt).toISOString() : null
          });
        } else {
          setLicenseData({
            licenseEmail: null,
            licenseOrderId: null,
            licenseActivatedAt: null
          });
        }

        if (result.valid) {
          setIsLicenseValid(true);
          setShowLicenseModal(false);
        } else {
          setIsLicenseValid(false);
          // Don't show license modal immediately - let trial system handle it
          // Only show if trial is expired and user explicitly wants to activate
          setShowLicenseModal(false);
        }
      } catch (error) {
        logger.error('Failed to check license:', error);
        setIsLicenseValid(false);
        // On error, also let trial system handle the flow
        setShowLicenseModal(false);
      }
    };

    checkLicense();
  }, []);

  // Welcome tutorial management
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialFromTemplate, setTutorialFromTemplate] = useState(false);
  const loadProject = useProjectStore((s) => s.loadProject);
  const newProject = useProjectStore((s) => s.newProject);

  // New project dialog state
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);

  // Check if welcome tutorial should be shown on first run
  useEffect(() => {
    const checkWelcome = async () => {
      try {
        const hasCompletedWelcome = await window.electronAPI.getHasCompletedWelcome();
        // Show tutorial if user has full access (licensed or trial) and hasn't completed it
        if (!hasCompletedWelcome && hasFullAccess) {
          // Load sample project for tutorial
          const sampleProject = generateSeedProject();
          loadProject(sampleProject);
          setShowTutorial(true);
          setShowStartScreen(false); // Hide start screen during tutorial
        }
      } catch (error) {
        logger.error('Failed to check welcome status:', error);
      }
    };

    // Only check after license/trial status is loaded
    if (!isLicenseLoading) {
      checkWelcome();
    }
  }, [isLicenseLoading, hasFullAccess, loadProject]);

  const handleTutorialComplete = async () => {
    setShowTutorial(false);

    // If tutorial was started from template, keep the user in the editor with their project
    if (tutorialFromTemplate) {
      setTutorialFromTemplate(false); // Reset the flag
      // Don't show start screen, let user continue editing the tutorial project
    } else {
      // First-run tutorial: show start screen for user to choose what to do
      setShowStartScreen(true);
      // Reset the project to empty state
      const now = new Date().toISOString();
      const emptyProject: Project = {
        version: PROJECT_FILE_VERSION,
        name: UNTITLED_PROJECT_NAME,
        units: 'imperial',
        gridSize: DEFAULT_PROJECT_GRID_SIZE.imperial,
        parts: [],
        stocks: [],
        assemblies: [],
        groups: [],
        groupMembers: [],
        createdAt: now,
        modifiedAt: now
      };
      loadProject(emptyProject);
    }

    try {
      await window.electronAPI.setHasCompletedWelcome(true);
    } catch (error) {
      logger.error('Failed to save welcome completion:', error);
    }
  };

  // Track project file path to auto-hide start screen when a project is loaded
  const filePath = useProjectStore((s) => s.filePath);

  // Hide start screen when a project is loaded from file
  useEffect(() => {
    if (filePath && showStartScreen) {
      setShowStartScreen(false);
    }
  }, [filePath, showStartScreen]);

  // Start screen handlers
  const handleStartScreenNewProject = () => {
    setShowNewProjectDialog(true);
  };

  const handleStartScreenSelectTemplate = (project: Project) => {
    loadProject(project);
    markDirty(); // Mark as dirty since it's a new unsaved project
    setShowStartScreen(false);
  };

  const handleStartScreenStartTutorial = (project: Project) => {
    loadProject(project);
    markDirty(); // Mark as dirty since it's a new unsaved project
    setShowStartScreen(false);
    setTutorialFromTemplate(true); // Track that this tutorial was started from template
    setShowTutorial(true); // Show the tutorial overlay
  };

  const handleStartScreenOpenProject = async () => {
    await handleOpen();
    // Explicitly hide start screen if a project was successfully loaded
    if (useProjectStore.getState().filePath) {
      setShowStartScreen(false);
    }
  };

  const handleStartScreenOpenRecent = async (openPath: string) => {
    await handleOpenRecent(openPath);
    // Explicitly hide start screen if a project was successfully loaded
    if (useProjectStore.getState().filePath) {
      setShowStartScreen(false);
    }
  };

  const handleStartScreenViewAllTemplates = () => {
    setShowTemplatesScreen(true);
  };

  // Templates Screen handlers
  const handleTemplatesScreenBack = () => {
    setShowTemplatesScreen(false);
  };

  const handleTemplatesScreenSelectTemplate = (project: Project) => {
    loadProject(project);
    markDirty();
    setShowTemplatesScreen(false);
    setShowStartScreen(false);
  };

  const handleTemplatesScreenStartTutorial = (project: Project) => {
    loadProject(project);
    markDirty();
    setShowTemplatesScreen(false);
    setShowStartScreen(false);
    setTutorialFromTemplate(true);
    setShowTutorial(true);
  };

  const handleTemplatesScreenEditTemplate = async (template: import('./templates').UserTemplate) => {
    const success = await startTemplateEditing(template);
    if (success) {
      setShowTemplatesScreen(false);
      setShowStartScreen(false);
    }
  };

  const handleTemplatesScreenNewTemplate = () => {
    // This just shows the setup dialog; actual editing starts when confirmNewTemplateSetup is called
    startCreatingNewTemplate();
  };

  // Handle recovery restore - need to hide start screen after successful restore
  const handleRecoveryRestore = async () => {
    const success = await restoreRecovery();
    if (success) {
      setShowStartScreen(false);
    }
  };

  const handleNewProjectDialogCreate = async (options: {
    name: string;
    units: 'imperial' | 'metric';
    selectedMaterials: string[];
  }) => {
    // Create a new project with the selected options
    const now = new Date().toISOString();
    const libraryStocks = ((await window.electronAPI.getPreference('stockLibrary')) as Stock[]) || [];
    const stockLibraryById = new Map(libraryStocks.map((stock) => [stock.id, stock] as const));
    const selectedStocks = options.selectedMaterials
      .map((id) => stockLibraryById.get(id))
      .filter((stock): stock is Stock => Boolean(stock))
      .map((stock) => ({
        ...stock,
        id: crypto.randomUUID()
      }));

    const newProject: Project = {
      version: PROJECT_FILE_VERSION,
      name: options.name,
      units: options.units,
      gridSize: DEFAULT_PROJECT_GRID_SIZE[options.units],
      parts: [],
      stocks: selectedStocks,
      assemblies: [],
      groups: [],
      groupMembers: [],
      createdAt: now,
      modifiedAt: now
    };

    loadProject(newProject);
    markDirty(); // Mark as dirty since it's a new unsaved project
    setShowNewProjectDialog(false);
    setShowStartScreen(false);
  };

  const handleNewProjectCancel = () => {
    setShowNewProjectDialog(false);
  };

  const handleLicenseActivate = async (licenseKey: string) => {
    try {
      const result = await window.electronAPI.activateLicense(licenseKey);
      if (result.valid) {
        const data = await window.electronAPI.getLicenseData();
        if (data) {
          setLicenseData({
            licenseEmail: data.email || null,
            licenseOrderId: data.orderId?.toString() || null,
            licenseActivatedAt: data.validatedAt ? new Date(data.validatedAt).toISOString() : null
          });
        }
        setIsLicenseValid(true);
        setShowLicenseModal(false);
        // Refresh the license status hook to update trial UI
        refreshLicenseStatus();
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Invalid license key' };
      }
    } catch {
      return { success: false, error: 'Failed to verify license' };
    }
  };

  const handleLicenseDeactivate = async () => {
    try {
      await window.electronAPI.deactivateLicense();
      setLicenseData({
        licenseEmail: null,
        licenseOrderId: null,
        licenseActivatedAt: null
      });
      setIsLicenseValid(false);
      // Refresh the license status hook - it will determine if trial modal should show
      refreshLicenseStatus();
      // Don't show license modal immediately - let trial system handle the flow
    } catch (error) {
      logger.error('Failed to deactivate license:', error);
    }
  };

  // Project name and dirty state for header
  const projectName = useProjectStore((s) => s.projectName);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const isDirty = useProjectStore((s) => s.isDirty);
  const markDirty = useProjectStore((s) => s.markDirty);
  const [isHeaderNameEditing, setIsHeaderNameEditing] = useState(false);
  const [headerNameDraft, setHeaderNameDraft] = useState('');

  const headerMode: 'project' | 'template' | 'assembly' = isEditingAssembly
    ? 'assembly'
    : isEditingTemplate
      ? 'template'
      : 'project';
  const displayName =
    headerMode === 'assembly'
      ? editingAssemblyName || 'Untitled Assembly'
      : projectName || (headerMode === 'template' ? UNTITLED_TEMPLATE_NAME : UNTITLED_PROJECT_NAME);

  useEffect(() => {
    if (!isHeaderNameEditing) {
      setHeaderNameDraft(displayName);
    }
  }, [displayName, isHeaderNameEditing]);

  const handleStartHeaderNameEdit = () => {
    setHeaderNameDraft(displayName);
    setIsHeaderNameEditing(true);
  };

  const handleCommitHeaderName = () => {
    const trimmed = headerNameDraft.trim();
    const nextName = trimmed || displayName;

    if (headerMode === 'assembly') {
      if (nextName !== editingAssemblyName) {
        useAssemblyEditingStore.setState({ editingAssemblyName: nextName });
      }
    } else {
      if (nextName !== projectName) {
        setProjectName(nextName);
      }
    }
    setIsHeaderNameEditing(false);
  };

  const handleHeaderNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommitHeaderName();
    } else if (e.key === 'Escape') {
      setIsHeaderNameEditing(false);
      setHeaderNameDraft(displayName);
    }
  };

  const handleExitEditMode = () => {
    if (isEditingAssembly) {
      requestAssemblyExit();
      return;
    }
    if (isEditingTemplate) {
      requestTemplateDiscard();
    }
  };

  // Part deletion confirmation
  const parts = useProjectStore((s) => s.parts);
  const pendingDeletePartIds = useUIStore((s) => s.pendingDeletePartIds);
  const confirmDeleteParts = useProjectStore((s) => s.confirmDeleteParts);
  const cancelDeleteParts = useUIStore((s) => s.cancelDeleteParts);

  // Cut list modal
  const openCutListModal = useUIStore((s) => s.openCutListModal);
  const cutListModalOpen = useUIStore((s) => s.cutListModalOpen);

  // Save assembly modal
  const saveAssemblyModalOpen = useUIStore((s) => s.saveAssemblyModalOpen);

  // App settings
  const { settings: appSettings, isLoading: settingsLoading, updateSettings: updateAppSettings } = useAppSettings();

  // Apply theme based on settings (skip while loading — index.html inline script already set the initial theme)
  useEffect(() => {
    if (settingsLoading) return;

    const applyTheme = (theme: 'light' | 'dark' | 'system') => {
      let effectiveTheme: 'light' | 'dark';
      if (theme === 'system') {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        effectiveTheme = prefersDark ? 'dark' : 'light';
      } else {
        effectiveTheme = theme;
      }
      document.documentElement.setAttribute('data-theme', effectiveTheme);

      // Cache theme in localStorage for instant restore on next launch (read by index.html)
      localStorage.setItem('carvd-theme', theme); // eslint-disable-line no-undef

      // Update title bar overlay colors for Windows/Linux
      const overlayColors = effectiveTheme === 'dark' ? TITLE_BAR_OVERLAY_COLORS.dark : TITLE_BAR_OVERLAY_COLORS.light;
      window.electronAPI.setTitleBarOverlay(overlayColors);
    };

    applyTheme(appSettings.theme);

    // Listen for system theme changes if using system preference
    if (appSettings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [appSettings.theme, settingsLoading]);

  // Handle confirm before delete setting
  // When confirmBeforeDelete is false, immediately delete without dialog
  useEffect(() => {
    if (pendingDeletePartIds && !appSettings.confirmBeforeDelete) {
      // Skip confirmation, delete immediately
      confirmDeleteParts();
    }
  }, [pendingDeletePartIds, appSettings.confirmBeforeDelete, confirmDeleteParts]);

  // Modal state
  const [isStockLibraryOpen, setIsStockLibraryOpen] = useState(false);
  const [isAppSettingsOpen, setIsAppSettingsOpen] = useState(false);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [isTemplateBrowserOpen, setIsTemplateBrowserOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isImportAppStateOpen, setIsImportAppStateOpen] = useState(false);

  // Handler for creating a project from a template
  const handleCreateFromTemplate = async (project: Project) => {
    loadProject(project);
    // Mark as dirty since this is a new project (not saved to disk yet)
    markDirty();

    // Add template stocks to the app-level stock library (if not already present)
    // Compare by name, dimensions, and thickness to avoid duplicates
    for (const templateStock of project.stocks) {
      const exists = stockLibrary.some(
        (s) =>
          s.name === templateStock.name &&
          s.length === templateStock.length &&
          s.width === templateStock.width &&
          s.thickness === templateStock.thickness
      );
      if (!exists) {
        await addToLibrary({ ...templateStock });
      }
    }

    // Add template assemblies to the app-level assembly library (if any and not already present)
    if (project.assemblies && project.assemblies.length > 0) {
      for (const templateAssembly of project.assemblies) {
        const exists = assemblyLibrary.some((a) => a.name === templateAssembly.name);
        if (!exists) {
          try {
            const currentAssemblies = (await window.electronAPI.getPreference('assemblyLibrary')) || [];
            await window.electronAPI.setPreference('assemblyLibrary', [...currentAssemblies, templateAssembly]);
          } catch (error) {
            logger.error('Failed to add template assembly to library:', error);
          }
        }
      }
    }
  };

  const {
    stocks: stockLibrary,
    addStock: addToLibrary,
    updateStock: updateLibraryStock,
    deleteStock: deleteLibraryStock
  } = useStockLibrary();

  const {
    assemblies: assemblyLibrary,
    updateAssembly: updateLibraryAssembly,
    deleteAssembly: deleteLibraryAssembly,
    duplicateAssembly: duplicateLibraryAssembly
  } = useAssemblyLibrary();

  // Native menu commands handler
  useMenuCommands({
    onOpenSettings: () => setIsAppSettingsOpen(true),
    onOpenTemplateBrowser: () => {
      setIsTemplateBrowserOpen(false);
      setShowTemplatesScreen(true);
      setShowStartScreen(false);
    },
    onShowAbout: () => setIsAboutModalOpen(true),
    // File operations with unsaved changes handling
    onNewProject: handleNew,
    onOpenProject: handleOpen,
    onOpenRecentProject: handleOpenRecent,
    onCloseProject: handleGoHome,
    // Template/assembly editing mode - route save commands appropriately
    isEditingTemplate,
    onSaveTemplate: saveTemplateDirectly,
    onSaveAssembly: saveAssemblyAndExit
  });

  // Get names of parts pending deletion for the confirmation message
  const pendingDeletePartNames = pendingDeletePartIds
    ? parts.filter((p) => pendingDeletePartIds.includes(p.id)).map((p) => p.name)
    : [];

  // Determine if we should show the main editor or a full-screen overlay
  // Note: showTutorial is NOT excluded here because the tutorial needs the editor
  // elements to be visible for targeting (sidebar, canvas, properties panel)
  // With trial system: user can use editor if licensed, in trial, OR in free mode (with limits)
  // Note: licenseMode covers all cases - we don't need a separate isLicenseValid check
  const canUseApp = licenseMode === 'licensed' || licenseMode === 'trial' || licenseMode === 'free';
  const showMainEditor = canUseApp && !showStartScreen && !isLicenseLoading;

  return (
    <TooltipProvider>
      <div className="app">
        {/* Update notifications — banner for updates, toast for post-update */}
        <UpdateNotificationBanner />
        {/* Only show header and main content when not on start screen */}
        {showMainEditor && (
          <>
            <header className={`app-header ${platform ? `platform-${platform}` : ''}`}>
              <div className="header-left">
                <div className="header-title">
                  <button
                    className="app-name-btn"
                    onClick={handleGoHome}
                    title="Return to start screen"
                    aria-label="Carvd Studio home"
                  >
                    <AppHorizontalLogo className="h-10 w-auto -mx-1" alt="Carvd Studio" />
                  </button>
                  <span className="title-separator">/</span>
                  {headerMode !== 'project' && (
                    <Badge
                      variant="outline"
                      className={
                        headerMode === 'template'
                          ? 'header-mode-chip border-warning/50 bg-warning-bg text-warning'
                          : 'header-mode-chip border-info bg-info-bg text-info'
                      }
                    >
                      {headerMode === 'template' ? 'Template' : 'Assembly'}
                    </Badge>
                  )}
                  {isHeaderNameEditing ? (
                    <span className="header-name-editor">
                      <Input
                        type="text"
                        value={headerNameDraft}
                        onChange={(e) => setHeaderNameDraft(e.target.value)}
                        onKeyDown={handleHeaderNameKeyDown}
                        onBlur={handleCommitHeaderName}
                        className="h-7 w-[260px] bg-bg"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="header-name-confirm"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleCommitHeaderName}
                        title="Confirm name"
                      >
                        <Check size={14} />
                      </Button>
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="project-name h-auto gap-1.5 rounded px-2 py-1"
                      onClick={handleStartHeaderNameEdit}
                      title="Click to rename"
                    >
                      <span>{displayName}</span>
                      <Pencil size={12} className="opacity-60" />
                      {isDirty && <span className="dirty-indicator"> •</span>}
                    </Button>
                  )}
                </div>
              </div>
              <div className="header-actions">
                <div className="header-actions-group">
                  <UndoRedoButtons />
                  {(isEditingTemplate || isEditingAssembly) && (
                    <Button
                      variant={isDirty ? 'secondary' : 'outline'}
                      size="xs"
                      className="h-7 px-2"
                      onClick={handleExitEditMode}
                      title={isDirty ? 'Cancel editing' : 'Exit editing'}
                    >
                      {isDirty ? 'Cancel' : 'Exit'}
                    </Button>
                  )}
                  <Button
                    variant={isDirty ? 'default' : 'outline'}
                    size="icon"
                    onClick={handleSave}
                    title="Save (Cmd+S)"
                  >
                    <Save size={18} />
                  </Button>
                </div>
                <Separator orientation="vertical" className="h-7" />
                <div className="header-actions-group">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsStockLibraryOpen(true)}
                    title="Stock Library"
                  >
                    <Library size={18} />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setIsAppSettingsOpen(true)} title="App Settings">
                    <Settings size={18} />
                  </Button>
                </div>
                {licenseMode === 'free' && (
                  <>
                    <Separator orientation="vertical" className="h-7" />
                    <Button
                      size="sm"
                      className="upgrade-btn"
                      onClick={() => {
                        // Open purchase page in browser
                        window.open(EXTERNAL_LINKS.pricing, '_blank');
                        // Also open license modal to enter key
                        setShowLicenseModal(true);
                      }}
                    >
                      Upgrade
                    </Button>
                  </>
                )}
              </div>
            </header>
            {/* Trial Banner (shown days 7-14 of trial) */}
            {shouldShowTrialBanner && trialStatus && (
              <TrialBanner
                daysRemaining={trialStatus.daysRemaining}
                onActivateLicense={() => setShowLicenseModal(true)}
                onPurchase={() => {}}
              />
            )}
            <SidebarProvider className="app-main">
              <AppSidebar
                onOpenProjectSettings={() => setIsProjectSettingsOpen(true)}
                onOpenCutList={openCutListModal}
                onCreateNewAssembly={startCreatingNewAssembly}
                onShowLicenseModal={() => setShowLicenseModal(true)}
              />
              <CanvasWithDrop />
              <PropertiesPanel />
            </SidebarProvider>
          </>
        )}
        <ContextMenu />
        <SelectionBox />
        <Toaster />
        {isStockLibraryOpen && (
          <Suspense fallback={null}>
            <LazyStockLibraryModal
              isOpen={isStockLibraryOpen}
              onClose={() => setIsStockLibraryOpen(false)}
              stocks={stockLibrary}
              onAddStock={addToLibrary}
              onUpdateStock={updateLibraryStock}
              onDeleteStock={deleteLibraryStock}
              assemblies={assemblyLibrary}
              onUpdateAssembly={updateLibraryAssembly}
              onDeleteAssembly={deleteLibraryAssembly}
              onDuplicateAssembly={duplicateLibraryAssembly}
              onEditAssemblyIn3D={async (assembly) => {
                const success = await startAssemblyEditing(assembly);
                if (success && showStartScreen) {
                  assemblyEditingFromStartScreen.current = true;
                  setShowStartScreen(false);
                }
                return success;
              }}
              onCreateNewAssembly={async () => {
                const success = await startCreatingNewAssembly();
                if (success && showStartScreen) {
                  assemblyEditingFromStartScreen.current = true;
                  setShowStartScreen(false);
                }
                return success;
              }}
            />
          </Suspense>
        )}

        {/* Delete Part(s) Confirmation - only shown when confirmBeforeDelete is enabled */}
        <ConfirmDialog
          isOpen={pendingDeletePartIds !== null && appSettings.confirmBeforeDelete}
          title={pendingDeletePartIds?.length === 1 ? 'Delete Part?' : 'Delete Parts?'}
          message={
            pendingDeletePartIds?.length === 1
              ? `Are you sure you want to delete "${pendingDeletePartNames[0]}"?`
              : `Are you sure you want to delete ${pendingDeletePartIds?.length} parts?`
          }
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={confirmDeleteParts}
          onCancel={cancelDeleteParts}
        />

        {/* Trial Expired Modal */}
        {shouldShowExpiredModal && (
          <TrialExpiredModal
            onActivateLicense={() => {
              acknowledgeExpired();
              setShowLicenseModal(true);
            }}
            onPurchase={acknowledgeExpired}
            onContinueFree={acknowledgeExpired}
          />
        )}

        {/* License Activation Modal */}
        {showLicenseModal && (
          <Suspense fallback={null}>
            <LazyLicenseActivationModal
              isOpen={showLicenseModal}
              onActivate={handleLicenseActivate}
              onClose={() => setShowLicenseModal(false)}
            />
          </Suspense>
        )}

        {/* App Settings Modal */}
        {isAppSettingsOpen && (
          <Suspense fallback={null}>
            <LazyAppSettingsModal
              isOpen={isAppSettingsOpen}
              onClose={() => setIsAppSettingsOpen(false)}
              settings={appSettings}
              onUpdateSettings={updateAppSettings}
              licenseMode={licenseMode}
              licenseData={licenseData}
              onDeactivateLicense={handleLicenseDeactivate}
              onShowLicenseModal={() => setShowLicenseModal(true)}
              onShowImportModal={() => setIsImportAppStateOpen(true)}
            />
          </Suspense>
        )}

        {/* Import App State Modal */}
        {isImportAppStateOpen && (
          <Suspense fallback={null}>
            <LazyImportAppStateModal isOpen={isImportAppStateOpen} onClose={() => setIsImportAppStateOpen(false)} />
          </Suspense>
        )}

        {/* About Modal */}
        {isAboutModalOpen && (
          <Suspense fallback={null}>
            <LazyAboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
          </Suspense>
        )}

        {/* Project Settings Modal */}
        {isProjectSettingsOpen && (
          <Suspense fallback={null}>
            <LazyProjectSettingsModal
              isOpen={isProjectSettingsOpen}
              onClose={() => setIsProjectSettingsOpen(false)}
              isEditingTemplate={isEditingTemplate}
            />
          </Suspense>
        )}

        {/* Template Browser Modal */}
        {isTemplateBrowserOpen && (
          <Suspense fallback={null}>
            <LazyTemplateBrowserModal
              isOpen={isTemplateBrowserOpen}
              onClose={() => setIsTemplateBrowserOpen(false)}
              onCreateProject={handleCreateFromTemplate}
            />
          </Suspense>
        )}

        {/* Save Assembly Modal */}
        {saveAssemblyModalOpen && (
          <Suspense fallback={null}>
            <LazySaveAssemblyModalWrapper />
          </Suspense>
        )}

        {/* Cut List Modal */}
        {cutListModalOpen && (
          <Suspense fallback={null}>
            <LazyCutListModalWrapper />
          </Suspense>
        )}

        {/* Unsaved Changes Dialog */}
        <UnsavedChangesDialogComponent />
        <FileRecoveryModalComponent />

        {/* Auto-Recovery Dialog */}
        <RecoveryDialog
          isOpen={hasRecovery}
          recoveryInfo={recoveryInfo}
          onRestore={handleRecoveryRestore}
          onDiscard={discardRecovery}
        />

        {/* Import to Library Dialog */}
        <ImportToLibraryDialog
          isOpen={showImportDialog}
          missingStocks={missingStocks}
          missingAssemblies={missingAssemblies}
          onImport={handleLibraryImport}
          onSkip={handleLibraryImportSkip}
        />

        {/* Assembly Editing Exit Dialog */}
        <AssemblyEditingExitDialog
          isOpen={showAssemblyExitDialog}
          assemblyName={editingAssemblyName}
          isCreatingNew={isCreatingNewAssembly}
          onSave={saveAssemblyAndExit}
          onDiscard={discardAssemblyAndExit}
          onCancel={cancelAssemblyExit}
        />

        {/* Template Save Dialog */}
        <TemplateSaveDialog
          isOpen={showTemplateSaveDialog}
          templateName={editingTemplateName}
          templateDescription={editingTemplateDescription}
          isCreatingNew={isCreatingNewTemplate}
          onSave={saveTemplateAndExit}
          onCancel={cancelTemplateDialog}
        />

        {/* Template Discard Confirmation Dialog */}
        <TemplateDiscardDialog
          isOpen={showTemplateDiscardDialog}
          templateName={editingTemplateName}
          isCreatingNew={isCreatingNewTemplate}
          onDiscard={discardTemplateAndExit}
          onCancel={cancelTemplateDialog}
        />

        {/* Template Setup Dialog (shown before entering edit mode for new templates) */}
        <TemplateSetupDialog
          isOpen={showNewTemplateSetupDialog}
          onConfirm={async (name, description) => {
            const success = await confirmNewTemplateSetup(name, description);
            if (success) {
              setShowTemplatesScreen(false);
              setShowStartScreen(false);
            }
          }}
          onCancel={cancelNewTemplateSetup}
        />

        {/* Welcome Tutorial (first-run experience) */}
        {showTutorial && (
          <Suspense fallback={null}>
            <LazyWelcomeTutorial onComplete={handleTutorialComplete} />
          </Suspense>
        )}

        {/* Start Screen (shown when no project is loaded, or while checking license/trial) */}
        {showStartScreen && canUseApp && !showTutorial && !isLicenseLoading && (
          <StartScreen
            onNewProject={handleStartScreenNewProject}
            onOpenFile={handleStartScreenOpenProject}
            onOpenProject={handleStartScreenOpenRecent}
            onRelocateFile={handleRelocateFile}
            onSelectTemplate={handleStartScreenSelectTemplate}
            onStartTutorial={handleStartScreenStartTutorial}
            onViewAllTemplates={handleStartScreenViewAllTemplates}
            onOpenSettings={() => setIsAppSettingsOpen(true)}
            onOpenLibrary={() => setIsStockLibraryOpen(true)}
          />
        )}

        {/* Templates Screen (full-screen view of all templates) */}
        {showTemplatesScreen && (
          <Suspense fallback={null}>
            <LazyTemplatesScreen
              onBack={handleTemplatesScreenBack}
              onSelectTemplate={handleTemplatesScreenSelectTemplate}
              onStartTutorial={handleTemplatesScreenStartTutorial}
              onEditTemplate={handleTemplatesScreenEditTemplate}
              onNewTemplate={handleTemplatesScreenNewTemplate}
            />
          </Suspense>
        )}

        {/* New Project Dialog */}
        <NewProjectDialog
          isOpen={showNewProjectDialog}
          onClose={handleNewProjectCancel}
          onCreateProject={handleNewProjectDialogCreate}
        />
      </div>
    </TooltipProvider>
  );
}

export default App;
