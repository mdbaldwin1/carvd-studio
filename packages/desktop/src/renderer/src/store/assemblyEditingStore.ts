import { create } from 'zustand';
import {
  Part,
  Stock,
  Group,
  GroupMember,
  Assembly,
  AssemblyPart,
  AssemblyGroup,
  AssemblyGroupMember,
  SnapGuide,
  StockConstraintSettings,
  CutList,
  EmbeddedStock,
  CameraState
} from '../types';
import { useProjectStore } from './projectStore';
import { useSelectionStore } from './selectionStore';
import { useSnapStore } from './snapStore';
import { useCameraStore } from './cameraStore';

export interface ProjectSnapshot {
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
  cameraState: CameraState | null;
}

interface AssemblyEditingStoreState {
  // Assembly editing mode state
  isEditingAssembly: boolean;
  editingAssemblyId: string | null;
  editingAssemblyName: string;
  previousProjectSnapshot: ProjectSnapshot | null;

  // Actions
  startEditingAssembly: (
    assemblyId: string,
    assemblyName: string,
    parts: Part[],
    groups?: Group[],
    groupMembers?: GroupMember[],
    embeddedStocks?: Stock[]
  ) => void;
  saveEditingAssembly: () => Assembly | null;
  cancelEditingAssembly: () => void;
  restorePreviousProject: () => void;
  startFreshAfterAssemblyEdit: () => void;
}

