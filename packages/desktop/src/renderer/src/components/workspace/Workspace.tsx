import { Grid, OrbitControls } from '@react-three/drei';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GRID_SIZE } from '../../constants';
import { useProjectStore } from '../../store/projectStore';
import { useSnapStore } from '../../store/snapStore';
import { useInteractionStore } from '../../store/interactionStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useUIStore } from '../../store/uiStore';
import { useCameraStore } from '../../store/cameraStore';
import { useAppSettingsStore } from '../../store/appSettingsStore';
import { CameraState } from '../../types';
import { getPartLocalCorners } from '../../utils/partFeatureGeometry';
import { getPartGroupContext } from './partClickHandler';
import { AxisIndicator } from './AxisIndicator';
import { CameraController } from './CameraController';
import { CanvasCaptureHandler } from './CanvasCaptureHandler';
import { GpuTelemetry } from './GpuTelemetry';
import { MultiSelectionDimensions } from './MultiSelectionDimensions';
import { PartsRenderer } from './PartsRenderer';
import { PerfMonitor } from './PerfMonitor';
import { ReferenceDistanceIndicators } from './ReferenceDistanceIndicators';
import { GroupRotationHandles } from './GroupRotationHandles';
import { SceneBackground } from './SceneBackground';
import { SnapAlignmentLines } from './SnapAlignmentLines';
import { SnapGuides } from './SnapGuides';
import { ThumbnailCaptureHandler } from './ThumbnailCaptureHandler';
import { installDragDebugTools } from '../../utils/dragDebug';
import { hasInteractiveHitAt as resolveHasInteractiveHitAt } from '../../interaction/hitTest';
import { useCanvasPointerSession } from '../../interaction/useCanvasPointerSession';
import { computeOverlayModel } from '../../interaction/overlayModel';
import {
  LIGHTING_PRESETS,
  bindWindowPointerSession,
  isOrbitControls,
  pauseOrbitControls,
  resumeOrbitControls
} from './workspaceUtils';

declare global {
  interface Window {
    __selectionDebugLogs?: Array<{ ts: string; args: unknown[] }>;
    __carvdE2E?: {
      getPartScreenPoint: (partId?: string) => { x: number; y: number } | null;
      getResizeHandleScreenPoint: (
        handle: { x: -1 | 0 | 1; y: -1 | 0 | 1; z: -1 | 0 | 1 },
        partId?: string
      ) => { x: number; y: number } | null;
      getRotationHandleScreenPoint: (
        handle: { axis: 'x' | 'y' | 'z'; side: -1 | 1; target?: 'ring' | 'grab' },
        partId?: string
      ) => { x: number; y: number } | null;
      setCameraView: (view: 'isometric' | 'top' | 'front' | 'right') => void;
    };
  }
}

