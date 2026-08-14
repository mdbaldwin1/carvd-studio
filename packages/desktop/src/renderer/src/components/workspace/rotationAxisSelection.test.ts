import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  chooseBestRotationAxisCandidate,
  scoreRotationAxisCandidate,
  type RotationAxisCandidate
} from './rotationAxisSelection';

function candidate(
  axis: 'x' | 'y' | 'z',
  alignment: number,
  tangentStrength: number,
  axisPerpendicularity: number
): RotationAxisCandidate {
  return {
    candidate: axis,
    alignment,
    tangentStrength,
    axisPerpendicularity,
    startVector: new THREE.Vector3(1, 0, 0)
  };
}

describe('rotationAxisSelection', () => {
  it('scores candidates by weighted blend of alignment, tangent strength, and axis-perpendicularity', () => {
    const c = candidate('x', 0.8, 0.5, 0.25);
    expect(scoreRotationAxisCandidate(c)).toBeCloseTo(0.8 * 0.7 + 0.5 * 0.2 + 0.25 * 0.1, 6);
  });

  it('prefers higher score', () => {
    const a = candidate('x', 0.9, 0.4, 0.2);
    const b = candidate('y', 0.8, 0.7, 0.6);
    expect(chooseBestRotationAxisCandidate(a, b)?.candidate).toBe('y');
  });

  it('uses deterministic tie-breakers', () => {
    const a = candidate('x', 0.7, 0.5, 0.3);
    const b = candidate('y', 0.7, 0.4, 0.5); // equal score, lower tangentStrength
    expect(scoreRotationAxisCandidate(a)).toBeCloseTo(scoreRotationAxisCandidate(b), 6);
    expect(chooseBestRotationAxisCandidate(a, b)?.candidate).toBe('x');
  });

  it('handles missing candidates', () => {
    const a = candidate('z', 0.6, 0.3, 0.2);
    expect(chooseBestRotationAxisCandidate(a, null)?.candidate).toBe('z');
    expect(chooseBestRotationAxisCandidate(null, a)?.candidate).toBe('z');
    expect(chooseBestRotationAxisCandidate(null, null)).toBeNull();
  });
});
