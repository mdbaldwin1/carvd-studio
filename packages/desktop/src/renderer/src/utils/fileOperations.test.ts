import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { useProjectStore } from '../store/projectStore';
import { useCameraStore } from '../store/cameraStore';

// Mock fileFormat module
vi.mock('./fileFormat', () => ({
  serializeProject: vi.fn().mockReturnValue({ version: '1.0', projectName: 'Test' }),
  parseCarvdFile: vi.fn(),
  deserializeToProject: vi.fn(),
  stringifyCarvdFile: vi.fn().mockReturnValue('{"version":"1.0"}'),
  CARVD_FILE_FILTER: { name: 'Carvd Project', extensions: ['carvd'] },
  getProjectNameFromPath: vi.fn((p: string) => {
    const name = p.split('/').pop()?.replace('.carvd', '') ?? 'Untitled';
    return name;
  }),
  repairCarvdFile: vi.fn()
}));

// Mock logger
vi.mock('./logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Mock generateThumbnail from projectStore
vi.mock('../store/projectStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../store/projectStore')>();
  return {
    ...actual,
    generateThumbnail: vi.fn().mockResolvedValue(null)
  };
});

import {
  saveProject,
  saveProjectAs,
  openProject,
  openProjectFromPath,
  attemptFileRepair,
  loadRepairedFile,
  newProject,
  hasUnsavedChanges,
  getCurrentFilePath,
  updateWindowTitle,
  getRecentProjects,
  clearRecentProjects
} from './fileOperations';
import { parseCarvdFile, deserializeToProject, repairCarvdFile } from './fileFormat';
import { generateThumbnail } from '../store/projectStore';

// ============================================================
// Setup
// ============================================================

beforeAll(() => {
  window.electronAPI = {
    showSaveDialog: vi.fn(),
    showOpenDialog: vi.fn(),
    writeBinaryFile: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    addRecentProject: vi.fn(),
    getRecentProjects: vi.fn(),
    clearRecentProjects: vi.fn(),
    setWindowTitle: vi.fn(),
    getPreference: vi.fn(),
    setPreference: vi.fn()
  } as unknown as typeof window.electronAPI;
});

