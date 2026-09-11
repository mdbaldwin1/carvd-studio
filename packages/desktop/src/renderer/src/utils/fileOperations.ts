/**
 * File operations for Carvd Studio projects
 * Integrates electron APIs with the project store
 */

import { useProjectStore, generateThumbnail } from '../store/projectStore';
import { useCameraStore } from '../store/cameraStore';
import { usePartCutsEditingStore } from '../store/partCutsEditingStore';
import { ProjectThumbnail } from '../types';
import {
  serializeProject,
  parseCarvdFile,
  deserializeToProject,
  stringifyCarvdFile,
  CARVD_FILE_FILTER,
  getProjectNameFromPath,
  repairCarvdFile,
  FileRepairResult
} from './fileFormat';
import type { CarvdFile } from '../types';
import { logger } from './logger';
import { analytics } from './analytics';
import { bucketCount } from '../../../shared/analytics';
import { validateAssemblyDowelRelationships, validateDowelRelationships } from './dowelJointUtils';

export interface FileOperationResult {
  success: boolean;
  filePath?: string;
  error?: string;
  canceled?: boolean;
  pendingChanges?: boolean;
  documentChanged?: boolean;
  // For corrupted files that can potentially be recovered
  needsRecovery?: boolean;
  validationErrors?: string[];
  rawContent?: string;
}

/**
 * Save project to current file path, or prompt for Save As if no path
 */
export type ProjectSaveKind = 'initial' | 'manual' | 'auto' | 'save_as';

// Queue the complete save, including thumbnail/dialog work: queuing only the
// final write would allow an older slow thumbnail to write after a newer save.
let pendingSave: Promise<void> | null = null;
type SaveDocument = {
  generation: number;
  filePath: string | null;
  renames: Array<{ from: string; to: string }>;
};
let requestedSaveDocument: SaveDocument | null = null;

function captureSaveDocument(state: ReturnType<typeof useProjectStore.getState>): SaveDocument {
  if (!pendingSave || requestedSaveDocument?.generation !== state.documentGeneration) {
    requestedSaveDocument = { generation: state.documentGeneration, filePath: state.filePath, renames: [] };
  }
  return requestedSaveDocument;
}

function resolveSaveState(
  state: ReturnType<typeof useProjectStore.getState>,
  document: SaveDocument,
  nameRevision: number
) {
  // A queued snapshot may predate the preceding Save As chooser. Carry forward
  // its automatic filename-derived rename, but never overwrite an authored name.
  let projectName = state.projectName;
  for (const rename of document.renames.slice(nameRevision)) {
    if (projectName === rename.from) projectName = rename.to;
  }
  return projectName === state.projectName ? state : { ...state, projectName };
}
function enqueueProjectSave(operation: () => Promise<FileOperationResult>): Promise<FileOperationResult> {
  const result = pendingSave ? pendingSave.then(operation) : operation();
  const settled = result.then(
    () => undefined,
    () => undefined
  );
  pendingSave = settled;
  void settled.then(() => {
    if (pendingSave === settled) {
      pendingSave = null;
      requestedSaveDocument = null;
    }
  });
  return result;
}

export async function waitForPendingProjectSaves(): Promise<void> {
  while (pendingSave) await pendingSave;
}
export function hasPendingProjectSaves(): boolean {
  return pendingSave !== null;
}

export async function saveProject(saveKind?: 'manual' | 'auto'): Promise<FileOperationResult> {
  const state = useProjectStore.getState();
  const document = captureSaveDocument(state);
  const nameRevision = document.renames.length;
  // Content belongs to the request; the destination belongs to its ordered
  // document transaction. A preceding successful Save As may change it while
  // this save waits. Never consult a replacement document's live file path.
  return enqueueProjectSave(() => {
    const snapshot = resolveSaveState(state, document, nameRevision);
    return document.filePath
      ? saveToPath(document.filePath, saveKind ?? 'manual', snapshot)
      : performSaveAs('initial', snapshot, document);
  });
}

/**
 * Always prompt for a new file location
 */
export async function saveProjectAs(saveKind: ProjectSaveKind = 'save_as'): Promise<FileOperationResult> {
  const state = useProjectStore.getState();
  const document = captureSaveDocument(state);
  const nameRevision = document.renames.length;
  return enqueueProjectSave(() => performSaveAs(saveKind, resolveSaveState(state, document, nameRevision), document));
}

