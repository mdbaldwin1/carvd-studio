import * as THREE from 'three';
import { Part, SnapLine, SnapDistanceIndicator, SnapGuide, ReferenceDistanceIndicator } from '../types';

// Part bounding box in world space
export interface PartBounds {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  centerX: number;
  centerY: number;
  centerZ: number;
}

// Snap suggestion for a single axis
interface AxisSnap {
  snapped: boolean;
  value: number; // The value to snap to
  delta: number; // How much to adjust the position
  type: 'edge' | 'center';
  targetPartId: string;
}

// Equal spacing snap suggestion
interface EqualSpacingSnap {
  snapped: boolean;
  axis: 'x' | 'y' | 'z';
  delta: number; // How much to adjust the position
  equalGap: number; // The resulting equal gap on each side
  part1Id: string; // First bookend part
  part2Id: string; // Second bookend part
  part1Bounds: PartBounds;
  part2Bounds: PartBounds;
}

// Result of snap detection
export interface SnapResult {
  // Position adjustments to apply
  adjustedPosition: { x: number; y: number; z: number };
  // Whether each axis was snapped
  snappedX: boolean;
  snappedY: boolean;
  snappedZ: boolean;
  // Alignment lines to display
  snapLines: SnapLine[];
}

// Calculate axis-aligned bounding box for a part in world space
export function getPartBounds(part: Part): PartBounds {
  const rotX = (part.rotation.x * Math.PI) / 180;
  const rotY = (part.rotation.y * Math.PI) / 180;
  const rotZ = (part.rotation.z * Math.PI) / 180;
  const euler = new THREE.Euler(rotX, rotY, rotZ, 'XYZ');
  const quat = new THREE.Quaternion().setFromEuler(euler);

  const halfLength = part.length / 2;
  const halfThickness = part.thickness / 2;
  const halfWidth = part.width / 2;

  // Get the 8 corners of the bounding box in local space
  const corners = [
    new THREE.Vector3(-halfLength, -halfThickness, -halfWidth),
    new THREE.Vector3(-halfLength, -halfThickness, halfWidth),
    new THREE.Vector3(-halfLength, halfThickness, -halfWidth),
    new THREE.Vector3(-halfLength, halfThickness, halfWidth),
    new THREE.Vector3(halfLength, -halfThickness, -halfWidth),
    new THREE.Vector3(halfLength, -halfThickness, halfWidth),
    new THREE.Vector3(halfLength, halfThickness, -halfWidth),
    new THREE.Vector3(halfLength, halfThickness, halfWidth)
  ];

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;

  for (const corner of corners) {
    corner.applyQuaternion(quat);
    corner.add(new THREE.Vector3(part.position.x, part.position.y, part.position.z));
    minX = Math.min(minX, corner.x);
    maxX = Math.max(maxX, corner.x);
    minY = Math.min(minY, corner.y);
    maxY = Math.max(maxY, corner.y);
    minZ = Math.min(minZ, corner.z);
    maxZ = Math.max(maxZ, corner.z);
  }

  return {
    id: part.id,
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    centerZ: (minZ + maxZ) / 2
  };
}

// Calculate bounds for a part at a hypothetical position (for live drag)
export function getPartBoundsAtPosition(part: Part, position: { x: number; y: number; z: number }): PartBounds {
  const tempPart = { ...part, position };
  return getPartBounds(tempPart);
}

// Calculate combined bounding box for multiple parts
export function getCombinedBounds(parts: Part[]): PartBounds {
  if (parts.length === 0) {
    return {
      id: 'empty',
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      minZ: 0,
      maxZ: 0,
      centerX: 0,
      centerY: 0,
      centerZ: 0
    };
  }

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;

  for (const part of parts) {
    const bounds = getPartBounds(part);
    minX = Math.min(minX, bounds.minX);
    maxX = Math.max(maxX, bounds.maxX);
    minY = Math.min(minY, bounds.minY);
    maxY = Math.max(maxY, bounds.maxY);
    minZ = Math.min(minZ, bounds.minZ);
    maxZ = Math.max(maxZ, bounds.maxZ);
  }

  return {
    id: parts.length === 1 ? parts[0].id : 'group',
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    centerZ: (minZ + maxZ) / 2
  };
}

// Calculate combined bounding box for parts at adjusted positions
export function getCombinedBoundsAtPosition(parts: Part[], delta: { x: number; y: number; z: number }): PartBounds {
  if (parts.length === 0) {
    return {
      id: 'empty',
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      minZ: 0,
      maxZ: 0,
      centerX: 0,
      centerY: 0,
      centerZ: 0
    };
  }

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;

  for (const part of parts) {
    const adjustedPart = {
      ...part,
      position: {
        x: part.position.x + delta.x,
        y: part.position.y + delta.y,
        z: part.position.z + delta.z
      }
    };
    const bounds = getPartBounds(adjustedPart);
    minX = Math.min(minX, bounds.minX);
    maxX = Math.max(maxX, bounds.maxX);
    minY = Math.min(minY, bounds.minY);
    maxY = Math.max(maxY, bounds.maxY);
    minZ = Math.min(minZ, bounds.minZ);
    maxZ = Math.max(maxZ, bounds.maxZ);
  }

  return {
    id: parts.length === 1 ? parts[0].id : 'group',
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    centerZ: (minZ + maxZ) / 2
  };
}

// Helper to create an axis-aligned indicator line
// IMPORTANT: value1 is from the selected part, value2 is from the reference part.
// We preserve this order in start/end so movement direction can be calculated correctly.
function createAxisAlignedIndicator(
  id: string,
  axis: 'x' | 'y' | 'z',
  type: 'edge-to-edge' | 'edge-offset',
  fromPartId: string,
  toPartId: string,
  selectedValue: number, // Edge position of the selected part
  referenceValue: number, // Edge position of the reference part
  perpPos1: number, // Position on first perpendicular axis
  perpPos2: number, // Position on second perpendicular axis
  labelOffset: number = 0.5
): ReferenceDistanceIndicator {
  const distance = Math.abs(referenceValue - selectedValue);
  const midVal = (selectedValue + referenceValue) / 2;

  let start: { x: number; y: number; z: number };
  let end: { x: number; y: number; z: number };
  let labelPosition: { x: number; y: number; z: number };

  // start = selected part's edge, end = reference part's edge
  // This preserves the relationship for calculating movement direction
  switch (axis) {
    case 'x':
      start = { x: selectedValue, y: perpPos1, z: perpPos2 };
      end = { x: referenceValue, y: perpPos1, z: perpPos2 };
      labelPosition = { x: midVal, y: perpPos1 + labelOffset, z: perpPos2 };
      break;
    case 'y':
      start = { x: perpPos1, y: selectedValue, z: perpPos2 };
      end = { x: perpPos1, y: referenceValue, z: perpPos2 };
      labelPosition = { x: perpPos1 + labelOffset, y: midVal, z: perpPos2 };
      break;
    case 'z':
      start = { x: perpPos1, y: perpPos2, z: selectedValue };
      end = { x: perpPos1, y: perpPos2, z: referenceValue };
      labelPosition = { x: perpPos1, y: perpPos2 + labelOffset, z: midVal };
      break;
  }

  return {
    id,
    axis,
    type,
    fromPartId,
    toPartId,
    start,
    end,
    distance,
    labelPosition
  };
}

// Calculate clean distance indicators between selected parts and reference parts
// Shows only meaningful distances: gaps between closest edges and edge alignment offsets
export function calculateReferenceDistances(
  draggingPart: Part,
  draggingPosition: { x: number; y: number; z: number },
  referenceParts: Part[]
): ReferenceDistanceIndicator[] {
  const draggingBounds = getPartBoundsAtPosition(draggingPart, draggingPosition);
  return calculateDistancesFromBounds(draggingBounds, draggingPart.id, referenceParts);
}

