import { useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { useProjectStore } from '../../store/projectStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useInteractionStore } from '../../store/interactionStore';
import { resolveMeasurementSelectionEntities } from '../../utils/interactionSelection';
import { shouldHideMeasurementOverlays } from '../../utils/interactionOverlay';
import { getProjectedMeasurementLength, resolveMeasurementOverlayLayout } from '../../utils/measurementOverlayLayout';
import { getBoundingBoxDimensionPlacements } from '../../utils/measurementPlacement';
import { getBoundingMeasurementPriority } from '../../utils/measurementPriority';
import { DimensionLabel } from './DimensionLabel';
import { getPartAABB } from './workspaceUtils';

const NOOP_RAYCAST: THREE.Object3D['raycast'] = () => {};

// Component that shows overall bounding box dimensions when multiple parts are selected
export function MultiSelectionDimensions() {
  const { camera, size } = useThree();
  const parts = useProjectStore((s) => s.parts);
  const selectedPartIds = useSelectionStore((s) => s.selectedPartIds);
  const selectedGroupIds = useSelectionStore((s) => s.selectedGroupIds);
  const groupMembers = useProjectStore((s) => s.groupMembers);
  const activeSession = useInteractionStore((s) => s.activeSession);
  const units = useProjectStore((s) => s.units);

  const measurementEntities = useMemo(() => {
    return resolveMeasurementSelectionEntities({ selectedPartIds, selectedGroupIds }, groupMembers);
  }, [selectedPartIds, selectedGroupIds, groupMembers]);

  // Memoize the heavy AABB + gap calculations
  const boundsData = useMemo(() => {
    // Show bounding box for 2+ selected parts, or for group selections (even single-part groups)
    const hasGroupSelection = selectedGroupIds.length > 0;
    const minEntities = hasGroupSelection ? 1 : 2;
    if (measurementEntities.length < minEntities) return null;

    const entityAABBs = measurementEntities
      .map((entity) => {
        const entityParts = parts.filter((part) => entity.partIds.includes(part.id));
        if (entityParts.length === 0) return null;

        const partAABBs = entityParts.map((part) => getPartAABB(part));
        return {
          entity,
          aabb: {
            minX: Math.min(...partAABBs.map((aabb) => aabb.minX)),
            maxX: Math.max(...partAABBs.map((aabb) => aabb.maxX)),
            minY: Math.min(...partAABBs.map((aabb) => aabb.minY)),
            maxY: Math.max(...partAABBs.map((aabb) => aabb.maxY)),
            minZ: Math.min(...partAABBs.map((aabb) => aabb.minZ)),
            maxZ: Math.max(...partAABBs.map((aabb) => aabb.maxZ))
          }
        };
      })
      .filter(
        (
          entry
        ): entry is {
          entity: (typeof measurementEntities)[number];
          aabb: ReturnType<typeof getPartAABB>;
        } => entry !== null
      );

    if (entityAABBs.length < minEntities) return null;

    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;

    for (const { aabb } of entityAABBs) {
      minX = Math.min(minX, aabb.minX);
      maxX = Math.max(maxX, aabb.maxX);
      minY = Math.min(minY, aabb.minY);
      maxY = Math.max(maxY, aabb.maxY);
      minZ = Math.min(minZ, aabb.minZ);
      maxZ = Math.max(maxZ, aabb.maxZ);
    }

    // Calculate gaps between parts along each axis
    const gaps: {
      axis: 'x' | 'y' | 'z';
      start: [number, number, number];
      end: [number, number, number];
      distance: number;
    }[] = [];

    const sortedByX = [...entityAABBs].sort((a, b) => a.aabb.minX - b.aabb.minX);
    for (let i = 0; i < sortedByX.length - 1; i++) {
      const current = sortedByX[i];
      const next = sortedByX[i + 1];
      const gap = next.aabb.minX - current.aabb.maxX;
      if (gap > 0.01) {
        const avgY = (Math.max(current.aabb.minY, next.aabb.minY) + Math.min(current.aabb.maxY, next.aabb.maxY)) / 2;
        const avgZ = (Math.max(current.aabb.minZ, next.aabb.minZ) + Math.min(current.aabb.maxZ, next.aabb.maxZ)) / 2;
        gaps.push({
          axis: 'x',
          start: [current.aabb.maxX, avgY, avgZ],
          end: [next.aabb.minX, avgY, avgZ],
          distance: gap
        });
      }
    }

    const sortedByZ = [...entityAABBs].sort((a, b) => a.aabb.minZ - b.aabb.minZ);
    for (let i = 0; i < sortedByZ.length - 1; i++) {
      const current = sortedByZ[i];
      const next = sortedByZ[i + 1];
      const gap = next.aabb.minZ - current.aabb.maxZ;
      if (gap > 0.01) {
        const avgX = (Math.max(current.aabb.minX, next.aabb.minX) + Math.min(current.aabb.maxX, next.aabb.maxX)) / 2;
        const avgY = (Math.max(current.aabb.minY, next.aabb.minY) + Math.min(current.aabb.maxY, next.aabb.maxY)) / 2;
        gaps.push({
          axis: 'z',
          start: [avgX, avgY, current.aabb.maxZ],
          end: [avgX, avgY, next.aabb.minZ],
          distance: gap
        });
      }
    }

    const sortedByY = [...entityAABBs].sort((a, b) => a.aabb.minY - b.aabb.minY);
    for (let i = 0; i < sortedByY.length - 1; i++) {
      const current = sortedByY[i];
      const next = sortedByY[i + 1];
      const gap = next.aabb.minY - current.aabb.maxY;
      if (gap > 0.01) {
        const avgX = (Math.max(current.aabb.minX, next.aabb.minX) + Math.min(current.aabb.maxX, next.aabb.maxX)) / 2;
        const avgZ = (Math.max(current.aabb.minZ, next.aabb.minZ) + Math.min(current.aabb.maxZ, next.aabb.maxZ)) / 2;
        gaps.push({
          axis: 'y',
          start: [avgX, current.aabb.maxY, avgZ],
          end: [avgX, next.aabb.minY, avgZ],
          distance: gap
        });
      }
    }

    return { minX, maxX, minY, maxY, minZ, maxZ, gaps };
  }, [measurementEntities, parts, selectedGroupIds]);

  const dimensionLayout = useMemo(() => {
    if (!boundsData) {
      return new Set<string>();
    }

    const { minX, maxX, minY, maxY, minZ, maxZ, gaps } = boundsData;
    const sizeX = maxX - minX;
    const sizeY = maxY - minY;
    const sizeZ = maxZ - minZ;
    const placements = getBoundingBoxDimensionPlacements({
      minX,
      maxX,
      minY,
      maxY,
      minZ,
      maxZ,
      cameraWorld: [camera.position.x, camera.position.y, camera.position.z]
    });
    const viewport = { width: size.width, height: size.height };
    const candidates = [
      {
        id: 'bound-x',
        start: placements.x.start,
        end: placements.x.end,
        labelPosition: {
          x: (placements.x.start[0] + placements.x.end[0]) / 2 + placements.x.offsetDir[0] * placements.x.offset,
          y: (placements.x.start[1] + placements.x.end[1]) / 2 + placements.x.offsetDir[1] * placements.x.offset,
          z: (placements.x.start[2] + placements.x.end[2]) / 2 + placements.x.offsetDir[2] * placements.x.offset
        },
        priority: getBoundingMeasurementPriority('overall', 'x', sizeX)
      },
      {
        id: 'bound-z',
        start: placements.z.start,
        end: placements.z.end,
        labelPosition: {
          x: (placements.z.start[0] + placements.z.end[0]) / 2 + placements.z.offsetDir[0] * placements.z.offset,
          y: (placements.z.start[1] + placements.z.end[1]) / 2 + placements.z.offsetDir[1] * placements.z.offset,
          z: (placements.z.start[2] + placements.z.end[2]) / 2 + placements.z.offsetDir[2] * placements.z.offset
        },
        priority: getBoundingMeasurementPriority('overall', 'z', sizeZ)
      },
      {
        id: 'bound-y',
        start: placements.y.start,
        end: placements.y.end,
        labelPosition: {
          x: (placements.y.start[0] + placements.y.end[0]) / 2 + placements.y.offsetDir[0] * placements.y.offset,
          y: (placements.y.start[1] + placements.y.end[1]) / 2 + placements.y.offsetDir[1] * placements.y.offset,
          z: (placements.y.start[2] + placements.y.end[2]) / 2 + placements.y.offsetDir[2] * placements.y.offset
        },
        priority: getBoundingMeasurementPriority('overall', 'y', sizeY)
      },
      ...gaps.map((gap, index) => {
        const gapOffsetDir: [number, number, number] =
          gap.axis === 'x' ? [0, 1, 0] : gap.axis === 'z' ? [0, 1, 0] : [1, 0, 0];
        return {
          id: `gap-${index}`,
          start: gap.start,
          end: gap.end,
          labelPosition: {
            x: (gap.start[0] + gap.end[0]) / 2 + gapOffsetDir[0] * 1.5,
            y: (gap.start[1] + gap.end[1]) / 2 + gapOffsetDir[1] * 1.5,
            z: (gap.start[2] + gap.end[2]) / 2 + gapOffsetDir[2] * 1.5
          },
          priority: getBoundingMeasurementPriority('gap', gap.axis, gap.distance)
        };
      })
    ].filter((candidate) => {
      const length = getProjectedMeasurementLength(
        { x: candidate.start[0], y: candidate.start[1], z: candidate.start[2] },
        { x: candidate.end[0], y: candidate.end[1], z: candidate.end[2] },
        camera,
        viewport
      );

      return length >= (candidate.id.startsWith('gap-') ? 42 : 56);
    });

    return resolveMeasurementOverlayLayout(
      candidates.map((candidate) => ({
        id: candidate.id,
        worldPosition: candidate.labelPosition,
        priority: candidate.priority
      })),
      camera,
      viewport,
      44,
      3
    );
  }, [boundsData, camera, size.height, size.width]);

  if (!boundsData) return null;
  if (shouldHideMeasurementOverlays(activeSession)) return null;

  const { minX, maxX, minY, maxY, minZ, maxZ, gaps } = boundsData;
  const sizeX = maxX - minX;
  const sizeY = maxY - minY;
  const sizeZ = maxZ - minZ;
  const placements = getBoundingBoxDimensionPlacements({
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ,
    cameraWorld: [camera.position.x, camera.position.y, camera.position.z]
  });

  return (
    <group>
      {/* X dimension (width) - along front edge at bottom, offset toward -Z */}
      <DimensionLabel
        hidden={!dimensionLayout.get('bound-x')?.visible}
        start={placements.x.start}
        end={placements.x.end}
        value={sizeX}
        offsetDir={placements.x.offsetDir}
        offset={placements.x.offset + (dimensionLayout.get('bound-x')?.lane ?? 0) * 0.85}
        color="#ff6b6b"
        units={units}
        fontSize={0.5}
        lineWidth={2}
        tickLength={0.46}
      />

      {/* Z dimension (depth) - along right edge at bottom, offset toward +X */}
      <DimensionLabel
        hidden={!dimensionLayout.get('bound-z')?.visible}
        start={placements.z.start}
        end={placements.z.end}
        value={sizeZ}
        offsetDir={placements.z.offsetDir}
        offset={placements.z.offset + (dimensionLayout.get('bound-z')?.lane ?? 0) * 0.85}
        color="#4dabf7"
        units={units}
        fontSize={0.5}
        lineWidth={2}
        tickLength={0.46}
      />

      {/* Y dimension (height) - along front-right vertical edge, offset diagonally */}
      <DimensionLabel
        hidden={!dimensionLayout.get('bound-y')?.visible}
        start={placements.y.start}
        end={placements.y.end}
        value={sizeY}
        offsetDir={placements.y.offsetDir}
        offset={placements.y.offset + (dimensionLayout.get('bound-y')?.lane ?? 0) * 0.85}
        color="#69db7c"
        units={units}
        fontSize={0.5}
        lineWidth={2}
        tickLength={0.46}
      />

      {/* Gap/spacing dimensions between parts */}
      {gaps.map((gap, index) => {
        const offsetDir: [number, number, number] =
          gap.axis === 'x' ? [0, 1, 0] : gap.axis === 'z' ? [0, 1, 0] : [1, 0, 0];
        return (
          <DimensionLabel
            key={`gap-${index}`}
            hidden={!dimensionLayout.get(`gap-${index}`)?.visible}
            start={gap.start}
            end={gap.end}
            value={gap.distance}
            offsetDir={offsetDir}
            offset={1.5 + (dimensionLayout.get(`gap-${index}`)?.lane ?? 0) * 0.7}
            color="#ffd43b"
            units={units}
            fontSize={0.42}
            lineWidth={1.5}
          />
        );
      })}

      {/* Bounding box wireframe outline */}
      <group position={[(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2]}>
        <lineSegments raycast={NOOP_RAYCAST}>
          <edgesGeometry args={[new THREE.BoxGeometry(sizeX, sizeY, sizeZ)]} />
          <lineBasicMaterial color="#ffffff" transparent opacity={0.7} />
        </lineSegments>
      </group>
    </group>
  );
}
