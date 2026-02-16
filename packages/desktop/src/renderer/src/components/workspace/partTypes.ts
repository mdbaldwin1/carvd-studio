import * as THREE from 'three';
import { GRID_SIZE } from '../../constants';

export interface LiveDimensions {
  x: number;
  y: number;
  z: number;
  length: number;
  width: number;
  thickness: number;
}

// Handle types for 3D resize system
export type HandleType = 'corner' | 'edge-x' | 'edge-y' | 'edge-z';

// 3D handle position: x, y, z indicate position on the box (-1, 0, or 1)
// For corners: all three are ±1
// For edges: one is 0 (the axis the edge is parallel to), others are ±1
export type HandlePosition = {
  x: -1 | 0 | 1;
  y: -1 | 0 | 1;
  z: -1 | 0 | 1;
  type: HandleType;
};

export type DragPlaneInfo = {
  normal: THREE.Vector3;
  axes: { x: boolean; y: boolean; z: boolean };
};

export const HANDLE_POSITIONS: HandlePosition[] = [
  // 8 Corners - for uniform scaling
  { x: -1, y: -1, z: -1, type: 'corner' },
  { x: -1, y: -1, z: 1, type: 'corner' },
  { x: -1, y: 1, z: -1, type: 'corner' },
  { x: -1, y: 1, z: 1, type: 'corner' },
  { x: 1, y: -1, z: -1, type: 'corner' },
  { x: 1, y: -1, z: 1, type: 'corner' },
  { x: 1, y: 1, z: -1, type: 'corner' },
  { x: 1, y: 1, z: 1, type: 'corner' },

  // 4 Edges parallel to X axis (affects Y and Z)
  { x: 0, y: -1, z: -1, type: 'edge-x' },
  { x: 0, y: -1, z: 1, type: 'edge-x' },
  { x: 0, y: 1, z: -1, type: 'edge-x' },
  { x: 0, y: 1, z: 1, type: 'edge-x' },

  // 4 Edges parallel to Y axis (affects X and Z)
  { x: -1, y: 0, z: -1, type: 'edge-y' },
  { x: -1, y: 0, z: 1, type: 'edge-y' },
  { x: 1, y: 0, z: -1, type: 'edge-y' },
  { x: 1, y: 0, z: 1, type: 'edge-y' },

  // 4 Edges parallel to Z axis (affects X and Y)
  { x: -1, y: -1, z: 0, type: 'edge-z' },
  { x: -1, y: 1, z: 0, type: 'edge-z' },
  { x: 1, y: -1, z: 0, type: 'edge-z' },
  { x: 1, y: 1, z: 0, type: 'edge-z' }
];

export const HANDLE_SIZE = 0.45; // Slightly larger for better visibility

// Bolder resize handle colors for better visibility
export const RESIZE_COLORS = {
  corner: '#ffcc44', // Bright gold for corners
  edge: '#44aaff', // Bright blue for edges
  hover: '#ffffff' // White on hover
};

// Rotation handle - flat ring with arrow on each face
export const ROTATION_HANDLE_SIZE = 0.55; // Slightly larger
export const ROTATION_RING_THICKNESS = 0.12; // Thicker ring (was 0.08)

// Bolder, more saturated rotation colors
export const ROTATION_COLORS = {
  x: '#ff4444', // Bright red for X
  y: '#44ff44', // Bright green for Y
  z: '#4499ff', // Bright blue for Z
  hover: '#ffffff'
};

// Snap to grid helper
export const snapToGrid = (value: number): number => {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
};
