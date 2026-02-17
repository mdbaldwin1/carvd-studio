import { memo } from 'react';
import * as THREE from 'three';
import { LiveDimensions } from './partTypes';
import { GRAIN_ARROW_HEAD_GEOMETRY, GRAIN_ARROW_MATERIAL } from './partGeometry';

// Double-headed arrow showing grain direction painted on the part surface
export const GrainDirectionArrow = memo(
  function GrainDirectionArrow({
    liveDims,
    grainDirection
  }: {
    liveDims: LiveDimensions;
    grainDirection: 'length' | 'width';
  }) {
    // Arrow sits just above top surface
    const surfaceY = liveDims.thickness / 2 + 0.02;

    // Calculate arrow size based on grain direction (60% of that dimension, max 8 inches)
    const alongDim = grainDirection === 'length' ? liveDims.length : liveDims.width;
    const arrowLength = Math.min(alongDim * 0.6, 8);
    const halfArrow = arrowLength / 2;

    // Arrow head and shaft proportions
    const headLength = Math.min(arrowLength * 0.25, 1.5);
    const headWidth = Math.min(arrowLength * 0.15, 0.8);
    const shaftWidth = headWidth * 0.4;

    // Rotation for width direction (rotate 90 degrees around Y)
    const rotation: [number, number, number] = grainDirection === 'length' ? [0, 0, 0] : [0, Math.PI / 2, 0];

    return (
      <group position={[0, surfaceY, 0]} rotation={rotation}>
        {/* Arrow shaft - flat rectangle */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} material={GRAIN_ARROW_MATERIAL}>
          <planeGeometry args={[arrowLength - headLength * 2, shaftWidth]} />
        </mesh>

        {/* Arrow head 1 (positive X direction) */}
        <mesh
          position={[halfArrow - headLength / 2, 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[headLength, headWidth, 1]}
          geometry={GRAIN_ARROW_HEAD_GEOMETRY}
          material={GRAIN_ARROW_MATERIAL}
        />

        {/* Arrow head 2 (negative X direction) */}
        <mesh
          position={[-halfArrow + headLength / 2, 0, 0]}
          rotation={[-Math.PI / 2, 0, Math.PI]}
          scale={[headLength, headWidth, 1]}
          geometry={GRAIN_ARROW_HEAD_GEOMETRY}
          material={GRAIN_ARROW_MATERIAL}
        />
      </group>
    );
  },
  (prev, next) =>
    prev.liveDims.length === next.liveDims.length &&
    prev.liveDims.width === next.liveDims.width &&
    prev.liveDims.thickness === next.liveDims.thickness &&
    prev.grainDirection === next.grainDirection
);
