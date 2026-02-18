/**
 * File format utilities for .carvd project files
 * Handles serialization, deserialization, validation, and migration
 */

import {
  Assembly,
  CameraState,
  CARVD_FILE_VERSION,
  CarvdFile,
  CutList,
  CustomShoppingItem,
  FileValidationResult,
  Group,
  GroupMember,
  Part,
  Project,
  ProjectThumbnail,
  SnapGuide,
  Stock,
  StockConstraintSettings
} from '../types';

// Default stock constraints for migration
const DEFAULT_STOCK_CONSTRAINTS: StockConstraintSettings = {
  constrainDimensions: true,
  constrainGrain: true,
  constrainColor: true,
  preventOverlap: true
};

/**
 * Serialize project state to CarvdFile format
 */
export function serializeProject(state: {
  projectName: string;
  createdAt: string;
  modifiedAt: string;
  units: 'imperial' | 'metric';
  gridSize: number;
  kerfWidth: number;
  overageFactor: number;
  projectNotes: string;
  stockConstraints: StockConstraintSettings;
  parts: Part[];
  stocks: Stock[];
  groups: Group[];
  groupMembers: GroupMember[];
  assemblies: Assembly[];
  snapGuides: SnapGuide[];
  customShoppingItems: CustomShoppingItem[];
  cutList: CutList | null;
  thumbnail?: ProjectThumbnail | null;
  cameraState?: CameraState | null;
}): CarvdFile {
  return {
    version: CARVD_FILE_VERSION,
    project: {
      name: state.projectName,
      createdAt: state.createdAt,
      modifiedAt: new Date().toISOString(), // Always update modifiedAt on save
      units: state.units,
      gridSize: state.gridSize,
      kerfWidth: state.kerfWidth,
      overageFactor: state.overageFactor,
      projectNotes: state.projectNotes,
      stockConstraints: state.stockConstraints
    },
    parts: state.parts,
    stocks: state.stocks,
    groups: state.groups,
    groupMembers: state.groupMembers,
    assemblies: state.assemblies.length > 0 ? state.assemblies : undefined,
    snapGuides: state.snapGuides.length > 0 ? state.snapGuides : undefined,
    customShoppingItems: state.customShoppingItems?.length > 0 ? state.customShoppingItems : undefined,
    cutList: state.cutList || undefined,
    thumbnail: state.thumbnail || undefined,
    cameraState: state.cameraState || undefined
  };
}

/**
 * Convert CarvdFile to Project format for loading into store
 */
export function deserializeToProject(file: CarvdFile): Project {
  return {
    version: String(file.version),
    name: file.project.name,
    createdAt: file.project.createdAt,
    modifiedAt: file.project.modifiedAt,
    units: file.project.units,
    gridSize: file.project.gridSize,
    kerfWidth: file.project.kerfWidth,
    overageFactor: file.project.overageFactor,
    projectNotes: file.project.projectNotes,
    stockConstraints: file.project.stockConstraints,
    parts: file.parts,
    stocks: file.stocks,
    groups: file.groups,
    groupMembers: file.groupMembers,
    assemblies: file.assemblies,
    snapGuides: file.snapGuides,
    customShoppingItems: file.customShoppingItems,
    cutList: file.cutList,
    thumbnail: file.thumbnail,
    cameraState: file.cameraState
  };
}

/**
 * Validate a parsed CarvdFile structure
 */
export function validateCarvdFile(data: unknown): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Type guard for basic structure
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid file: not a JSON object'], warnings: [] };
  }

  const obj = data as Record<string, unknown>;

  // Check version
  if (typeof obj.version !== 'number') {
    errors.push('Missing or invalid version number');
  } else if (obj.version > CARVD_FILE_VERSION) {
    errors.push(
      `File version ${obj.version} is newer than supported version ${CARVD_FILE_VERSION}. Please update Carvd Studio.`
    );
  }

  // Check project metadata
  if (!obj.project || typeof obj.project !== 'object') {
    errors.push('Missing project metadata');
  } else {
    const project = obj.project as Record<string, unknown>;
    if (typeof project.name !== 'string') errors.push('Missing project name');
    if (typeof project.units !== 'string' || !['imperial', 'metric'].includes(project.units)) {
      warnings.push('Invalid units, defaulting to imperial');
    }
  }

  // Check required arrays
  if (!Array.isArray(obj.parts)) {
    errors.push('Missing parts array');
  }
  if (!Array.isArray(obj.stocks)) {
    errors.push('Missing stocks array');
  }
  if (!Array.isArray(obj.groups)) {
    errors.push('Missing groups array');
  }
  if (!Array.isArray(obj.groupMembers)) {
    errors.push('Missing groupMembers array');
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Migrate if needed
  const migratedData = migrateFile(obj as CarvdFile);

  // Validate referential integrity
  const integrityResult = validateReferentialIntegrity(migratedData);
  warnings.push(...integrityResult.warnings);

  if (integrityResult.errors.length > 0) {
    return { valid: false, errors: integrityResult.errors, warnings };
  }

  return { valid: true, errors: [], warnings, data: migratedData };
}

