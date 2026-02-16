import { ThreeEvent } from '@react-three/fiber';
import { memo, useState } from 'react';
import * as THREE from 'three';
import { LiveDimensions, ROTATION_COLORS, ROTATION_HANDLE_SIZE } from './partTypes';
import {
  ROTATION_HIT_GEOMETRY,
  ROTATION_HIT_MATERIAL,
  ROTATION_OUTLINE_RING_GEOMETRY,
  ROTATION_OUTLINE_MATERIAL,
  ROTATION_MAIN_RING_GEOMETRY,
  ROTATION_ARROW_GEOMETRY
} from './partGeometry';

export const RotationHandle = memo(
  function RotationHandle({
    liveDims,
    axis,
    side,
    onRotate
  }: {
    liveDims: LiveDimensions;
    axis: 'x' | 'y' | 'z';
    side: 1 | -1; // Which side of the axis (+1 or -1)
    onRotate: (axis: 'x' | 'y' | 'z') => void;
  }) {
    const [hovered, setHovered] = useState(false);

    const halfLength = liveDims.length / 2;
    const halfThickness = liveDims.thickness / 2;
    const halfWidth = liveDims.width / 2;
    const offset = 0.15; // Distance above the surface

    // Position the handle on the face perpendicular to the rotation axis
    // Rotation orients the flat ring to be parallel to the face it's on
    let position: [number, number, number];
    let rotation: [number, number, number];

    if (axis === 'y') {
      // Top (+1) or bottom (-1) face - ring lies flat (parallel to XZ plane)
      position = [0, side * (halfThickness + offset), 0];
      rotation = [-Math.PI / 2, 0, 0];
    } else if (axis === 'x') {
      // +X or -X side face - ring parallel to YZ plane
      position = [side * (halfLength + offset), 0, 0];
      rotation = [0, Math.PI / 2, 0];
    } else {
      // +Z or -Z front/back face - ring parallel to XY plane
      position = [0, 0, side * (halfWidth + offset)];
      rotation = [0, 0, 0];
    }

    const baseColor = ROTATION_COLORS[axis];
    const color = hovered ? ROTATION_COLORS.hover : baseColor;

    const zOffset = 0.02; // Z offset to sit on top of the ring and avoid z-fighting
    const arrowPosX = ROTATION_HANDLE_SIZE - 0.1; // Position on the ring

    // Shared event handlers
    const handleClick = (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onRotate(axis);
    };

    const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(true);
      document.body.style.cursor = 'pointer';
    };

    const handlePointerOut = () => {
      setHovered(false);
      document.body.style.cursor = 'auto';
    };

    return (
      <group position={position} rotation={rotation}>
        {/* Invisible hit area - covers entire circular region for easier clicking */}
        <mesh
          geometry={ROTATION_HIT_GEOMETRY}
          material={ROTATION_HIT_MATERIAL}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        />

        {/* Dark outline ring for contrast */}
        <mesh geometry={ROTATION_OUTLINE_RING_GEOMETRY} material={ROTATION_OUTLINE_MATERIAL} />

        {/* Main visible ring - thicker and bolder */}
        <mesh geometry={ROTATION_MAIN_RING_GEOMETRY}>
          <meshStandardMaterial
            color={color}
            side={THREE.DoubleSide}
            emissive={hovered ? baseColor : '#000000'}
            emissiveIntensity={hovered ? 0.4 : 0}
          />
        </mesh>

        {/* Flat arrow indicator showing rotation direction - positioned on the ring */}
        <mesh geometry={ROTATION_ARROW_GEOMETRY} position={[arrowPosX, 0, zOffset]} rotation={[0, 0, -Math.PI / 6]}>
          <meshStandardMaterial
            color={color}
            side={THREE.DoubleSide}
            emissive={hovered ? baseColor : '#000000'}
            emissiveIntensity={hovered ? 0.4 : 0}
          />
        </mesh>
      </group>
    );
  },
  (prev, next) =>
    prev.liveDims.length === next.liveDims.length &&
    prev.liveDims.width === next.liveDims.width &&
    prev.liveDims.thickness === next.liveDims.thickness &&
    prev.axis === next.axis &&
    prev.side === next.side &&
    prev.onRotate === next.onRotate
);