export const useAssemblyEditingStore = create<AssemblyEditingStoreState>((set, get) => ({
  isEditingAssembly: false,
  editingAssemblyId: null,
  editingAssemblyName: '',
  previousProjectSnapshot: null,

  startEditingAssembly: (assemblyId, assemblyName, parts, groups = [], groupMembers = [], embeddedStocks = []) => {
    const projectState = useProjectStore.getState();

    // Save current project state as snapshot (including UI state)
    const snapshot: ProjectSnapshot = {
      projectName: projectState.projectName,
      parts: projectState.parts,
      stocks: projectState.stocks,
      groups: projectState.groups,
      groupMembers: projectState.groupMembers,
      assemblies: projectState.assemblies,
      filePath: projectState.filePath,
      isDirty: projectState.isDirty,
      units: projectState.units,
      gridSize: projectState.gridSize,
      kerfWidth: projectState.kerfWidth,
      overageFactor: projectState.overageFactor,
      projectNotes: projectState.projectNotes,
      stockConstraints: projectState.stockConstraints,
      createdAt: projectState.createdAt,
      modifiedAt: projectState.modifiedAt,
      snapGuides: projectState.snapGuides,
      cutList: projectState.cutList,
      // UI state to restore
      expandedGroupIds: useSelectionStore.getState().expandedGroupIds,
      referencePartIds: useSnapStore.getState().referencePartIds,
      cameraState: useCameraStore.getState().cameraState
    };

    // Merge previous project stocks with embedded stocks from the assembly
    // Embedded stocks are added for parts that reference stocks not in the library
    const existingStockIds = new Set(projectState.stocks.map((s) => s.id));
    const mergedStocks = [...projectState.stocks, ...embeddedStocks.filter((s) => !existingStockIds.has(s.id))];

    // Set assembly editing state
    set({
      previousProjectSnapshot: snapshot,
      isEditingAssembly: true,
      editingAssemblyId: assemblyId,
      editingAssemblyName: assemblyName
    });

    // Load assembly parts into workspace
    useProjectStore.setState({
      projectName: `Editing: ${assemblyName}`,
      parts,
      groups,
      groupMembers,
      stocks: mergedStocks,
      assemblies: [],
      filePath: null,
      isDirty: false,
      cutList: null,
      snapGuides: []
    });
    useSelectionStore.setState({
      selectedPartIds: [],
      selectedGroupIds: [],
      expandedGroupIds: groups.map((g) => g.id),
      editingGroupId: null
    });
    useSnapStore.setState({ referencePartIds: [] });
    // Reset camera to default so it orbits correctly around the assembly
    useCameraStore.getState().setCameraState(null);
    useCameraStore.getState().clearPendingCameraRestore();

    // Clear undo history
    setTimeout(() => useProjectStore.temporal.getState().clear(), 0);
  },

  saveEditingAssembly: () => {
    const { isEditingAssembly, editingAssemblyId, editingAssemblyName } = get();
    if (!isEditingAssembly || !editingAssemblyId) return null;

    const projectState = useProjectStore.getState();

    // Guard against empty parts array (division by zero)
    if (projectState.parts.length === 0) return null;

    // Find the center of all parts to normalize positions
    const allPositions = projectState.parts.map((p) => p.position);
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
    const assemblyParts: AssemblyPart[] = projectState.parts.map((part) => {
      // Look up and embed stock data if part has a stock assigned
      let embeddedStock: EmbeddedStock | undefined;
      if (part.stockId) {
        const stock = projectState.stocks.find((s) => s.id === part.stockId);
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
    const partIdToIndex = new Map(projectState.parts.map((p, i) => [p.id, i]));
    const groupIdToIndex = new Map(projectState.groups.map((g, i) => [g.id, i]));

    const assemblyGroups: AssemblyGroup[] = projectState.groups.map((group) => ({
      originalId: group.id,
      name: group.name
    }));

    const assemblyGroupMembers: AssemblyGroupMember[] = projectState.groupMembers.map((gm) => ({
      groupIndex: groupIdToIndex.get(gm.groupId) ?? 0,
      memberType: gm.memberType,
      memberIndex:
        gm.memberType === 'part' ? (partIdToIndex.get(gm.memberId) ?? 0) : (groupIdToIndex.get(gm.memberId) ?? 0)
    }));

    const now = new Date().toISOString();
    const assembly: Assembly = {
      id: editingAssemblyId,
      name: editingAssemblyName,
      description: '',
      parts: assemblyParts,
      groups: assemblyGroups,
      groupMembers: assemblyGroupMembers,
      createdAt: now,
      modifiedAt: now
    };

    // Note: The actual library update is handled by the caller (hook/component)
    // because the store doesn't have direct access to the library API

    return assembly;
  },

  cancelEditingAssembly: () => {
    const { isEditingAssembly } = get();
    if (!isEditingAssembly) return;

    // Reset assembly editing state (but keep previousProjectSnapshot for restore)
    set({
      isEditingAssembly: false,
      editingAssemblyId: null,
      editingAssemblyName: ''
    });
  },

  restorePreviousProject: () => {
    const { previousProjectSnapshot: snapshot } = get();
    if (!snapshot) return;

    // Restore project data
    useProjectStore.setState({
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
      cutList: snapshot.cutList
    });

    // Clear assembly editing state
    set({
      isEditingAssembly: false,
      editingAssemblyId: null,
      editingAssemblyName: '',
      previousProjectSnapshot: null
    });

    // Restore other stores
    useSelectionStore.setState({
      selectedPartIds: [],
      selectedGroupIds: [],
      expandedGroupIds: snapshot.expandedGroupIds,
      editingGroupId: null
    });
    useSnapStore.setState({ referencePartIds: snapshot.referencePartIds });
    // Restore camera position via cameraStore
    const snapshotCameraState = snapshot.cameraState || null;
    useCameraStore.getState().setCameraState(snapshotCameraState);
    if (snapshotCameraState) {
      useCameraStore.setState({ pendingCameraRestore: true });
    }

    // Clear undo history
    setTimeout(() => useProjectStore.temporal.getState().clear(), 0);
  },

  startFreshAfterAssemblyEdit: () => {
    const { previousProjectSnapshot } = get();

    // Get defaults from previous snapshot if available
    const defaults = previousProjectSnapshot
      ? {
          units: previousProjectSnapshot.units,
          gridSize: previousProjectSnapshot.gridSize,
          stockConstraints: previousProjectSnapshot.stockConstraints
        }
      : undefined;

    // Clear assembly editing state
    set({
      isEditingAssembly: false,
      editingAssemblyId: null,
      editingAssemblyName: '',
      previousProjectSnapshot: null
    });

    // Start a new project
    useProjectStore.getState().newProject(defaults);
  }
}));
