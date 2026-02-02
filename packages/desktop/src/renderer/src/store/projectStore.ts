import { create } from 'zustand';
import { temporal } from 'zundo';
import { v4 as uuidv4 } from 'uuid';
import { Part, Stock, Group, GroupMember, Project, DisplayMode, SnapLine, SnapGuide, Clipboard, Assembly, AssemblyPart, AssemblyGroup, AssemblyGroupMember, StockConstraintSettings, CutList, PartValidationIssue, EmbeddedStock, CustomShoppingItem } from '../types';
import { STOCK_COLORS } from '../constants';

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
  selectedPartIds: string[];
  hoveredPartId: string | null;
  transformMode: 'translate' | 'scale';
  clipboard: Clipboard;
  activeDragDelta: { x: number; y: number; z: number } | null; // Live drag offset for multi-select
  contextMenu: {
    x: number;
    y: number;
    type: 'part' | 'background' | 'guide';
    worldPosition?: { x: number; y: number; z: number }; // For paste-at-location
    guideId?: string; // For guide-specific context menu
  } | null;
  centerCameraRequested: boolean; // Flag to trigger camera centering
  centerCameraAtOriginRequested: boolean; // Flag to trigger camera centering at origin
  centerCameraAtPosition: { x: number; y: number; z: number } | null; // Target position for camera centering
  selectionBox: {
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null;
  toast: { message: string; id: string } | null;
  // Camera view vectors for view-relative movement (screen-aligned, normalized)
  cameraViewVectors: {
    up: { x: number; y: number; z: number }; // Direction pointing "up" on screen
    right: { x: number; y: number; z: number }; // Direction pointing "right" on screen
  };
  showGrainDirection: boolean; // Toggle for grain direction arrows on parts
  pendingDeletePartIds: string[] | null; // Parts pending deletion confirmation
  saveAssemblyModalOpen: boolean; // Flag to open the save assembly modal
  // Transient view state (not saved with project)
  displayMode: DisplayMode;
  showGrid: boolean;
  // Snap-to-parts feature
  snapToPartsEnabled: boolean;
  activeSnapLines: SnapLine[]; // Current alignment lines to display during drag
  // Reference parts for precision snapping
  referencePartIds: string[]; // Parts marked as snap reference targets
  // Persistent snap guides
  snapGuides: SnapGuide[]; // User-created guide planes for snapping
  // Custom shopping list items (hardware, fasteners, etc.)
  customShoppingItems: CustomShoppingItem[]; // User-added items that persist through cut list regeneration
  // Group UI state (transient)
  selectedGroupIds: string[]; // Groups currently selected
  expandedGroupIds: string[]; // Groups expanded in sidebar
  editingGroupId: string | null; // Currently "entered" group for individual part editing (Figma-style)

  // Cut list state
  cutList: CutList | null; // Generated cut list (persisted with project)
  cutListModalOpen: boolean; // UI state for modal visibility

  // Assembly editing mode state
  isEditingAssembly: boolean; // Whether we're in assembly editing mode
  editingAssemblyId: string | null; // ID of the assembly being edited (in library)
  editingAssemblyName: string; // Name of the assembly being edited
  previousProjectSnapshot: {
    projectName: string;
    parts: Part[];
    stocks: Stock[];
    groups: Group[];
    groupMembers: GroupMember[];
    assemblies: Assembly[];
    filePath: string | null;
    isDirty: boolean;
    units: 'imperial' | 'metric';
    gridSize: number;
    kerfWidth: number;
    overageFactor: number;
    projectNotes: string;
    stockConstraints: StockConstraintSettings;
    createdAt: string;
    modifiedAt: string;
    snapGuides: SnapGuide[];
    cutList: CutList | null;
    // UI state to restore
    expandedGroupIds: string[];
    referencePartIds: string[];
  } | null; // Snapshot of project state before entering assembly edit mode

  // Actions - Parts
  addPart: (part?: Partial<Part>) => string;
  updatePart: (id: string, updates: Partial<Part>) => void;
  updateParts: (ids: string[], updates: Partial<Part>) => void;
  batchUpdateParts: (updates: Array<{ id: string; changes: Partial<Part> }>) => void;
  moveSelectedParts: (delta: { x: number; y: number; z: number }) => void;
  deletePart: (id: string) => void;
  deleteSelectedParts: () => void;
  requestDeleteParts: (ids: string[]) => void;
  confirmDeleteParts: () => void;
  cancelDeleteParts: () => void;
  duplicatePart: (id: string) => string | null;
  duplicateSelectedParts: () => string[];
  resetSelectedPartsToStock: () => void;

  // Actions - Selection
  selectPart: (id: string | null) => void;
  togglePartSelection: (id: string) => void;
  selectParts: (ids: string[]) => void;
  clearSelection: () => void;
  setHoveredPart: (id: string | null) => void;
  setTransformMode: (mode: 'translate' | 'scale') => void;
  setActiveDragDelta: (delta: { x: number; y: number; z: number } | null) => void;
  openContextMenu: (menu: {
    x: number;
    y: number;
    type: 'part' | 'background' | 'guide';
    worldPosition?: { x: number; y: number; z: number };
    guideId?: string;
  }) => void;
  closeContextMenu: () => void;
  requestCenterCamera: () => void;
  requestCenterCameraAtOrigin: () => void;
  requestCenterCameraAtPosition: (position: { x: number; y: number; z: number }) => void;
  clearCenterCameraRequest: () => void;
  setSelectionBox: (box: { start: { x: number; y: number }; end: { x: number; y: number } } | null) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
  setCameraViewVectors: (vectors: { up: { x: number; y: number; z: number }; right: { x: number; y: number; z: number } }) => void;
  toggleGrainDirection: () => void;

  // Actions - Clipboard
  copySelectedParts: () => void;
  pasteClipboard: () => string[];
  pasteAtPosition: (position: { x: number; y: number; z: number }) => string[];

  // Actions - Stocks
  addStock: (stock?: Partial<Stock>) => string;
  updateStock: (id: string, updates: Partial<Stock>) => void;
  deleteStock: (id: string) => void;
  assignStockToSelectedParts: (stockId: string | null) => void;

  // Actions - Assemblies
  addAssembly: (assembly: Assembly) => void;
  updateAssembly: (id: string, updates: Partial<Assembly>) => void;
  deleteAssembly: (id: string) => void;
  createAssemblyFromSelection: (name: string, description?: string) => Assembly | null;
  placeAssembly: (assemblyId: string, position: { x: number; y: number; z: number }, libraryStocks?: Stock[]) => string[];
  openSaveAssemblyModal: () => void;
  closeSaveAssemblyModal: () => void;

  // Actions - Project
  newProject: (defaults?: { units?: 'imperial' | 'metric'; gridSize?: number; stockConstraints?: StockConstraintSettings }) => void;
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

  // Actions - View State (transient, not saved)
  setDisplayMode: (mode: DisplayMode) => void;
  setShowGrid: (show: boolean) => void;
  // Snap-to-parts actions
  setSnapToPartsEnabled: (enabled: boolean) => void;
  setActiveSnapLines: (lines: SnapLine[]) => void;
  // Reference parts actions
  setReferencePartIds: (ids: string[]) => void;
  addToReferences: (ids: string[]) => void;
  removeFromReferences: (ids: string[]) => void;
  toggleReference: (ids: string[]) => void;
  clearReferences: () => void;
  // Snap guide actions
  addSnapGuide: (axis: 'x' | 'y' | 'z', position: number, label?: string) => string;
  removeSnapGuide: (id: string) => void;
  clearSnapGuides: () => void;

  // Actions - Groups
  createGroup: (name: string, members: Array<{ id: string; type: 'part' | 'group' }>) => string;
  renameGroup: (groupId: string, name: string) => void;
  deleteGroup: (groupId: string, mode: 'ungroup' | 'recursive', targetParentGroupId?: string | null) => void;
  addToGroup: (groupId: string, memberIds: string[], memberType: 'part' | 'group') => void;
  removeFromGroup: (memberIds: string[], memberType: 'part' | 'group') => void;
  mergeGroups: (groupIds: string[], mode: 'top-level' | 'deep') => string;
  // Group selection actions
  selectGroup: (groupId: string) => void;
  toggleGroupSelection: (groupId: string) => void;
  clearGroupSelection: () => void;
  // Group editing mode (Figma-style double-click to enter)
  enterGroup: (groupId: string) => void;
  exitGroup: () => void;
  // Group expand/collapse actions
  toggleGroupExpanded: (groupId: string) => void;
  expandGroup: (groupId: string) => void;
  collapseGroup: (groupId: string) => void;
  expandAllGroups: () => void;
  collapseAllGroups: () => void;

  // Cut list actions
  openCutListModal: () => void;
  closeCutListModal: () => void;
  setCutList: (cutList: CutList | null) => void;
  markCutListStale: () => void;
  clearCutList: () => void;

  // Custom shopping list item actions
  addCustomShoppingItem: (item: Omit<CustomShoppingItem, 'id'>) => string;
  updateCustomShoppingItem: (id: string, updates: Partial<CustomShoppingItem>) => void;
  deleteCustomShoppingItem: (id: string) => void;

  // Assembly editing actions
  startEditingAssembly: (assemblyId: string, assemblyName: string, parts: Part[], groups?: Group[], groupMembers?: GroupMember[], embeddedStocks?: Stock[]) => void;
  saveEditingAssembly: () => Assembly | null;
  cancelEditingAssembly: () => void;
  restorePreviousProject: () => void;
  startFreshAfterAssemblyEdit: () => void;
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

// Track toast timeout for cleanup (module-level, not in store state since it's not serializable)
let toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

// Helper function: Find which group a part belongs to (if any)
export const getContainingGroupId = (partId: string, groupMembers: GroupMember[]): string | null => {
  const member = groupMembers.find((gm) => gm.memberType === 'part' && gm.memberId === partId);
  return member ? member.groupId : null;
};

// Helper function: Get all descendant part IDs from a group (recursively includes nested groups)
export const getAllDescendantPartIds = (groupId: string, groupMembers: GroupMember[]): string[] => {
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
export const validatePartsForCutList = (
  parts: Part[],
  stocks: Stock[]
): PartValidationIssue[] => {
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

  selectedPartIds: [],
  hoveredPartId: null,
  transformMode: 'translate',
  clipboard: { parts: [], groups: [], groupMembers: [] },
  activeDragDelta: null,
  contextMenu: null,
  centerCameraRequested: false,
  centerCameraAtOriginRequested: false,
  centerCameraAtPosition: null,
  selectionBox: null,
  toast: null,
  // Default camera view vectors (screen-aligned for default isometric view)
  cameraViewVectors: {
    up: { x: 0, y: 1, z: 0 }, // Screen up direction
    right: { x: 0.707, y: 0, z: -0.707 } // Screen right direction
  },
  showGrainDirection: false,
  pendingDeletePartIds: null,
  saveAssemblyModalOpen: false,
  displayMode: 'solid',
  showGrid: true,
  snapToPartsEnabled: true, // Enabled by default
  activeSnapLines: [],
  referencePartIds: [], // No reference parts by default
  snapGuides: [], // No guides by default
  customShoppingItems: [], // No custom shopping items by default
  selectedGroupIds: [], // No groups selected by default
  expandedGroupIds: [], // All groups collapsed by default
  editingGroupId: null, // Not inside any group by default

  // Cut list state
  cutList: null, // No cut list generated by default
  cutListModalOpen: false, // Modal closed by default

  // Assembly editing mode state
  isEditingAssembly: false,
  editingAssemblyId: null,
  editingAssemblyName: '',
  previousProjectSnapshot: null,

  // Part actions
  addPart: (partOverrides) => {
    const newPart = createDefaultPart(partOverrides);
    set((state) => ({
      parts: [...state.parts, newPart],
      selectedPartIds: [newPart.id],
      isDirty: true
    }));
    get().markCutListStale();
    return newPart.id;
  },

  updatePart: (id, updates) => {
    set((state) => ({
      parts: state.parts.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      isDirty: true
    }));
    get().markCutListStale();
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
    const { selectedPartIds, selectedGroupIds, editingGroupId, groupMembers } = get();

    // Determine which parts to move
    let partIdsToMove: Set<string>;

    if (editingGroupId !== null) {
      // Inside a group (Figma-style "entered") - move only explicitly selected parts
      partIdsToMove = new Set(selectedPartIds);
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
  },

  deletePart: (id) => {
    set((state) => ({
      parts: state.parts.filter((p) => p.id !== id),
      selectedPartIds: state.selectedPartIds.filter((pid) => pid !== id),
      referencePartIds: state.referencePartIds.filter((pid) => pid !== id),
      // Remove from any groups
      groupMembers: state.groupMembers.filter((gm) => !(gm.memberType === 'part' && gm.memberId === id)),
      isDirty: true
    }));
    get().markCutListStale();
  },

  deleteSelectedParts: () => {
    const { selectedPartIds } = get();
    if (selectedPartIds.length === 0) return;
    set((state) => ({
      parts: state.parts.filter((p) => !selectedPartIds.includes(p.id)),
      selectedPartIds: [],
      referencePartIds: state.referencePartIds.filter((id) => !selectedPartIds.includes(id)),
      // Remove from any groups
      groupMembers: state.groupMembers.filter((gm) => !(gm.memberType === 'part' && selectedPartIds.includes(gm.memberId))),
      isDirty: true
    }));
    get().markCutListStale();
  },

  requestDeleteParts: (ids) => {
    if (ids.length === 0) return;
    set({ pendingDeletePartIds: ids });
  },

  confirmDeleteParts: () => {
    const { pendingDeletePartIds } = get();
    if (!pendingDeletePartIds || pendingDeletePartIds.length === 0) return;
    set((state) => ({
      parts: state.parts.filter((p) => !pendingDeletePartIds.includes(p.id)),
      selectedPartIds: state.selectedPartIds.filter((id) => !pendingDeletePartIds.includes(id)),
      referencePartIds: state.referencePartIds.filter((id) => !pendingDeletePartIds.includes(id)),
      // Remove from any groups
      groupMembers: state.groupMembers.filter((gm) => !(gm.memberType === 'part' && pendingDeletePartIds.includes(gm.memberId))),
      pendingDeletePartIds: null,
      isDirty: true
    }));
    get().markCutListStale();
  },

  cancelDeleteParts: () => {
    set({ pendingDeletePartIds: null });
  },

  duplicatePart: (id) => {
    const part = get().parts.find((p) => p.id === id);
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
      selectedPartIds: [newPart.id],
      isDirty: true
    }));

    get().markCutListStale();
    return newPart.id;
  },

  duplicateSelectedParts: () => {
    const { parts, groups, groupMembers, selectedPartIds, selectedGroupIds } = get();
    if (selectedPartIds.length === 0 && selectedGroupIds.length === 0) return [];

    // Collect all parts to duplicate (directly selected + parts from selected groups)
    const partIdsToDupe = new Set(selectedPartIds);

    // Helper to collect all descendant groups recursively
    const collectDescendantGroupIds = (groupId: string, collected: Set<string>) => {
      collected.add(groupId);
      const childGroups = groupMembers.filter(
        (gm) => gm.groupId === groupId && gm.memberType === 'group'
      );
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

    // Create ID mappings
    const partIdMap = new Map<string, string>();
    const groupIdMap = new Map<string, string>();

    // Duplicate parts with offset
    const selectedParts = parts.filter((p) => partIdsToDupe.has(p.id));
    const newParts = selectedParts.map((part) => {
      const newId = uuidv4();
      partIdMap.set(part.id, newId);
      return {
        ...part,
        id: newId,
        name: generateCopyName(part.name),
        position: {
          x: part.position.x + 2,
          y: part.position.y,
          z: part.position.z + 2
        }
      };
    });

    // Duplicate groups
    const selectedGroups = groups.filter((g) => groupIdsToDupe.has(g.id));
    const newGroups = selectedGroups.map((group) => {
      const newId = uuidv4();
      groupIdMap.set(group.id, newId);
      return {
        ...group,
        id: newId,
        name: generateCopyName(group.name)
      };
    });

    // Duplicate group members with mapped IDs
    const selectedGroupMembers = groupMembers.filter((gm) => groupIdsToDupe.has(gm.groupId));
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
    const childGroupIds = new Set(
      selectedGroupMembers.filter((gm) => gm.memberType === 'group').map((gm) => gm.memberId)
    );
    const topLevelGroupIds = newGroups
      .filter((g) => !childGroupIds.has(selectedGroups.find((og) => groupIdMap.get(og.id) === g.id)?.id || ''))
      .map((g) => g.id);

    set((state) => ({
      parts: [...state.parts, ...newParts],
      groups: [...state.groups, ...newGroups],
      groupMembers: [...state.groupMembers, ...newGroupMembers],
      // Select top-level groups if any, otherwise select parts
      selectedPartIds: topLevelGroupIds.length > 0 ? [] : newPartIds,
      selectedGroupIds: topLevelGroupIds,
      expandedGroupIds: [...state.expandedGroupIds, ...newGroupIds],
      isDirty: true
    }));

    get().markCutListStale();
    return newPartIds;
  },

  resetSelectedPartsToStock: () => {
    const { stocks, selectedPartIds } = get();
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

  // Selection actions
  selectPart: (id) => {
    set({ selectedPartIds: id ? [id] : [], selectedGroupIds: [] });
  },

  togglePartSelection: (id) => {
    set((state) => {
      if (state.selectedPartIds.includes(id)) {
        return { selectedPartIds: state.selectedPartIds.filter((pid) => pid !== id) };
      } else {
        return { selectedPartIds: [...state.selectedPartIds, id] };
      }
    });
  },

  selectParts: (ids) => {
    set({ selectedPartIds: ids, selectedGroupIds: [] });
  },

  clearSelection: () => {
    set({ selectedPartIds: [], selectedGroupIds: [], editingGroupId: null });
  },

  setHoveredPart: (id) => set({ hoveredPartId: id }),
  setTransformMode: (mode) => set({ transformMode: mode }),
  setActiveDragDelta: (delta) => set({ activeDragDelta: delta }),
  openContextMenu: (menu) => set({ contextMenu: menu }),
  closeContextMenu: () => set({ contextMenu: null }),
  requestCenterCamera: () => set({ centerCameraRequested: true }),
  requestCenterCameraAtOrigin: () => set({ centerCameraAtOriginRequested: true }),
  requestCenterCameraAtPosition: (position) => set({ centerCameraAtPosition: position }),
  clearCenterCameraRequest: () => set({ centerCameraRequested: false, centerCameraAtOriginRequested: false, centerCameraAtPosition: null }),
  setSelectionBox: (box) => set({ selectionBox: box }),
  showToast: (message) => {
    // Clear any existing toast timer to prevent timer accumulation
    if (toastTimeoutId !== null) {
      clearTimeout(toastTimeoutId);
      toastTimeoutId = null;
    }
    const id = uuidv4();
    set({ toast: { message, id } });
    // Auto-clear after 2 seconds
    toastTimeoutId = setTimeout(() => {
      const current = get().toast;
      if (current?.id === id) {
        set({ toast: null });
      }
      toastTimeoutId = null;
    }, 2000);
  },
  clearToast: () => set({ toast: null }),
  setCameraViewVectors: (vectors) => set({ cameraViewVectors: vectors }),
  toggleGrainDirection: () => set((state) => ({ showGrainDirection: !state.showGrainDirection })),

  // Clipboard actions
  copySelectedParts: () => {
    const { parts, groups, groupMembers, selectedPartIds, selectedGroupIds } = get();

    // Collect all parts to copy (directly selected + parts from selected groups)
    const partIdsToCopy = new Set(selectedPartIds);

    // Helper to collect all descendant groups recursively
    const collectDescendantGroupIds = (groupId: string, collected: Set<string>) => {
      collected.add(groupId);
      const childGroups = groupMembers.filter(
        (gm) => gm.groupId === groupId && gm.memberType === 'group'
      );
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
    const copiedGroupMembers = groupMembers.filter(
      (gm) => groupIdsToCopy.has(gm.groupId)
    );

    // Deep clone to prevent mutation of original objects
    set({
      clipboard: {
        parts: copiedParts.map(p => ({ ...p })),
        groups: copiedGroups.map(g => ({ ...g })),
        groupMembers: copiedGroupMembers.map(gm => ({ ...gm }))
      }
    });

    // Show toast notification
    const partCount = copiedParts.length;
    const groupCount = copiedGroups.length;
    if (groupCount > 0) {
      get().showToast(`Copied ${partCount} part${partCount === 1 ? '' : 's'} in ${groupCount} group${groupCount === 1 ? '' : 's'}`);
    } else {
      get().showToast(`Copied ${partCount} part${partCount === 1 ? '' : 's'}`);
    }
  },

  pasteClipboard: () => {
    const { clipboard } = get();
    if (clipboard.parts.length === 0) return [];

    // Create ID mapping for parts and groups
    const partIdMap = new Map<string, string>(); // oldId -> newId
    const groupIdMap = new Map<string, string>(); // oldId -> newId

    // Create new parts with new IDs and offset positions
    const newParts = clipboard.parts.map((part) => {
      const newId = uuidv4();
      partIdMap.set(part.id, newId);
      return {
        ...part,
        id: newId,
        name: generateCopyName(part.name),
        position: {
          x: part.position.x + 2,
          y: part.position.y,
          z: part.position.z + 2
        }
      };
    });

    // Create new groups with new IDs
    const newGroups = clipboard.groups.map((group) => {
      const newId = uuidv4();
      groupIdMap.set(group.id, newId);
      return {
        ...group,
        id: newId,
        name: generateCopyName(group.name)
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
    const childGroupIds = new Set(
      clipboard.groupMembers.filter((gm) => gm.memberType === 'group').map((gm) => gm.memberId)
    );
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
      // Select top-level groups if any, otherwise select parts
      selectedPartIds: topLevelGroupIds.length > 0 ? [] : newPartIds,
      selectedGroupIds: topLevelGroupIds,
      expandedGroupIds: [...state.expandedGroupIds, ...newGroupIds],
      clipboard: updatedClipboard,
      isDirty: true
    }));

    get().markCutListStale();
    return newPartIds;
  },

  pasteAtPosition: (position) => {
    const { clipboard } = get();
    if (clipboard.parts.length === 0) return [];

    // Calculate the center of the clipboard parts
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
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
    const newParts = clipboard.parts.map((part) => {
      const newId = uuidv4();
      partIdMap.set(part.id, newId);
      return {
        ...part,
        id: newId,
        name: generateCopyName(part.name),
        position: {
          x: position.x + (part.position.x - centerX),
          y: part.position.y,
          z: position.z + (part.position.z - centerZ)
        }
      };
    });

    // Create new groups with new IDs
    const newGroups = clipboard.groups.map((group) => {
      const newId = uuidv4();
      groupIdMap.set(group.id, newId);
      return {
        ...group,
        id: newId,
        name: generateCopyName(group.name)
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
    const childGroupIds = new Set(
      clipboard.groupMembers.filter((gm) => gm.memberType === 'group').map((gm) => gm.memberId)
    );
    const topLevelGroupIds = newGroups
      .filter((g) => !childGroupIds.has(clipboard.groups.find((og) => groupIdMap.get(og.id) === g.id)?.id || ''))
      .map((g) => g.id);

    set((state) => ({
      parts: [...state.parts, ...newParts],
      groups: [...state.groups, ...newGroups],
      groupMembers: [...state.groupMembers, ...newGroupMembers],
      selectedPartIds: topLevelGroupIds.length > 0 ? [] : newPartIds,
      selectedGroupIds: topLevelGroupIds,
      expandedGroupIds: [...state.expandedGroupIds, ...newGroupIds],
      isDirty: true
    }));

    get().markCutListStale();
    return newPartIds;
  },

  // Stock actions
  addStock: (stockOverrides) => {
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
    const { stocks, selectedPartIds } = get();
    if (selectedPartIds.length === 0) return;

    if (stockId === null) {
      // Unassign stock from all selected parts
      set((state) => ({
        parts: state.parts.map((p) =>
          selectedPartIds.includes(p.id) ? { ...p, stockId: null } : p
        ),
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
    const { parts, stocks, groups, groupMembers, selectedPartIds, selectedGroupIds } = get();

    // Collect all parts to include (directly selected + parts from selected groups)
    const partIdsToInclude = new Set(selectedPartIds);

    // Helper to collect all descendant groups recursively
    const collectDescendantGroupIds = (groupId: string, collected: Set<string>) => {
      collected.add(groupId);
      const childGroups = groupMembers.filter(
        (gm) => gm.groupId === groupId && gm.memberType === 'group'
      );
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
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

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
        memberIndex: gm.memberType === 'part'
          ? partIdToIndex.get(gm.memberId)!
          : groupIdToIndex.get(gm.memberId)!
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
      return existingStocks.find((s) =>
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
      memberId: cgm.memberType === 'part'
        ? partIdMap.get(cgm.memberIndex)!
        : groupIdMap.get(cgm.memberIndex)!
    }));

    const newPartIds = newParts.map((p) => p.id);
    const newGroupIds = newGroups.map((g) => g.id);

    // Find top-level groups (groups that aren't members of other groups in this assembly)
    const childGroupIndices = new Set(
      assembly.groupMembers.filter((gm) => gm.memberType === 'group').map((gm) => gm.memberIndex)
    );
    const topLevelGroupIds = newGroups
      .filter((_, index) => !childGroupIndices.has(index))
      .map((g) => g.id);

    set((state) => ({
      // Add any new stocks first
      stocks: [...state.stocks, ...stocksToAdd],
      parts: [...state.parts, ...newParts],
      groups: [...state.groups, ...newGroups],
      groupMembers: [...state.groupMembers, ...newGroupMembers],
      // Select the new items
      selectedPartIds: topLevelGroupIds.length > 0 ? [] : newPartIds,
      selectedGroupIds: topLevelGroupIds,
      expandedGroupIds: [...state.expandedGroupIds, ...newGroupIds],
      isDirty: true
    }));

    get().markCutListStale();
    return newPartIds;
  },

  openSaveAssemblyModal: () => {
    set({ saveAssemblyModalOpen: true });
  },

  closeSaveAssemblyModal: () => {
    set({ saveAssemblyModalOpen: false });
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
      stockConstraints: defaults?.stockConstraints || { constrainDimensions: true, constrainGrain: true, constrainColor: true, preventOverlap: true },
      version: '1.0',
      createdAt: now,
      modifiedAt: now,
      selectedPartIds: [],
      clipboard: { parts: [], groups: [], groupMembers: [] },
      referencePartIds: [],
      snapGuides: [],
      customShoppingItems: [],
      cutList: null,
      selectedGroupIds: [],
      expandedGroupIds: [],
      editingGroupId: null
    });
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
      stockConstraints: project.stockConstraints || { constrainDimensions: true, constrainGrain: true, constrainColor: true, preventOverlap: true },
      // Load project metadata or use defaults for older files
      version: project.version || '1.0',
      createdAt: project.createdAt || new Date().toISOString(),
      modifiedAt: project.modifiedAt || new Date().toISOString(),
      selectedPartIds: [],
      clipboard: { parts: [], groups: [], groupMembers: [] },
      referencePartIds: [],
      snapGuides: project.snapGuides || [],
      customShoppingItems: project.customShoppingItems || [],
      cutList: project.cutList || null,
      selectedGroupIds: [],
      expandedGroupIds: [],
      editingGroupId: null
    });
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

  // View state actions (transient)
  setDisplayMode: (displayMode) => set({ displayMode }),
  setShowGrid: (showGrid) => set({ showGrid }),
  // Snap-to-parts actions
  setSnapToPartsEnabled: (snapToPartsEnabled) => set({ snapToPartsEnabled }),
  setActiveSnapLines: (activeSnapLines) => set({ activeSnapLines }),
  // Reference parts actions
  setReferencePartIds: (referencePartIds) => set({ referencePartIds }),
  addToReferences: (ids) => set((state) => ({
    referencePartIds: [...new Set([...state.referencePartIds, ...ids])]
  })),
  removeFromReferences: (ids) => set((state) => ({
    referencePartIds: state.referencePartIds.filter((id) => !ids.includes(id))
  })),
  toggleReference: (ids) => set((state) => {
    // Check if all ids are already references
    const allAreReferences = ids.every((id) => state.referencePartIds.includes(id));
    if (allAreReferences) {
      // Remove all from references
      return { referencePartIds: state.referencePartIds.filter((id) => !ids.includes(id)) };
    } else {
      // Add all to references
      return { referencePartIds: [...new Set([...state.referencePartIds, ...ids])] };
    }
  }),
  clearReferences: () => set({ referencePartIds: [] }),
  // Snap guide actions
  addSnapGuide: (axis, position, label) => {
    const id = uuidv4();
    set((state) => ({
      snapGuides: [...state.snapGuides, { id, axis, position, label }]
    }));
    return id;
  },
  removeSnapGuide: (id) => set((state) => ({
    snapGuides: state.snapGuides.filter((g) => g.id !== id)
  })),
  clearSnapGuides: () => set({ snapGuides: [] }),

  // Group actions
  createGroup: (name, members) => {
    const groupId = uuidv4();
    const { groupMembers } = get();

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

    set((state) => ({
      groups: [...state.groups, { id: groupId, name }],
      groupMembers: [...filteredGroupMembers, ...newGroupMembers],
      selectedPartIds: [], // Clear part selection
      selectedGroupIds: [groupId], // Select the new group
      expandedGroupIds: [...state.expandedGroupIds, groupId], // Expand the new group
      isDirty: true
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
        let newGroupMembers = state.groupMembers.filter((gm) => !descendantGroupIds.includes(gm.groupId));

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
          selectedGroupIds: state.selectedGroupIds.filter((id) => !descendantGroupIds.includes(id)),
          expandedGroupIds: state.expandedGroupIds.filter((id) => !descendantGroupIds.includes(id)),
          editingGroupId: descendantGroupIds.includes(state.editingGroupId || '') ? null : state.editingGroupId,
          isDirty: true
        };
      });
    } else {
      // 'recursive' - delete group AND all member parts
      set((state) => ({
        groups: state.groups.filter((g) => !descendantGroupIds.includes(g.id)),
        groupMembers: state.groupMembers.filter((gm) => !descendantGroupIds.includes(gm.groupId)),
        parts: state.parts.filter((p) => !descendantPartIds.includes(p.id)),
        selectedPartIds: state.selectedPartIds.filter((id) => !descendantPartIds.includes(id)),
        selectedGroupIds: state.selectedGroupIds.filter((id) => !descendantGroupIds.includes(id)),
        expandedGroupIds: state.expandedGroupIds.filter((id) => !descendantGroupIds.includes(id)),
        referencePartIds: state.referencePartIds.filter((id) => !descendantPartIds.includes(id)),
        editingGroupId: descendantGroupIds.includes(state.editingGroupId || '') ? null : state.editingGroupId,
        isDirty: true
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
    const { groupMembers, groups, selectedGroupIds, editingGroupId, expandedGroupIds } = get();

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
        selectedGroupIds: selectedGroupIds.filter((id) => !emptyGroupIds.includes(id)),
        editingGroupId: editingGroupId && emptyGroupIds.includes(editingGroupId) ? null : editingGroupId,
        expandedGroupIds: expandedGroupIds.filter((id) => !emptyGroupIds.includes(id)),
        isDirty: true
      });
    } else {
      set({
        groupMembers: newGroupMembers,
        isDirty: true
      });
    }
  },

  mergeGroups: (groupIds, mode) => {
    const { groups, groupMembers } = get();
    if (groupIds.length < 2) return '';

    const newGroupId = uuidv4();

    // Get group names for the merged group name
    const groupNames = groupIds
      .map((id) => groups.find((g) => g.id === id)?.name || 'Group')
      .slice(0, 2);
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
      selectedPartIds: [],
      selectedGroupIds: [newGroupId],
      expandedGroupIds: [...state.expandedGroupIds, newGroupId],
      isDirty: true
    }));

    return newGroupId;
  },

  // Group selection actions
  selectGroup: (groupId) => {
    const { editingGroupId, groupMembers } = get();

    // Check if the group being selected is a descendant of the current editing group
    // If so, keep editingGroupId unchanged so user can drill into nested groups
    let newEditingGroupId: string | null = null;

    if (editingGroupId !== null) {
      // Check if groupId is inside editingGroupId (descendant)
      if (isDescendantOf(groupId, editingGroupId, groupMembers) && groupId !== editingGroupId) {
        newEditingGroupId = editingGroupId; // Stay in the parent group
      }
    }

    set({
      selectedGroupIds: [groupId],
      selectedPartIds: [], // Clear part selection when selecting a group
      editingGroupId: newEditingGroupId
    });
  },

  toggleGroupSelection: (groupId) => {
    set((state) => {
      if (state.selectedGroupIds.includes(groupId)) {
        return { selectedGroupIds: state.selectedGroupIds.filter((id) => id !== groupId) };
      } else {
        return {
          selectedGroupIds: [...state.selectedGroupIds, groupId],
          selectedPartIds: [], // Clear part selection
          editingGroupId: null
        };
      }
    });
  },

  clearGroupSelection: () => {
    set({ selectedGroupIds: [] });
  },

  // Group editing mode (Figma-style)
  enterGroup: (groupId) => {
    set({
      editingGroupId: groupId,
      selectedGroupIds: [], // Clear group selection
      selectedPartIds: [] // Clear part selection - user can now select individual parts
    });
  },

  exitGroup: () => {
    set({
      editingGroupId: null,
      selectedPartIds: [] // Clear part selection when exiting
    });
  },

  // Group expand/collapse actions
  toggleGroupExpanded: (groupId) => {
    set((state) => {
      if (state.expandedGroupIds.includes(groupId)) {
        return { expandedGroupIds: state.expandedGroupIds.filter((id) => id !== groupId) };
      } else {
        return { expandedGroupIds: [...state.expandedGroupIds, groupId] };
      }
    });
  },

  expandGroup: (groupId) => {
    set((state) => {
      if (state.expandedGroupIds.includes(groupId)) return {};
      return { expandedGroupIds: [...state.expandedGroupIds, groupId] };
    });
  },

  collapseGroup: (groupId) => {
    set((state) => ({
      expandedGroupIds: state.expandedGroupIds.filter((id) => id !== groupId)
    }));
  },

  expandAllGroups: () => {
    const { groups } = get();
    set({ expandedGroupIds: groups.map((g) => g.id) });
  },

  collapseAllGroups: () => {
    set({ expandedGroupIds: [] });
  },

  // Cut list actions
  openCutListModal: () => {
    set({ cutListModalOpen: true });
  },

  closeCutListModal: () => {
    set({ cutListModalOpen: false });
  },

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

  // Assembly editing actions
  startEditingAssembly: (assemblyId, assemblyName, parts, groups = [], groupMembers = [], embeddedStocks = []) => {
    const state = get();

    // Save current project state as snapshot (including UI state)
    const snapshot = {
      projectName: state.projectName,
      parts: state.parts,
      stocks: state.stocks,
      groups: state.groups,
      groupMembers: state.groupMembers,
      assemblies: state.assemblies,
      filePath: state.filePath,
      isDirty: state.isDirty,
      units: state.units,
      gridSize: state.gridSize,
      kerfWidth: state.kerfWidth,
      overageFactor: state.overageFactor,
      projectNotes: state.projectNotes,
      stockConstraints: state.stockConstraints,
      createdAt: state.createdAt,
      modifiedAt: state.modifiedAt,
      snapGuides: state.snapGuides,
      cutList: state.cutList,
      // UI state to restore
      expandedGroupIds: state.expandedGroupIds,
      referencePartIds: state.referencePartIds
    };

    // Merge previous project stocks with embedded stocks from the assembly
    // Embedded stocks are added for parts that reference stocks not in the library
    const existingStockIds = new Set(state.stocks.map(s => s.id));
    const mergedStocks = [
      ...state.stocks,
      ...embeddedStocks.filter(s => !existingStockIds.has(s.id))
    ];

    // Load assembly parts into workspace
    set({
      previousProjectSnapshot: snapshot,
      isEditingAssembly: true,
      editingAssemblyId: assemblyId,
      editingAssemblyName: assemblyName,
      // Clear workspace and load assembly parts
      projectName: `Editing: ${assemblyName}`,
      parts,
      groups,
      groupMembers,
      stocks: mergedStocks, // Keep stocks from current project + embedded stocks from assembly
      assemblies: [],
      filePath: null,
      isDirty: false,
      // Clear selection and UI state
      selectedPartIds: [],
      selectedGroupIds: [],
      expandedGroupIds: groups.map(g => g.id),
      editingGroupId: null,
      cutList: null,
      referencePartIds: [],
      snapGuides: []
    });

    // Clear undo history
    setTimeout(() => useProjectStore.temporal.getState().clear(), 0);
  },

  saveEditingAssembly: () => {
    const state = get();
    if (!state.isEditingAssembly || !state.editingAssemblyId) return null;

    // Guard against empty parts array (division by zero)
    if (state.parts.length === 0) return null;

    // Find the center of all parts to normalize positions
    const allPositions = state.parts.map(p => p.position);
    const centerX = allPositions.reduce((sum, pos) => sum + pos.x, 0) / allPositions.length;
    const centerZ = allPositions.reduce((sum, pos) => sum + pos.z, 0) / allPositions.length;

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

    // Create assembly from current parts (normalized to center)
    const assemblyParts: AssemblyPart[] = state.parts.map(part => {
      // Look up and embed stock data if part has a stock assigned
      let embeddedStock: EmbeddedStock | undefined;
      if (part.stockId) {
        const stock = state.stocks.find((s) => s.id === part.stockId);
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
          x: part.position.x - centerX,
          y: part.position.y,
          z: part.position.z - centerZ
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

    // Map part IDs to indices for group members
    const partIdToIndex = new Map(state.parts.map((p, i) => [p.id, i]));
    const groupIdToIndex = new Map(state.groups.map((g, i) => [g.id, i]));

    const assemblyGroups: AssemblyGroup[] = state.groups.map(group => ({
      originalId: group.id,
      name: group.name
    }));

    const assemblyGroupMembers: AssemblyGroupMember[] = state.groupMembers.map(gm => ({
      groupIndex: groupIdToIndex.get(gm.groupId) ?? 0,
      memberType: gm.memberType,
      memberIndex: gm.memberType === 'part'
        ? (partIdToIndex.get(gm.memberId) ?? 0)
        : (groupIdToIndex.get(gm.memberId) ?? 0)
    }));

    const now = new Date().toISOString();
    const assembly: Assembly = {
      id: state.editingAssemblyId,
      name: state.editingAssemblyName,
      description: '',
      parts: assemblyParts,
      groups: assemblyGroups,
      groupMembers: assemblyGroupMembers,
      createdAt: now, // Will be overwritten by library update
      modifiedAt: now
    };

    // Note: The actual library update is handled by the caller (hook/component)
    // because the store doesn't have direct access to the library API

    return assembly;
  },

  cancelEditingAssembly: () => {
    const state = get();
    if (!state.isEditingAssembly) return;

    // Reset assembly editing state (but keep previousProjectSnapshot for restore)
    set({
      isEditingAssembly: false,
      editingAssemblyId: null,
      editingAssemblyName: ''
    });
  },

  restorePreviousProject: () => {
    const state = get();
    if (!state.previousProjectSnapshot) return;

    const snapshot = state.previousProjectSnapshot;

    set({
      projectName: snapshot.projectName,
      parts: snapshot.parts,
      stocks: snapshot.stocks,
      groups: snapshot.groups,
      groupMembers: snapshot.groupMembers,
      assemblies: snapshot.assemblies,
      filePath: snapshot.filePath,
      isDirty: snapshot.isDirty,
      units: snapshot.units,
      gridSize: snapshot.gridSize,
      kerfWidth: snapshot.kerfWidth,
      overageFactor: snapshot.overageFactor,
      projectNotes: snapshot.projectNotes,
      stockConstraints: snapshot.stockConstraints,
      createdAt: snapshot.createdAt,
      modifiedAt: snapshot.modifiedAt,
      snapGuides: snapshot.snapGuides,
      cutList: snapshot.cutList,
      // Clear assembly editing state
      isEditingAssembly: false,
      editingAssemblyId: null,
      editingAssemblyName: '',
      previousProjectSnapshot: null,
      // Restore UI state (but clear selection as it may be stale)
      selectedPartIds: [],
      selectedGroupIds: [],
      expandedGroupIds: snapshot.expandedGroupIds,
      referencePartIds: snapshot.referencePartIds,
      editingGroupId: null
    });

    // Clear undo history
    setTimeout(() => useProjectStore.temporal.getState().clear(), 0);
  },

  startFreshAfterAssemblyEdit: () => {
    const state = get();

    // Get defaults from previous snapshot if available
    const defaults = state.previousProjectSnapshot ? {
      units: state.previousProjectSnapshot.units,
      gridSize: state.previousProjectSnapshot.gridSize,
      stockConstraints: state.previousProjectSnapshot.stockConstraints
    } : undefined;

    // Clear assembly editing state
    set({
      isEditingAssembly: false,
      editingAssemblyId: null,
      editingAssemblyName: '',
      previousProjectSnapshot: null
    });

    // Start a new project
    get().newProject(defaults);
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
        modifiedAt: state.modifiedAt,
      }),
      limit: 100,
      equality: (pastState, currentState) =>
        JSON.stringify(pastState) === JSON.stringify(currentState),
    }
  )
);
