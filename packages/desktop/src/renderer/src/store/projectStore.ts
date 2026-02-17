import { create } from 'zustand';
import { temporal } from 'zundo';
import { v4 as uuidv4 } from 'uuid';
import {
  Part,
  Stock,
  Group,
  GroupMember,
  Project,
  SnapGuide,
  Clipboard,
  Assembly,
  AssemblyPart,
  AssemblyGroup,
  AssemblyGroupMember,
  StockConstraintSettings,
  CutList,
  PartValidationIssue,
  EmbeddedStock,
  CustomShoppingItem,
  CameraState
} from '../types';
import { STOCK_COLORS } from '../constants';
import { LicenseMode, canAddPart, canAddStock, getBlockedMessage, getFeatureLimits } from '../utils/featureLimits';
import { useUIStore } from './uiStore';
import { useCameraStore } from './cameraStore';
import { useSelectionStore } from './selectionStore';
import { useSnapStore } from './snapStore';

interface ProjectState {
  // Project data
  projectName: string;
  parts: Part[];
  stocks: Stock[];
  groups: Group[];
  groupMembers: GroupMember[];
  assemblies: Assembly[];
  filePath: string | null;
  isDirty: boolean;
  // Project-level settings (saved with project file)
  units: 'imperial' | 'metric';
  gridSize: number; // in inches
  // Pre-cut list settings
  kerfWidth: number; // saw blade kerf in inches (default 0.125 = 1/8")
  overageFactor: number; // material overage percentage (default 0.1 = 10%)
  projectNotes: string; // free-form project notes
  // Stock constraint settings (initialized from app defaults when project is created)
  stockConstraints: StockConstraintSettings;
  // Project metadata
  version: string; // File format version
  createdAt: string; // ISO timestamp when project was created
  modifiedAt: string; // ISO timestamp when project was last modified

  // UI state
  clipboard: Clipboard;
  // Persistent snap guides
  snapGuides: SnapGuide[]; // User-created guide planes for snapping
  // Custom shopping list items (hardware, fasteners, etc.)
  customShoppingItems: CustomShoppingItem[]; // User-added items that persist through cut list regeneration
  // Cut list state
  cutList: CutList | null; // Generated cut list (persisted with project)

  // License mode (for feature limits)
  licenseMode: LicenseMode;

  // Actions - Parts
  addPart: (part?: Partial<Part>) => string | null;
  updatePart: (id: string, updates: Partial<Part>) => void;
  updateParts: (ids: string[], updates: Partial<Part>) => void;
  batchUpdateParts: (updates: Array<{ id: string; changes: Partial<Part> }>) => void;
  moveSelectedParts: (delta: { x: number; y: number; z: number }) => void;
  deletePart: (id: string) => void;
  deleteSelectedParts: () => void;
  confirmDeleteParts: () => void;
  duplicatePart: (id: string) => string | null;
  duplicateSelectedParts: () => string[];
  resetSelectedPartsToStock: () => void;

  // Actions - Clipboard
  copySelectedParts: () => void;
  pasteClipboard: () => string[];
  pasteAtPosition: (position: { x: number; y: number; z: number }) => string[];

  // Actions - Stocks
  addStock: (stock?: Partial<Stock>) => string | null;
  updateStock: (id: string, updates: Partial<Stock>) => void;
  deleteStock: (id: string) => void;
  assignStockToSelectedParts: (stockId: string | null) => void;

  // Actions - Assemblies
  addAssembly: (assembly: Assembly) => void;
  updateAssembly: (id: string, updates: Partial<Assembly>) => void;
  deleteAssembly: (id: string) => void;
  createAssemblyFromSelection: (name: string, description?: string) => Assembly | null;
  placeAssembly: (
    assemblyId: string,
    position: { x: number; y: number; z: number },
    libraryStocks?: Stock[]
  ) => string[];
  // Actions - Project
  newProject: (defaults?: {
    units?: 'imperial' | 'metric';
    gridSize?: number;
    stockConstraints?: StockConstraintSettings;
  }) => void;
  loadProject: (project: Project, filePath?: string) => void;
  setFilePath: (path: string | null) => void;
  markDirty: () => void;
  markClean: () => void;

  // Actions - Project Settings
  setProjectName: (name: string) => void;
  setProjectUnits: (units: 'imperial' | 'metric') => void;
  setProjectGridSize: (gridSize: number) => void;
  setKerfWidth: (kerfWidth: number) => void;
  setOverageFactor: (overageFactor: number) => void;
  setProjectNotes: (notes: string) => void;
  setStockConstraints: (constraints: StockConstraintSettings) => void;

  // Snap guide actions
  addSnapGuide: (axis: 'x' | 'y' | 'z', position: number, label?: string) => string;
  removeSnapGuide: (id: string) => void;
  clearSnapGuides: () => void;

  // Actions - Groups
  createGroup: (name: string, members: Array<{ id: string; type: 'part' | 'group' }>) => string | null;
  renameGroup: (groupId: string, name: string) => void;
  deleteGroup: (groupId: string, mode: 'ungroup' | 'recursive', targetParentGroupId?: string | null) => void;
  addToGroup: (groupId: string, memberIds: string[], memberType: 'part' | 'group') => void;
  removeFromGroup: (memberIds: string[], memberType: 'part' | 'group') => void;
  mergeGroups: (groupIds: string[], mode: 'top-level' | 'deep') => string | null;
  // Cut list actions
  setCutList: (cutList: CutList | null) => void;
  markCutListStale: () => void;
  clearCutList: () => void;

  // Custom shopping list item actions
  addCustomShoppingItem: (item: Omit<CustomShoppingItem, 'id'>) => string;
  updateCustomShoppingItem: (id: string, updates: Partial<CustomShoppingItem>) => void;
  deleteCustomShoppingItem: (id: string) => void;

  // License mode action
  setLicenseMode: (mode: LicenseMode) => void;
}

// Generate a smart copy name that avoids "Part 1 (copy) (copy) (copy)"
const generateCopyName = (originalName: string): string => {
  // Check if name ends with "(copy N)" pattern
  const copyWithNumberMatch = originalName.match(/^(.+) \(copy (\d+)\)$/);
  if (copyWithNumberMatch) {
    const baseName = copyWithNumberMatch[1];
    const copyNumber = parseInt(copyWithNumberMatch[2], 10);
    return `${baseName} (copy ${copyNumber + 1})`;
  }

  // Check if name ends with "(copy)" pattern
  const copyMatch = originalName.match(/^(.+) \(copy\)$/);
  if (copyMatch) {
    const baseName = copyMatch[1];
    return `${baseName} (copy 2)`;
  }

  // No copy suffix, add one
  return `${originalName} (copy)`;
};

const createDefaultPart = (overrides?: Partial<Part>): Part => ({
  id: uuidv4(),
  name: 'New Part',
  length: 24,
  width: 12,
  thickness: 0.75,
  position: { x: 0, y: 0.375, z: 0 }, // y = thickness/2 to sit on ground
  rotation: { x: 0, y: 0, z: 0 },
  stockId: null,
  grainSensitive: true,
  grainDirection: 'length',
  color: STOCK_COLORS[0],
  ...overrides
});

const createDefaultStock = (overrides?: Partial<Stock>): Stock => ({
  id: uuidv4(),
  name: 'New Stock',
  length: 96,
  width: 48,
  thickness: 0.75,
  grainDirection: 'length',
  pricingUnit: 'per_item',
  pricePerUnit: 50,
  color: STOCK_COLORS[Math.floor(Math.random() * STOCK_COLORS.length)],
  ...overrides
});

// Canvas capture callback (registered by Workspace, called by ContextMenu)
let canvasCaptureHandler: (() => Promise<void>) | null = null;

export function registerCanvasCaptureHandler(handler: () => Promise<void>): void {
  canvasCaptureHandler = handler;
}

export function unregisterCanvasCaptureHandler(): void {
  canvasCaptureHandler = null;
}

export async function captureCanvas(): Promise<void> {
  if (canvasCaptureHandler) {
    await canvasCaptureHandler();
  }
}

// Thumbnail generation callback (registered by Workspace, called on save)
let thumbnailGeneratorHandler: (() => Promise<string | null>) | null = null;

export function registerThumbnailGenerator(handler: () => Promise<string | null>): void {
  thumbnailGeneratorHandler = handler;
}

export function unregisterThumbnailGenerator(): void {
  thumbnailGeneratorHandler = null;
}

// Generate a thumbnail and return base64 data (or null if not available)
export async function generateThumbnail(): Promise<string | null> {
  if (thumbnailGeneratorHandler) {
    return await thumbnailGeneratorHandler();
  }
  return null;
}

