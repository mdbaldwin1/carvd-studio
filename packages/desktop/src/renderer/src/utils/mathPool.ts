import * as THREE from 'three';

// Module-level reusable objects for ground constraint calculations.
// Safe because JS is single-threaded and these are only used within
// synchronous function calls (never held across async boundaries).
const _upVector = new THREE.Vector3(0, 1, 0);
const _localX = new THREE.Vector3();
const _localY = new THREE.Vector3();
const _localZ = new THREE.Vector3();
const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();

/**
 * Calculate the world-space half-height of a rotated box.
 * Used for ground constraint enforcement.
 */
export function calculateWorldHalfHeight(
  quaternion: THREE.Quaternion,
  length: number,
  thickness: number,
  width: number
): number {
  _localX.set(1, 0, 0).applyQuaternion(quaternion);
  _localY.set(0, 1, 0).applyQuaternion(quaternion);
  _localZ.set(0, 0, 1).applyQuaternion(quaternion);
  return (
    Math.abs(_localX.dot(_upVector)) * (length / 2) +
    Math.abs(_localY.dot(_upVector)) * (thickness / 2) +
    Math.abs(_localZ.dot(_upVector)) * (width / 2)
  );
}

/**
 * Overload that accepts rotation in degrees and creates the quaternion internally.
 */
export function calculateWorldHalfHeightFromDegrees(
  rotation: { x: number; y: number; z: number },
  length: number,
  thickness: number,
  width: number
): number {
  _euler.set((rotation.x * Math.PI) / 180, (rotation.y * Math.PI) / 180, (rotation.z * Math.PI) / 180, 'XYZ');
  _quat.setFromEuler(_euler);
  return calculateWorldHalfHeight(_quat, length, thickness, width);
}