// Core function to calculate distances from bounds to reference parts
export function calculateDistancesFromBounds(
  selectedBounds: PartBounds,
  fromPartId: string,
  referenceParts: Part[]
): ReferenceDistanceIndicator[] {
  const indicators: ReferenceDistanceIndicator[] = [];

  // Get combined bounds of all reference parts (treat as one unit)
  const refBounds = getCombinedBounds(referenceParts);
  const toPartId = referenceParts.length === 1 ? referenceParts[0].id : 'reference-group';

  // For each axis, determine the relationship and show appropriate indicators
  for (const axis of ['x', 'y', 'z'] as const) {
    const minKey = `min${axis.toUpperCase()}` as 'minX' | 'minY' | 'minZ';
    const maxKey = `max${axis.toUpperCase()}` as 'maxX' | 'maxY' | 'maxZ';

    // Get perpendicular axis positions for drawing the line
    // Use the average position on perpendicular axes where the parts are closest
    const perpAxes = (['x', 'y', 'z'] as const).filter((a) => a !== axis);
    const perp1Key = `center${perpAxes[0].toUpperCase()}` as 'centerX' | 'centerY' | 'centerZ';
    const perp2Key = `center${perpAxes[1].toUpperCase()}` as 'centerX' | 'centerY' | 'centerZ';
    const perpPos1 = (selectedBounds[perp1Key] + refBounds[perp1Key]) / 2;
    const perpPos2 = (selectedBounds[perp2Key] + refBounds[perp2Key]) / 2;

    // Check if parts are separated on this axis (gap exists)
    if (selectedBounds[maxKey] < refBounds[minKey]) {
      // Selected part is entirely before reference - show gap
      const gap = refBounds[minKey] - selectedBounds[maxKey];
      if (gap > 0.001) {
        indicators.push(
          createAxisAlignedIndicator(
            `gap-${axis}-${fromPartId}-${toPartId}`,
            axis,
            'edge-to-edge',
            fromPartId,
            toPartId,
            selectedBounds[maxKey],
            refBounds[minKey],
            perpPos1,
            perpPos2
          )
        );
      }
    } else if (selectedBounds[minKey] > refBounds[maxKey]) {
      // Selected part is entirely after reference - show gap
      const gap = selectedBounds[minKey] - refBounds[maxKey];
      if (gap > 0.001) {
        indicators.push(
          createAxisAlignedIndicator(
            `gap-${axis}-${fromPartId}-${toPartId}`,
            axis,
            'edge-to-edge',
            fromPartId,
            toPartId,
            selectedBounds[minKey],
            refBounds[maxKey],
            perpPos1,
            perpPos2
          )
        );
      }
    } else {
      // Parts overlap on this axis - show edge alignment offsets
      // Show offset between corresponding edges (min-to-min, max-to-max)

      // Min edge offset (e.g., left-to-left, bottom-to-bottom, back-to-back)
      const minOffset = Math.abs(selectedBounds[minKey] - refBounds[minKey]);
      if (minOffset > 0.001) {
        // Position the line at the outer edge of the parts
        const linePerp1 =
          axis === 'x'
            ? Math.min(selectedBounds.minY, refBounds.minY) - 1
            : axis === 'y'
              ? Math.max(selectedBounds.maxX, refBounds.maxX) + 1
              : Math.min(selectedBounds.minY, refBounds.minY) - 1;
        const linePerp2 =
          axis === 'x'
            ? Math.min(selectedBounds.minZ, refBounds.minZ) - 1
            : axis === 'y'
              ? (selectedBounds.centerZ + refBounds.centerZ) / 2
              : Math.min(selectedBounds.minX, refBounds.minX) - 1;

        indicators.push(
          createAxisAlignedIndicator(
            `offset-min-${axis}-${fromPartId}-${toPartId}`,
            axis,
            'edge-offset',
            fromPartId,
            toPartId,
            selectedBounds[minKey],
            refBounds[minKey],
            linePerp1,
            linePerp2
          )
        );
      }

      // Max edge offset (e.g., right-to-right, top-to-top, front-to-front)
      const maxOffset = Math.abs(selectedBounds[maxKey] - refBounds[maxKey]);
      if (maxOffset > 0.001) {
        // Position the line at the outer edge of the parts
        const linePerp1 =
          axis === 'x'
            ? Math.max(selectedBounds.maxY, refBounds.maxY) + 1
            : axis === 'y'
              ? Math.max(selectedBounds.maxX, refBounds.maxX) + 1
              : Math.max(selectedBounds.maxY, refBounds.maxY) + 1;
        const linePerp2 =
          axis === 'x'
            ? Math.max(selectedBounds.maxZ, refBounds.maxZ) + 1
            : axis === 'y'
              ? (selectedBounds.centerZ + refBounds.centerZ) / 2
              : Math.max(selectedBounds.maxX, refBounds.maxX) + 1;

        indicators.push(
          createAxisAlignedIndicator(
            `offset-max-${axis}-${fromPartId}-${toPartId}`,
            axis,
            'edge-offset',
            fromPartId,
            toPartId,
            selectedBounds[maxKey],
            refBounds[maxKey],
            linePerp1,
            linePerp2
          )
        );
      }
    }
  }

  return indicators;
}

// Calculate distance indicators from multiple dragging parts (as a group) to reference parts
export function calculateGroupReferenceDistances(
  draggingParts: Part[],
  dragDelta: { x: number; y: number; z: number },
  referenceParts: Part[]
): ReferenceDistanceIndicator[] {
  if (draggingParts.length === 0) return [];

  // Calculate combined bounds of all dragging parts with delta applied
  const selectedBounds = getCombinedBoundsAtPosition(draggingParts, dragDelta);
  const fromPartId = draggingParts.length === 1 ? draggingParts[0].id : 'selected-group';

  return calculateDistancesFromBounds(selectedBounds, fromPartId, referenceParts);
}

// Find the N nearest parts to the dragging part
export function getNearestParts(
  draggingBounds: PartBounds,
  allParts: Part[],
  draggingPartIds: string[],
  maxParts: number = 10
): Part[] {
  // Filter out the parts being dragged
  const otherParts = allParts.filter((p) => !draggingPartIds.includes(p.id));

  // Calculate distances and sort
  const partsWithDistance = otherParts.map((part) => {
    const bounds = getPartBounds(part);
    // Distance from center to center
    const dx = bounds.centerX - draggingBounds.centerX;
    const dy = bounds.centerY - draggingBounds.centerY;
    const dz = bounds.centerZ - draggingBounds.centerZ;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return { part, distance };
  });

  // Sort by distance and take nearest N
  partsWithDistance.sort((a, b) => a.distance - b.distance);
  return partsWithDistance.slice(0, maxParts).map((p) => p.part);
}

// Check for snaps on a single axis
function checkAxisSnaps(
  draggingMin: number,
  draggingMax: number,
  draggingCenter: number,
  targetBounds: PartBounds[],
  axis: 'x' | 'y' | 'z',
  threshold: number
): AxisSnap | null {
  const getAxisValues = (bounds: PartBounds) => {
    switch (axis) {
      case 'x':
        return { min: bounds.minX, max: bounds.maxX, center: bounds.centerX };
      case 'y':
        return { min: bounds.minY, max: bounds.maxY, center: bounds.centerY };
      case 'z':
        return { min: bounds.minZ, max: bounds.maxZ, center: bounds.centerZ };
    }
  };

  let bestSnap: AxisSnap | null = null;
  let bestDistance = threshold;

  for (const target of targetBounds) {
    const targetValues = getAxisValues(target);

    // Edge-to-edge snaps
    const edgeSnaps = [
      // Dragging min edge aligns with target min edge
      { delta: targetValues.min - draggingMin, value: targetValues.min, type: 'edge' as const },
      // Dragging min edge aligns with target max edge
      { delta: targetValues.max - draggingMin, value: targetValues.max, type: 'edge' as const },
      // Dragging max edge aligns with target min edge
      { delta: targetValues.min - draggingMax, value: targetValues.min, type: 'edge' as const },
      // Dragging max edge aligns with target max edge
      { delta: targetValues.max - draggingMax, value: targetValues.max, type: 'edge' as const }
    ];

    // Center-to-center snap
    const centerSnap = {
      delta: targetValues.center - draggingCenter,
      value: targetValues.center,
      type: 'center' as const
    };

    // Check all snaps
    for (const snap of [...edgeSnaps, centerSnap]) {
      const distance = Math.abs(snap.delta);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestSnap = {
          snapped: true,
          value: snap.value,
          delta: snap.delta,
          type: snap.type,
          targetPartId: target.id
        };
      }
    }
  }

  return bestSnap;
}

