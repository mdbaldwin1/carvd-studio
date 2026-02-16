import { ThreeEvent } from '@react-three/fiber';
import { memo, useState } from 'react';
import { LiveDimensions, HandlePosition, RESIZE_COLORS } from './partTypes';
import { RESIZE_HANDLE_GEOMETRY, RESIZE_OUTLINE_MATERIAL } from './partGeometry';

export const ResizeHandle = memo(
  function ResizeHandle({
    liveDims,
    handlePos,
    onResizeStart,
    isResizing
  }: {
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

    return (
      <group position={[handleX, handleY, handleZ]}>
        {/* Dark outline for contrast on any background */}
        <mesh scale={1.15} geometry={RESIZE_HANDLE_GEOMETRY} material={RESIZE_OUTLINE_MATERIAL} />
        {/* Main handle */}
        <mesh
          geometry={RESIZE_HANDLE_GEOMETRY}
          onPointerDown={(e) => {
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
          <meshStandardMaterial
            color={isActive ? RESIZE_COLORS.hover : baseColor}
            emissive={isActive ? baseColor : '#000000'}
            emissiveIntensity={isActive ? 0.3 : 0}
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