/**
 * Validate referential integrity (IDs match up correctly)
 */
function validateReferentialIntegrity(file: CarvdFile): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const partIds = new Set(file.parts.map((p) => p.id));
  const stockIds = new Set(file.stocks.map((s) => s.id));
  const groupIds = new Set(file.groups.map((g) => g.id));

  // Check part stock references
  for (const part of file.parts) {
    if (part.stockId && !stockIds.has(part.stockId)) {
      warnings.push(`Part "${part.name}" references non-existent stock ID "${part.stockId}"`);
    }
  }

  // Check group member references
  for (const gm of file.groupMembers) {
    if (!groupIds.has(gm.groupId)) {
      errors.push(`GroupMember references non-existent group ID "${gm.groupId}"`);
    }
    if (gm.memberType === 'part' && !partIds.has(gm.memberId)) {
      errors.push(`GroupMember references non-existent part ID "${gm.memberId}"`);
    }
    if (gm.memberType === 'group' && !groupIds.has(gm.memberId)) {
      errors.push(`GroupMember references non-existent group ID "${gm.memberId}"`);
    }
  }

  // Check assembly stock references (if present)
  if (file.assemblies) {
    for (const assembly of file.assemblies) {
      for (const part of assembly.parts) {
        if (part.stockId && !stockIds.has(part.stockId)) {
          warnings.push(`Assembly "${assembly.name}" part references non-existent stock ID "${part.stockId}"`);
        }
      }
    }
  }

  return { errors, warnings };
}

/**
 * Migrate older file versions to current version
 */
function migrateFile(file: CarvdFile): CarvdFile {
  let migrated = { ...file };

  // Version 0 -> 1 migration (hypothetical, for future use)
  // if (migrated.version < 1) {
  //   migrated = migrateV0ToV1(migrated);
  // }

  // Ensure all optional fields have defaults
  migrated = {
    ...migrated,
    project: {
      ...migrated.project,
      kerfWidth: migrated.project.kerfWidth ?? 0.125,
      overageFactor: migrated.project.overageFactor ?? 0.1,
      projectNotes: migrated.project.projectNotes ?? '',
      stockConstraints: migrated.project.stockConstraints ?? DEFAULT_STOCK_CONSTRAINTS
    },
    version: CARVD_FILE_VERSION
  };

  // Ensure parts have all required fields
  migrated.parts = migrated.parts.map((part) => ({
    ...part,
    grainSensitive: part.grainSensitive ?? true,
    grainDirection: part.grainDirection ?? 'length',
    rotation: part.rotation ?? { x: 0, y: 0, z: 0 },
    extraLength: part.extraLength ?? undefined,
    extraWidth: part.extraWidth ?? undefined,
    glueUpPanel: part.glueUpPanel ?? undefined
  }));

  // Ensure stocks have all required fields
  migrated.stocks = migrated.stocks.map((stock) => ({
    ...stock,
    pricingUnit: stock.pricingUnit ?? 'per_item',
    pricePerUnit: stock.pricePerUnit ?? 0
  }));

  return migrated;
}

/**
 * Parse and validate a .carvd file from JSON string
 */
export function parseCarvdFile(jsonString: string): FileValidationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    return {
      valid: false,
      errors: [`Invalid JSON: ${e instanceof Error ? e.message : 'Parse error'}`],
      warnings: []
    };
  }

  return validateCarvdFile(parsed);
}

/**
 * Result of file repair attempt
 */
export interface FileRepairResult {
  success: boolean;
  repairedData?: CarvdFile;
  repairActions: string[];
  remainingErrors: string[];
  warnings: string[];
}

/**
 * Attempt to repair a corrupted CarvdFile by fixing referential integrity issues
 */
