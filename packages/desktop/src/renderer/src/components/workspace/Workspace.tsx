import { Grid, OrbitControls } from '@react-three/drei';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GRID_SIZE } from '../../constants';
import { useProjectStore } from '../../store/projectStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useUIStore } from '../../store/uiStore';
import { useCameraStore } from '../../store/cameraStore';
import { useAppSettingsStore } from '../../store/appSettingsStore';
import { CameraState } from '../../types';
import { AxisIndicator } from './AxisIndicator';
import { CameraController } from './CameraController';
import { CanvasCaptureHandler } from './CanvasCaptureHandler';
import { GpuTelemetry } from './GpuTelemetry';
import { MultiSelectionDimensions } from './MultiSelectionDimensions';
import { Part } from './Part';
import { PerfMonitor } from './PerfMonitor';
import { ReferenceDistanceIndicators } from './ReferenceDistanceIndicators';
import { SnapAlignmentLines } from './SnapAlignmentLines';
import { SnapGuides } from './SnapGuides';
import { ThumbnailCaptureHandler } from './ThumbnailCaptureHandler';
import {
  LIGHTING_PRESETS,
  isOrbitControls,
  setRightClickTarget,
  getRightClickTarget,
  clearRightClickTarget
} from './workspaceUtils';

export function Workspace() {
  const parts = useProjectStore((s) => s.parts);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const selectParts = useSelectionStore((s) => s.selectParts);
  const openContextMenu = useUIStore((s) => s.openContextMenu);
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

  const { camera, gl, controls } = useThree();

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

  // Track mouse position to distinguish click vs drag (for camera orbit)
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  // Track right-click position and time to distinguish right-click vs right-drag (for pan)
  const rightClickDownPos = useRef<{ x: number; y: number; time: number } | null>(null);

  // Prevent native context menu on canvas - we'll show our own on mouseup
  useEffect(() => {
    const canvas = gl.domElement;
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    canvas.addEventListener('contextmenu', preventContextMenu);
    return () => canvas.removeEventListener('contextmenu', preventContextMenu);
  }, [gl]);

  // Track right-click for our custom context menu (fires on mouseup, not mousedown)
  useEffect(() => {
    const canvas = gl.domElement;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        rightClickDownPos.current = { x: e.clientX, y: e.clientY, time: Date.now() };
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2 && rightClickDownPos.current) {
        const dx = e.clientX - rightClickDownPos.current.x;
        const dy = e.clientY - rightClickDownPos.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const elapsed = Date.now() - rightClickDownPos.current.time;

        // Only show context menu if it was a quick click (not a pan)
        if (distance <= 5 && elapsed <= 500) {
          // Show context menu based on what was targeted on mousedown
          const target = getRightClickTarget();
          if (target) {
            if (target.type === 'guide' && target.guideId) {
              openContextMenu({
                x: e.clientX,
                y: e.clientY,
                type: 'guide',
                guideId: target.guideId
              });
            } else if (target.type === 'part') {
              openContextMenu({ x: e.clientX, y: e.clientY, type: 'part' });
            } else {
              openContextMenu({
                x: e.clientX,
                y: e.clientY,
                type: 'background',
                worldPosition: target.worldPosition
              });
            }
          }
        }
        rightClickDownPos.current = null;
        clearRightClickTarget();
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [gl, openContextMenu]);

  // Click on empty space to deselect (only if not box selecting and not after drag)
  const handleBackgroundClick = (e: ThreeEvent<MouseEvent>) => {
    if (!e.object.userData.isGround || isBoxSelecting) return;

    // Only clear selection if we tracked a pointer-down on the ground
    // This prevents clearing selection when dragging a part and releasing over the ground
    if (!pointerDownPos.current) {
      return;
    }

    // Check if this was a drag (camera orbit) vs a click
    // Only clear selection on a deliberate click (minimal mouse movement)
    const dx = e.nativeEvent.clientX - pointerDownPos.current.x;
    const dy = e.nativeEvent.clientY - pointerDownPos.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If mouse moved more than 5 pixels, it was a drag - don't clear selection
    if (distance > 5) {
      pointerDownPos.current = null;
      return;
    }

    pointerDownPos.current = null;
    clearSelection();
  };

  // Track what was right-clicked on pointer down (for context menu on mouseup)
  const handleGroundRightClick = (e: ThreeEvent<PointerEvent>) => {
    if (e.nativeEvent.button === 2) {
      e.stopPropagation();
      const worldPosition = e.point ? { x: e.point.x, y: 0, z: e.point.z } : { x: 0, y: 0, z: 0 };
      setRightClickTarget({ type: 'background', worldPosition });
    }
  };

  const handleSkyRightClick = (e: ThreeEvent<PointerEvent>) => {
    if (e.nativeEvent.button === 2) {
      const worldPosition = e.point ? { x: e.point.x, y: e.point.y, z: e.point.z } : { x: 0, y: 0, z: 0 };
      setRightClickTarget({ type: 'background', worldPosition });
    }
  };

  // Click on sky to deselect (similar to ground click)
  const handleSkyClick = (e: ThreeEvent<MouseEvent>) => {
    if (!e.object.userData.isSky || isBoxSelecting) return;

    // Only clear selection if we tracked a pointer-down on the sky
    if (!pointerDownPos.current) {
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

    pointerDownPos.current = null;
    clearSelection();
  };

  // Track pointer down position to detect click vs drag
  const handleBackgroundPointerDownForClick = (e: ThreeEvent<PointerEvent>) => {
    if (e.object.userData.isGround || e.object.userData.isSky) {
      pointerDownPos.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
    }
  };

  // Double-click on background exits group editing mode (one level at a time)
  const handleBackgroundDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!e.object.userData.isGround && !e.object.userData.isSky) return;
    if (editingGroupId !== null) {
      exitGroup();
    }
  };

  // Start box selection on background pointer down (requires Ctrl/Cmd modifier)
  const handleBackgroundPointerDown = (e: ThreeEvent<PointerEvent>) => {
    // Always track pointer position for click detection
    handleBackgroundPointerDownForClick(e);

    // Track right-click target for context menu
    if (e.nativeEvent.button === 2) {
      handleGroundRightClick(e);
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
    if (isOrbitControls(controls)) {
      controls.enabled = false;
    }
  };

  // Handle pointer move and pointer up for box selection
  useEffect(() => {
    if (!isBoxSelecting) return;

    const handlePointerMove = (e: PointerEvent) => {
      const newEnd = { x: e.clientX, y: e.clientY };
      boxEndRef.current = newEnd;
      if (boxStartRef.current) {
        setSelectionBox({ start: boxStartRef.current, end: newEnd });
      }
    };

    const handlePointerUp = () => {
      if (boxStartRef.current && boxEndRef.current) {
        // Calculate which parts are within the selection box
        const selectedIds = getPartsInSelectionBox(boxStartRef.current, boxEndRef.current);

        if (selectedIds.length > 0) {
          selectParts(selectedIds);
        } else {
          clearSelection();
        }
      }

      setIsBoxSelecting(false);
      boxStartRef.current = null;
      boxEndRef.current = null;
      setSelectionBox(null);

      // Re-enable orbit controls
      if (isOrbitControls(controls)) {
        controls.enabled = true;
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBoxSelecting, controls, selectParts, clearSelection, setSelectionBox]);

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
        // Get part's 3D bounding box corners
        const halfLength = part.length / 2;
        const halfThickness = part.thickness / 2;
        const halfWidth = part.width / 2;

        // Reuse pooled objects (no allocations in this loop)
        _selEuler.set(
          (part.rotation.x * Math.PI) / 180,
          (part.rotation.y * Math.PI) / 180,
          (part.rotation.z * Math.PI) / 180,
          'XYZ'
        );
        _selQuat.setFromEuler(_selEuler);
        _selPosition.set(part.position.x, part.position.y, part.position.z);

        // Set corner values in-place
        _selCorners[0].set(-halfLength, -halfThickness, -halfWidth);
        _selCorners[1].set(-halfLength, -halfThickness, halfWidth);
        _selCorners[2].set(-halfLength, halfThickness, -halfWidth);
        _selCorners[3].set(-halfLength, halfThickness, halfWidth);
        _selCorners[4].set(halfLength, -halfThickness, -halfWidth);
        _selCorners[5].set(halfLength, -halfThickness, halfWidth);
        _selCorners[6].set(halfLength, halfThickness, -halfWidth);
        _selCorners[7].set(halfLength, halfThickness, halfWidth);

        // Transform corners to screen space and track bounding box
        let partLeft = Infinity,
          partRight = -Infinity,
          partTop = Infinity,
          partBottom = -Infinity;

        for (const corner of _selCorners) {
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
        userData={{ isGround: true }}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Sky sphere (catches clicks that miss everything else) */}
      <mesh
        onPointerDown={(e) => {
          handleBackgroundPointerDownForClick(e);
          if (e.nativeEvent.button === 2) {
            handleSkyRightClick(e);
          }
        }}
        onClick={handleSkyClick}
        onDoubleClick={handleBackgroundDoubleClick}
        userData={{ isSky: true }}
        renderOrder={-1}
      >
        <sphereGeometry args={[500, 8, 6]} />
        <meshBasicMaterial visible={false} side={1} /> {/* BackSide = 1 */}
      </mesh>

      {/* Visual grid */}
      {showGrid && (
        <Grid
          args={[200, 200]}
          cellSize={GRID_SIZE}
          cellThickness={0.5}
          cellColor="#4a4a4a"
          sectionSize={12}
          sectionThickness={1}
          sectionColor="#6a6a6a"
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
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} minDistance={1} maxDistance={600} zoomSpeed={0.5} />

      {/* All parts */}
      {parts.map((part) => (
        <Part key={part.id} part={part} />
      ))}

      {/* Multi-selection bounding box dimensions */}
      <MultiSelectionDimensions />

      {/* Snap alignment lines */}
      <SnapAlignmentLines />

      {/* Reference distance indicators */}
      <ReferenceDistanceIndicators />

      {/* Persistent snap guides */}
      <SnapGuides />
    </>
  );
}
