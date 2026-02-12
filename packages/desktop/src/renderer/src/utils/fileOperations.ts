/**
 * File operations for Carvd Studio projects
 * Integrates electron APIs with the project store
 */

import { useProjectStore, generateThumbnail } from '../store/projectStore';
import { ProjectThumbnail } from '../types';
import {
  serializeProject,
  parseCarvdFile,
  deserializeToProject,
  stringifyCarvdFile,
  CARVD_FILE_FILTER,
  getProjectNameFromPath,
  repairCarvdFile,
  FileRepairResult,
  CarvdFile
} from './fileFormat';
import { logger } from './logger';

export interface FileOperationResult {
  success: boolean;
  filePath?: string;
  error?: string;
  canceled?: boolean;
  // For corrupted files that can potentially be recovered
  needsRecovery?: boolean;
  validationErrors?: string[];
  rawContent?: string;
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
    // Generate thumbnail before saving (only if we have parts to show)
    let thumbnail: ProjectThumbnail | null = null;
    if (state.parts.length > 0) {
      const thumbnailData = await generateThumbnail();
      if (thumbnailData) {
        thumbnail = {
          data: thumbnailData,
          width: 400,
          height: 300,
          generatedAt: new Date().toISOString()
        };
      }
    }

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
      cutList: state.cutList,
      thumbnail,
      cameraState: state.cameraState
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
  logger.info('[openProjectFromPath] Starting to open:', filePath);
  try {
    logger.info('[openProjectFromPath] Reading file...');
    const content = await window.electronAPI.readFile(filePath);
    logger.info('[openProjectFromPath] File read, content length:', content?.length || 0);

    logger.info('[openProjectFromPath] Parsing file...');
    const validation = parseCarvdFile(content);
    logger.info('[openProjectFromPath] Parse result - valid:', validation.valid, 'errors:', validation.errors);

    if (!validation.valid || !validation.data) {
      // Check if this is a potentially recoverable error (not a JSON parse error)
      const isJsonError = validation.errors.some((e) => e.includes('Invalid JSON'));
      if (!isJsonError && validation.errors.length > 0) {
        // Return with recovery information
        logger.warn('[openProjectFromPath] File needs recovery:', validation.errors);
        return {
          success: false,
          needsRecovery: true,
          validationErrors: validation.errors,
          rawContent: content,
          filePath
        };
      }
      const errorMsg = validation.errors.join('\n');
      logger.error('[openProjectFromPath] Invalid file:', errorMsg);
      return { success: false, error: `Invalid project file:\n${errorMsg}` };
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      logger.warn('Project file warnings:', validation.warnings);
    }

    logger.info('[openProjectFromPath] Deserializing project...');
    const project = deserializeToProject(validation.data);
    logger.info('[openProjectFromPath] Project deserialized, name:', project.name);

    // Load into store
    logger.info('[openProjectFromPath] Loading into store...');
    useProjectStore.getState().loadProject(project, filePath);
    logger.info('[openProjectFromPath] Loaded into store');

    // Add to recent projects
    logger.info('[openProjectFromPath] Adding to recent projects...');
    await window.electronAPI.addRecentProject(filePath);

    // Update window title
    updateWindowTitle();

    logger.info('[openProjectFromPath] Success!');
    return { success: true, filePath };
  } catch (error) {
    logger.error('[openProjectFromPath] Error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Attempt to repair a corrupted file and load it
 */
export function attemptFileRepair(rawContent: string): FileRepairResult {
  return repairCarvdFile(rawContent);
}

/**
 * Load a repaired file into the project store
 */
export async function loadRepairedFile(repairedData: CarvdFile, filePath: string): Promise<FileOperationResult> {
  try {
    const project = deserializeToProject(repairedData);
    useProjectStore.getState().loadProject(project, filePath);

    // Mark as dirty since the repaired version differs from the saved file
    useProjectStore.getState().markDirty();

    // Add to recent projects
    await window.electronAPI.addRecentProject(filePath);

    // Update window title
    updateWindowTitle();

    return { success: true, filePath };
  } catch (error) {
    logger.error('[loadRepairedFile] Error:', error);
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
  const fileName = state.filePath ? getProjectNameFromPath(state.filePath) : state.projectName;

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