export function repairCarvdFile(jsonString: string): FileRepairResult {
  const repairActions: string[] = [];
  const warnings: string[] = [];

  // First, try to parse the JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    return {
      success: false,
      repairActions: [],
      remainingErrors: [`Invalid JSON: ${e instanceof Error ? e.message : 'Parse error'}`],
      warnings: []
    };
  }

  // Basic structure check
  if (!parsed || typeof parsed !== 'object') {
    return {
      success: false,
      repairActions: [],
      remainingErrors: ['Invalid file: not a JSON object'],
      warnings: []
    };
  }

  const obj = parsed as Record<string, unknown>;

  // Check for required fields
  if (!obj.project || typeof obj.project !== 'object') {
    return {
      success: false,
      repairActions: [],
      remainingErrors: ['Missing project metadata - cannot repair'],
      warnings: []
    };
  }

  // Ensure arrays exist
  if (!Array.isArray(obj.parts)) obj.parts = [];
  if (!Array.isArray(obj.stocks)) obj.stocks = [];
  if (!Array.isArray(obj.groups)) obj.groups = [];
  if (!Array.isArray(obj.groupMembers)) obj.groupMembers = [];

  // Build ID sets for repair
  const partIds = new Set((obj.parts as Array<{ id: string }>).map((p) => p.id));
  const stockIds = new Set((obj.stocks as Array<{ id: string }>).map((s) => s.id));
  const groupIds = new Set((obj.groups as Array<{ id: string }>).map((g) => g.id));

  // Repair: Remove orphaned groupMembers
  const originalGroupMemberCount = (obj.groupMembers as unknown[]).length;
  obj.groupMembers = (obj.groupMembers as Array<{ groupId: string; memberType: string; memberId: string }>).filter(
    (gm) => {
      // Check if the parent group exists
      if (!groupIds.has(gm.groupId)) {
        repairActions.push(`Removed orphaned membership to non-existent group "${gm.groupId}"`);
        return false;
      }
      // Check if the member exists
      if (gm.memberType === 'part' && !partIds.has(gm.memberId)) {
        repairActions.push(`Removed membership referencing non-existent part "${gm.memberId}"`);
        return false;
      }
      if (gm.memberType === 'group' && !groupIds.has(gm.memberId)) {
        repairActions.push(`Removed membership referencing non-existent group "${gm.memberId}"`);
        return false;
      }
      return true;
    }
  );

  if ((obj.groupMembers as unknown[]).length < originalGroupMemberCount) {
    const removed = originalGroupMemberCount - (obj.groupMembers as unknown[]).length;
    repairActions.push(`Removed ${removed} orphaned group membership(s)`);
  }

  // Repair: Clear invalid stock references on parts (set to null, don't remove part)
  for (const part of obj.parts as Array<{ id: string; name: string; stockId: string | null }>) {
    if (part.stockId && !stockIds.has(part.stockId)) {
      warnings.push(`Part "${part.name}" had invalid stock reference - stock unassigned`);
      part.stockId = null;
    }
  }

  // Try to validate the repaired file
  const migratedData = migrateFile(obj as CarvdFile);
  const integrityResult = validateReferentialIntegrity(migratedData);

  if (integrityResult.errors.length > 0) {
    return {
      success: false,
      repairActions,
      remainingErrors: integrityResult.errors,
      warnings: [...warnings, ...integrityResult.warnings]
    };
  }

  return {
    success: true,
    repairedData: migratedData,
    repairActions,
    remainingErrors: [],
    warnings: [...warnings, ...integrityResult.warnings]
  };
}

/**
 * Get summary statistics for a CarvdFile
 */
export function getFileSummary(file: CarvdFile): { parts: number; stocks: number; groups: number } {
  return {
    parts: file.parts.length,
    stocks: file.stocks.length,
    groups: file.groups.length
  };
}

/**
 * Stringify CarvdFile to JSON with pretty formatting
 */
export function stringifyCarvdFile(file: CarvdFile): string {
  return JSON.stringify(file, null, 2);
}

/**
 * Get file extension for .carvd files
 */
export const CARVD_FILE_EXTENSION = 'carvd';

/**
 * File filter for dialogs
 */
export const CARVD_FILE_FILTER = {
  name: 'Carvd Studio Project',
  extensions: [CARVD_FILE_EXTENSION]
};

/**
 * Extract project name from file path
 */
export function getProjectNameFromPath(filePath: string): string {
  const fileName = filePath.split(/[/\\]/).pop() || 'Untitled';
  // Remove .carvd extension if present
  return fileName.replace(/\.carvd$/i, '');
}
