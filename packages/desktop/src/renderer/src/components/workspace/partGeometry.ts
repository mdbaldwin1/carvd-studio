import * as THREE from 'three';
import { HANDLE_SIZE, ROTATION_HANDLE_SIZE, ROTATION_RING_THICKNESS } from './partTypes';

// Shared geometries — created once at module level, reused across all handle instances
export const RESIZE_HANDLE_GEOMETRY = new THREE.BoxGeometry(HANDLE_SIZE, HANDLE_SIZE, HANDLE_SIZE);

export const ROTATION_RING_ARC_START = -Math.PI * 0.75;
export const ROTATION_RING_ARC_LENGTH = Math.PI * 1.5;
export const ROTATION_HIT_GEOMETRY = new THREE.RingGeometry(
  ROTATION_HANDLE_SIZE - ROTATION_RING_THICKNESS * 2.4,
  ROTATION_HANDLE_SIZE + ROTATION_RING_THICKNESS * 2.4,
  48,
  1,
  ROTATION_RING_ARC_START,
  ROTATION_RING_ARC_LENGTH
);
export const ROTATION_MAIN_RING_GEOMETRY = new THREE.RingGeometry(
  ROTATION_HANDLE_SIZE - ROTATION_RING_THICKNESS,
  ROTATION_HANDLE_SIZE + ROTATION_RING_THICKNESS,
  48,
  1,
  ROTATION_RING_ARC_START,
  ROTATION_RING_ARC_LENGTH
);

export const ROTATION_ARROW_SIZE = 0.3;
export const ROTATION_ARROW_GEOMETRY = new THREE.BufferGeometry();
ROTATION_ARROW_GEOMETRY.setAttribute(
  'position',
  new THREE.BufferAttribute(
    new Float32Array([
      -ROTATION_ARROW_SIZE * 0.65,
      -ROTATION_ARROW_SIZE * 0.75,
      0,
      -ROTATION_ARROW_SIZE * 0.65,
      ROTATION_ARROW_SIZE * 0.75,
      0,
      ROTATION_ARROW_SIZE * 0.9,
      0,
      0
    ]),
    3
  )
);

// Shared materials — only for constant materials with no per-instance variation
export const RESIZE_OUTLINE_MATERIAL = new THREE.MeshBasicMaterial({
  color: '#000000',
  transparent: true,
  opacity: 0.5
});
export const ROTATION_HIT_MATERIAL = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });

// Grain direction arrow — shared geometry and material
export const GRAIN_ARROW_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#8B4513',
  side: THREE.DoubleSide
});

// Unit triangle: vertices at (-0.5, -1, 0), (-0.5, 1, 0), (0.5, 0, 0)
// Each instance scales X by headLength, Y by headWidth
export const GRAIN_ARROW_HEAD_GEOMETRY = new THREE.BufferGeometry();
GRAIN_ARROW_HEAD_GEOMETRY.setAttribute(
  'position',
  new THREE.BufferAttribute(new Float32Array([-0.5, -1, 0, -0.5, 1, 0, 0.5, 0, 0]), 3)
);
