import * as THREE from 'three';
import { HANDLE_SIZE, ROTATION_HANDLE_SIZE, ROTATION_RING_THICKNESS } from './partTypes';

// Shared geometries — created once at module level, reused across all handle instances
export const RESIZE_HANDLE_GEOMETRY = new THREE.BoxGeometry(HANDLE_SIZE, HANDLE_SIZE, HANDLE_SIZE);

export const ROTATION_HIT_GEOMETRY = new THREE.CircleGeometry(ROTATION_HANDLE_SIZE + ROTATION_RING_THICKNESS, 24);
export const ROTATION_OUTLINE_RING_GEOMETRY = new THREE.RingGeometry(
  ROTATION_HANDLE_SIZE - ROTATION_RING_THICKNESS - 0.02,
  ROTATION_HANDLE_SIZE + ROTATION_RING_THICKNESS + 0.02,
  24
);
export const ROTATION_MAIN_RING_GEOMETRY = new THREE.RingGeometry(
  ROTATION_HANDLE_SIZE - ROTATION_RING_THICKNESS,
  ROTATION_HANDLE_SIZE + ROTATION_RING_THICKNESS,
  24
);

export const ROTATION_ARROW_SIZE = 0.4;
export const ROTATION_ARROW_GEOMETRY = new THREE.BufferGeometry();
ROTATION_ARROW_GEOMETRY.setAttribute(
  'position',
  new THREE.BufferAttribute(
    new Float32Array([
      0,
      -ROTATION_ARROW_SIZE * 0.7,
      0,
      0,
      ROTATION_ARROW_SIZE * 0.7,
      0,
      ROTATION_ARROW_SIZE * 1.1,
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
export const ROTATION_OUTLINE_MATERIAL = new THREE.MeshBasicMaterial({
  color: '#000000',
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.4
});