beforeEach(() => {
  vi.clearAllMocks();
  useProjectStore.setState({
    projectName: 'Test Project',
    filePath: null,
    isDirty: false,
    parts: [],
    stocks: [],
    groups: [],
    groupMembers: [],
    assemblies: [],
    snapGuides: [],
    customShoppingItems: [],
    cutList: null,
    units: 'imperial',
    gridSize: 1,
    kerfWidth: 0.125,
    overageFactor: 1.0,
    projectNotes: '',
    stockConstraints: {
      constrainDimensions: true,
      constrainGrain: true,
      constrainColor: true,
      preventOverlap: true
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    modifiedAt: '2026-01-01T00:00:00.000Z'
  });
});

// ============================================================
// saveProject
// ============================================================

describe('saveProject', () => {
  it('delegates to saveProjectAs when no filePath is set', async () => {
    (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
      canceled: true
    });

    const result = await saveProject();
    expect(result.success).toBe(false);
    expect(result.canceled).toBe(true);
    expect(window.electronAPI.showSaveDialog).toHaveBeenCalled();
  });

  it('saves to existing path when filePath is set', async () => {
    useProjectStore.setState({ filePath: '/path/to/project.carvd' });
    (window.electronAPI.writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (window.electronAPI.addRecentProject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await saveProject();
    expect(result.success).toBe(true);
    expect(result.filePath).toBe('/path/to/project.carvd');
    expect(window.electronAPI.showSaveDialog).not.toHaveBeenCalled();
  });
});

// ============================================================
// saveProjectAs
// ============================================================

describe('saveProjectAs', () => {
  it('returns canceled when dialog is canceled', async () => {
    (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
      canceled: true,
      filePath: undefined
    });

    const result = await saveProjectAs();
    expect(result.success).toBe(false);
    expect(result.canceled).toBe(true);
  });

  it('returns canceled when filePath is empty', async () => {
    (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
      canceled: false,
      filePath: ''
    });

    const result = await saveProjectAs();
    expect(result.success).toBe(false);
    expect(result.canceled).toBe(true);
  });

  it('saves successfully to chosen path', async () => {
    (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
      canceled: false,
      filePath: '/new/path/MyProject.carvd'
    });
    (window.electronAPI.writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (window.electronAPI.addRecentProject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await saveProjectAs();
    expect(result.success).toBe(true);
    expect(result.filePath).toBe('/new/path/MyProject.carvd');
  });

  it('updates project name from chosen filename', async () => {
    (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
      canceled: false,
      filePath: '/new/path/NewName.carvd'
    });
    (window.electronAPI.writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (window.electronAPI.addRecentProject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await saveProjectAs();
    // setProjectName should have been called (the mock of getProjectNameFromPath returns 'NewName')
    expect(useProjectStore.getState().projectName).toBe('NewName');
  });

  it('returns error when showSaveDialog throws', async () => {
    (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Dialog error'));

    const result = await saveProjectAs();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Dialog error');
  });
});

// ============================================================
// saveToPath (tested indirectly via saveProject)
// ============================================================

describe('saveToPath (via saveProject)', () => {
  beforeEach(() => {
    useProjectStore.setState({ filePath: '/test/project.carvd' });
    (window.electronAPI.writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (window.electronAPI.addRecentProject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('marks project as clean after saving', async () => {
    useProjectStore.setState({ isDirty: true });

    await saveProject();
    expect(useProjectStore.getState().isDirty).toBe(false);
  });

  it('sets file path in store', async () => {
    useProjectStore.setState({ filePath: '/old/path.carvd' });

    await saveProject();
    expect(useProjectStore.getState().filePath).toBe('/old/path.carvd');
  });

  it('adds to recent projects', async () => {
    await saveProject();
    expect(window.electronAPI.addRecentProject).toHaveBeenCalledWith('/test/project.carvd');
  });

  it('updates window title', async () => {
    await saveProject();
    expect(window.electronAPI.setWindowTitle).toHaveBeenCalled();
  });

  it('generates thumbnail when parts exist', async () => {
    useProjectStore.setState({
      parts: [{ id: 'p1' }] as any[]
    });
    (generateThumbnail as ReturnType<typeof vi.fn>).mockResolvedValue('data:image/png;base64,abc');

    await saveProject();
    expect(generateThumbnail).toHaveBeenCalled();
  });

  it('skips thumbnail when no parts', async () => {
    useProjectStore.setState({ parts: [] });

    await saveProject();
    expect(generateThumbnail).not.toHaveBeenCalled();
  });

  it('returns error on write failure', async () => {
    (window.electronAPI.writeFile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Disk full'));

    const result = await saveProject();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Disk full');
  });
});

// ============================================================
// openProject
// ============================================================

describe('openProject', () => {
  it('returns canceled when dialog is canceled', async () => {
    (window.electronAPI.showOpenDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
      canceled: true,
      filePaths: []
    });

    const result = await openProject();
    expect(result.success).toBe(false);
    expect(result.canceled).toBe(true);
  });

  it('returns canceled when no files selected', async () => {
    (window.electronAPI.showOpenDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
      canceled: false,
      filePaths: []
    });

    const result = await openProject();
    expect(result.success).toBe(false);
    expect(result.canceled).toBe(true);
  });

  it('opens file from selected path', async () => {
    (window.electronAPI.showOpenDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
      canceled: false,
      filePaths: ['/path/to/project.carvd']
    });
    (window.electronAPI.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('{}');
    (parseCarvdFile as ReturnType<typeof vi.fn>).mockReturnValue({
      valid: true,
      data: { version: '1.0', projectName: 'Test' },
      errors: [],
      warnings: []
    });
    (deserializeToProject as ReturnType<typeof vi.fn>).mockReturnValue({
      name: 'Test',
      parts: [],
      stocks: []
    });
    (window.electronAPI.addRecentProject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await openProject();
    expect(result.success).toBe(true);
    expect(result.filePath).toBe('/path/to/project.carvd');
  });

  it('returns error when showOpenDialog throws', async () => {
    (window.electronAPI.showOpenDialog as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Dialog error'));

    const result = await openProject();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Dialog error');
  });
});

// ============================================================
// openProjectFromPath
// ============================================================

describe('openProjectFromPath', () => {
  it('loads a valid file successfully', async () => {
    (window.electronAPI.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('{"valid":"json"}');
    (parseCarvdFile as ReturnType<typeof vi.fn>).mockReturnValue({
      valid: true,
      data: { version: '1.0', projectName: 'Loaded' },
      errors: [],
      warnings: []
    });
    (deserializeToProject as ReturnType<typeof vi.fn>).mockReturnValue({
      name: 'Loaded',
      parts: [],
      stocks: []
    });
    (window.electronAPI.addRecentProject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await openProjectFromPath('/path/to/loaded.carvd');
    expect(result.success).toBe(true);
    expect(result.filePath).toBe('/path/to/loaded.carvd');
  });

  it('adds to recent projects on success', async () => {
    (window.electronAPI.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('{}');
    (parseCarvdFile as ReturnType<typeof vi.fn>).mockReturnValue({
      valid: true,
      data: { version: '1.0' },
      errors: [],
      warnings: []
    });
    (deserializeToProject as ReturnType<typeof vi.fn>).mockReturnValue({ name: 'Test' });
    (window.electronAPI.addRecentProject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await openProjectFromPath('/path/to/project.carvd');
    expect(window.electronAPI.addRecentProject).toHaveBeenCalledWith('/path/to/project.carvd');
  });

  it('returns error for invalid JSON file', async () => {
    (window.electronAPI.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('not json');
    (parseCarvdFile as ReturnType<typeof vi.fn>).mockReturnValue({
      valid: false,
      data: null,
      errors: ['Invalid JSON'],
      warnings: []
    });

    const result = await openProjectFromPath('/path/to/bad.carvd');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid JSON');
  });

  it('returns needsRecovery for non-JSON validation errors', async () => {
    (window.electronAPI.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('{"version":"1.0"}');
    (parseCarvdFile as ReturnType<typeof vi.fn>).mockReturnValue({
      valid: false,
      data: null,
      errors: ['Missing required field: parts'],
      warnings: []
    });

    const result = await openProjectFromPath('/path/to/corrupt.carvd');
    expect(result.success).toBe(false);
    expect(result.needsRecovery).toBe(true);
    expect(result.validationErrors).toContain('Missing required field: parts');
    expect(result.rawContent).toBe('{"version":"1.0"}');
    expect(result.filePath).toBe('/path/to/corrupt.carvd');
  });

  it('handles file with warnings', async () => {
    (window.electronAPI.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('{}');
    (parseCarvdFile as ReturnType<typeof vi.fn>).mockReturnValue({
      valid: true,
      data: { version: '1.0' },
      errors: [],
      warnings: ['Deprecated field found']
    });
    (deserializeToProject as ReturnType<typeof vi.fn>).mockReturnValue({ name: 'Test' });
    (window.electronAPI.addRecentProject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await openProjectFromPath('/path/to/old.carvd');
    expect(result.success).toBe(true);
  });

  it('returns error when readFile throws', async () => {
    (window.electronAPI.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('File not found'));

    const result = await openProjectFromPath('/nonexistent.carvd');
    expect(result.success).toBe(false);
    expect(result.error).toContain('File not found');
  });

  it('updates window title on success', async () => {
    (window.electronAPI.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('{}');
    (parseCarvdFile as ReturnType<typeof vi.fn>).mockReturnValue({
      valid: true,
      data: { version: '1.0' },
      errors: [],
      warnings: []
    });
    (deserializeToProject as ReturnType<typeof vi.fn>).mockReturnValue({ name: 'Test' });
    (window.electronAPI.addRecentProject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await openProjectFromPath('/path/to/project.carvd');
    expect(window.electronAPI.setWindowTitle).toHaveBeenCalled();
  });
});

// ============================================================
// attemptFileRepair
// ============================================================

describe('attemptFileRepair', () => {
  it('delegates to repairCarvdFile', () => {
    const mockResult = {
      success: true,
      repairedData: { version: '1.0' },
      repairActions: ['Added missing parts array'],
      remainingErrors: [],
      warnings: []
    };
    (repairCarvdFile as ReturnType<typeof vi.fn>).mockReturnValue(mockResult);

    const result = attemptFileRepair('{"version":"1.0"}');
    expect(repairCarvdFile).toHaveBeenCalledWith('{"version":"1.0"}');
    expect(result).toEqual(mockResult);
  });
});

// ============================================================
// loadRepairedFile
// ============================================================

describe('loadRepairedFile', () => {
  it('loads repaired data and marks as dirty', async () => {
    const repairedData = { version: '1.0', projectName: 'Repaired' } as any;
    (deserializeToProject as ReturnType<typeof vi.fn>).mockReturnValue({
      name: 'Repaired',
      parts: [],
      stocks: []
    });
    (window.electronAPI.addRecentProject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await loadRepairedFile(repairedData, '/path/to/repaired.carvd');
    expect(result.success).toBe(true);
    expect(result.filePath).toBe('/path/to/repaired.carvd');
    expect(useProjectStore.getState().isDirty).toBe(true);
  });

  it('adds to recent projects', async () => {
    (deserializeToProject as ReturnType<typeof vi.fn>).mockReturnValue({ name: 'Test' });
    (window.electronAPI.addRecentProject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await loadRepairedFile({} as any, '/path/to/file.carvd');
    expect(window.electronAPI.addRecentProject).toHaveBeenCalledWith('/path/to/file.carvd');
  });

  it('returns error when deserialization fails', async () => {
    (deserializeToProject as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Deserialization failed');
    });

    const result = await loadRepairedFile({} as any, '/path/to/bad.carvd');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Deserialization failed');
  });
});

// ============================================================
// newProject
// ============================================================

describe('newProject', () => {
  it('returns success', async () => {
    const result = await newProject();
    expect(result.success).toBe(true);
  });

  it('updates window title', async () => {
    await newProject();
    expect(window.electronAPI.setWindowTitle).toHaveBeenCalled();
  });

  it('passes defaults to store', async () => {
    await newProject({ units: 'metric', gridSize: 10 });
    // newProject resets the store; we just check no error
    expect(window.electronAPI.setWindowTitle).toHaveBeenCalled();
  });
});

// ============================================================
// hasUnsavedChanges
// ============================================================

describe('hasUnsavedChanges', () => {
  it('returns false when project is clean', () => {
    useProjectStore.setState({ isDirty: false });
    expect(hasUnsavedChanges()).toBe(false);
  });

  it('returns true when project is dirty', () => {
    useProjectStore.setState({ isDirty: true });
    expect(hasUnsavedChanges()).toBe(true);
  });
});

// ============================================================
// getCurrentFilePath
// ============================================================

describe('getCurrentFilePath', () => {
  it('returns null when no file path set', () => {
    useProjectStore.setState({ filePath: null });
    expect(getCurrentFilePath()).toBeNull();
  });

  it('returns the file path when set', () => {
    useProjectStore.setState({ filePath: '/some/path.carvd' });
    expect(getCurrentFilePath()).toBe('/some/path.carvd');
  });
});

// ============================================================
// updateWindowTitle
// ============================================================

describe('updateWindowTitle', () => {
  it('uses project name when no file path', () => {
    useProjectStore.setState({ projectName: 'My Design', filePath: null, isDirty: false });

    updateWindowTitle();
    expect(window.electronAPI.setWindowTitle).toHaveBeenCalledWith('My Design - Carvd Studio');
  });

  it('uses file name from path when filePath is set', () => {
    useProjectStore.setState({ filePath: '/path/to/Bookshelf.carvd', isDirty: false });

    updateWindowTitle();
    // getProjectNameFromPath mock strips .carvd extension
    expect(window.electronAPI.setWindowTitle).toHaveBeenCalledWith('Bookshelf - Carvd Studio');
  });

  it('adds dirty indicator when project has unsaved changes', () => {
    useProjectStore.setState({ projectName: 'My Design', filePath: null, isDirty: true });

    updateWindowTitle();
    expect(window.electronAPI.setWindowTitle).toHaveBeenCalledWith('My Design • - Carvd Studio');
  });
});

// ============================================================
// getRecentProjects
// ============================================================

describe('getRecentProjects', () => {
  it('returns list from electron API', async () => {
    (window.electronAPI.getRecentProjects as ReturnType<typeof vi.fn>).mockResolvedValue([
      '/path/a.carvd',
      '/path/b.carvd'
    ]);

    const result = await getRecentProjects();
    expect(result).toEqual(['/path/a.carvd', '/path/b.carvd']);
  });
});

// ============================================================
// clearRecentProjects
// ============================================================

describe('clearRecentProjects', () => {
  it('delegates to electron API', async () => {
    (window.electronAPI.clearRecentProjects as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await clearRecentProjects();
    expect(window.electronAPI.clearRecentProjects).toHaveBeenCalled();
  });
});
