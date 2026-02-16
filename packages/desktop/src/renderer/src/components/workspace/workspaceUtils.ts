import * as THREE from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { LightingMode } from '../../types';

// Lighting presets for different viewing conditions
export const LIGHTING_PRESETS: Record<
  LightingMode,
  {
    ambient: number;
    mainLight: { position: [number, number, number]; intensity: number };
    fillLight: { position: [number, number, number]; intensity: number };
    description: string;
  }
> = {
  default: {
    ambient: 0.5,
    mainLight: { position: [10, 20, 10], intensity: 1 },
    fillLight: { position: [-10, 10, -10], intensity: 0.3 },
    description: 'Balanced lighting for general use'
  },
  bright: {
    ambient: 1.0,
    mainLight: { position: [10, 20, 10], intensity: 1.5 },
    fillLight: { position: [-10, 15, -10], intensity: 0.8 },
    description: 'Brighter lighting for dark materials'
  },
  studio: {
    ambient: 0.6,
    mainLight: { position: [15, 25, 15], intensity: 0.8 },
    fillLight: { position: [-15, 15, -15], intensity: 0.5 },
    description: 'Soft, even lighting like a photography studio'
  },
  dramatic: {
    ambient: 0.3,
    mainLight: { position: [5, 30, 5], intensity: 1.5 },
    fillLight: { position: [-8, 5, -8], intensity: 0.15 },
    description: 'High contrast lighting with strong shadows'
  }
};

// Type guard to check if controls is OrbitControls
export function isOrbitControls(controls: THREE.EventDispatcher<object> | null): controls is OrbitControlsImpl {
  return controls !== null && 'enabled' in controls;
}

// Module-level tracking for right-click context menu
// Shared between Workspace, SnapGuides, and Part
let globalRightClickTarget: {
  type: 'background' | 'part' | 'guide';
  worldPosition?: { x: number; y: number; z: number };
  guideId?: string;
} | null = null;

export function setRightClickTarget(target: typeof globalRightClickTarget) {
  globalRightClickTarget = target;
}

export function getRightClickTarget() {
  return globalRightClickTarget;
}

export function clearRightClickTarget() {
  globalRightClickTarget = null;
}

// Helper to calculate axis-aligned bounding box for a part
export function getPartAABB(part: {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  length: number;
  width: number;
  thickness: number;
}) {
  const rotX = (part.rotation.x * Math.PI) / 180;
  const rotY = (part.rotation.y * Math.PI) / 180;
  const rotZ = (part.rotation.z * Math.PI) / 180;
  const euler = new THREE.Euler(rotX, rotY, rotZ, 'XYZ');
  const quat = new THREE.Quaternion().setFromEuler(euler);

  const halfLength = part.length / 2;
  const halfThickness = part.thickness / 2;
  const halfWidth = part.width / 2;

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

  return { minX, maxX, minY, maxY, minZ, maxZ };
}
