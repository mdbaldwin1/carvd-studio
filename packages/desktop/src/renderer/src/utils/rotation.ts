import * as THREE from 'three';
import { Rotation3D } from '../types';

const _euler = new THREE.Euler();
const _quatA = new THREE.Quaternion();
const _quatB = new THREE.Quaternion();
const _axis = new THREE.Vector3();

export function normalizeAngle360(degrees: number): number {
  const normalized = ((degrees % 360) + 360) % 360;
  return normalized === 360 ? 0 : normalized;
}

export function normalizeAngle180(degrees: number): number {
  const normalized = normalizeAngle360(degrees);
  return normalized > 180 ? normalized - 360 : normalized;
}

export function roundAngle(degrees: number, precision = 3): number {
  const factor = 10 ** precision;
  return Math.round(degrees * factor) / factor;
}

export function normalizeRotation(rotation: Rotation3D, precision = 3): Rotation3D {
  return {
    x: roundAngle(normalizeAngle180(rotation.x), precision),
    y: roundAngle(normalizeAngle180(rotation.y), precision),
    z: roundAngle(normalizeAngle180(rotation.z), precision)
  };
}

export function snapAngle(degrees: number, increment: number): number {
  if (!Number.isFinite(increment) || increment <= 0) {
    return degrees;
  }
  return Math.round(degrees / increment) * increment;
}

export function isAxisAlignedRotation(rotation: Rotation3D, epsilon = 1e-3): boolean {
  const isMultipleOf90 = (value: number) => {
    const n = normalizeAngle180(value);
    const nearest = Math.round(n / 90) * 90;
    return Math.abs(n - nearest) <= epsilon;
  };
  return isMultipleOf90(rotation.x) && isMultipleOf90(rotation.y) && isMultipleOf90(rotation.z);
}

export function rotationFromQuaternion(quaternion: THREE.Quaternion): Rotation3D {
  _euler.setFromQuaternion(quaternion, 'XYZ');
  return normalizeRotation({
    x: (_euler.x * 180) / Math.PI,
    y: (_euler.y * 180) / Math.PI,
    z: (_euler.z * 180) / Math.PI
  });
}

export function quaternionFromRotation(rotation: Rotation3D): THREE.Quaternion {
  _euler.set((rotation.x * Math.PI) / 180, (rotation.y * Math.PI) / 180, (rotation.z * Math.PI) / 180, 'XYZ');
  return _quatA.setFromEuler(_euler).clone();
}

export function rotateAroundWorldAxis(rotation: Rotation3D, axis: 'x' | 'y' | 'z', degrees: number): Rotation3D {
  _axis.set(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0);
  _quatA.setFromAxisAngle(_axis, (degrees * Math.PI) / 180);

  _euler.set((rotation.x * Math.PI) / 180, (rotation.y * Math.PI) / 180, (rotation.z * Math.PI) / 180, 'XYZ');
  _quatB.setFromEuler(_euler);

  const worldRotated = _quatA.clone().multiply(_quatB);
  return rotationFromQuaternion(worldRotated);
}

export function rotateAroundLocalAxis(rotation: Rotation3D, axis: 'x' | 'y' | 'z', degrees: number): Rotation3D {
  _axis.set(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0);
  _quatA.setFromAxisAngle(_axis, (degrees * Math.PI) / 180);

  _euler.set((rotation.x * Math.PI) / 180, (rotation.y * Math.PI) / 180, (rotation.z * Math.PI) / 180, 'XYZ');
  _quatB.setFromEuler(_euler);

  _quatB.multiply(_quatA);
  return rotationFromQuaternion(_quatB);
}