// Helper function: Find which group a part belongs to (if any)
export const getContainingGroupId = (partId: string, groupMembers: GroupMember[]): string | null => {
  const member = groupMembers.find((gm) => gm.memberType === 'part' && gm.memberId === partId);
  return member ? member.groupId : null;
};

// Helper function: Get all descendant part IDs from a group (recursively includes nested groups)
// Memoized: caches results per groupMembers array reference to avoid repeated recursive traversals
let _descendantCache: WeakRef<GroupMember[]> | null = null;
let _descendantResults: Map<string, string[]> = new Map();

export const getAllDescendantPartIds = (groupId: string, groupMembers: GroupMember[]): string[] => {
  // Invalidate cache if groupMembers array changed
  if (!_descendantCache || _descendantCache.deref() !== groupMembers) {
    _descendantCache = new WeakRef(groupMembers);
    _descendantResults = new Map();
  }

  const cached = _descendantResults.get(groupId);
  if (cached) return cached;

  const partIds: string[] = [];
  const members = groupMembers.filter((gm) => gm.groupId === groupId);

  for (const member of members) {
    if (member.memberType === 'part') {
      partIds.push(member.memberId);
    } else {
      // Nested group - recurse
      partIds.push(...getAllDescendantPartIds(member.memberId, groupMembers));
    }
  }

  _descendantResults.set(groupId, partIds);
  return partIds;
};

// Helper function: Get all ancestor group IDs for a part (for auto-expand functionality)
export const getAncestorGroupIds = (partId: string, groupMembers: GroupMember[]): string[] => {
  const ancestors: string[] = [];
  let currentId: string | null = partId;
  let currentType: 'part' | 'group' = 'part';

  while (currentId) {
    const member = groupMembers.find((gm) => gm.memberType === currentType && gm.memberId === currentId);
    if (member) {
      ancestors.push(member.groupId);
      currentId = member.groupId;
      currentType = 'group';
    } else {
      break;
    }
  }

  return ancestors;
};

// Helper function: Check if a group contains another group (to prevent circular references)
export const isDescendantOf = (
  potentialDescendantId: string,
  potentialAncestorId: string,
  groupMembers: GroupMember[]
): boolean => {
  if (potentialDescendantId === potentialAncestorId) return true;

  // Recursively find all nested group IDs
  const getDescendantGroupIds = (gId: string): string[] => {
    const groupIds: string[] = [];
    const members = groupMembers.filter((gm) => gm.groupId === gId);
    for (const member of members) {
      if (member.memberType === 'group') {
        groupIds.push(member.memberId);
        groupIds.push(...getDescendantGroupIds(member.memberId));
      }
    }
    return groupIds;
  };

  const descendantGroupIds = getDescendantGroupIds(potentialAncestorId);
  return descendantGroupIds.includes(potentialDescendantId);
};

// Helper function: Validate parts for cut list generation
export const validatePartsForCutList = (parts: Part[], stocks: Stock[]): PartValidationIssue[] => {
  const issues: PartValidationIssue[] = [];

  for (const part of parts) {
    // Check for unassigned stock
    if (!part.stockId) {
      issues.push({
        partId: part.id,
        partName: part.name,
        type: 'no_stock',
        message: 'No stock assigned',
        severity: 'error'
      });
      continue;
    }

    const stock = stocks.find((s) => s.id === part.stockId);
    if (!stock) {
      issues.push({
        partId: part.id,
        partName: part.name,
        type: 'no_stock',
        message: 'Assigned stock not found',
        severity: 'error'
      });
      continue;
    }

    const cutLength = part.length + (part.extraLength || 0);
    const cutWidth = part.width + (part.extraWidth || 0);

    // Check thickness
    if (part.thickness > stock.thickness) {
      issues.push({
        partId: part.id,
        partName: part.name,
        type: 'exceeds_thickness',
        message: `Thickness (${part.thickness}") exceeds stock (${stock.thickness}")`,
        severity: 'error'
      });
    }

    // Check dimensions (considering rotation possibility)
    const fitsNormal = cutLength <= stock.length && cutWidth <= stock.width;
    const fitsRotated = !part.grainSensitive && cutLength <= stock.width && cutWidth <= stock.length;

    if (!fitsNormal && !fitsRotated) {
      // Check if it's a glue-up panel that only exceeds width
      if (part.glueUpPanel && cutLength <= stock.length) {
        // Glue-up panel that only exceeds width is acceptable - no issue to report
        // The boards needed calculation is shown in the Properties panel
      } else {
        issues.push({
          partId: part.id,
          partName: part.name,
          type: 'exceeds_dimensions',
          message: `Dimensions (${cutLength}" × ${cutWidth}") exceed stock (${stock.length}" × ${stock.width}")`,
          severity: 'error'
        });
      }
    }

    // Check grain mismatch (warning only)
    if (part.grainSensitive && stock.grainDirection !== 'none') {
      if (part.grainDirection !== stock.grainDirection) {
        issues.push({
          partId: part.id,
          partName: part.name,
          type: 'grain_mismatch',
          message: `Grain direction (${part.grainDirection}) doesn't match stock (${stock.grainDirection})`,
          severity: 'warning'
        });
      }
    }
  }

  return issues;
};