// Check for equal spacing snaps on a given axis
// Finds pairs of parts where the dragging part can be positioned with equal gaps on both sides
function checkEqualSpacingSnaps(
  draggingBounds: PartBounds,
  targetBounds: PartBounds[],
  axis: 'x' | 'y' | 'z',
  threshold: number
): EqualSpacingSnap | null {
  if (targetBounds.length < 2) return null;

  const getAxisValues = (bounds: PartBounds) => {
    switch (axis) {
      case 'x':
        return { min: bounds.minX, max: bounds.maxX, center: bounds.centerX, size: bounds.maxX - bounds.minX };
      case 'y':
        return { min: bounds.minY, max: bounds.maxY, center: bounds.centerY, size: bounds.maxY - bounds.minY };
      case 'z':
        return { min: bounds.minZ, max: bounds.maxZ, center: bounds.centerZ, size: bounds.maxZ - bounds.minZ };
    }
  };

  const draggingValues = getAxisValues(draggingBounds);
  const draggingSize = draggingValues.size;

  let bestSnap: EqualSpacingSnap | null = null;
  let bestDistance = threshold;

  // Check all pairs of target parts
  for (let i = 0; i < targetBounds.length; i++) {
    for (let j = i + 1; j < targetBounds.length; j++) {
      const bounds1 = targetBounds[i];
      const bounds2 = targetBounds[j];
      const values1 = getAxisValues(bounds1);
      const values2 = getAxisValues(bounds2);

      // Determine which part is "left" (lower coord) and which is "right" (higher coord)
      const [leftBounds, rightBounds, leftValues, rightValues] =
        values1.center < values2.center ? [bounds1, bounds2, values1, values2] : [bounds2, bounds1, values2, values1];

      // Calculate the gap between the two parts
      const totalGapSpace = rightValues.min - leftValues.max;

      // Skip if parts overlap or gap is too small for the dragging part
      if (totalGapSpace < draggingSize) continue;

      // Calculate where the dragging part center needs to be for equal spacing
      // equalGap = (totalGapSpace - draggingSize) / 2
      // dragging part min should be at: leftValues.max + equalGap
      // dragging part center should be at: leftValues.max + equalGap + (draggingSize / 2)
      const equalGap = (totalGapSpace - draggingSize) / 2;
      const targetCenter = leftValues.max + equalGap + draggingSize / 2;
      const delta = targetCenter - draggingValues.center;
      const distance = Math.abs(delta);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestSnap = {
          snapped: true,
          axis,
          delta,
          equalGap,
          part1Id: leftBounds.id,
          part2Id: rightBounds.id,
          part1Bounds: leftBounds,
          part2Bounds: rightBounds
        };
      }
    }
  }

  return bestSnap;
}

// Create distance indicators for a snap
// Shows distances from the dragging part to edges of the target part
function createDistanceIndicators(
  axis: 'x' | 'y' | 'z',
  type: 'edge' | 'center',
  draggingBounds: PartBounds,
  targetBounds: PartBounds
): SnapDistanceIndicator[] {
  const indicators: SnapDistanceIndicator[] = [];
  const LABEL_OFFSET = 0.5; // Offset for label visibility

  // For center snaps, show distance from dragging part to both edges of target
  if (type === 'center') {
    switch (axis) {
      case 'x': {
        // Distance from dragging part's min/max X to target's min/max X
        const distToMinEdge = draggingBounds.minX - targetBounds.minX;
        const distToMaxEdge = targetBounds.maxX - draggingBounds.maxX;
        const y = Math.max(draggingBounds.maxY, targetBounds.maxY) + LABEL_OFFSET;
        const z = (draggingBounds.centerZ + targetBounds.centerZ) / 2;

        if (distToMinEdge > 0.01) {
          indicators.push({
            start: { x: targetBounds.minX, y, z },
            end: { x: draggingBounds.minX, y, z },
            distance: distToMinEdge,
            labelPosition: { x: (targetBounds.minX + draggingBounds.minX) / 2, y: y + LABEL_OFFSET, z }
          });
        }
        if (distToMaxEdge > 0.01) {
          indicators.push({
            start: { x: draggingBounds.maxX, y, z },
            end: { x: targetBounds.maxX, y, z },
            distance: distToMaxEdge,
            labelPosition: { x: (draggingBounds.maxX + targetBounds.maxX) / 2, y: y + LABEL_OFFSET, z }
          });
        }
        break;
      }
      case 'y': {
        // Distance from dragging part's min/max Y to target's min/max Y
        const distToMinEdge = draggingBounds.minY - targetBounds.minY;
        const distToMaxEdge = targetBounds.maxY - draggingBounds.maxY;
        const x = Math.max(draggingBounds.maxX, targetBounds.maxX) + LABEL_OFFSET;
        const z = (draggingBounds.centerZ + targetBounds.centerZ) / 2;

        if (distToMinEdge > 0.01) {
          indicators.push({
            start: { x, y: targetBounds.minY, z },
            end: { x, y: draggingBounds.minY, z },
            distance: distToMinEdge,
            labelPosition: { x: x + LABEL_OFFSET, y: (targetBounds.minY + draggingBounds.minY) / 2, z }
          });
        }
        if (distToMaxEdge > 0.01) {
          indicators.push({
            start: { x, y: draggingBounds.maxY, z },
            end: { x, y: targetBounds.maxY, z },
            distance: distToMaxEdge,
            labelPosition: { x: x + LABEL_OFFSET, y: (draggingBounds.maxY + targetBounds.maxY) / 2, z }
          });
        }
        break;
      }
      case 'z': {
        // Distance from dragging part's min/max Z to target's min/max Z
        const distToMinEdge = draggingBounds.minZ - targetBounds.minZ;
        const distToMaxEdge = targetBounds.maxZ - draggingBounds.maxZ;
        const x = (draggingBounds.centerX + targetBounds.centerX) / 2;
        const y = Math.max(draggingBounds.maxY, targetBounds.maxY) + LABEL_OFFSET;

        if (distToMinEdge > 0.01) {
          indicators.push({
            start: { x, y, z: targetBounds.minZ },
            end: { x, y, z: draggingBounds.minZ },
            distance: distToMinEdge,
            labelPosition: { x, y: y + LABEL_OFFSET, z: (targetBounds.minZ + draggingBounds.minZ) / 2 }
          });
        }
        if (distToMaxEdge > 0.01) {
          indicators.push({
            start: { x, y, z: draggingBounds.maxZ },
            end: { x, y, z: targetBounds.maxZ },
            distance: distToMaxEdge,
            labelPosition: { x, y: y + LABEL_OFFSET, z: (draggingBounds.maxZ + targetBounds.maxZ) / 2 }
          });
        }
        break;
      }
    }
  } else {
    // For edge snaps, show the gap or overlap between parts on perpendicular axes
    // This helps show how far the dragged part extends beyond or falls short of the target
    switch (axis) {
      case 'x': {
        // When X edges are aligned, show Z distances (how far apart or overlapping in Z)
        const y = Math.max(draggingBounds.maxY, targetBounds.maxY) + LABEL_OFFSET;

        // Distance from dragging part's edge to target's near/far Z edges
        if (draggingBounds.maxZ < targetBounds.minZ || draggingBounds.minZ > targetBounds.maxZ) {
          // Parts don't overlap in Z - show the gap
          const gap =
            draggingBounds.maxZ < targetBounds.minZ
              ? targetBounds.minZ - draggingBounds.maxZ
              : draggingBounds.minZ - targetBounds.maxZ;
          const zStart = draggingBounds.maxZ < targetBounds.minZ ? draggingBounds.maxZ : targetBounds.maxZ;
          const zEnd = draggingBounds.maxZ < targetBounds.minZ ? targetBounds.minZ : draggingBounds.minZ;
          const x = (draggingBounds.centerX + targetBounds.centerX) / 2;

          if (gap > 0.01) {
            indicators.push({
              start: { x, y, z: zStart },
              end: { x, y, z: zEnd },
              distance: gap,
              labelPosition: { x, y: y + LABEL_OFFSET, z: (zStart + zEnd) / 2 }
            });
          }
        }
        break;
      }
      case 'z': {
        // When Z edges are aligned, show X distances
        const y = Math.max(draggingBounds.maxY, targetBounds.maxY) + LABEL_OFFSET;

        if (draggingBounds.maxX < targetBounds.minX || draggingBounds.minX > targetBounds.maxX) {
          // Parts don't overlap in X - show the gap
          const gap =
            draggingBounds.maxX < targetBounds.minX
              ? targetBounds.minX - draggingBounds.maxX
              : draggingBounds.minX - targetBounds.maxX;
          const xStart = draggingBounds.maxX < targetBounds.minX ? draggingBounds.maxX : targetBounds.maxX;
          const xEnd = draggingBounds.maxX < targetBounds.minX ? targetBounds.minX : draggingBounds.minX;
          const z = (draggingBounds.centerZ + targetBounds.centerZ) / 2;

          if (gap > 0.01) {
            indicators.push({
              start: { x: xStart, y, z },
              end: { x: xEnd, y, z },
              distance: gap,
              labelPosition: { x: (xStart + xEnd) / 2, y: y + LABEL_OFFSET, z }
            });
          }
        }
        break;
      }
      // Y edge snaps don't typically need distance indicators
    }
  }

  return indicators;
}

