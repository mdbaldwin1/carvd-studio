/**
 * File operations for Carvd Studio projects
 * Integrates electron APIs with the project store
 */

import { useProjectStore } from '../store/projectStore';
import {
  serializeProject,
  parseCarvdFile,
  deserializeToProject,
  stringifyCarvdFile,
  CARVD_FILE_FILTER,
  getProjectNameFromPath
} from './fileFormat';

export interface FileOperationResult {
  success: boolean;
  filePath?: string;
  error?: string;
  canceled?: boolean;
}

/**
 * Save project to current file path, or prompt for Save As if no path
 */
export async function saveProject(): Promise<FileOperationResult> {
  const state = useProjectStore.getState();

  if (state.filePath) {
    return saveToPath(state.filePath);
  } else {
    return saveProjectAs();
  }
}

/**
 * Always prompt for a new file location
 */
export async function saveProjectAs(): Promise<FileOperationResult> {
  const state = useProjectStore.getState();

  try {
    const result = await window.electronAPI.showSaveDialog({
      defaultPath: `${state.projectName}.carvd`,
      filters: [CARVD_FILE_FILTER]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }

    // Update project name to match the chosen filename
    const newProjectName = getProjectNameFromPath(result.filePath);
    useProjectStore.getState().setProjectName(newProjectName);

    return saveToPath(result.filePath);
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Save to a specific file path
 */
async function saveToPath(filePath: string): Promise<FileOperationResult> {
  const state = useProjectStore.getState();

  try {
    const fileData = serializeProject({
      projectName: state.projectName,
      createdAt: state.createdAt,
      modifiedAt: state.modifiedAt,
      units: state.units,
      gridSize: state.gridSize,
      kerfWidth: state.kerfWidth,
      overageFactor: state.overageFactor,
      projectNotes: state.projectNotes,
      stockConstraints: state.stockConstraints,
      parts: state.parts,
      stocks: state.stocks,
      groups: state.groups,
      groupMembers: state.groupMembers,
      assemblies: state.assemblies,
      snapGuides: state.snapGuides,
      customShoppingItems: state.customShoppingItems,
      cutList: state.cutList
    });

    const json = stringifyCarvdFile(fileData);
    await window.electronAPI.writeFile(filePath, json);

    // Update store with file path and mark as clean
    useProjectStore.getState().setFilePath(filePath);
    useProjectStore.getState().markClean();

    // Add to recent projects
    await window.electronAPI.addRecentProject(filePath);

    // Update window title
    updateWindowTitle();

    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Open a project file (shows file dialog)
 */
export async function openProject(): Promise<FileOperationResult> {
  try {
    const result = await window.electronAPI.showOpenDialog({
      filters: [CARVD_FILE_FILTER],
      properties: ['openFile']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    return openProjectFromPath(result.filePaths[0]);
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Open a project from a specific file path
 */
export async function openProjectFromPath(filePath: string): Promise<FileOperationResult> {
  try {
    const content = await window.electronAPI.readFile(filePath);
    const validation = parseCarvdFile(content);

    if (!validation.valid || !validation.data) {
      const errorMsg = validation.errors.join('\n');
      return { success: false, error: `Invalid project file:\n${errorMsg}` };
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn('Project file warnings:', validation.warnings);
    }

    const project = deserializeToProject(validation.data);

    // Load into store
    useProjectStore.getState().loadProject(project, filePath);

    // Add to recent projects
    await window.electronAPI.addRecentProject(filePath);

    // Update window title
    updateWindowTitle();

    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Create a new project (optionally prompting to save unsaved changes first)
 */
export async function newProject(defaults?: {
  units?: 'imperial' | 'metric';
  gridSize?: number;
}): Promise<FileOperationResult> {
  useProjectStore.getState().newProject(defaults);
  updateWindowTitle();
  return { success: true };
}

/**
 * Check if there are unsaved changes
 */
export function hasUnsavedChanges(): boolean {
  return useProjectStore.getState().isDirty;
}

/**
 * Get current file path
 */
export function getCurrentFilePath(): string | null {
  return useProjectStore.getState().filePath;
}

/**
 * Update the window title based on project state
 */
export function updateWindowTitle(): void {
  const state = useProjectStore.getState();
  const dirtyIndicator = state.isDirty ? ' •' : '';
  const fileName = state.filePath
    ? getProjectNameFromPath(state.filePath)
    : state.projectName;

  const title = `${fileName}${dirtyIndicator} - Carvd Studio`;
  window.electronAPI.setWindowTitle(title);
}

/**
 * Get recent projects list
 */
export async function getRecentProjects(): Promise<string[]> {
  return window.electronAPI.getRecentProjects();
}

/**
 * Clear recent projects list
 */
export async function clearRecentProjects(): Promise<void> {
  return window.electronAPI.clearRecentProjects();
}