export const useProjectStore = create<ProjectState>()(
  temporal(
    (set, get) => ({
      // Initial state
      projectName: 'Untitled Project',
      parts: [],
      stocks: [],
      groups: [],
      groupMembers: [],
      assemblies: [],
      filePath: null,
      isDirty: false,
      units: 'imperial',
      gridSize: 0.0625, // 1/16"
      kerfWidth: 0.125, // 1/8" default kerf
      overageFactor: 0.1, // 10% default overage
      projectNotes: '',
      stockConstraints: { constrainDimensions: true, constrainGrain: true, constrainColor: true, preventOverlap: true },
      version: '1.0',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),

      clipboard: { parts: [], groups: [], groupMembers: [] },
      snapGuides: [], // No guides by default
      customShoppingItems: [], // No custom shopping items by default

      // Cut list state
      cutList: null, // No cut list generated by default

      // License mode (default to trial, App.tsx updates this based on actual status)
      licenseMode: 'trial' as LicenseMode,

      // Part actions
      addPart: (partOverrides) => {
        const { licenseMode, parts } = get();

        // Check license limits
        if (!canAddPart(licenseMode, parts.length)) {
          useUIStore.getState().showToast(getBlockedMessage('addPart'));
          return null;
        }

        const newPart = createDefaultPart(partOverrides);
        set((state) => ({
          parts: [...state.parts, newPart],
          isDirty: true
        }));
        useSelectionStore.setState({ selectedPartIds: [newPart.id] });
        get().markCutListStale();
        return newPart.id;
      },

      updatePart: (id, updates) => {
        set((state) => ({
          parts: state.parts.map((p) => (p.id === id ? { ...p, ...updates } : p)),
          isDirty: true
        }));
        get().markCutListStale();
        // Update reference distances if position changed
        if (updates.position) {
          useSnapStore.getState().updateReferenceDistances();
        }
      },

      updateParts: (ids, updates) => {
        set((state) => ({
          parts: state.parts.map((p) => (ids.includes(p.id) ? { ...p, ...updates } : p)),
          isDirty: true
        }));
        get().markCutListStale();
      },

      batchUpdateParts: (updates) => {
        const updateMap = new Map(updates.map((u) => [u.id, u.changes]));
        set((state) => ({
          parts: state.parts.map((p) => {
            const changes = updateMap.get(p.id);
            return changes ? { ...p, ...changes } : p;
          }),
          isDirty: true
        }));
        get().markCutListStale();
      },

      moveSelectedParts: (delta) => {
        const { groupMembers } = get();
        const { selectedPartIds, selectedGroupIds, editingGroupId } = useSelectionStore.getState();

        // Determine which parts to move
        let partIdsToMove: Set<string>;

        if (editingGroupId !== null) {
          // Inside a group (Figma-style "entered") - move explicitly selected parts
          // and all parts from selected sub-groups
          partIdsToMove = new Set(selectedPartIds);

          // Also include all parts from selected groups (e.g., nested groups within the editing context)
          for (const groupId of selectedGroupIds) {
            const groupPartIds = getAllDescendantPartIds(groupId, groupMembers);
            groupPartIds.forEach((id) => partIdsToMove.add(id));
          }
        } else {
          // Not inside a group - expand selection to include all group members
          partIdsToMove = new Set(selectedPartIds);

          // For each selected part, check if it's in a group and add all group members
          for (const partId of selectedPartIds) {
            const containingGroupId = getContainingGroupId(partId, groupMembers);
            if (containingGroupId) {
              const groupPartIds = getAllDescendantPartIds(containingGroupId, groupMembers);
              groupPartIds.forEach((id) => partIdsToMove.add(id));
            }
          }

          // Also include all parts from selected groups
          for (const groupId of selectedGroupIds) {
            const groupPartIds = getAllDescendantPartIds(groupId, groupMembers);
            groupPartIds.forEach((id) => partIdsToMove.add(id));
          }
        }

        if (partIdsToMove.size === 0) return;

        set((state) => ({
          parts: state.parts.map((p) => {
            if (!partIdsToMove.has(p.id)) return p;
            return {
              ...p,
              position: {
                x: p.position.x + delta.x,
                y: p.position.y + delta.y,
                z: p.position.z + delta.z
              }
            };
          }),
          isDirty: true
        }));
        useSnapStore.getState().updateReferenceDistances();
      },

      deletePart: (id) => {
        set((state) => ({
          parts: state.parts.filter((p) => p.id !== id),
          // Remove from any groups
          groupMembers: state.groupMembers.filter((gm) => !(gm.memberType === 'part' && gm.memberId === id)),
          isDirty: true
        }));
        useSelectionStore.setState((state) => ({
          selectedPartIds: state.selectedPartIds.filter((pid) => pid !== id)
        }));
        useSnapStore.setState((state) => ({
          referencePartIds: state.referencePartIds.filter((pid) => pid !== id)
        }));
        get().markCutListStale();
      },

      deleteSelectedParts: () => {
        const { selectedPartIds } = useSelectionStore.getState();
        if (selectedPartIds.length === 0) return;
        set((state) => ({
          parts: state.parts.filter((p) => !selectedPartIds.includes(p.id)),
          // Remove from any groups
          groupMembers: state.groupMembers.filter(
            (gm) => !(gm.memberType === 'part' && selectedPartIds.includes(gm.memberId))
          ),
          isDirty: true
        }));
        useSelectionStore.setState({ selectedPartIds: [] });
        useSnapStore.setState((state) => ({
          referencePartIds: state.referencePartIds.filter((id) => !selectedPartIds.includes(id))
        }));
        get().markCutListStale();
      },

      confirmDeleteParts: () => {
        const { pendingDeletePartIds } = useUIStore.getState();
        if (!pendingDeletePartIds || pendingDeletePartIds.length === 0) return;
        set((state) => ({
          parts: state.parts.filter((p) => !pendingDeletePartIds.includes(p.id)),
          // Remove from any groups
          groupMembers: state.groupMembers.filter(
            (gm) => !(gm.memberType === 'part' && pendingDeletePartIds.includes(gm.memberId))
          ),
          isDirty: true
        }));
        useSelectionStore.setState((state) => ({
          selectedPartIds: state.selectedPartIds.filter((id) => !pendingDeletePartIds.includes(id))
        }));
        useSnapStore.setState((state) => ({
          referencePartIds: state.referencePartIds.filter((id) => !pendingDeletePartIds.includes(id))
        }));
        useUIStore.getState().cancelDeleteParts();
        get().markCutListStale();
      },

      duplicatePart: (id) => {
        const { licenseMode, parts } = get();

        // Check license limits
        if (!canAddPart(licenseMode, parts.length)) {
          useUIStore.getState().showToast(getBlockedMessage('addPart'));
          return null;
        }

        const part = parts.find((p) => p.id === id);
        if (!part) return null;

        // Destructure to exclude `id` so createDefaultPart generates a new one
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _oldId, ...partWithoutId } = part;
        const newPart = createDefaultPart({
          ...partWithoutId,
          name: generateCopyName(part.name),
          position: {
            x: part.position.x + 2,
            y: part.position.y,
            z: part.position.z + 2
          }
        });

        set((state) => ({
          parts: [...state.parts, newPart],
          isDirty: true
        }));
        useSelectionStore.setState({ selectedPartIds: [newPart.id] });

        get().markCutListStale();
        return newPart.id;
      },

      duplicateSelectedParts: () => {
        const { licenseMode, parts, groups, groupMembers } = get();
        const { selectedPartIds, selectedGroupIds } = useSelectionStore.getState();
        if (selectedPartIds.length === 0 && selectedGroupIds.length === 0) return [];

        // Collect all parts to duplicate (directly selected + parts from selected groups)
        const partIdsToDupe = new Set(selectedPartIds);

        // Helper to collect all descendant groups recursively
        const collectDescendantGroupIds = (groupId: string, collected: Set<string>) => {
          collected.add(groupId);
          const childGroups = groupMembers.filter((gm) => gm.groupId === groupId && gm.memberType === 'group');
          for (const child of childGroups) {
            collectDescendantGroupIds(child.memberId, collected);
          }
        };

        // Collect all groups to duplicate (selected groups + their descendants)
        const groupIdsToDupe = new Set<string>();
        for (const groupId of selectedGroupIds) {
          collectDescendantGroupIds(groupId, groupIdsToDupe);
        }

        // Add all parts from duplicated groups
        for (const groupId of groupIdsToDupe) {
          const groupPartIds = getAllDescendantPartIds(groupId, groupMembers);
          groupPartIds.forEach((id) => partIdsToDupe.add(id));
        }

        // Check license limits before duplicating
        const partsToAdd = partIdsToDupe.size;
        if (!canAddPart(licenseMode, parts.length + partsToAdd - 1)) {
          useUIStore.getState().showToast(getBlockedMessage('addPart'));
          return [];
        }

        // Create ID mappings
        const partIdMap = new Map<string, string>();
        const groupIdMap = new Map<string, string>();

        // Get group members that will be duplicated to identify child items
        const selectedGroupMembers = groupMembers.filter((gm) => groupIdsToDupe.has(gm.groupId));

        // Identify child items (parts/groups that are members of any group being duplicated)
        // Only top-level items get "(copy)" appended to their names
        const childPartIds = new Set(
          selectedGroupMembers.filter((gm) => gm.memberType === 'part').map((gm) => gm.memberId)
        );
        const childGroupIds = new Set(
          selectedGroupMembers.filter((gm) => gm.memberType === 'group').map((gm) => gm.memberId)
        );

        // Duplicate parts with offset
        // Only top-level parts (not in any group being duplicated) get "(copy)" appended
        const selectedParts = parts.filter((p) => partIdsToDupe.has(p.id));
        const newParts = selectedParts.map((part) => {
          const newId = uuidv4();
          partIdMap.set(part.id, newId);
          const isChild = childPartIds.has(part.id);
          return {
            ...part,
            id: newId,
            name: isChild ? part.name : generateCopyName(part.name),
            position: {
              x: part.position.x + 2,
              y: part.position.y,
              z: part.position.z + 2
            }
          };
        });

        // Duplicate groups
        // Only top-level groups (not nested in other groups being duplicated) get "(copy)" appended
        const selectedGroups = groups.filter((g) => groupIdsToDupe.has(g.id));
        const newGroups = selectedGroups.map((group) => {
          const newId = uuidv4();
          groupIdMap.set(group.id, newId);
          const isChild = childGroupIds.has(group.id);
          return {
            ...group,
            id: newId,
            name: isChild ? group.name : generateCopyName(group.name)
          };
        });

        // Duplicate group members with mapped IDs
        const newGroupMembers = selectedGroupMembers.map((gm) => ({
          id: uuidv4(),
          groupId: groupIdMap.get(gm.groupId) || gm.groupId,
          memberType: gm.memberType,
          memberId:
            gm.memberType === 'part'
              ? partIdMap.get(gm.memberId) || gm.memberId
              : groupIdMap.get(gm.memberId) || gm.memberId
        }));

        const newPartIds = newParts.map((p) => p.id);
        const newGroupIds = newGroups.map((g) => g.id);

        // Find top-level groups (groups that aren't members of other duplicated groups)
        const topLevelGroupIds = newGroups
          .filter((g) => !childGroupIds.has(selectedGroups.find((og) => groupIdMap.get(og.id) === g.id)?.id || ''))
          .map((g) => g.id);

        set((state) => ({
          parts: [...state.parts, ...newParts],
          groups: [...state.groups, ...newGroups],
          groupMembers: [...state.groupMembers, ...newGroupMembers],
          isDirty: true
        }));
        useSelectionStore.setState((state) => ({
          selectedPartIds: topLevelGroupIds.length > 0 ? [] : newPartIds,
          selectedGroupIds: topLevelGroupIds,
          expandedGroupIds: [...state.expandedGroupIds, ...newGroupIds]
        }));

        get().markCutListStale();
        return newPartIds;
      },

      resetSelectedPartsToStock: () => {
        const { stocks } = get();
        const { selectedPartIds } = useSelectionStore.getState();
        if (selectedPartIds.length === 0) return;

        set((state) => ({
          parts: state.parts.map((p) => {
            if (!selectedPartIds.includes(p.id)) return p;
            if (!p.stockId) return p; // No stock assigned, skip

            const stock = stocks.find((s) => s.id === p.stockId);
            if (!stock) return p; // Stock not found, skip

            return {
              ...p,
              color: stock.color,
              grainDirection: stock.grainDirection === 'none' ? p.grainDirection : stock.grainDirection
            };
          }),
          isDirty: true
        }));
      },

      // Clipboard actions
      copySelectedParts: () => {
        const { parts, groups, groupMembers } = get();
        const { selectedPartIds, selectedGroupIds } = useSelectionStore.getState();

        // Collect all parts to copy (directly selected + parts from selected groups)
        const partIdsToCopy = new Set(selectedPartIds);

        // Helper to collect all descendant groups recursively
        const collectDescendantGroupIds = (groupId: string, collected: Set<string>) => {
          collected.add(groupId);
          const childGroups = groupMembers.filter((gm) => gm.groupId === groupId && gm.memberType === 'group');
          for (const child of childGroups) {
            collectDescendantGroupIds(child.memberId, collected);
          }
        };

        // Collect all groups to copy (selected groups + their descendants)
        const groupIdsToCopy = new Set<string>();
        for (const groupId of selectedGroupIds) {
          collectDescendantGroupIds(groupId, groupIdsToCopy);
        }

        // Add all parts from copied groups
        for (const groupId of groupIdsToCopy) {
          const groupPartIds = getAllDescendantPartIds(groupId, groupMembers);
          groupPartIds.forEach((id) => partIdsToCopy.add(id));
        }

        // Filter data to copy
        const copiedParts = parts.filter((p) => partIdsToCopy.has(p.id));
        const copiedGroups = groups.filter((g) => groupIdsToCopy.has(g.id));
        const copiedGroupMembers = groupMembers.filter((gm) => groupIdsToCopy.has(gm.groupId));

        // Deep clone to prevent mutation of original objects
        set({
          clipboard: {
            parts: copiedParts.map((p) => ({ ...p })),
            groups: copiedGroups.map((g) => ({ ...g })),
            groupMembers: copiedGroupMembers.map((gm) => ({ ...gm }))
          }
        });

        // Show toast notification
        const partCount = copiedParts.length;
        const groupCount = copiedGroups.length;
        if (groupCount > 0) {
          useUIStore
            .getState()
            .showToast(
              `Copied ${partCount} part${partCount === 1 ? '' : 's'} in ${groupCount} group${groupCount === 1 ? '' : 's'}`
            );
        } else {
          useUIStore.getState().showToast(`Copied ${partCount} part${partCount === 1 ? '' : 's'}`);
        }
      },

      pasteClipboard: () => {
        const { licenseMode, parts, clipboard } = get();
        if (clipboard.parts.length === 0) return [];

        // Check license limits before pasting
        if (!canAddPart(licenseMode, parts.length + clipboard.parts.length - 1)) {
          useUIStore.getState().showToast(getBlockedMessage('addPart'));
          return [];
        }

        // Identify child items (parts/groups that are members of any group)
        // Only top-level items get "(copy)" appended to their names
        const childPartIds = new Set(
          clipboard.groupMembers.filter((gm) => gm.memberType === 'part').map((gm) => gm.memberId)
        );
        const childGroupIds = new Set(
          clipboard.groupMembers.filter((gm) => gm.memberType === 'group').map((gm) => gm.memberId)
        );

        // Create ID mapping for parts and groups
        const partIdMap = new Map<string, string>(); // oldId -> newId
        const groupIdMap = new Map<string, string>(); // oldId -> newId

        // Create new parts with new IDs and offset positions
        // Only top-level parts (not in any group) get "(copy)" appended
        const newParts = clipboard.parts.map((part) => {
          const newId = uuidv4();
          partIdMap.set(part.id, newId);
          const isChild = childPartIds.has(part.id);
          return {
            ...part,
            id: newId,
            name: isChild ? part.name : generateCopyName(part.name),
            position: {
              x: part.position.x + 2,
              y: part.position.y,
              z: part.position.z + 2
            }
          };
        });

        // Create new groups with new IDs
        // Only top-level groups (not nested in other groups) get "(copy)" appended
        const newGroups = clipboard.groups.map((group) => {
          const newId = uuidv4();
          groupIdMap.set(group.id, newId);
          const isChild = childGroupIds.has(group.id);
          return {
            ...group,
            id: newId,
            name: isChild ? group.name : generateCopyName(group.name)
          };
        });

        // Create new group members with mapped IDs
        const newGroupMembers = clipboard.groupMembers.map((gm) => ({
          id: uuidv4(),
          groupId: groupIdMap.get(gm.groupId) || gm.groupId,
          memberType: gm.memberType,
          memberId:
            gm.memberType === 'part'
              ? partIdMap.get(gm.memberId) || gm.memberId
              : groupIdMap.get(gm.memberId) || gm.memberId
        }));

        const newPartIds = newParts.map((p) => p.id);
        const newGroupIds = newGroups.map((g) => g.id);

        // Find top-level groups (groups that aren't members of other copied groups)
        const topLevelGroupIds = newGroups
          .filter((g) => !childGroupIds.has(clipboard.groups.find((og) => groupIdMap.get(og.id) === g.id)?.id || ''))
          .map((g) => g.id);

        // Update clipboard for subsequent pastes (with updated positions)
        const updatedClipboard: Clipboard = {
          parts: newParts,
          groups: newGroups,
          groupMembers: newGroupMembers
        };

        set((state) => ({
          parts: [...state.parts, ...newParts],
          groups: [...state.groups, ...newGroups],
          groupMembers: [...state.groupMembers, ...newGroupMembers],
          clipboard: updatedClipboard,
          isDirty: true
        }));
        useSelectionStore.setState((state) => ({
          selectedPartIds: topLevelGroupIds.length > 0 ? [] : newPartIds,
          selectedGroupIds: topLevelGroupIds,
          expandedGroupIds: [...state.expandedGroupIds, ...newGroupIds]
        }));

        get().markCutListStale();
        return newPartIds;
      },

      pasteAtPosition: (position) => {
        const { licenseMode, parts, clipboard } = get();
        if (clipboard.parts.length === 0) return [];

        // Check license limits before pasting
        if (!canAddPart(licenseMode, parts.length + clipboard.parts.length - 1)) {
          useUIStore.getState().showToast(getBlockedMessage('addPart'));
          return [];
        }

        // Identify child items (parts/groups that are members of any group)
        // Only top-level items get "(copy)" appended to their names
        const childPartIds = new Set(
          clipboard.groupMembers.filter((gm) => gm.memberType === 'part').map((gm) => gm.memberId)
        );
        const childGroupIds = new Set(
          clipboard.groupMembers.filter((gm) => gm.memberType === 'group').map((gm) => gm.memberId)
        );

        // Calculate the center of the clipboard parts
        let minX = Infinity,
          maxX = -Infinity;
        let minZ = Infinity,
          maxZ = -Infinity;
        for (const part of clipboard.parts) {
          minX = Math.min(minX, part.position.x);
          maxX = Math.max(maxX, part.position.x);
          minZ = Math.min(minZ, part.position.z);
          maxZ = Math.max(maxZ, part.position.z);
        }
        const centerX = (minX + maxX) / 2;
        const centerZ = (minZ + maxZ) / 2;

        // Create ID mapping for parts and groups
        const partIdMap = new Map<string, string>();
        const groupIdMap = new Map<string, string>();

        // Create new parts centered at the clicked position
        // Only top-level parts (not in any group) get "(copy)" appended
        const newParts = clipboard.parts.map((part) => {
          const newId = uuidv4();
          partIdMap.set(part.id, newId);
          const isChild = childPartIds.has(part.id);
          return {
            ...part,
            id: newId,
            name: isChild ? part.name : generateCopyName(part.name),
            position: {
              x: position.x + (part.position.x - centerX),
              y: part.position.y,
              z: position.z + (part.position.z - centerZ)
            }
          };
        });

        // Create new groups with new IDs
        // Only top-level groups (not nested in other groups) get "(copy)" appended
        const newGroups = clipboard.groups.map((group) => {
          const newId = uuidv4();
          groupIdMap.set(group.id, newId);
          const isChild = childGroupIds.has(group.id);
          return {
            ...group,
            id: newId,
            name: isChild ? group.name : generateCopyName(group.name)
          };
        });

        // Create new group members with mapped IDs
        const newGroupMembers = clipboard.groupMembers.map((gm) => ({
          id: uuidv4(),
          groupId: groupIdMap.get(gm.groupId) || gm.groupId,
          memberType: gm.memberType,
          memberId:
            gm.memberType === 'part'
              ? partIdMap.get(gm.memberId) || gm.memberId
              : groupIdMap.get(gm.memberId) || gm.memberId
        }));

        const newPartIds = newParts.map((p) => p.id);
        const newGroupIds = newGroups.map((g) => g.id);

        // Find top-level groups
        const topLevelGroupIds = newGroups
          .filter((g) => !childGroupIds.has(clipboard.groups.find((og) => groupIdMap.get(og.id) === g.id)?.id || ''))
          .map((g) => g.id);

        set((state) => ({
          parts: [...state.parts, ...newParts],
          groups: [...state.groups, ...newGroups],
          groupMembers: [...state.groupMembers, ...newGroupMembers],
          isDirty: true
        }));
        useSelectionStore.setState((state) => ({
          selectedPartIds: topLevelGroupIds.length > 0 ? [] : newPartIds,
          selectedGroupIds: topLevelGroupIds,
          expandedGroupIds: [...state.expandedGroupIds, ...newGroupIds]
        }));

        get().markCutListStale();
        return newPartIds;
      },

      // Stock actions
      addStock: (stockOverrides) => {
        const { licenseMode, stocks } = get();

        // Check license limits
        if (!canAddStock(licenseMode, stocks.length)) {
          useUIStore.getState().showToast(getBlockedMessage('addStock'));
          return null;
        }

        const newStock = createDefaultStock(stockOverrides);
        set((state) => ({
          stocks: [...state.stocks, newStock],
          isDirty: true
        }));
        return newStock.id;
      },

      updateStock: (id, updates) => {
        // Validate dimensions are > 0
        const validatedUpdates = { ...updates };
        if (validatedUpdates.length !== undefined) {
          validatedUpdates.length = Math.max(0.001, validatedUpdates.length);
        }
        if (validatedUpdates.width !== undefined) {
          validatedUpdates.width = Math.max(0.001, validatedUpdates.width);
        }
        if (validatedUpdates.thickness !== undefined) {
          validatedUpdates.thickness = Math.max(0.001, validatedUpdates.thickness);
        }
        set((state) => ({
          stocks: state.stocks.map((s) => (s.id === id ? { ...s, ...validatedUpdates } : s)),
          isDirty: true
        }));
        get().markCutListStale();
      },

      deleteStock: (id) => {
        set((state) => ({
          stocks: state.stocks.filter((s) => s.id !== id),
          // Unassign the stock from any parts that were using it
          parts: state.parts.map((p) => (p.stockId === id ? { ...p, stockId: null } : p)),
          isDirty: true
        }));
        get().markCutListStale();
      },

      assignStockToSelectedParts: (stockId) => {
        const { stocks } = get();
        const { selectedPartIds } = useSelectionStore.getState();
        if (selectedPartIds.length === 0) return;

        if (stockId === null) {
          // Unassign stock from all selected parts
          set((state) => ({
            parts: state.parts.map((p) => (selectedPartIds.includes(p.id) ? { ...p, stockId: null } : p)),
            isDirty: true
          }));
        } else {
          const stock = stocks.find((s) => s.id === stockId);
          if (!stock) return;

          // Assign stock and inherit color + grain direction
          set((state) => ({
            parts: state.parts.map((p) =>
              selectedPartIds.includes(p.id)
                ? {
                    ...p,
                    stockId,
                    color: stock.color,
                    grainDirection: stock.grainDirection === 'none' ? p.grainDirection : stock.grainDirection
                  }
                : p
            ),
            isDirty: true
          }));
        }
        get().markCutListStale();
      },

      // Assembly actions
      addAssembly: (assembly) => {
        set((state) => ({
          assemblies: [...state.assemblies, assembly],
          isDirty: true
        }));
      },

      updateAssembly: (id, updates) => {
        set((state) => ({
          assemblies: state.assemblies.map((c) => (c.id === id ? { ...c, ...updates } : c)),
          isDirty: true
        }));
      },

      deleteAssembly: (id) => {
        set((state) => ({
          assemblies: state.assemblies.filter((c) => c.id !== id),
          isDirty: true
        }));
      },

      createAssemblyFromSelection: (name, description) => {
        const { licenseMode, parts, stocks, groups, groupMembers } = get();
        const { selectedPartIds, selectedGroupIds } = useSelectionStore.getState();

        // Check license limits for assemblies
        const limits = getFeatureLimits(licenseMode);
        if (!limits.canUseAssemblies) {
          useUIStore.getState().showToast(getBlockedMessage('useAssemblies'));
          return null;
        }

        // Collect all parts to include (directly selected + parts from selected groups)
        const partIdsToInclude = new Set(selectedPartIds);

        // Helper to collect all descendant groups recursively
        const collectDescendantGroupIds = (groupId: string, collected: Set<string>) => {
          collected.add(groupId);
          const childGroups = groupMembers.filter((gm) => gm.groupId === groupId && gm.memberType === 'group');
          for (const child of childGroups) {
            collectDescendantGroupIds(child.memberId, collected);
          }
        };

        // Collect all groups to include (selected groups + their descendants)
        const groupIdsToInclude = new Set<string>();
        for (const groupId of selectedGroupIds) {
          collectDescendantGroupIds(groupId, groupIdsToInclude);
        }

        // Add all parts from included groups
        for (const groupId of groupIdsToInclude) {
          const groupPartIds = getAllDescendantPartIds(groupId, groupMembers);
          groupPartIds.forEach((id) => partIdsToInclude.add(id));
        }

        if (partIdsToInclude.size === 0) return null;

        // Get the selected parts
        const selectedParts = parts.filter((p) => partIdsToInclude.has(p.id));

        // Calculate the center/origin of the selection (for relative positioning)
        let minX = Infinity,
          maxX = -Infinity;
        let minY = Infinity,
          maxY = -Infinity;
        let minZ = Infinity,
          maxZ = -Infinity;

        for (const part of selectedParts) {
          minX = Math.min(minX, part.position.x - part.length / 2);
          maxX = Math.max(maxX, part.position.x + part.length / 2);
          minY = Math.min(minY, part.position.y - part.thickness / 2);
          maxY = Math.max(maxY, part.position.y + part.thickness / 2);
          minZ = Math.min(minZ, part.position.z - part.width / 2);
          maxZ = Math.max(maxZ, part.position.z + part.width / 2);
        }

        const originX = (minX + maxX) / 2;
        const originY = minY; // Use bottom as Y origin (so parts sit on ground when placed)
        const originZ = (minZ + maxZ) / 2;

        // Helper to create embedded stock snapshot from a stock
        const createEmbeddedStock = (stock: Stock): EmbeddedStock => ({
          name: stock.name,
          length: stock.length,
          width: stock.width,
          thickness: stock.thickness,
          grainDirection: stock.grainDirection,
          pricingUnit: stock.pricingUnit,
          pricePerUnit: stock.pricePerUnit,
          color: stock.color
        });

        // Create part index map for group member references
        const partIdToIndex = new Map<string, number>();
        const assemblyParts: AssemblyPart[] = selectedParts.map((part, index) => {
          partIdToIndex.set(part.id, index);

          // Look up and embed stock data if part has a stock assigned
          let embeddedStock: EmbeddedStock | undefined;
          if (part.stockId) {
            const stock = stocks.find((s) => s.id === part.stockId);
            if (stock) {
              embeddedStock = createEmbeddedStock(stock);
            }
          }

          return {
            name: part.name,
            length: part.length,
            width: part.width,
            thickness: part.thickness,
            relativePosition: {
              x: part.position.x - originX,
              y: part.position.y - originY,
              z: part.position.z - originZ
            },
            rotation: part.rotation,
            stockId: part.stockId,
            grainSensitive: part.grainSensitive,
            grainDirection: part.grainDirection,
            color: part.color,
            notes: part.notes,
            extraLength: part.extraLength,
            extraWidth: part.extraWidth,
            embeddedStock
          };
        });

        // Create group structures
        const selectedGroups = groups.filter((g) => groupIdsToInclude.has(g.id));
        const groupIdToIndex = new Map<string, number>();
        const assemblyGroups: AssemblyGroup[] = selectedGroups.map((group, index) => {
          groupIdToIndex.set(group.id, index);
          return {
            originalId: group.id,
            name: group.name
          };
        });

        // Create group member structures
        const selectedGroupMembers = groupMembers.filter((gm) => groupIdsToInclude.has(gm.groupId));
        const assemblyGroupMembers: AssemblyGroupMember[] = selectedGroupMembers
          .filter((gm) => {
            // Only include members that are in our selection
            if (gm.memberType === 'part') {
              return partIdToIndex.has(gm.memberId);
            } else {
              return groupIdToIndex.has(gm.memberId);
            }
          })
          .map((gm) => ({
            groupIndex: groupIdToIndex.get(gm.groupId)!,
            memberType: gm.memberType,
            memberIndex: gm.memberType === 'part' ? partIdToIndex.get(gm.memberId)! : groupIdToIndex.get(gm.memberId)!
          }));

        const now = new Date().toISOString();
        const assembly: Assembly = {
          id: uuidv4(),
          name,
          description,
          parts: assemblyParts,
          groups: assemblyGroups,
          groupMembers: assemblyGroupMembers,
          createdAt: now,
          modifiedAt: now
        };

        return assembly;
      },

      placeAssembly: (assemblyId, position, libraryStocks = []) => {
        const { assemblies, stocks: projectStocks } = get();
        const assembly = assemblies.find((c) => c.id === assemblyId);
        if (!assembly) return [];

        // Track stocks that need to be added to the project
        const stocksToAdd: Stock[] = [];
        // Map from original stockId to resolved stockId (may be different if we create from embedded)
        const stockIdResolutionMap = new Map<string, string>();

        // Helper to check if a stock with matching properties already exists
        const findMatchingStock = (embedded: EmbeddedStock, existingStocks: Stock[]): Stock | undefined => {
          return existingStocks.find(
            (s) =>
              s.name === embedded.name &&
              s.thickness === embedded.thickness &&
              s.length === embedded.length &&
              s.width === embedded.width &&
              s.color === embedded.color
          );
        };

        // Resolve stocks for all parts that have stockId
        for (const cp of assembly.parts) {
          if (!cp.stockId) continue;
          if (stockIdResolutionMap.has(cp.stockId)) continue; // Already resolved

          // 1. Try to find in project stocks
          const projectStock = projectStocks.find((s) => s.id === cp.stockId);
          if (projectStock) {
            stockIdResolutionMap.set(cp.stockId, cp.stockId);
            continue;
          }

          // 2. Try to find in library stocks
          const libraryStock = libraryStocks.find((s) => s.id === cp.stockId);
          if (libraryStock) {
            // Add library stock to project
            stocksToAdd.push(libraryStock);
            stockIdResolutionMap.set(cp.stockId, libraryStock.id);
            continue;
          }

          // 3. Fall back to embedded stock data
          if (cp.embeddedStock) {
            // Check if a matching stock already exists in project or stocks we're adding
            const allStocks = [...projectStocks, ...stocksToAdd];
            const existingMatch = findMatchingStock(cp.embeddedStock, allStocks);

            if (existingMatch) {
              stockIdResolutionMap.set(cp.stockId, existingMatch.id);
            } else {
              // Create a new stock from embedded data
              const newStock: Stock = {
                id: uuidv4(),
                name: cp.embeddedStock.name,
                length: cp.embeddedStock.length,
                width: cp.embeddedStock.width,
                thickness: cp.embeddedStock.thickness,
                grainDirection: cp.embeddedStock.grainDirection,
                pricingUnit: cp.embeddedStock.pricingUnit,
                pricePerUnit: cp.embeddedStock.pricePerUnit,
                color: cp.embeddedStock.color
              };
              stocksToAdd.push(newStock);
              stockIdResolutionMap.set(cp.stockId, newStock.id);
            }
          } else {
            // No embedded data available - clear the stockId (graceful fallback)
            stockIdResolutionMap.set(cp.stockId, '');
          }
        }

        // Create ID mappings
        const partIdMap = new Map<number, string>(); // index -> new ID
        const groupIdMap = new Map<number, string>(); // index -> new ID

        // Create new parts with resolved stock IDs
        const newParts: Part[] = assembly.parts.map((cp, index) => {
          const newId = uuidv4();
          partIdMap.set(index, newId);

          // Resolve the stockId
          let resolvedStockId: string | null = cp.stockId;
          if (cp.stockId && stockIdResolutionMap.has(cp.stockId)) {
            const resolved = stockIdResolutionMap.get(cp.stockId)!;
            resolvedStockId = resolved || null; // Empty string means clear the stock
          }

          return {
            id: newId,
            name: cp.name,
            length: cp.length,
            width: cp.width,
            thickness: cp.thickness,
            position: {
              x: position.x + cp.relativePosition.x,
              y: position.y + cp.relativePosition.y,
              z: position.z + cp.relativePosition.z
            },
            rotation: cp.rotation,
            stockId: resolvedStockId,
            grainSensitive: cp.grainSensitive,
            grainDirection: cp.grainDirection,
            color: cp.color,
            notes: cp.notes,
            extraLength: cp.extraLength,
            extraWidth: cp.extraWidth
          };
        });

        // Create new groups
        const newGroups: Group[] = assembly.groups.map((cg, index) => {
          const newId = uuidv4();
          groupIdMap.set(index, newId);
          return {
            id: newId,
            name: cg.name
          };
        });

        // Create new group members with mapped IDs
        const newGroupMembers: GroupMember[] = assembly.groupMembers.map((cgm) => ({
          id: uuidv4(),
          groupId: groupIdMap.get(cgm.groupIndex)!,
          memberType: cgm.memberType,
          memberId: cgm.memberType === 'part' ? partIdMap.get(cgm.memberIndex)! : groupIdMap.get(cgm.memberIndex)!
        }));

        const newPartIds = newParts.map((p) => p.id);
        const newGroupIds = newGroups.map((g) => g.id);

        // Find top-level groups (groups that aren't members of other groups in this assembly)
        const childGroupIndices = new Set(
          assembly.groupMembers.filter((gm) => gm.memberType === 'group').map((gm) => gm.memberIndex)
        );
        const topLevelGroupIds = newGroups.filter((_, index) => !childGroupIndices.has(index)).map((g) => g.id);

        set((state) => ({
          // Add any new stocks first
          stocks: [...state.stocks, ...stocksToAdd],
          parts: [...state.parts, ...newParts],
          groups: [...state.groups, ...newGroups],
          groupMembers: [...state.groupMembers, ...newGroupMembers],
          isDirty: true
        }));
        useSelectionStore.setState((state) => ({
          selectedPartIds: topLevelGroupIds.length > 0 ? [] : newPartIds,
          selectedGroupIds: topLevelGroupIds,
          expandedGroupIds: [...state.expandedGroupIds, ...newGroupIds]
        }));

        get().markCutListStale();
        return newPartIds;
      },

      // Project actions
      newProject: (defaults) => {
        const now = new Date().toISOString();
        set({
          projectName: 'Untitled Project',
          parts: [],
          stocks: [],
          groups: [],
          groupMembers: [],
          assemblies: [],
          filePath: null,
          isDirty: false,
          units: defaults?.units || 'imperial',
          gridSize: defaults?.gridSize || 0.0625,
          kerfWidth: 0.125, // 1/8" default
          overageFactor: 0.1, // 10% default
          projectNotes: '',
          stockConstraints: defaults?.stockConstraints || {
            constrainDimensions: true,
            constrainGrain: true,
            constrainColor: true,
            preventOverlap: true
          },
          version: '1.0',
          createdAt: now,
          modifiedAt: now,
          clipboard: { parts: [], groups: [], groupMembers: [] },
          snapGuides: [],
          customShoppingItems: [],
          cutList: null
        });
        useSelectionStore.setState({
          selectedPartIds: [],
          selectedGroupIds: [],
          expandedGroupIds: [],
          editingGroupId: null
        });
        useSnapStore.setState({ referencePartIds: [], activeSnapLines: [], activeReferenceDistances: [] });
        // Reset camera state for new project
        useCameraStore.getState().setCameraState(null);
        useCameraStore.getState().clearPendingCameraRestore();
        // Clear undo history after setting new project state
        setTimeout(() => useProjectStore.temporal.getState().clear(), 0);
      },

      loadProject: (project, filePath) => {
        set({
          projectName: project.name,
          parts: project.parts,
          stocks: project.stocks,
          groups: project.groups,
          groupMembers: project.groupMembers || [],
          assemblies: project.assemblies || [],
          filePath: filePath || null,
          isDirty: false,
          // Load project settings or use defaults
          units: project.units || 'imperial',
          gridSize: project.gridSize || 0.0625,
          // Pre-cut list settings (with defaults for older files)
          kerfWidth: project.kerfWidth ?? 0.125,
          overageFactor: project.overageFactor ?? 0.1,
          projectNotes: project.projectNotes || '',
          // Stock constraints (provide defaults for older files that don't have them)
          stockConstraints: project.stockConstraints || {
            constrainDimensions: true,
            constrainGrain: true,
            constrainColor: true,
            preventOverlap: true
          },
          // Load project metadata or use defaults for older files
          version: project.version || '1.0',
          createdAt: project.createdAt || new Date().toISOString(),
          modifiedAt: project.modifiedAt || new Date().toISOString(),
          clipboard: { parts: [], groups: [], groupMembers: [] },
          snapGuides: project.snapGuides || [],
          customShoppingItems: project.customShoppingItems || [],
          cutList: project.cutList || null
        });
        useSelectionStore.setState({
          selectedPartIds: [],
          selectedGroupIds: [],
          expandedGroupIds: [],
          editingGroupId: null
        });
        useSnapStore.setState({ referencePartIds: [], activeSnapLines: [], activeReferenceDistances: [] });
        // Set camera state in cameraStore (cross-store)
        const cameraState = project.cameraState || null;
        useCameraStore.getState().setCameraState(cameraState);
        if (cameraState) {
          // pendingCameraRestore is set directly since there's no setter that sets it to true
          useCameraStore.setState({ pendingCameraRestore: true });
        }
        // Clear undo history after loading project state
        setTimeout(() => useProjectStore.temporal.getState().clear(), 0);
      },

      setFilePath: (path) => set({ filePath: path }),
      markDirty: () => set({ isDirty: true, modifiedAt: new Date().toISOString() }),
      markClean: () => set({ isDirty: false }),

      // Project settings actions
      setProjectName: (projectName) => set({ projectName, isDirty: true }),
      setProjectUnits: (units) => set({ units, isDirty: true }),
      setProjectGridSize: (gridSize) => set({ gridSize, isDirty: true }),
      setKerfWidth: (kerfWidth) => {
        set({ kerfWidth, isDirty: true });
        get().markCutListStale();
      },
      setOverageFactor: (overageFactor) => {
        set({ overageFactor, isDirty: true });
        get().markCutListStale();
      },
      setProjectNotes: (projectNotes) => set({ projectNotes, isDirty: true }),
      setStockConstraints: (stockConstraints) => set({ stockConstraints, isDirty: true }),

      // Snap guide actions
      addSnapGuide: (axis, position, label) => {
        const id = uuidv4();
        set((state) => ({
          snapGuides: [...state.snapGuides, { id, axis, position, label }]
        }));
        return id;
      },
      removeSnapGuide: (id) =>
        set((state) => ({
          snapGuides: state.snapGuides.filter((g) => g.id !== id)
        })),
      clearSnapGuides: () => set({ snapGuides: [] }),

      // Group actions
      createGroup: (name, members) => {
        const { licenseMode, groupMembers } = get();

        // Check license limits for groups
        const limits = getFeatureLimits(licenseMode);
        if (!limits.canUseGroups) {
          useUIStore.getState().showToast(getBlockedMessage('useGroups'));
          return null;
        }

        const groupId = uuidv4();

        // Separate parts and groups
        const partIds = members.filter((m) => m.type === 'part').map((m) => m.id);
        const childGroupIds = members.filter((m) => m.type === 'group').map((m) => m.id);

        // Remove members from any existing groups first (a part/group can only be in one group)
        const filteredGroupMembers = groupMembers.filter((gm) => {
          if (gm.memberType === 'part' && partIds.includes(gm.memberId)) return false;
          if (gm.memberType === 'group' && childGroupIds.includes(gm.memberId)) return false;
          return true;
        });

        // Create new group members for all items
        const newGroupMembers = members.map((member) => ({
          id: uuidv4(),
          groupId,
          memberType: member.type,
          memberId: member.id
        }));

        set({
          groups: [...get().groups, { id: groupId, name }],
          groupMembers: [...filteredGroupMembers, ...newGroupMembers],
          isDirty: true
        });
        useSelectionStore.setState((state) => ({
          selectedPartIds: [],
          selectedGroupIds: [groupId],
          expandedGroupIds: [...state.expandedGroupIds, groupId]
        }));

        return groupId;
      },

      renameGroup: (groupId, name) => {
        set((state) => ({
          groups: state.groups.map((g) => (g.id === groupId ? { ...g, name } : g)),
          isDirty: true
        }));
      },

      deleteGroup: (groupId, mode, targetParentGroupId) => {
        const { groupMembers } = get();

        // Helper to get all descendant part IDs recursively
        const getAllDescendantPartIds = (gId: string): string[] => {
          const partIds: string[] = [];
          const members = groupMembers.filter((gm) => gm.groupId === gId);

          for (const member of members) {
            if (member.memberType === 'part') {
              partIds.push(member.memberId);
            } else {
              // Nested group - recurse
              partIds.push(...getAllDescendantPartIds(member.memberId));
            }
          }
          return partIds;
        };

        // Helper to get all descendant group IDs recursively
        const getAllDescendantGroupIds = (gId: string): string[] => {
          const groupIds: string[] = [gId];
          const members = groupMembers.filter((gm) => gm.groupId === gId);

          for (const member of members) {
            if (member.memberType === 'group') {
              groupIds.push(...getAllDescendantGroupIds(member.memberId));
            }
          }
          return groupIds;
        };

        const descendantGroupIds = getAllDescendantGroupIds(groupId);
        const descendantPartIds = getAllDescendantPartIds(groupId);

        if (mode === 'ungroup') {
          // Remove the group, but keep its immediate children
          // If targetParentGroupId is provided, move immediate children to that parent
          // Otherwise, children become top-level (ungrouped)

          // Get immediate children of the group being ungrouped
          const immediateChildren = groupMembers.filter((gm) => gm.groupId === groupId);

          set((state) => {
            // Remove all memberships within the group being deleted (and its descendants)
            // Also remove any memberships that reference the deleted groups as members
            let newGroupMembers = state.groupMembers.filter((gm) => {
              // Remove if this membership is inside a deleted group
              if (descendantGroupIds.includes(gm.groupId)) return false;
              // Remove if this membership references a deleted group as a member
              if (gm.memberType === 'group' && descendantGroupIds.includes(gm.memberId)) return false;
              return true;
            });

            // If there's a target parent, add immediate children to it
            if (targetParentGroupId) {
              const newMemberships = immediateChildren.map((child) => ({
                id: uuidv4(),
                groupId: targetParentGroupId,
                memberType: child.memberType,
                memberId: child.memberId
              }));
              newGroupMembers = [...newGroupMembers, ...newMemberships];
            }

            return {
              groups: state.groups.filter((g) => !descendantGroupIds.includes(g.id)),
              groupMembers: newGroupMembers,
              isDirty: true
            };
          });
          useSelectionStore.setState((state) => ({
            selectedGroupIds: state.selectedGroupIds.filter((id) => !descendantGroupIds.includes(id)),
            expandedGroupIds: state.expandedGroupIds.filter((id) => !descendantGroupIds.includes(id)),
            editingGroupId: descendantGroupIds.includes(state.editingGroupId || '') ? null : state.editingGroupId
          }));
        } else {
          // 'recursive' - delete group AND all member parts
          set((state) => ({
            groups: state.groups.filter((g) => !descendantGroupIds.includes(g.id)),
            // Remove memberships inside deleted groups AND memberships that reference deleted groups as members
            groupMembers: state.groupMembers.filter((gm) => {
              if (descendantGroupIds.includes(gm.groupId)) return false;
              if (gm.memberType === 'group' && descendantGroupIds.includes(gm.memberId)) return false;
              return true;
            }),
            parts: state.parts.filter((p) => !descendantPartIds.includes(p.id)),
            isDirty: true
          }));
          useSelectionStore.setState((state) => ({
            selectedPartIds: state.selectedPartIds.filter((id) => !descendantPartIds.includes(id)),
            selectedGroupIds: state.selectedGroupIds.filter((id) => !descendantGroupIds.includes(id)),
            expandedGroupIds: state.expandedGroupIds.filter((id) => !descendantGroupIds.includes(id)),
            editingGroupId: descendantGroupIds.includes(state.editingGroupId || '') ? null : state.editingGroupId
          }));
          useSnapStore.setState((state) => ({
            referencePartIds: state.referencePartIds.filter((id) => !descendantPartIds.includes(id))
          }));
        }
      },

      addToGroup: (groupId, memberIds, memberType) => {
        const { groupMembers } = get();

        // Remove members from any existing groups first (a part/group can only be in one group)
        const existingMemberIds = new Set(memberIds);
        const filteredGroupMembers = groupMembers.filter(
          (gm) => !(gm.memberType === memberType && existingMemberIds.has(gm.memberId))
        );

        // Create new group members
        const newGroupMembers = memberIds.map((memberId) => ({
          id: uuidv4(),
          groupId,
          memberType,
          memberId
        }));

        set({
          groupMembers: [...filteredGroupMembers, ...newGroupMembers],
          isDirty: true
        });
      },

      removeFromGroup: (memberIds, memberType) => {
        const { groupMembers, groups } = get();
        const { selectedGroupIds, editingGroupId, expandedGroupIds } = useSelectionStore.getState();

        // Find which groups will be affected (groups containing the members being removed)
        const affectedGroupIds = new Set<string>();
        for (const gm of groupMembers) {
          if (gm.memberType === memberType && memberIds.includes(gm.memberId)) {
            affectedGroupIds.add(gm.groupId);
          }
        }

        // Remove the members
        const newGroupMembers = groupMembers.filter(
          (gm) => !(gm.memberType === memberType && memberIds.includes(gm.memberId))
        );

        // Find groups that are now empty
        const emptyGroupIds: string[] = [];
        for (const groupId of affectedGroupIds) {
          const remainingMembers = newGroupMembers.filter((gm) => gm.groupId === groupId);
          if (remainingMembers.length === 0) {
            emptyGroupIds.push(groupId);
          }
        }

        // If there are empty groups, also remove them from groups array and clean up all related state
        if (emptyGroupIds.length > 0) {
          set({
            groupMembers: newGroupMembers.filter((gm) => !emptyGroupIds.includes(gm.groupId)),
            groups: groups.filter((g) => !emptyGroupIds.includes(g.id)),
            isDirty: true
          });
          useSelectionStore.setState({
            selectedGroupIds: selectedGroupIds.filter((id) => !emptyGroupIds.includes(id)),
            editingGroupId: editingGroupId && emptyGroupIds.includes(editingGroupId) ? null : editingGroupId,
            expandedGroupIds: expandedGroupIds.filter((id) => !emptyGroupIds.includes(id))
          });
        } else {
          set({
            groupMembers: newGroupMembers,
            isDirty: true
          });
        }
      },

      mergeGroups: (groupIds, mode) => {
        const { licenseMode, groups, groupMembers } = get();
        if (groupIds.length < 2) return null;

        // Check license limits for groups
        const limits = getFeatureLimits(licenseMode);
        if (!limits.canUseGroups) {
          useUIStore.getState().showToast(getBlockedMessage('useGroups'));
          return null;
        }

        const newGroupId = uuidv4();

        // Get group names for the merged group name
        const groupNames = groupIds.map((id) => groups.find((g) => g.id === id)?.name || 'Group').slice(0, 2);
        const mergedName =
          groupIds.length === 2
            ? `${groupNames[0]} & ${groupNames[1]} Merged`
            : `${groupNames[0]} & ${groupIds.length - 1} others Merged`;

        let newMembers: Array<{ id: string; type: 'part' | 'group' }> = [];

        if (mode === 'top-level') {
          // Collect immediate children of all selected groups
          for (const groupId of groupIds) {
            const children = groupMembers.filter((gm) => gm.groupId === groupId);
            for (const child of children) {
              newMembers.push({ id: child.memberId, type: child.memberType });
            }
          }
        } else {
          // 'deep' mode - flatten all groups recursively into just parts
          const allPartIds = new Set<string>();
          for (const groupId of groupIds) {
            const partIds = getAllDescendantPartIds(groupId, groupMembers);
            partIds.forEach((id) => allPartIds.add(id));
          }
          newMembers = [...allPartIds].map((id) => ({ id, type: 'part' as const }));
        }

        // Remove members from their current groups (they'll move to the new group)
        const memberIdsToMove = new Set(newMembers.map((m) => m.id));
        let filteredGroupMembers = groupMembers.filter((gm) => {
          // Remove if this member is being moved to the new group
          if (memberIdsToMove.has(gm.memberId)) return false;
          // Remove all memberships of the groups being merged
          if (groupIds.includes(gm.groupId)) return false;
          return true;
        });

        // For deep mode, also remove nested groups that were inside merged groups
        if (mode === 'deep') {
          // Collect all descendant group IDs
          const descendantGroupIds = new Set<string>();
          const collectDescendantGroups = (gId: string) => {
            const children = groupMembers.filter((gm) => gm.groupId === gId && gm.memberType === 'group');
            for (const child of children) {
              descendantGroupIds.add(child.memberId);
              collectDescendantGroups(child.memberId);
            }
          };
          for (const groupId of groupIds) {
            collectDescendantGroups(groupId);
          }

          // Remove nested groups from groups array and their memberships
          filteredGroupMembers = filteredGroupMembers.filter(
            (gm) => !descendantGroupIds.has(gm.groupId) && !descendantGroupIds.has(gm.memberId)
          );

          set((state) => ({
            groups: state.groups.filter((g) => !groupIds.includes(g.id) && !descendantGroupIds.has(g.id)),
            groupMembers: filteredGroupMembers,
            isDirty: true
          }));
        } else {
          // Top-level mode: just remove the merged groups
          set((state) => ({
            groups: state.groups.filter((g) => !groupIds.includes(g.id)),
            groupMembers: filteredGroupMembers,
            isDirty: true
          }));
        }

        // Create the new merged group using createGroup action
        // But we need to do this after clearing the old groups, so we do it manually
        const newGroupMembers = newMembers.map((member) => ({
          id: uuidv4(),
          groupId: newGroupId,
          memberType: member.type,
          memberId: member.id
        }));

        set((state) => ({
          groups: [...state.groups, { id: newGroupId, name: mergedName }],
          groupMembers: [...state.groupMembers, ...newGroupMembers],
          isDirty: true
        }));
        useSelectionStore.setState((state) => ({
          selectedPartIds: [],
          selectedGroupIds: [newGroupId],
          expandedGroupIds: [...state.expandedGroupIds, newGroupId]
        }));

        return newGroupId;
      },

      // Cut list actions
      setCutList: (cutList) => {
        set({ cutList, isDirty: true });
      },

      markCutListStale: () => {
        // Use functional setter to avoid race condition with concurrent state updates
        set((state) => {
          if (state.cutList && !state.cutList.isStale) {
            return {
              cutList: { ...state.cutList, isStale: true },
              isDirty: true
            };
          }
          return {};
        });
      },

      clearCutList: () => {
        set({ cutList: null, isDirty: true });
      },

      // Custom shopping list item actions
      addCustomShoppingItem: (item) => {
        const id = uuidv4();
        const newItem: CustomShoppingItem = { ...item, id };
        set((state) => ({
          customShoppingItems: [...state.customShoppingItems, newItem],
          isDirty: true
        }));
        return id;
      },

      updateCustomShoppingItem: (id, updates) => {
        set((state) => ({
          customShoppingItems: state.customShoppingItems.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
          isDirty: true
        }));
      },

      deleteCustomShoppingItem: (id) => {
        set((state) => ({
          customShoppingItems: state.customShoppingItems.filter((item) => item.id !== id),
          isDirty: true
        }));
      },

      setLicenseMode: (mode) => {
        set({ licenseMode: mode });
      }
    }),
    {
      partialize: (state) => ({
        projectName: state.projectName,
        parts: state.parts,
        stocks: state.stocks,
        groups: state.groups,
        groupMembers: state.groupMembers,
        assemblies: state.assemblies,
        units: state.units,
        gridSize: state.gridSize,
        kerfWidth: state.kerfWidth,
        overageFactor: state.overageFactor,
        projectNotes: state.projectNotes,
        stockConstraints: state.stockConstraints,
        snapGuides: state.snapGuides,
        customShoppingItems: state.customShoppingItems,
        cutList: state.cutList,
        version: state.version,
        createdAt: state.createdAt,
        modifiedAt: state.modifiedAt
      }),
      limit: 100,
      equality: (pastState, currentState) => JSON.stringify(pastState) === JSON.stringify(currentState)
    }
  )
);

// Selection change subscription bridge is in selectionStore.ts to avoid circular init issues