// Create alignment line for visualization
function createSnapLine(
  axis: 'x' | 'y' | 'z',
  snapValue: number,
  type: 'edge' | 'center',
  draggingBounds: PartBounds,
  targetBounds: PartBounds
): SnapLine {
  // Create a line that spans between the dragging part and target part
  // The line extends along the perpendicular axes

  const LINE_EXTENSION = 20; // How far to extend the line beyond the parts

  // Calculate distance indicators
  const distanceIndicators = createDistanceIndicators(axis, type, draggingBounds, targetBounds);

  switch (axis) {
    case 'x': {
      // Line along Y and Z at the snap X value
      const minZ = Math.min(draggingBounds.minZ, targetBounds.minZ) - LINE_EXTENSION;
      const maxZ = Math.max(draggingBounds.maxZ, targetBounds.maxZ) + LINE_EXTENSION;
      const avgY = (draggingBounds.centerY + targetBounds.centerY) / 2;
      return {
        axis: 'x',
        type,
        start: { x: snapValue, y: avgY, z: minZ },
        end: { x: snapValue, y: avgY, z: maxZ },
        snapValue,
        distanceIndicators: distanceIndicators.length > 0 ? distanceIndicators : undefined
      };
    }
    case 'y': {
      // Line along X at the snap Y value
      const minX = Math.min(draggingBounds.minX, targetBounds.minX) - LINE_EXTENSION;
      const maxX = Math.max(draggingBounds.maxX, targetBounds.maxX) + LINE_EXTENSION;
      const avgZ = (draggingBounds.centerZ + targetBounds.centerZ) / 2;
      return {
        axis: 'y',
        type,
        start: { x: minX, y: snapValue, z: avgZ },
        end: { x: maxX, y: snapValue, z: avgZ },
        snapValue,
        distanceIndicators: distanceIndicators.length > 0 ? distanceIndicators : undefined
      };
    }
    case 'z': {
      // Line along X at the snap Z value
      const minX = Math.min(draggingBounds.minX, targetBounds.minX) - LINE_EXTENSION;
      const maxX = Math.max(draggingBounds.maxX, targetBounds.maxX) + LINE_EXTENSION;
      const avgY = (draggingBounds.centerY + targetBounds.centerY) / 2;
      return {
        axis: 'z',
        type,
        start: { x: minX, y: avgY, z: snapValue },
        end: { x: maxX, y: avgY, z: snapValue },
        snapValue,
        distanceIndicators: distanceIndicators.length > 0 ? distanceIndicators : undefined
      };
    }
  }
}

// Create snap lines for equal spacing visualization
function createEqualSpacingSnapLines(
  axis: 'x' | 'y' | 'z',
  equalGap: number,
  draggingBounds: PartBounds,
  part1Bounds: PartBounds,
  part2Bounds: PartBounds
): SnapLine[] {
  const snapLines: SnapLine[] = [];
  const LABEL_OFFSET = 0.5;

  // Determine which part is left and which is right
  const getAxisCenter = (bounds: PartBounds) => {
    switch (axis) {
      case 'x':
        return bounds.centerX;
      case 'y':
        return bounds.centerY;
      case 'z':
        return bounds.centerZ;
    }
  };

  const [leftBounds, rightBounds] =
    getAxisCenter(part1Bounds) < getAxisCenter(part2Bounds) ? [part1Bounds, part2Bounds] : [part2Bounds, part1Bounds];

  // Create distance indicators for both gaps
  const indicators: SnapDistanceIndicator[] = [];

  switch (axis) {
    case 'x': {
      const y = Math.max(draggingBounds.maxY, leftBounds.maxY, rightBounds.maxY) + LABEL_OFFSET;
      const z = (draggingBounds.centerZ + leftBounds.centerZ + rightBounds.centerZ) / 3;

      // Left gap indicator (from left part's max to dragging part's min)
      indicators.push({
        start: { x: leftBounds.maxX, y, z },
        end: { x: draggingBounds.minX, y, z },
        distance: equalGap,
        labelPosition: { x: (leftBounds.maxX + draggingBounds.minX) / 2, y: y + LABEL_OFFSET, z }
      });

      // Right gap indicator (from dragging part's max to right part's min)
      indicators.push({
        start: { x: draggingBounds.maxX, y, z },
        end: { x: rightBounds.minX, y, z },
        distance: equalGap,
        labelPosition: { x: (draggingBounds.maxX + rightBounds.minX) / 2, y: y + LABEL_OFFSET, z }
      });

      // Create the snap line at the center of the dragging part
      const minZ = Math.min(draggingBounds.minZ, leftBounds.minZ, rightBounds.minZ) - 5;
      const maxZ = Math.max(draggingBounds.maxZ, leftBounds.maxZ, rightBounds.maxZ) + 5;
      snapLines.push({
        axis: 'x',
        type: 'equal-spacing',
        start: { x: draggingBounds.centerX, y, z: minZ },
        end: { x: draggingBounds.centerX, y, z: maxZ },
        snapValue: draggingBounds.centerX,
        distanceIndicators: indicators
      });
      break;
    }
    case 'y': {
      const x = Math.max(draggingBounds.maxX, leftBounds.maxX, rightBounds.maxX) + LABEL_OFFSET;
      const z = (draggingBounds.centerZ + leftBounds.centerZ + rightBounds.centerZ) / 3;

      // Bottom gap indicator
      indicators.push({
        start: { x, y: leftBounds.maxY, z },
        end: { x, y: draggingBounds.minY, z },
        distance: equalGap,
        labelPosition: { x: x + LABEL_OFFSET, y: (leftBounds.maxY + draggingBounds.minY) / 2, z }
      });

      // Top gap indicator
      indicators.push({
        start: { x, y: draggingBounds.maxY, z },
        end: { x, y: rightBounds.minY, z },
        distance: equalGap,
        labelPosition: { x: x + LABEL_OFFSET, y: (draggingBounds.maxY + rightBounds.minY) / 2, z }
      });

      // Create the snap line at the center of the dragging part
      const minX = Math.min(draggingBounds.minX, leftBounds.minX, rightBounds.minX) - 5;
      const maxX = Math.max(draggingBounds.maxX, leftBounds.maxX, rightBounds.maxX) + 5;
      snapLines.push({
        axis: 'y',
        type: 'equal-spacing',
        start: { x: minX, y: draggingBounds.centerY, z },
        end: { x: maxX, y: draggingBounds.centerY, z },
        snapValue: draggingBounds.centerY,
        distanceIndicators: indicators
      });
      break;
    }
    case 'z': {
      const x = (draggingBounds.centerX + leftBounds.centerX + rightBounds.centerX) / 3;
      const y = Math.max(draggingBounds.maxY, leftBounds.maxY, rightBounds.maxY) + LABEL_OFFSET;

      // Front gap indicator
      indicators.push({
        start: { x, y, z: leftBounds.maxZ },
        end: { x, y, z: draggingBounds.minZ },
        distance: equalGap,
        labelPosition: { x, y: y + LABEL_OFFSET, z: (leftBounds.maxZ + draggingBounds.minZ) / 2 }
      });

      // Back gap indicator
      indicators.push({
        start: { x, y, z: draggingBounds.maxZ },
        end: { x, y, z: rightBounds.minZ },
        distance: equalGap,
        labelPosition: { x, y: y + LABEL_OFFSET, z: (draggingBounds.maxZ + rightBounds.minZ) / 2 }
      });

      // Create the snap line at the center of the dragging part
      const minX = Math.min(draggingBounds.minX, leftBounds.minX, rightBounds.minX) - 5;
      const maxX = Math.max(draggingBounds.maxX, leftBounds.maxX, rightBounds.maxX) + 5;
      snapLines.push({
        axis: 'z',
        type: 'equal-spacing',
        start: { x: minX, y, z: draggingBounds.centerZ },
        end: { x: maxX, y, z: draggingBounds.centerZ },
        snapValue: draggingBounds.centerZ,
        distanceIndicators: indicators
      });
      break;
    }
  }

  return snapLines;
}