// Reads the effective theme from the DOM and returns 'light' or 'dark'
function useEffectiveTheme(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    // eslint-disable-next-line no-undef
    const observer = new MutationObserver(() => {
      const t = document.documentElement.getAttribute('data-theme');
      setTheme(t === 'light' ? 'light' : 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

export function Workspace() {
  useEffect(() => {
    installDragDebugTools();
  }, []);

  const debugSelection = (...args: unknown[]) => {
    if (import.meta.env.DEV) {
      const entry = { ts: new Date().toISOString(), args };
      const current = window.__selectionDebugLogs || [];
      current.push(entry);
      if (current.length > 400) {
        current.splice(0, current.length - 400);
      }
      window.__selectionDebugLogs = current;
      console.info('[SelectionDebug]', ...args);
    }
  };

  const parts = useProjectStore((s) => s.parts);
  const units = useProjectStore((s) => s.units);
  const groupMembers = useProjectStore((s) => s.groupMembers);
  // ADR-005: overlay model derivation reads snap state here once instead of
  // each overlay component re-subscribing independently.
  const snapActiveLines = useSnapStore((s) => s.activeSnapLines);
  const snapPulseAt = useSnapStore((s) => s.snapPulseAt);
  const snapLabelPosition = useSnapStore((s) => s.snapLabelPosition);
  const activeReferenceRulers = useSnapStore((s) => s.activeReferenceRulers);
  const activeReferenceDistances = useSnapStore((s) => s.activeReferenceDistances);
  const displayMode = useCameraStore((s) => s.displayMode);
  const selectedPartIdsForOverlay = useSelectionStore((s) => s.selectedPartIds);
  const selectedGroupIdsForOverlay = useSelectionStore((s) => s.selectedGroupIds);
  const activeSessionForOverlay = useInteractionStore((s) => s.activeSession);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const selectPart = useSelectionStore((s) => s.selectPart);
  const selectGroup = useSelectionStore((s) => s.selectGroup);
  const togglePartSelection = useSelectionStore((s) => s.togglePartSelection);
  const toggleGroupSelection = useSelectionStore((s) => s.toggleGroupSelection);
  const enterGroup = useSelectionStore((s) => s.enterGroup);
  const selectParts = useSelectionStore((s) => s.selectParts);
  const setDragIntent = useSelectionStore((s) => s.setDragIntent);
  const openContextMenu = useUIStore((s) => s.openContextMenu);
  const setSelectedSidebarStockId = useUIStore((s) => s.setSelectedSidebarStockId);
  const setSelectionBox = useSelectionStore((s) => s.setSelectionBox);
  const showGrid = useCameraStore((s) => s.showGrid);
  const cameraState = useCameraStore((s) => s.cameraState);
  const setCameraState = useCameraStore((s) => s.setCameraState);
  const pendingCameraRestore = useCameraStore((s) => s.pendingCameraRestore);
  const clearPendingCameraRestore = useCameraStore((s) => s.clearPendingCameraRestore);
  const editingGroupId = useSelectionStore((s) => s.editingGroupId);
  const exitGroup = useSelectionStore((s) => s.exitGroup);
  const lightingMode = useAppSettingsStore((s) => s.settings.lightingMode) || 'default';
  const brightnessMultiplier = useAppSettingsStore((s) => s.settings.brightnessMultiplier) ?? 1.0;
  const lightingPreset = LIGHTING_PRESETS[lightingMode];
  const effectiveTheme = useEffectiveTheme();

  // ADR-005: single derivation point for every overlay's display data.
  // Memoize so child overlay components only re-render when their slice
  // identity changes.
  const overlayModel = useMemo(
    () =>
      computeOverlayModel({
        activeSession: activeSessionForOverlay,
        snap: {
          activeSnapLines: snapActiveLines,
          snapPulseAt,
          snapLabelPosition
        },
        selection: {
          selectedPartIds: selectedPartIdsForOverlay,
          selectedGroupIds: selectedGroupIdsForOverlay
        },
        project: {
          parts,
          groupMembers,
          units
        },
        references: {
          activeReferenceRulers,
          activeReferenceDistances
        },
        displayMode
      }),
    [
      activeSessionForOverlay,
      snapActiveLines,
      snapPulseAt,
      snapLabelPosition,
      selectedPartIdsForOverlay,
      selectedGroupIdsForOverlay,
      parts,
      groupMembers,
      units,
      activeReferenceRulers,
      activeReferenceDistances,
      displayMode
    ]
  );

  const { camera, gl, controls, scene } = useThree();

  useEffect(() => {
    const isTestMode =
      typeof window !== 'undefined' &&
      Boolean((window as unknown as { useProjectStore?: unknown }).useProjectStore) &&
      Boolean((window as unknown as { useSelectionStore?: unknown }).useSelectionStore);
    if (!isTestMode) return;

    const projected = new THREE.Vector3();
    const euler = new THREE.Euler();
    const quaternion = new THREE.Quaternion();
    const local = new THREE.Vector3();
    const world = new THREE.Vector3();
    const faceQuaternion = new THREE.Quaternion();
    const faceNormal = new THREE.Vector3();
    const grabLocal = new THREE.Vector3();
    const ringEuler = new THREE.Euler();
    const ringQuaternion = new THREE.Quaternion();
    const cameraTarget = new THREE.Vector3();
    const cameraOffsetByView = {
      isometric: new THREE.Vector3(36, 30, 36),
      top: new THREE.Vector3(0, 54, 0.01),
      front: new THREE.Vector3(0, 18, 54),
      right: new THREE.Vector3(54, 18, 0)
    } satisfies Record<'isometric' | 'top' | 'front' | 'right', THREE.Vector3>;
    const projectWorld = (point: THREE.Vector3) => {
      const rect = gl.domElement.getBoundingClientRect();
      projected.copy(point).project(camera);
      return {
        x: rect.left + ((projected.x + 1) / 2) * rect.width,
        y: rect.top + ((1 - projected.y) / 2) * rect.height
      };
    };
    const resolvePart = (partId?: string) => {
      const selection = useSelectionStore.getState();
      const id = partId ?? selection.selectedPartIds[0];
      return useProjectStore.getState().parts.find((candidate) => candidate.id === id) ?? null;
    };
    const partQuaternion = (rotation: { x: number; y: number; z: number }) => {
      euler.set((rotation.x * Math.PI) / 180, (rotation.y * Math.PI) / 180, (rotation.z * Math.PI) / 180, 'XYZ');
      return quaternion.setFromEuler(euler);
    };

    window.__carvdE2E = {
      getPartScreenPoint: (partId?: string) => {
        const part = resolvePart(partId);
        if (!part) return null;
        return projectWorld(world.set(part.position.x, part.position.y, part.position.z));
      },
      getResizeHandleScreenPoint: (handle, partId?: string) => {
        const part = resolvePart(partId);
        if (!part) return null;
        local.set(
          handle.x === 0 ? 0 : handle.x * (part.length / 2),
          handle.y === 0 ? 0 : handle.y * (part.thickness / 2),
          handle.z === 0 ? 0 : handle.z * (part.width / 2)
        );
        local.applyQuaternion(partQuaternion(part.rotation));
        world.set(part.position.x, part.position.y, part.position.z).add(local);
        return projectWorld(world);
      },
      getRotationHandleScreenPoint: (handle, partId?: string) => {
        const part = resolvePart(partId);
        if (!part) return null;
        const offset = 0.2;
        if (handle.axis === 'y') {
          local.set(0, handle.side * (part.thickness / 2 + offset), 0);
          faceNormal.set(0, handle.side, 0);
          ringEuler.set(handle.side === 1 ? Math.PI / 2 : -Math.PI / 2, 0, 0);
        } else if (handle.axis === 'x') {
          local.set(handle.side * (part.length / 2 + offset), 0, 0);
          faceNormal.set(handle.side, 0, 0);
          ringEuler.set(0, handle.side === 1 ? -Math.PI / 2 : Math.PI / 2, 0);
        } else {
          local.set(0, 0, handle.side * (part.width / 2 + offset));
          faceNormal.set(0, 0, handle.side);
          ringEuler.set(0, handle.side === 1 ? 0 : Math.PI, 0);
        }

        if (handle.target === 'grab') {
          faceQuaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), faceNormal);
          grabLocal.set(0, 0, 1.55);
          local.add(grabLocal.applyQuaternion(faceQuaternion));
        } else {
          ringQuaternion.setFromEuler(ringEuler);
          grabLocal.set(0.55, 0, 0.02);
          local.add(grabLocal.applyQuaternion(ringQuaternion));
        }

        local.applyQuaternion(partQuaternion(part.rotation));
        world.set(part.position.x, part.position.y, part.position.z).add(local);
        return projectWorld(world);
      },
      setCameraView: (view) => {
        const part = resolvePart();
        if (part) {
          cameraTarget.set(part.position.x, part.position.y, part.position.z);
        } else {
          cameraTarget.set(0, 0, 0);
        }
        camera.position.copy(cameraTarget).add(cameraOffsetByView[view]);
        camera.lookAt(cameraTarget);
        if (isOrbitControls(controls)) {
          controls.target.copy(cameraTarget);
          controls.update();
        }
      }
    };

    return () => {
      delete window.__carvdE2E;
    };
  }, [camera, controls, gl.domElement]);

  // Drag-box selection state
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const boxStartRef = useRef<{ x: number; y: number } | null>(null);
  const boxEndRef = useRef<{ x: number; y: number } | null>(null);

  // Reusable objects for box selection (avoids 18 THREE allocs per part per frame)
  const _selEuler = useMemo(() => new THREE.Euler(), []);
  const _selQuat = useMemo(() => new THREE.Quaternion(), []);
  const _selCorners = useMemo(() => Array.from({ length: 8 }, () => new THREE.Vector3()), []);
  const _selPosition = useMemo(() => new THREE.Vector3(), []);

  // Camera state persistence
  const cameraSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Restore camera state when pendingCameraRestore flag is set
  // This happens when loading a project or restoring from edit mode
  useEffect(() => {
    if (pendingCameraRestore && cameraState && isOrbitControls(controls)) {
      // Restore camera position
      camera.position.set(cameraState.position.x, cameraState.position.y, cameraState.position.z);
      // Restore orbit target
      controls.target.set(cameraState.target.x, cameraState.target.y, cameraState.target.z);
      controls.update();
      // Clear the flag to prevent re-restoration
      clearPendingCameraRestore();
    }
  }, [pendingCameraRestore, cameraState, camera, controls, clearPendingCameraRestore]);

  // Reset camera to default when cameraState is null (new project or assembly edit mode)
  useEffect(() => {
    if (cameraState === null) {
      // Reset OrbitControls target to origin so camera orbits correctly
      if (isOrbitControls(controls)) {
        controls.target.set(0, 0, 0);
        controls.update();
      }
    }
  }, [cameraState, controls]);

  // Save camera state on camera changes (debounced)
  useEffect(() => {
    if (!isOrbitControls(controls)) return;

    const handleCameraChange = () => {
      // Clear any pending save
      if (cameraSaveTimeoutRef.current) {
        clearTimeout(cameraSaveTimeoutRef.current);
      }
      // Debounce the save to avoid excessive updates
      cameraSaveTimeoutRef.current = setTimeout(() => {
        const newCameraState: CameraState = {
          position: {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z
          },
          target: {
            x: controls.target.x,
            y: controls.target.y,
            z: controls.target.z
          }
        };
        setCameraState(newCameraState);
      }, 500); // 500ms debounce
    };

    controls.addEventListener('change', handleCameraChange);
    return () => {
      controls.removeEventListener('change', handleCameraChange);
      if (cameraSaveTimeoutRef.current) {
        clearTimeout(cameraSaveTimeoutRef.current);
      }
    };
  }, [controls, camera, setCameraState]);

  // ADR-003: pointer state lives inside the session controller in
  // `useCanvasPointerSession` below. The legacy cross-handler refs
  // (`leftClickDownPos`, `rightClickDownPos`, `previousSelectionKeyRef`) are
  // gone — the state machine is the single source of truth for click vs drag
  // classification and double-click timing.
  //
  // `pointerDownPos` is kept because R3F per-mesh ground/sky handlers below
  // still use it to distinguish a deliberate empty-click from an orbit drag.
  // `lastSelectionApplyAtRef` is kept for the same reason — it suppresses
  // empty-click deselect for 250ms after a selection was applied, protecting
  // the click-vs-bubble race between the per-mesh part handler and the per-mesh
  // ground handler. The session controller's `onClick` updates this ref via
  // `markSelectionApplied` so the guard still works.
  // These remaining R3F ground/sky paths still live at the canvas edge because
  // they depend on empty-space pointer geometry; the session controller owns
  // click classification and calls `markSelectionApplied` for the shared race
  // guard.
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  // Guard against double-processing the same background double-click via bubbling/overlap.
  const lastBackgroundDoubleClickAt = useRef(0);
  const lastSelectionApplyAtRef = useRef(0);
  const lastPartDrillAtRef = useRef(0);

  const markSelectionApplied = () => {
    lastSelectionApplyAtRef.current = performance.now();
  };

  // ADR-003: `getHitPartId` is no longer needed at the Workspace level — the
  // session controller's hit-test runs inside `useCanvasPointerSession` and
  // delivers typed `HitTarget` results to the click/contextmenu handlers.
  // `selectFromPartHit` / `drillFromPartHit` are still called from those
  // handlers, but they now receive `partId` from the session action directly.

  const selectFromPartHit = useCallback(
    (partId: string, additive: boolean) => {
      const before = useSelectionStore.getState();
      const { groupMembers } = useProjectStore.getState();
      const { editingGroupId } = useSelectionStore.getState();
      const ctx = getPartGroupContext(partId, groupMembers, editingGroupId);
      debugSelection('selectFromPartHit:start', {
        partId,
        additive,
        editingGroupId,
        ctx,
        before: {
          selectedPartIds: before.selectedPartIds,
          selectedGroupIds: before.selectedGroupIds
        }
      });

      if (ctx.isOutsideEditingContext) {
        useSelectionStore.setState({ editingGroupId: null });
        const topLevelGroupId = ctx.ancestorGroupIds[ctx.ancestorGroupIds.length - 1] ?? null;
        if (topLevelGroupId) {
          selectGroup(topLevelGroupId);
        } else {
          selectPart(partId);
        }
        setSelectedSidebarStockId(null);
        markSelectionApplied();
        const after = useSelectionStore.getState();
        debugSelection('selectFromPartHit:outsideContext-recover', {
          partId,
          after: {
            selectedPartIds: after.selectedPartIds,
            selectedGroupIds: after.selectedGroupIds,
            editingGroupId: after.editingGroupId
          }
        });
        return;
      }

      if (additive) {
        if (ctx.groupToSelectOnClick) {
          toggleGroupSelection(ctx.groupToSelectOnClick);
        } else {
          togglePartSelection(partId);
        }
      } else {
        if (ctx.groupToSelectOnClick) {
          selectGroup(ctx.groupToSelectOnClick);
        } else {
          selectPart(partId);
        }
      }
      setSelectedSidebarStockId(null);
      markSelectionApplied();
      const after = useSelectionStore.getState();
      debugSelection('selectFromPartHit:applied', {
        partId,
        after: {
          selectedPartIds: after.selectedPartIds,
          selectedGroupIds: after.selectedGroupIds,
          editingGroupId: after.editingGroupId
        }
      });
    },
    [selectGroup, selectPart, toggleGroupSelection, togglePartSelection, setSelectedSidebarStockId]
  );

  const drillFromPartHit = useCallback(
    (partId: string) => {
      lastPartDrillAtRef.current = performance.now();
      const { groupMembers } = useProjectStore.getState();
      const { editingGroupId } = useSelectionStore.getState();
      const ctx = getPartGroupContext(partId, groupMembers, editingGroupId);
      debugSelection('drillFromPartHit:start', { partId, editingGroupId, ctx });
      if (ctx.isOutsideEditingContext) return;

      if (ctx.groupToSelectOnClick) {
        enterGroup(ctx.groupToSelectOnClick);
        const topLevelGroupId = ctx.ancestorGroupIds[ctx.ancestorGroupIds.length - 1] ?? null;
        const immediateChildGroupId =
          ctx.ancestorGroupIds.length > 1 ? ctx.ancestorGroupIds[ctx.ancestorGroupIds.length - 2] : null;
        if (ctx.groupToSelectOnClick === topLevelGroupId && immediateChildGroupId) {
          selectGroup(immediateChildGroupId);
        } else {
          selectPart(partId);
        }
      } else {
        selectPart(partId);
      }

      setSelectedSidebarStockId(null);
      markSelectionApplied();
      const after = useSelectionStore.getState();
      debugSelection('drillFromPartHit:applied', {
        partId,
        after: {
          selectedPartIds: after.selectedPartIds,
          selectedGroupIds: after.selectedGroupIds,
          editingGroupId: after.editingGroupId
        }
      });
    },
    [enterGroup, selectGroup, selectPart, setSelectedSidebarStockId]
  );

  // ADR-003: pointer events are routed through the session controller. Hook
  // owns all native canvas + window listeners (pointerdown/up/move/cancel,
  // blur, escape, contextmenu) and emits typed semantic actions back to us.
  //
  // Per-mesh R3F handlers in Part.tsx / InstancedParts.tsx still apply
  // selection eagerly on pointerdown — the controller's `onClick` is the
  // fallback for clicks that R3F's per-mesh path didn't already handle (e.g.
  // when orbit/drag detection ate the R3F click). The controller is
  // authoritative for double-click, context menu, and empty-space clicks.
  useCanvasPointerSession({
    canvas: gl.domElement,
    camera,
    scene,
    parts,
    handlers: {
      onPointerDownHit: (hit, event) => {
        if (event.button === 0 && hit.kind === 'part-body') {
          pauseOrbitControls(controls);
        }
      },
      onClick: (action) => {
        resumeOrbitControls(controls);
        // Mirror the legacy native-mouseup fallback: skip additive (the per-mesh
        // R3F handler already toggled selection; re-toggling would net zero).
        const isAdditive = action.modifiers.shift || action.modifiers.meta || action.modifiers.ctrl;
        if (isAdditive) {
          debugSelection('session:click:additive-skipped');
          return;
        }
        if (action.hit?.kind === 'part-body') {
          debugSelection('session:click:part-fallback', { partId: action.hit.partId });
          selectFromPartHit(action.hit.partId, false);
        }
        // ground / sky / null are handled by the R3F per-mesh
        // handleBackgroundClick / handleSkyClick paths (which run via the R3F
        // event system) — we don't duplicate the deselect logic here.
      },
      onDoubleClick: (action) => {
        if (action.hit?.kind === 'part-body') {
          debugSelection('session:dblclick:part', { partId: action.hit.partId });
          drillFromPartHit(action.hit.partId);
        }
      },
      onContextMenu: (action) => {
        debugSelection('session:contextmenu', {
          x: action.clientX,
          y: action.clientY,
          hit: action.hit?.kind ?? null
        });
        if (action.hit?.kind === 'snap-guide') {
          openContextMenu({
            x: action.clientX,
            y: action.clientY,
            type: 'guide',
            guideId: action.hit.guideId
          });
          return;
        }
        if (action.hit?.kind === 'part-body') {
          // Ensure the part is selected (matching the legacy fallback) so the
          // part context menu acts on the right target.
          const selection = useSelectionStore.getState();
          const projectState = useProjectStore.getState();
          const hitContext = getPartGroupContext(
            action.hit.partId,
            projectState.groupMembers,
            selection.editingGroupId
          );
          const isAlreadySelected =
            selection.selectedPartIds.includes(action.hit.partId) ||
            hitContext.ancestorGroupIds.some((groupId) => selection.selectedGroupIds.includes(groupId));
          if (!isAlreadySelected) {
            selectFromPartHit(action.hit.partId, false);
          }
          openContextMenu({ x: action.clientX, y: action.clientY, type: 'part' });
          return;
        }
        if (action.hit?.kind === 'ground' || action.hit?.kind === 'sky') {
          openContextMenu({
            x: action.clientX,
            y: action.clientY,
            type: 'background',
            worldPosition: action.hit.worldPoint
          });
          return;
        }
        // Click landed on empty space or a non-context-menu target (e.g. a
        // handle). Open the background context menu so the gesture still does
        // something useful (Add Guide, etc.).
        openContextMenu({ x: action.clientX, y: action.clientY, type: 'background' });
      },
      onDragStart: (action) => {
        if (action.button !== 0 || action.hit?.kind !== 'part-body') return;
        const activeSession = useInteractionStore.getState().activeSession;
        const selectionState = useSelectionStore.getState();
        const isDirectPartDragAlreadyActive =
          activeSession?.kind === 'move' &&
          activeSession.primaryPartId === action.hit.partId &&
          selectionState.selectedPartIds.includes(action.hit.partId);
        if (isDirectPartDragAlreadyActive) {
          debugSelection('session:dragstart:part-fallback:skipped-active-direct-drag', {
            partId: action.hit.partId
          });
          return;
        }
        debugSelection('session:dragstart:part-fallback', { partId: action.hit.partId });
        selectFromPartHit(action.hit.partId, false);
        setSelectedSidebarStockId(null);
        setDragIntent({
          partId: action.hit.partId,
          screenX: action.downAt.clientX,
          screenY: action.downAt.clientY,
          worldPoint: action.hit.worldPoint,
          startImmediately: true
        });
        pauseOrbitControls(controls);
      },
      onDragCommit: () => {
        useSelectionStore.getState().clearDragIntent();
        resumeOrbitControls(controls);
      },
      onDragCancel: () => {
        useSelectionStore.getState().clearDragIntent();
        resumeOrbitControls(controls);
      }
    }
  });

  // The legacy contextmenu + mousedown/mouseup/dblclick/blur useEffect blocks
  // that lived here are deleted: the hook above owns all of those paths.
  // Cross-handler refs (leftClickDownPos, rightClickDownPos,
  // lastSelectionApplyAtRef, previousSelectionKeyRef, lastPartDrillAtRef) and
  // their bookkeeping useEffect are likewise gone — the state machine inside
  // the controller is now the single source of truth for click vs drag and
  // double-click timing.

  // ADR-002: delegates to the hit-test service. Used by background-click and
  // empty-space-click paths to decide whether to clear the selection.
  const hasInteractiveHitAt = useCallback(
    (clientX: number, clientY: number): boolean => {
      const rect = gl.domElement.getBoundingClientRect();
      return resolveHasInteractiveHitAt(
        { clientX, clientY },
        {
          camera,
          scene,
          canvasRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
          parts
        }
      );
    },
    [camera, gl, parts, scene]
  );

  // Click on empty space to deselect (only if not box selecting and not after drag)
  const handleBackgroundClick = (e: ThreeEvent<MouseEvent>) => {
    if (!e.object.userData.isGround || isBoxSelecting) return;

    // Only clear selection if we tracked a pointer-down on the ground
    // This prevents clearing selection when dragging a part and releasing over the ground
    if (!pointerDownPos.current) {
      debugSelection('background:click:ignored-no-pointerdown');
      return;
    }

    // Additive (shift / cmd) click on empty space should preserve the existing
    // selection. Without this, missing a part while shift+clicking would wipe
    // out everything the user just multi-selected.
    const isMac = window.navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
    const isModKey = isMac ? e.nativeEvent.metaKey : e.nativeEvent.ctrlKey;
    if (e.nativeEvent.shiftKey || isModKey) {
      pointerDownPos.current = null;
      debugSelection('background:click:additive-preserve-selection');
      return;
    }

    // Suppress deselect while a context menu is open. Trackpad right-click can
    // emit a paired left button event, and clearing selection here would unmount
    // the just-opened part menu (which depends on selectedPartIds).
    if (useUIStore.getState().contextMenu) {
      pointerDownPos.current = null;
      debugSelection('background:click:suppressed-context-menu-open');
      return;
    }

    if (performance.now() - lastSelectionApplyAtRef.current < 250) {
      pointerDownPos.current = null;
      debugSelection('background:click:suppressed-after-selection');
      return;
    }

    // Check if this was a drag (camera orbit) vs a click
    // Only clear selection on a deliberate click (minimal mouse movement)
    const dx = e.nativeEvent.clientX - pointerDownPos.current.x;
    const dy = e.nativeEvent.clientY - pointerDownPos.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If mouse moved more than 5 pixels, it was a drag - don't clear selection
    if (distance > 5) {
      debugSelection('background:click:ignored-drag', { distance });
      pointerDownPos.current = null;
      return;
    }

    // Defensive: if this click ray intersects any non-background object, don't clear.
    // This avoids accidental deselection when part-click events are handled on a
    // different path (e.g. native canvas listeners for instanced meshes).
    if (hasInteractiveHitAt(e.nativeEvent.clientX, e.nativeEvent.clientY)) {
      debugSelection('background:click:blocked-interactive-hit');
      pointerDownPos.current = null;
      return;
    }

    pointerDownPos.current = null;
    clearSelection();
    setSelectedSidebarStockId(null);
    debugSelection('background:click:cleared-selection');
  };

  // ADR-002 + ADR-003: right-click target resolution is handled by the
  // hit-test service via the session controller's onContextMenu. The
  // workspaceUtils right-click-target globals are gone; the per-mesh
  // ground/sky right-click handlers below are now no-ops kept only so the
  // pointerdown plumbing remains symmetrical until §4b consolidates these
  // paths into the controller too.

  // Click on sky to deselect (similar to ground click)
  const handleSkyClick = (e: ThreeEvent<MouseEvent>) => {
    if (!e.object.userData.isSky || isBoxSelecting) return;

    // Only clear selection if we tracked a pointer-down on the sky
    if (!pointerDownPos.current) {
      return;
    }

    // Preserve selection on additive (shift / cmd) click — same reason as ground.
    const isMac = window.navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
    const isModKey = isMac ? e.nativeEvent.metaKey : e.nativeEvent.ctrlKey;
    if (e.nativeEvent.shiftKey || isModKey) {
      pointerDownPos.current = null;
      debugSelection('sky:click:additive-preserve-selection');
      return;
    }

    // Suppress deselect while a context menu is open (see handleBackgroundClick).
    if (useUIStore.getState().contextMenu) {
      pointerDownPos.current = null;
      debugSelection('sky:click:suppressed-context-menu-open');
      return;
    }

    if (performance.now() - lastSelectionApplyAtRef.current < 250) {
      pointerDownPos.current = null;
      debugSelection('sky:click:suppressed-after-selection');
      return;
    }

    // Check if this was a drag (camera orbit) vs a click
    const dx = e.nativeEvent.clientX - pointerDownPos.current.x;
    const dy = e.nativeEvent.clientY - pointerDownPos.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If mouse moved more than 5 pixels, it was a drag - don't clear selection
    if (distance > 5) {
      pointerDownPos.current = null;
      return;
    }

    // Defensive: if click intersects a non-background object, don't clear.
    if (hasInteractiveHitAt(e.nativeEvent.clientX, e.nativeEvent.clientY)) {
      pointerDownPos.current = null;
      return;
    }

    pointerDownPos.current = null;
    clearSelection();
    setSelectedSidebarStockId(null);
  };

  // Track pointer down position to detect click vs drag
  const handleBackgroundPointerDownForClick = (e: ThreeEvent<PointerEvent>) => {
    if (e.object.userData.isGround || e.object.userData.isSky) {
      // Do not arm background click clearing if the pointer is actually over a part.
      if (hasInteractiveHitAt(e.nativeEvent.clientX, e.nativeEvent.clientY)) {
        pointerDownPos.current = null;
        return;
      }
      pointerDownPos.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
    }
  };

  // Double-click on background exits group editing mode (one level at a time)
  const handleBackgroundDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!e.object.userData.isGround && !e.object.userData.isSky) return;
    e.stopPropagation();

    // Ignore background double-click exits that occur in the same interaction
    // window as a successful part drill; prevents drill-then-immediate-exit races.
    if (performance.now() - lastPartDrillAtRef.current < 300) {
      debugSelection('background:dblclick:suppressed-after-drill');
      return;
    }

    const now = performance.now();
    if (now - lastBackgroundDoubleClickAt.current < 120) return;
    lastBackgroundDoubleClickAt.current = now;

    if (editingGroupId !== null) {
      exitGroup();
    }
  };

  // Start box selection on background pointer down (requires Ctrl/Cmd modifier)
  const handleBackgroundPointerDown = (e: ThreeEvent<PointerEvent>) => {
    // Always track pointer position for click detection
    handleBackgroundPointerDownForClick(e);

    // Right-click on ground: the session controller's onContextMenu resolves
    // this via the hit-test service and opens the background menu with the
    // world position. Nothing to do here at the per-mesh level.
    if (e.nativeEvent.button === 2) {
      e.stopPropagation();
      return;
    }

    if (!e.object.userData.isGround) return;

    // Only start box selection with left mouse button + Ctrl/Cmd modifier
    // This allows normal drag to still orbit the camera
    if (e.nativeEvent.button !== 0) return;
    if (!e.nativeEvent.ctrlKey && !e.nativeEvent.metaKey) return;

    e.stopPropagation();

    const screenPos = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
    boxStartRef.current = screenPos;
    boxEndRef.current = screenPos;
    setSelectionBox({ start: screenPos, end: screenPos });
    setIsBoxSelecting(true);

    // Disable orbit controls during selection
    pauseOrbitControls(controls);
  };

  // Handle pointer move and pointer up for box selection
  useEffect(() => {
    if (!isBoxSelecting) return;

    const finishBoxSelection = () => {
      if (boxStartRef.current && boxEndRef.current) {
        // Calculate which parts are within the selection box
        const selectedIds = getPartsInSelectionBox(boxStartRef.current, boxEndRef.current);

        if (selectedIds.length > 0) {
          selectParts(selectedIds);
        } else {
          clearSelection();
          setSelectedSidebarStockId(null);
        }
      }

      setIsBoxSelecting(false);
      boxStartRef.current = null;
      boxEndRef.current = null;
      setSelectionBox(null);

      // Re-enable orbit controls
      resumeOrbitControls(controls);
    };

    const handlePointerMove = (e: PointerEvent) => {
      const newEnd = { x: e.clientX, y: e.clientY };
      boxEndRef.current = newEnd;
      if (boxStartRef.current) {
        setSelectionBox({ start: boxStartRef.current, end: newEnd });
      }
    };

    const handlePointerUp = () => {
      finishBoxSelection();
    };

    const unbindPointerSession = bindWindowPointerSession(window, {
      onMove: handlePointerMove,
      onEnd: handlePointerUp
    });

    return () => {
      unbindPointerSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBoxSelecting, controls, selectParts, clearSelection, setSelectionBox, setSelectedSidebarStockId]);

  // Get parts whose screen-space bounding box intersects with the selection rectangle
  const getPartsInSelectionBox = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }): string[] => {
      const rect = gl.domElement.getBoundingClientRect();

      // Normalize selection box to min/max
      const selLeft = Math.min(start.x, end.x);
      const selRight = Math.max(start.x, end.x);
      const selTop = Math.min(start.y, end.y);
      const selBottom = Math.max(start.y, end.y);

      // Minimum drag distance to count as box selection (in pixels)
      const minDragDistance = 5;
      if (Math.abs(end.x - start.x) < minDragDistance && Math.abs(end.y - start.y) < minDragDistance) {
        return [];
      }

      const selectedIds: string[] = [];

      for (const part of parts) {
        _selEuler.set(
          (part.rotation.x * Math.PI) / 180,
          (part.rotation.y * Math.PI) / 180,
          (part.rotation.z * Math.PI) / 180,
          'XYZ'
        );
        _selQuat.setFromEuler(_selEuler);
        _selPosition.set(part.position.x, part.position.y, part.position.z);
        const localCorners = getPartLocalCorners(part);

        // Transform corners to screen space and track bounding box
        let partLeft = Infinity,
          partRight = -Infinity,
          partTop = Infinity,
          partBottom = -Infinity;

        for (let i = 0; i < localCorners.length; i += 1) {
          const corner = _selCorners[i].copy(localCorners[i]);
          corner.applyQuaternion(_selQuat);
          corner.add(_selPosition);
          corner.project(camera);
          const screenX = ((corner.x + 1) / 2) * rect.width + rect.left;
          const screenY = ((-corner.y + 1) / 2) * rect.height + rect.top;
          partLeft = Math.min(partLeft, screenX);
          partRight = Math.max(partRight, screenX);
          partTop = Math.min(partTop, screenY);
          partBottom = Math.max(partBottom, screenY);
        }

        // Check if part's screen bounding box intersects with selection box
        const intersects = partLeft <= selRight && partRight >= selLeft && partTop <= selBottom && partBottom >= selTop;

        if (intersects) {
          selectedIds.push(part.id);
        }
      }

      return selectedIds;
    },
    [parts, gl, camera, _selEuler, _selQuat, _selCorners, _selPosition]
  );

  return (
    <>
      {/* Scene background color (matches theme) */}
      <SceneBackground theme={effectiveTheme} />
      {/* Camera controller for centering on selection */}
      <CameraController />
      {/* Canvas capture handler for export */}
      <CanvasCaptureHandler />
      {/* Thumbnail generator for project saves */}
      <ThumbnailCaptureHandler />
      {/* GPU telemetry for debugging production performance */}
      <GpuTelemetry />
      {/* Dev-only: FPS stats panel + renderer.info logging */}
      <PerfMonitor />

      {/* Ground plane (invisible but clickable) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.001, 0]}
        onClick={handleBackgroundClick}
        onDoubleClick={handleBackgroundDoubleClick}
        onPointerDown={handleBackgroundPointerDown}
        // ADR-002: hitTarget descriptor for the hit-test service.
        userData={{ isGround: true, hitTarget: { kind: 'ground' } }}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Sky sphere (catches clicks that miss everything else) */}
      <mesh
        onPointerDown={handleBackgroundPointerDownForClick}
        onClick={handleSkyClick}
        onDoubleClick={handleBackgroundDoubleClick}
        // ADR-002: hitTarget descriptor for the hit-test service.
        userData={{ isSky: true, hitTarget: { kind: 'sky' } }}
        renderOrder={-1}
      >
        <sphereGeometry args={[500, 8, 6]} />
        <meshBasicMaterial visible={false} side={1} /> {/* BackSide = 1 */}
      </mesh>

      {/* Visual grid — colors adapt to theme */}
      {showGrid && (
        <Grid
          args={[200, 200]}
          cellSize={GRID_SIZE}
          cellThickness={0.5}
          cellColor={effectiveTheme === 'light' ? '#c0b8a8' : '#4a4a4a'}
          sectionSize={12}
          sectionThickness={1}
          sectionColor={effectiveTheme === 'light' ? '#a09888' : '#6a6a6a'}
          fadeDistance={100}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={true}
        />
      )}

      {/* Origin axis indicators (only show when grid is visible) */}
      {showGrid && <AxisIndicator />}

      {/* Lighting - uses preset from app settings with brightness multiplier */}
      {/* Keys force recreation when lighting mode changes, ensuring Three.js updates properly */}
      <ambientLight
        key={`ambient-${lightingMode}-${brightnessMultiplier}`}
        intensity={lightingPreset.ambient * brightnessMultiplier}
      />
      <directionalLight
        key={`main-${lightingMode}-${brightnessMultiplier}`}
        position={lightingPreset.mainLight.position}
        intensity={lightingPreset.mainLight.intensity * brightnessMultiplier}
      />
      <directionalLight
        key={`fill-${lightingMode}-${brightnessMultiplier}`}
        position={lightingPreset.fillLight.position}
        intensity={lightingPreset.fillLight.intensity * brightnessMultiplier}
      />

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={0.5}
        maxDistance={1500}
        zoomSpeed={0.5}
      />

      {/* All parts — hybrid instanced + individual rendering */}
      <PartsRenderer />

      {/* Group-wide rotation handles */}
      <GroupRotationHandles />

      {/* Multi-selection bounding box dimensions — OverlayModel dimensions slot (ADR-005) */}
      <MultiSelectionDimensions data={overlayModel.dimensions} />

      {/* Snap alignment lines — consumes the snap slot of OverlayModel (ADR-005) */}
      <SnapAlignmentLines data={overlayModel.snap} units={units} displayMode={displayMode} />

      {/* Reference distance indicators */}
      {/* Reference rulers — OverlayModel references slot (ADR-005) */}
      <ReferenceDistanceIndicators data={overlayModel.references} />

      {/* Persistent snap guides */}
      <SnapGuides />
    </>
  );
}
