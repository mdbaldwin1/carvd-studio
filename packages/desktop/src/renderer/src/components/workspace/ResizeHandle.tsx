import { ThreeEvent } from '@react-three/fiber';
import { memo, useState } from 'react';
import * as THREE from 'three';
import { LiveDimensions, HandlePosition, RESIZE_COLORS } from './partTypes';
import { RESIZE_HANDLE_GEOMETRY } from './partGeometry';
import type { HitTargetDescriptor } from '../../interaction/hitTest';

const NOOP_RAYCAST: THREE.Object3D['raycast'] = () => {};

export const ResizeHandle = memo(
  function ResizeHandle({
    partId,
    liveDims,
    handlePos,
    onResizeStart,
    isResizing
  }: {
    partId: string;
    liveDims: LiveDimensions;
    handlePos: HandlePosition;
    onResizeStart: (handlePos: HandlePosition, e: ThreeEvent<PointerEvent>) => void;
    isResizing: boolean;
  }) {
    const [hovered, setHovered] = useState(false);

    // Calculate handle position relative to part center (0,0,0 in local space)
    // For each axis: if handlePos value is 0, position at center; otherwise at edge
    // Handles are centered on the part edge so they overlap the part by half their size,
    // making them easier to grab when parts are flush against each other
    const halfLength = liveDims.length / 2;
    const halfThickness = liveDims.thickness / 2;
    const halfWidth = liveDims.width / 2;

    // Scale visual handle size with part size, but keep sane min/max bounds.
    // This prevents handles from covering thin/small parts while remaining usable.
    const minPartDimension = Math.min(liveDims.length, liveDims.width, liveDims.thickness);
    const visualHandleSize = Math.max(0.12, Math.min(0.32, minPartDimension * 0.22));
    const visualScale = visualHandleSize / 0.45; // 0.45 = base geometry size
    const hitScale = Math.max(0.68, visualScale * 1.35);

    // Positions relative to center (group position handles world offset)
    const handleX = handlePos.x === 0 ? 0 : handlePos.x * halfLength;
    const handleY = handlePos.y === 0 ? 0 : handlePos.y * halfThickness;
    const handleZ = handlePos.z === 0 ? 0 : handlePos.z * halfWidth;

    // Determine cursor based on handle type
    let cursor = 'pointer';
    if (handlePos.type === 'corner') {
      cursor = 'nwse-resize'; // Uniform scale
    } else if (handlePos.type === 'edge-x') {
      // Edge parallel to X, affects Y and Z
      cursor = 'ns-resize';
    } else if (handlePos.type === 'edge-y') {
      // Edge parallel to Y (vertical), affects X and Z
      cursor = 'ew-resize';
    } else if (handlePos.type === 'edge-z') {
      // Edge parallel to Z, affects X and Y
      cursor = 'nesw-resize';
    }

    // Bolder colors for different handle types
    const baseColor = handlePos.type === 'corner' ? RESIZE_COLORS.corner : RESIZE_COLORS.edge;
    const isActive = hovered || isResizing;
    const activeScaleBoost = isActive ? 1.16 : 1;

    // ADR-002: descriptor for the hit-test service.
    const hitDescriptor: HitTargetDescriptor = {
      kind: 'resize-handle',
      nodeId: partId,
      partId,
      handle: { x: handlePos.x, y: handlePos.y, z: handlePos.z, type: handlePos.type }
    };

    return (
      <group position={[handleX, handleY, handleZ]}>
        {/* Larger near-invisible hit target keeps handles easy to grab even when visually scaled down */}
        <mesh
          userData={{ blocksPartSelection: true, hitTarget: hitDescriptor }}
          scale={hitScale}
          geometry={RESIZE_HANDLE_GEOMETRY}
          onPointerDown={(e) => {
            if (e.nativeEvent.button !== 0) return;
            e.stopPropagation();
            onResizeStart(handlePos, e);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = cursor;
          }}
          onPointerOut={() => {
            setHovered(false);
            if (!isResizing) document.body.style.cursor = 'auto';
          }}
        >
          <meshBasicMaterial transparent opacity={0.02} depthWrite={false} />
        </mesh>

        {/* Soft halo instead of dark outline so theme colors remain readable */}
        <mesh raycast={NOOP_RAYCAST} scale={visualScale * 1.12} geometry={RESIZE_HANDLE_GEOMETRY}>
          <meshBasicMaterial
            color={isActive ? RESIZE_COLORS.hover : baseColor}
            transparent
            opacity={isActive ? 0.2 : 0.12}
            depthWrite={false}
          />
        </mesh>
        {/* Extra hover glow to make handle focus obvious */}
        {isActive && (
          <mesh raycast={NOOP_RAYCAST} scale={visualScale * 1.35} geometry={RESIZE_HANDLE_GEOMETRY}>
            <meshBasicMaterial color={RESIZE_COLORS.hover} transparent opacity={0.18} depthWrite={false} />
          </mesh>
        )}
        {/* Main handle */}
        <mesh raycast={NOOP_RAYCAST} scale={visualScale * activeScaleBoost} geometry={RESIZE_HANDLE_GEOMETRY}>
          <meshBasicMaterial
            color={isActive ? RESIZE_COLORS.hover : baseColor}
            transparent
            opacity={isActive ? 0.88 : 0.78}
            depthWrite={false}
          />
        </mesh>
      </group>
    );
  },
  (prev, next) =>
    prev.liveDims.length === next.liveDims.length &&
    prev.liveDims.width === next.liveDims.width &&
    prev.liveDims.thickness === next.liveDims.thickness &&
    prev.handlePos === next.handlePos &&
    prev.onResizeStart === next.onResizeStart &&
    prev.isResizing === next.isResizing
);