// Main snap detection function
export function detectSnaps(
  draggingPart: Part,
  currentPosition: { x: number; y: number; z: number },
  allParts: Part[],
  draggingPartIds: string[],
  snapThreshold: number = 0.5 // Default threshold in inches
): SnapResult {
  // Get bounds of dragging part at current position
  const draggingBounds = getPartBoundsAtPosition(draggingPart, currentPosition);

  // Find nearest parts to check for snaps
  const nearestParts = getNearestParts(draggingBounds, allParts, draggingPartIds);

  // Get bounds for all target parts
  const targetBounds = nearestParts.map((p) => getPartBounds(p));

  // Check for snaps on each axis
  const xSnap = checkAxisSnaps(
    draggingBounds.minX,
    draggingBounds.maxX,
    draggingBounds.centerX,
    targetBounds,
    'x',
    snapThreshold
  );
  const ySnap = checkAxisSnaps(
    draggingBounds.minY,
    draggingBounds.maxY,
    draggingBounds.centerY,
    targetBounds,
    'y',
    snapThreshold
  );
  const zSnap = checkAxisSnaps(
    draggingBounds.minZ,
    draggingBounds.maxZ,
    draggingBounds.centerZ,
    targetBounds,
    'z',
    snapThreshold
  );

  // Check for equal spacing snaps (with slightly larger threshold to catch them)
  const equalSpacingThreshold = snapThreshold * 1.5;
  const xEqualSnap = checkEqualSpacingSnaps(draggingBounds, targetBounds, 'x', equalSpacingThreshold);
  const yEqualSnap = checkEqualSpacingSnaps(draggingBounds, targetBounds, 'y', equalSpacingThreshold);
  const zEqualSnap = checkEqualSpacingSnaps(draggingBounds, targetBounds, 'z', equalSpacingThreshold);

  // Determine which snap to use for each axis
  // Edge/center snaps take priority if they're closer, but equal spacing can win if edge/center is not present
  const effectiveXDelta = xSnap
    ? xEqualSnap && Math.abs(xEqualSnap.delta) < Math.abs(xSnap.delta)
      ? xEqualSnap.delta
      : xSnap.delta
    : (xEqualSnap?.delta ?? 0);
  const effectiveYDelta = ySnap
    ? yEqualSnap && Math.abs(yEqualSnap.delta) < Math.abs(ySnap.delta)
      ? yEqualSnap.delta
      : ySnap.delta
    : (yEqualSnap?.delta ?? 0);
  const effectiveZDelta = zSnap
    ? zEqualSnap && Math.abs(zEqualSnap.delta) < Math.abs(zSnap.delta)
      ? zEqualSnap.delta
      : zSnap.delta
    : (zEqualSnap?.delta ?? 0);

  // Track which type of snap was used
  const useXEqualSnap =
    (!xSnap && xEqualSnap) || (xSnap && xEqualSnap && Math.abs(xEqualSnap.delta) < Math.abs(xSnap.delta));
  const useYEqualSnap =
    (!ySnap && yEqualSnap) || (ySnap && yEqualSnap && Math.abs(yEqualSnap.delta) < Math.abs(ySnap.delta));
  const useZEqualSnap =
    (!zSnap && zEqualSnap) || (zSnap && zEqualSnap && Math.abs(zEqualSnap.delta) < Math.abs(zSnap.delta));

  // Calculate adjusted position
  const adjustedPosition = {
    x: currentPosition.x + effectiveXDelta,
    y: currentPosition.y + effectiveYDelta,
    z: currentPosition.z + effectiveZDelta
  };

  // Create snap lines for visualization
  const snapLines: SnapLine[] = [];

  // Get updated bounds after snap adjustment
  const adjustedBounds = getPartBoundsAtPosition(draggingPart, adjustedPosition);

  // Create snap lines for X axis
  if (useXEqualSnap && xEqualSnap) {
    snapLines.push(
      ...createEqualSpacingSnapLines(
        'x',
        xEqualSnap.equalGap,
        adjustedBounds,
        xEqualSnap.part1Bounds,
        xEqualSnap.part2Bounds
      )
    );
  } else if (xSnap) {
    const targetPart = nearestParts.find((p) => p.id === xSnap.targetPartId);
    if (targetPart) {
      snapLines.push(createSnapLine('x', xSnap.value, xSnap.type, adjustedBounds, getPartBounds(targetPart)));
    }
  }

  // Create snap lines for Y axis
  if (useYEqualSnap && yEqualSnap) {
    snapLines.push(
      ...createEqualSpacingSnapLines(
        'y',
        yEqualSnap.equalGap,
        adjustedBounds,
        yEqualSnap.part1Bounds,
        yEqualSnap.part2Bounds
      )
    );
  } else if (ySnap) {
    const targetPart = nearestParts.find((p) => p.id === ySnap.targetPartId);
    if (targetPart) {
      snapLines.push(createSnapLine('y', ySnap.value, ySnap.type, adjustedBounds, getPartBounds(targetPart)));
    }
  }

  // Create snap lines for Z axis
  if (useZEqualSnap && zEqualSnap) {
    snapLines.push(
      ...createEqualSpacingSnapLines(
        'z',
        zEqualSnap.equalGap,
        adjustedBounds,
        zEqualSnap.part1Bounds,
        zEqualSnap.part2Bounds
      )
    );
  } else if (zSnap) {
    const targetPart = nearestParts.find((p) => p.id === zSnap.targetPartId);
    if (targetPart) {
      snapLines.push(createSnapLine('z', zSnap.value, zSnap.type, adjustedBounds, getPartBounds(targetPart)));
    }
  }

  return {
    adjustedPosition,
    snappedX: !!xSnap || !!useXEqualSnap,
    snappedY: !!ySnap || !!useYEqualSnap,
    snappedZ: !!zSnap || !!useZEqualSnap,
    snapLines
  };
}

// Sensitivity multipliers for snap threshold
const SENSITIVITY_MULTIPLIERS = {
  tight: 0.5, // Half the normal threshold (more precise)
  normal: 1.0, // Default threshold
  loose: 2.0 // Double the normal threshold (easier to snap)
};

// Calculate snap threshold based on camera distance (zoom level) and sensitivity setting
export function calculateSnapThreshold(
  cameraDistance: number,
  sensitivity: 'tight' | 'normal' | 'loose' = 'normal'
): number {
  // Base threshold at a "normal" viewing distance of ~50 units
  const BASE_THRESHOLD = 0.5; // 1/2 inch at normal zoom
  const BASE_DISTANCE = 50;

  // Scale threshold proportionally to camera distance
  // Closer zoom = smaller threshold (more precision)
  // Further zoom = larger threshold (easier to snap)
  const scaleFactor = cameraDistance / BASE_DISTANCE;

  // Apply sensitivity multiplier
  const sensitivityMultiplier = SENSITIVITY_MULTIPLIERS[sensitivity] ?? 1.0;

  // Clamp between min and max thresholds (adjusted for sensitivity)
  const MIN_THRESHOLD = 0.125 * sensitivityMultiplier; // 1/8 inch minimum (adjusted)
  const MAX_THRESHOLD = 2 * sensitivityMultiplier; // 2 inch maximum (adjusted)

  return Math.max(MIN_THRESHOLD, Math.min(MAX_THRESHOLD, BASE_THRESHOLD * scaleFactor * sensitivityMultiplier));
}

// Standard dimensions to snap to for length/width (in inches)
export const STANDARD_DIMENSIONS_IMPERIAL = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 30, 36, 42, 48, 60, 72, 84, 96];