async function performSaveAs(
  saveKind: ProjectSaveKind,
  state: ReturnType<typeof useProjectStore.getState>,
  document: SaveDocument
): Promise<FileOperationResult> {
  const ownsDocument = () => useProjectStore.getState().documentGeneration === state.documentGeneration;
  if (!ownsDocument()) return { success: false, canceled: true, documentChanged: true };

  try {
    const result = await window.electronAPI.showSaveDialog({
      defaultPath: `${state.projectName}.carvd`,
      filters: [CARVD_FILE_FILTER]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }
    if (!ownsDocument()) return { success: false, canceled: true, documentChanged: true };

    // Commit destination/name only after a successful write. Cancellation or
    // failure must leave succeeding saves on the last successful destination.
    const newProjectName = getProjectNameFromPath(result.filePath);
    const saved = await saveToPath(
      result.filePath,
      saveKind,
      { ...state, projectName: newProjectName },
      state.projectName
    );
    if (saved.success) {
      document.filePath = result.filePath;
      document.renames.push({ from: state.projectName, to: newProjectName });
    }
    return saved;
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

function captureDocumentFields(state = useProjectStore.getState()) {
  // Store actions replace document fields immutably. Retain the exact revision
  // being serialized, including edits that can happen during thumbnail/file I/O.
  return {
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
  };
}

function documentFieldsMatch(snapshot: ReturnType<typeof captureDocumentFields>): boolean {
  const current = useProjectStore.getState();
  return (Object.keys(snapshot) as Array<keyof typeof snapshot>).every((key) => current[key] === snapshot[key]);
}

/** Save the captured document, never whichever document happens to be open later. */
async function saveToPath(
  filePath: string,
  saveKind: ProjectSaveKind,
  state = useProjectStore.getState(),
  renameFrom?: string
): Promise<FileOperationResult> {
  const snapshot = captureDocumentFields(state);

  try {
    const dowelErrors = validateDowelRelationships(state.parts);
    if (dowelErrors.length > 0) return { success: false, error: dowelErrors.join('\n') };
    const assemblyDowelErrors = state.assemblies.flatMap((assembly) =>
      validateAssemblyDowelRelationships(assembly.parts).map((error) => `Assembly "${assembly.name}": ${error}`)
    );
    if (assemblyDowelErrors.length > 0) return { success: false, error: assemblyDowelErrors.join('\n') };
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
      ...snapshot,
      thumbnail,
      cameraState: useCameraStore.getState().cameraState
    });

    const json = stringifyCarvdFile(fileData);
    await window.electronAPI.writeFile(filePath, json);

    // Add to recent projects
    await window.electronAPI.addRecentProject(filePath);

    const current = useProjectStore.getState();
    // An old document's successful write must not retarget or dirty its
    // replacement, even if the replacement happens to contain identical data.
    if (current.documentGeneration !== state.documentGeneration) {
      return { success: true, filePath, documentChanged: true };
    }
    if (renameFrom !== undefined && current.projectName === renameFrom) current.setProjectName(snapshot.projectName);
    current.setFilePath(filePath);
    const pendingChanges = !documentFieldsMatch(snapshot);
    if (pendingChanges && !current.isDirty) current.markDirty();
    else if (!pendingChanges) current.markClean();

    // Update window title
    updateWindowTitle();

    if (saveKind !== 'auto') {
      analytics.capture('project_saved', {
        save_kind: saveKind,
        part_count_bucket: bucketCount(state.parts.length)
      });
    }

    return { success: true, filePath, ...(pendingChanges ? { pendingChanges: true } : {}) };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Open a project file (shows file dialog)
 */
let replacementRequest = 0;
export function beginProjectReplacement() {
  const state = useProjectStore.getState();
  return {
    request: ++replacementRequest,
    generation: state.documentGeneration,
    filePath: state.filePath,
    fields: captureDocumentFields(state),
    cutSession: usePartCutsEditingStore.getState().sessionGeneration
  };
}
function replacementError(transaction: ReturnType<typeof beginProjectReplacement>): string | null {
  const current = useProjectStore.getState();
  const cuts = usePartCutsEditingStore.getState();
  if (cuts.isEditingPartCuts) return 'Save or discard part cuts before changing projects.';
  if (
    transaction.request !== replacementRequest ||
    transaction.generation !== current.documentGeneration ||
    transaction.filePath !== current.filePath ||
    transaction.cutSession !== cuts.sessionGeneration ||
    !documentFieldsMatch(transaction.fields)
  ) {
    return 'The project or editing session changed while opening the file. Your current work was kept. Open the file again when ready.';
  }
  return null;
}

export async function openProject(): Promise<FileOperationResult> {
  const transaction = beginProjectReplacement();
  const error = replacementError(transaction);
  if (error) return { success: false, error };
  try {
    const result = await window.electronAPI.showOpenDialog({
      filters: [CARVD_FILE_FILTER],
      properties: ['openFile']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    return readProjectFromPath(result.filePaths[0], transaction);
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Open a project from a specific file path
 */
export async function openProjectFromPath(
  filePath: string,
  transaction = beginProjectReplacement()
): Promise<FileOperationResult> {
  return readProjectFromPath(filePath, transaction);
}

async function readProjectFromPath(
  filePath: string,
  transaction: ReturnType<typeof beginProjectReplacement>
): Promise<FileOperationResult> {
  const error = replacementError(transaction);
  if (error) return { success: false, error };
  logger.info('[openProjectFromPath] Starting to open:', filePath);
  try {
    logger.info('[openProjectFromPath] Reading file...');
    const content = await window.electronAPI.readFile(filePath);
    // Validate after the async read, immediately before any parse/recovery/load
    // side effects. The initial handler check cannot protect this interval.
    const changed = replacementError(transaction);
    if (changed) return { success: false, error: changed };
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
    const error = replacementError(beginProjectReplacement());
    if (error) return { success: false, error };
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
