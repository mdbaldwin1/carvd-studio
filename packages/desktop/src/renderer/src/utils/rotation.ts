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
  // Three's display-oriented Euler conversion switches to its gimbal-lock
  // branch before the axes are actually singular. Near 90 degrees that drops
  // a real angle and moves tight joint faces. Keep both angles until the
  // rotation is numerically singular, using atan2 for the middle angle.
  const { x: qx, y: qy, z: qz, w: qw } = quaternion;
  const m11 = 1 - 2 * (qy * qy + qz * qz);
  const m12 = 2 * (qx * qy - qz * qw);
  const m13 = 2 * (qx * qz + qy * qw);
  const m22 = 1 - 2 * (qx * qx + qz * qz);
  const m23 = 2 * (qy * qz - qx * qw);
  const m32 = 2 * (qy * qz + qx * qw);
  const m33 = 1 - 2 * (qx * qx + qy * qy);
  const cosY = Math.hypot(m11, m12);
  const x = cosY > 1e-12 ? Math.atan2(-m23, m33) : Math.atan2(m32, m22);
  const y = Math.atan2(m13, cosY);
  const z = cosY > 1e-12 ? Math.atan2(-m12, m11) : 0;
  // Positions rotate at full precision; presentation rounding must not skew
  // their orientations or accumulate during a handle drag.
  return normalizeRotation(
    {
      x: (x * 180) / Math.PI,
      y: (y * 180) / Math.PI,
      z: (z * 180) / Math.PI
    },
    12
  );
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