// Standard dimensions for metric length/width (in inches, converted from mm)
export const STANDARD_DIMENSIONS_METRIC = [
  150 / 25.4,
  200 / 25.4,
  250 / 25.4,
  300 / 25.4,
  400 / 25.4,
  450 / 25.4,
  500 / 25.4,
  600 / 25.4,
  750 / 25.4,
  900 / 25.4,
  1000 / 25.4,
  1200 / 25.4,
  1500 / 25.4,
  1800 / 25.4,
  2000 / 25.4,
  2400 / 25.4
];

// Standard lumber/plywood thicknesses (in inches)
// Includes common nominal and actual sizes
export const STANDARD_THICKNESSES_IMPERIAL = [
  0.25, // 1/4" (plywood, hardboard)
  0.375, // 3/8" (plywood)
  0.5, // 1/2" (plywood)
  0.625, // 5/8" (plywood)
  0.75, // 3/4" (plywood, 1x lumber actual)
  1.0, // 1" (5/4 lumber actual ~1.0")
  1.125, // 1-1/8" (5/4 lumber actual)
  1.5, // 1-1/2" (2x lumber actual)
  1.75, // 1-3/4" (some hardwoods)
  2.0, // 2" (thick stock)
  2.5, // 2-1/2"
  3.0, // 3" (4x lumber actual ~3.5")
  3.5 // 3-1/2" (4x lumber actual)
];

// Standard thicknesses for metric (in inches, converted from mm)
export const STANDARD_THICKNESSES_METRIC = [
  6 / 25.4, // 6mm
  9 / 25.4, // 9mm
  12 / 25.4, // 12mm
  15 / 25.4, // 15mm
  18 / 25.4, // 18mm (common plywood)
  19 / 25.4, // 19mm
  22 / 25.4, // 22mm
  25 / 25.4, // 25mm
  30 / 25.4, // 30mm
  38 / 25.4, // 38mm
  40 / 25.4, // 40mm
  50 / 25.4 // 50mm
];

// Result of dimension snap detection during resize
export interface DimensionSnapResult {
  snapped: boolean;
  dimension: 'length' | 'width' | 'thickness'; // The dimension being resized
  targetValue: number;
  delta: number; // How much to adjust the dimension
  // For part-based snaps
  matchedPartId: string | null;
  matchedPartName: string | null;
  matchedPartBounds: PartBounds | null;
  matchedDimension: 'length' | 'width' | 'thickness' | null; // Which dimension of the target part matched
  // For standard dimension snaps
  isStandardDimension: boolean;
}

// Detect dimension matches during resize
// Returns snap suggestions for dimensions that match reference parts or standard dimensions
export function detectDimensionSnaps(
  currentDimensions: { length: number; width: number; thickness: number },
  resizingDimensions: { length: boolean; width: boolean; thickness: boolean },
  targetParts: Part[],
  resizingPartId: string,
  threshold: number,
  sameTypeOnly: boolean = false, // When true, only match same dimension types (length to length, etc.)
  units: 'imperial' | 'metric' = 'imperial', // For standard dimension selection
  enableStandardSnap: boolean = true // Whether to also snap to standard dimensions
): DimensionSnapResult[] {
  const results: DimensionSnapResult[] = [];

  // Get unique dimensions from target parts (excluding the resizing part)
  const otherParts = targetParts.filter((p) => p.id !== resizingPartId);

  // Get standard dimensions based on unit system and dimension type
  const getStandardDimensions = (dim: 'length' | 'width' | 'thickness') => {
    if (dim === 'thickness') {
      // Use lumber/plywood thickness standards
      return units === 'metric' ? STANDARD_THICKNESSES_METRIC : STANDARD_THICKNESSES_IMPERIAL;
    }
    // Use length/width standards for length and width
    return units === 'metric' ? STANDARD_DIMENSIONS_METRIC : STANDARD_DIMENSIONS_IMPERIAL;
  };

  // For each dimension being resized, check for matches
  const dimensionTypes: Array<'length' | 'width' | 'thickness'> = ['length', 'width', 'thickness'];

  for (const dim of dimensionTypes) {
    if (!resizingDimensions[dim]) continue;

    const currentValue = currentDimensions[dim];
    let bestMatch: DimensionSnapResult | null = null;
    let bestDistance = threshold;

    // Check part dimensions
    for (const part of otherParts) {
      // Determine which dimensions to check based on sameTypeOnly setting
      const dimensionsToCheck = sameTypeOnly ? [dim] : dimensionTypes;

      for (const targetDim of dimensionsToCheck) {
        const targetValue = part[targetDim];
        const distance = Math.abs(currentValue - targetValue);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = {
            snapped: true,
            dimension: dim,
            targetValue,
            delta: targetValue - currentValue,
            matchedPartId: part.id,
            matchedPartName: part.name,
            matchedPartBounds: getPartBounds(part),
            matchedDimension: targetDim,
            isStandardDimension: false
          };
        }
      }
    }

    // Check standard dimensions (if enabled) - use appropriate standards for this dimension type
    if (enableStandardSnap) {
      const standardDimensions = getStandardDimensions(dim);
      for (const standardValue of standardDimensions) {
        const distance = Math.abs(currentValue - standardValue);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = {
            snapped: true,
            dimension: dim,
            targetValue: standardValue,
            delta: standardValue - currentValue,
            matchedPartId: null,
            matchedPartName: null,
            matchedPartBounds: null,
            matchedDimension: null,
            isStandardDimension: true
          };
        }
      }
    }

    if (bestMatch) {
      results.push(bestMatch);
    }
  }

  return results;
}

// Extended snap line info for dimension matching (includes source info)
export interface DimensionSnapLineInfo {
  snapLine: SnapLine;
  // Additional metadata for enhanced display
  sourceInfo: {
    isStandard: boolean;
    partName: string | null;
    matchedDimension: 'length' | 'width' | 'thickness' | null;
  };
  // Optional connector line to matched part
  connectorLine?: {
    start: { x: number; y: number; z: number };
    end: { x: number; y: number; z: number };
  };
}

// Create visual feedback lines for dimension matching
// Uses actual part bounds (which account for rotation) instead of raw dimensions
export function createDimensionMatchSnapLine(snap: DimensionSnapResult, resizingPartBounds: PartBounds): SnapLine {
  const { matchedPartBounds, dimension, targetValue } = snap;

  // Create a line showing the matched dimension
  // Position it near the resizing part using actual bounds (rotation-aware)
  const OFFSET = 2; // Distance to offset the indicator line from the part
  const y = matchedPartBounds
    ? Math.max(resizingPartBounds.maxY, matchedPartBounds.maxY) + 1
    : resizingPartBounds.maxY + 1;

  // Create axis based on which dimension matched
  // The line should represent the dimension visually
  let axis: 'x' | 'y' | 'z';
  let start: { x: number; y: number; z: number };
  let end: { x: number; y: number; z: number };

  switch (dimension) {
    case 'length':
      axis = 'x';
      // Show a horizontal line representing the matched length, positioned above and in front of the part
      start = {
        x: resizingPartBounds.centerX - targetValue / 2,
        y,
        z: resizingPartBounds.minZ - OFFSET
      };
      end = {
        x: resizingPartBounds.centerX + targetValue / 2,
        y,
        z: resizingPartBounds.minZ - OFFSET
      };
      break;
    case 'width':
      axis = 'z';
      // Show a line representing the matched width, positioned above and to the side of the part
      start = {
        x: resizingPartBounds.maxX + OFFSET,
        y,
        z: resizingPartBounds.centerZ - targetValue / 2
      };
      end = {
        x: resizingPartBounds.maxX + OFFSET,
        y,
        z: resizingPartBounds.centerZ + targetValue / 2
      };
      break;
    case 'thickness':
    default:
      axis = 'y';
      // Show a vertical line representing the matched thickness, positioned to the side of the part
      start = {
        x: resizingPartBounds.maxX + OFFSET,
        y: resizingPartBounds.centerY - targetValue / 2,
        z: resizingPartBounds.minZ - OFFSET
      };
      end = {
        x: resizingPartBounds.maxX + OFFSET,
        y: resizingPartBounds.centerY + targetValue / 2,
        z: resizingPartBounds.minZ - OFFSET
      };
      break;
  }

  return {
    axis,
    type: 'dimension-match',
    start,
    end,
    snapValue: targetValue,
    distanceIndicators: [
      {
        start,
        end,
        distance: targetValue,
        labelPosition: {
          x: (start.x + end.x) / 2,
          y: (start.y + end.y) / 2 + 0.5,
          z: (start.z + end.z) / 2
        }
      }
    ]
  };
}

