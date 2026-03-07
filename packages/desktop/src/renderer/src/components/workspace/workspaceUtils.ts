import * as THREE from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { LightingMode } from '../../types';
import { getPartWorldAABB } from '../../utils/partFeatureGeometry';

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
  features?: import('../../types').PartFeature[];
}) {
  return getPartWorldAABB(part as Parameters<typeof getPartWorldAABB>[0]);
}