// Create enhanced dimension snap visualization with source info and connector line
export function createEnhancedDimensionSnapLine(
  snap: DimensionSnapResult,
  resizingPartBounds: PartBounds
): DimensionSnapLineInfo {
  const { matchedPartBounds, dimension, targetValue, matchedPartName, matchedDimension, isStandardDimension } = snap;

  const OFFSET = 2;
  const y = matchedPartBounds
    ? Math.max(resizingPartBounds.maxY, matchedPartBounds.maxY) + 1
    : resizingPartBounds.maxY + 1;

  let axis: 'x' | 'y' | 'z';
  let start: { x: number; y: number; z: number };
  let end: { x: number; y: number; z: number };

  switch (dimension) {
    case 'length':
      axis = 'x';
      start = {
        x: resizingPartBounds.centerX - targetValue / 2,
        y,
        z: resizingPartBounds.minZ - OFFSET
      };
      end = {
        x: resizingPartBounds.centerX + targetValue / 2,
        y,
        z: resizingPartBounds.minZ - OFFSET
      };
      break;
    case 'width':
      axis = 'z';
      start = {
        x: resizingPartBounds.maxX + OFFSET,
        y,
        z: resizingPartBounds.centerZ - targetValue / 2
      };
      end = {
        x: resizingPartBounds.maxX + OFFSET,
        y,
        z: resizingPartBounds.centerZ + targetValue / 2
      };
      break;
    case 'thickness':
    default:
      axis = 'y';
      start = {
        x: resizingPartBounds.maxX + OFFSET,
        y: resizingPartBounds.centerY - targetValue / 2,
        z: resizingPartBounds.minZ - OFFSET
      };
      end = {
        x: resizingPartBounds.maxX + OFFSET,
        y: resizingPartBounds.centerY + targetValue / 2,
        z: resizingPartBounds.minZ - OFFSET
      };
      break;
  }

  const result: DimensionSnapLineInfo = {
    snapLine: {
      axis,
      type: 'dimension-match',
      start,
      end,
      snapValue: targetValue,
      distanceIndicators: [
        {
          start,
          end,
          distance: targetValue,
          labelPosition: {
            x: (start.x + end.x) / 2,
            y: (start.y + end.y) / 2 + 0.5,
            z: (start.z + end.z) / 2
          }
        }
      ]
    },
    sourceInfo: {
      isStandard: isStandardDimension,
      partName: matchedPartName,
      matchedDimension: matchedDimension
    }
  };

  // Add connector line to matched part (if not a standard dimension)
  if (matchedPartBounds && !isStandardDimension) {
    const labelPos = result.snapLine.distanceIndicators![0].labelPosition;
    result.connectorLine = {
      start: labelPos,
      end: {
        x: matchedPartBounds.centerX,
        y: matchedPartBounds.maxY + 0.5,
        z: matchedPartBounds.centerZ
      }
    };
  }

  return result;
}

// Result of guide snap detection
export interface GuideSnapResult {
  axis: 'x' | 'y' | 'z';
  snapped: boolean;
  value: number;
  delta: number;
  guideId: string;
}

// Detect snaps to persistent guides
export function detectGuideSnaps(
  draggingBounds: PartBounds,
  guides: SnapGuide[],
  threshold: number
): { x: GuideSnapResult | null; y: GuideSnapResult | null; z: GuideSnapResult | null } {
  const result = {
    x: null as GuideSnapResult | null,
    y: null as GuideSnapResult | null,
    z: null as GuideSnapResult | null
  };

  for (const guide of guides) {
    const { axis, position, id } = guide;

    // Get the bounds values for this axis
    let min: number, max: number, center: number;
    switch (axis) {
      case 'x':
        min = draggingBounds.minX;
        max = draggingBounds.maxX;
        center = draggingBounds.centerX;
        break;
      case 'y':
        min = draggingBounds.minY;
        max = draggingBounds.maxY;
        center = draggingBounds.centerY;
        break;
      case 'z':
        min = draggingBounds.minZ;
        max = draggingBounds.maxZ;
        center = draggingBounds.centerZ;
        break;
    }

    // Check different snap points
    const snapPoints = [
      { delta: position - min, name: 'min' },
      { delta: position - max, name: 'max' },
      { delta: position - center, name: 'center' }
    ];

    for (const snap of snapPoints) {
      const distance = Math.abs(snap.delta);
      if (distance < threshold) {
        const currentBest = result[axis];
        if (!currentBest || distance < Math.abs(currentBest.delta)) {
          result[axis] = {
            axis,
            snapped: true,
            value: position,
            delta: snap.delta,
            guideId: id
          };
        }
      }
    }
  }

  return result;
}

// Create snap line for guide visualization
export function createGuideSnapLine(guide: SnapGuide, draggingBounds: PartBounds): SnapLine {
  const { axis, position } = guide;
  const LINE_EXTENSION = 30;

  switch (axis) {
    case 'x': {
      // Vertical plane at X = position
      const minZ = Math.min(draggingBounds.minZ, -LINE_EXTENSION);
      const maxZ = Math.max(draggingBounds.maxZ, LINE_EXTENSION);
      const avgY = draggingBounds.centerY;
      return {
        axis: 'x',
        type: 'face',
        start: { x: position, y: avgY, z: minZ },
        end: { x: position, y: avgY, z: maxZ },
        snapValue: position
      };
    }
    case 'y': {
      // Horizontal plane at Y = position
      const minX = Math.min(draggingBounds.minX, -LINE_EXTENSION);
      const maxX = Math.max(draggingBounds.maxX, LINE_EXTENSION);
      const avgZ = draggingBounds.centerZ;
      return {
        axis: 'y',
        type: 'face',
        start: { x: minX, y: position, z: avgZ },
        end: { x: maxX, y: position, z: avgZ },
        snapValue: position
      };
    }
    case 'z':
    default: {
      // Vertical plane at Z = position
      const minX = Math.min(draggingBounds.minX, -LINE_EXTENSION);
      const maxX = Math.max(draggingBounds.maxX, LINE_EXTENSION);
      const avgY = draggingBounds.centerY;
      return {
        axis: 'z',
        type: 'face',
        start: { x: minX, y: avgY, z: position },
        end: { x: maxX, y: avgY, z: position },
        snapValue: position
      };
    }
  }
}

// ============================================================
// ORIGIN SNAP DETECTION
// Snap parts to workspace origin planes (X=0, Y=0, Z=0)
// ============================================================

export interface OriginSnapResult {
  delta: number;
  snapType: 'min' | 'max' | 'center';
}

// Detect snaps to origin planes (X=0, Y=0, Z=0)
export function detectOriginSnaps(
  draggingBounds: PartBounds,
  threshold: number
): { x: OriginSnapResult | null; y: OriginSnapResult | null; z: OriginSnapResult | null } {
  const result = {
    x: null as OriginSnapResult | null,
    y: null as OriginSnapResult | null,
    z: null as OriginSnapResult | null
  };

  // Check X=0 plane
  const xSnapPoints = [
    { delta: -draggingBounds.minX, type: 'min' as const },
    { delta: -draggingBounds.maxX, type: 'max' as const },
    { delta: -draggingBounds.centerX, type: 'center' as const }
  ];
  for (const snap of xSnapPoints) {
    if (Math.abs(snap.delta) < threshold) {
      if (!result.x || Math.abs(snap.delta) < Math.abs(result.x.delta)) {
        result.x = { delta: snap.delta, snapType: snap.type };
      }
    }
  }

  // Check Y=0 plane (ground - usually only snap min edge to ground)
  const ySnapPoints = [
    { delta: -draggingBounds.minY, type: 'min' as const },
    { delta: -draggingBounds.centerY, type: 'center' as const }
  ];
  for (const snap of ySnapPoints) {
    if (Math.abs(snap.delta) < threshold) {
      if (!result.y || Math.abs(snap.delta) < Math.abs(result.y.delta)) {
        result.y = { delta: snap.delta, snapType: snap.type };
      }
    }
  }

  // Check Z=0 plane
  const zSnapPoints = [
    { delta: -draggingBounds.minZ, type: 'min' as const },
    { delta: -draggingBounds.maxZ, type: 'max' as const },
    { delta: -draggingBounds.centerZ, type: 'center' as const }
  ];
  for (const snap of zSnapPoints) {
    if (Math.abs(snap.delta) < threshold) {
      if (!result.z || Math.abs(snap.delta) < Math.abs(result.z.delta)) {
        result.z = { delta: snap.delta, snapType: snap.type };
      }
    }
  }

  return result;
}

// Create visual snap line for origin snap
export function createOriginSnapLine(
  axis: 'x' | 'y' | 'z',
  snapType: 'min' | 'max' | 'center',
  draggingBounds: PartBounds
): SnapLine {
  const LINE_EXTENSION = 30;

  switch (axis) {
    case 'x': {
      // Line along Z axis at X=0
      const minZ = Math.min(draggingBounds.minZ, -LINE_EXTENSION);
      const maxZ = Math.max(draggingBounds.maxZ, LINE_EXTENSION);
      const y = draggingBounds.centerY;
      return {
        axis: 'x',
        type: snapType === 'center' ? 'center' : 'edge',
        start: { x: 0, y, z: minZ },
        end: { x: 0, y, z: maxZ },
        snapValue: 0
      };
    }
    case 'y': {
      // Line along X axis at Y=0
      const minX = Math.min(draggingBounds.minX, -LINE_EXTENSION);
      const maxX = Math.max(draggingBounds.maxX, LINE_EXTENSION);
      const z = draggingBounds.centerZ;
      return {
        axis: 'y',
        type: snapType === 'center' ? 'center' : 'edge',
        start: { x: minX, y: 0, z },
        end: { x: maxX, y: 0, z },
        snapValue: 0
      };
    }
    case 'z':
    default: {
      // Line along X axis at Z=0
      const minX = Math.min(draggingBounds.minX, -LINE_EXTENSION);
      const maxX = Math.max(draggingBounds.maxX, LINE_EXTENSION);
      const y = draggingBounds.centerY;
      return {
        axis: 'z',
        type: snapType === 'center' ? 'center' : 'edge',
        start: { x: minX, y, z: 0 },
        end: { x: maxX, y, z: 0 },
        snapValue: 0
      };
    }
  }
}

// ============================================================
// FACE-TO-FACE (FLUSH) SNAP DETECTION
// Snap one part's face flush against another part's face
// ============================================================

// Detect face-to-face snaps (flush alignment)
// This positions parts so their faces are touching (e.g., top of A against bottom of B)
export function detectFaceSnaps(
  draggingPart: Part,
  currentPosition: { x: number; y: number; z: number },
  allParts: Part[],
  draggingPartIds: string[],
  snapThreshold: number
): SnapResult {
  const draggingBounds = getPartBoundsAtPosition(draggingPart, currentPosition);
  const nearestParts = getNearestParts(draggingBounds, allParts, draggingPartIds);
  const targetBounds = nearestParts.map((p) => getPartBounds(p));

  let xDelta = 0,
    yDelta = 0,
    zDelta = 0;
  let snappedX = false,
    snappedY = false,
    snappedZ = false;
  const snapLines: SnapLine[] = [];

  // For each target part, check if we can align faces flush
  for (const target of targetBounds) {
    // X-axis face snaps: dragging part's max X face against target's min X face (or vice versa)
    if (!snappedX) {
      // Dragging part's right face (maxX) flush with target's left face (minX)
      const rightToLeftDelta = target.minX - draggingBounds.maxX;
      if (Math.abs(rightToLeftDelta) < snapThreshold) {
        xDelta = rightToLeftDelta;
        snappedX = true;
        snapLines.push(createFaceSnapLine('x', target.minX, draggingBounds, target));
      }
      // Dragging part's left face (minX) flush with target's right face (maxX)
      const leftToRightDelta = target.maxX - draggingBounds.minX;
      if (!snappedX && Math.abs(leftToRightDelta) < snapThreshold) {
        xDelta = leftToRightDelta;
        snappedX = true;
        snapLines.push(createFaceSnapLine('x', target.maxX, draggingBounds, target));
      }
    }

    // Y-axis face snaps: dragging part's top/bottom face against target's bottom/top
    if (!snappedY) {
      // Dragging part's top face (maxY) flush with target's bottom face (minY)
      const topToBottomDelta = target.minY - draggingBounds.maxY;
      if (Math.abs(topToBottomDelta) < snapThreshold) {
        yDelta = topToBottomDelta;
        snappedY = true;
        snapLines.push(createFaceSnapLine('y', target.minY, draggingBounds, target));
      }
      // Dragging part's bottom face (minY) flush with target's top face (maxY)
      const bottomToTopDelta = target.maxY - draggingBounds.minY;
      if (!snappedY && Math.abs(bottomToTopDelta) < snapThreshold) {
        yDelta = bottomToTopDelta;
        snappedY = true;
        snapLines.push(createFaceSnapLine('y', target.maxY, draggingBounds, target));
      }
    }

    // Z-axis face snaps: dragging part's front/back face against target's back/front
    if (!snappedZ) {
      // Dragging part's front face (maxZ) flush with target's back face (minZ)
      const frontToBackDelta = target.minZ - draggingBounds.maxZ;
      if (Math.abs(frontToBackDelta) < snapThreshold) {
        zDelta = frontToBackDelta;
        snappedZ = true;
        snapLines.push(createFaceSnapLine('z', target.minZ, draggingBounds, target));
      }
      // Dragging part's back face (minZ) flush with target's front face (maxZ)
      const backToFrontDelta = target.maxZ - draggingBounds.minZ;
      if (!snappedZ && Math.abs(backToFrontDelta) < snapThreshold) {
        zDelta = backToFrontDelta;
        snappedZ = true;
        snapLines.push(createFaceSnapLine('z', target.maxZ, draggingBounds, target));
      }
    }
  }

  return {
    adjustedPosition: {
      x: currentPosition.x + xDelta,
      y: currentPosition.y + yDelta,
      z: currentPosition.z + zDelta
    },
    snappedX,
    snappedY,
    snappedZ,
    snapLines
  };
}

// Create visual line for face-to-face snap
function createFaceSnapLine(
  axis: 'x' | 'y' | 'z',
  position: number,
  draggingBounds: PartBounds,
  targetBounds: PartBounds
): SnapLine {
  const LINE_EXTENSION = 5;

  switch (axis) {
    case 'x': {
      // Line showing the X plane where faces meet
      const minY = Math.min(draggingBounds.minY, targetBounds.minY) - LINE_EXTENSION;
      const maxY = Math.max(draggingBounds.maxY, targetBounds.maxY) + LINE_EXTENSION;
      const avgZ = (draggingBounds.centerZ + targetBounds.centerZ) / 2;
      return {
        axis: 'x',
        type: 'face',
        start: { x: position, y: minY, z: avgZ },
        end: { x: position, y: maxY, z: avgZ },
        snapValue: position
      };
    }
    case 'y': {
      // Line showing the Y plane where faces meet
      const minX = Math.min(draggingBounds.minX, targetBounds.minX) - LINE_EXTENSION;
      const maxX = Math.max(draggingBounds.maxX, targetBounds.maxX) + LINE_EXTENSION;
      const avgZ = (draggingBounds.centerZ + targetBounds.centerZ) / 2;
      return {
        axis: 'y',
        type: 'face',
        start: { x: minX, y: position, z: avgZ },
        end: { x: maxX, y: position, z: avgZ },
        snapValue: position
      };
    }
    case 'z':
    default: {
      // Line showing the Z plane where faces meet
      const minX = Math.min(draggingBounds.minX, targetBounds.minX) - LINE_EXTENSION;
      const maxX = Math.max(draggingBounds.maxX, targetBounds.maxX) + LINE_EXTENSION;
      const avgY = (draggingBounds.centerY + targetBounds.centerY) / 2;
      return {
        axis: 'z',
        type: 'face',
        start: { x: minX, y: avgY, z: position },
        end: { x: maxX, y: avgY, z: position },
        snapValue: position
      };
    }
  }
}
