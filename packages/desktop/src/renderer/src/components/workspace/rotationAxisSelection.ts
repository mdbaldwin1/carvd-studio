import type { Vector3 } from 'three';

export type RotationAxisCandidate = {
  candidate: 'x' | 'y' | 'z';
  alignment: number;
  tangentStrength: number;
  axisPerpendicularity: number;
  startVector: Vector3;
};

export function scoreRotationAxisCandidate(candidate: RotationAxisCandidate): number {
  return candidate.alignment * 0.7 + candidate.tangentStrength * 0.2 + candidate.axisPerpendicularity * 0.1;
}

export function chooseBestRotationAxisCandidate(
  a: RotationAxisCandidate | null,
  b: RotationAxisCandidate | null
): RotationAxisCandidate | null {
  if (!a) return b;
  if (!b) return a;

  const scoreA = scoreRotationAxisCandidate(a);
  const scoreB = scoreRotationAxisCandidate(b);
  if (scoreA !== scoreB) return scoreA > scoreB ? a : b;
  if (a.alignment !== b.alignment) return a.alignment > b.alignment ? a : b;
  if (a.tangentStrength !== b.tangentStrength) return a.tangentStrength > b.tangentStrength ? a : b;
  return a;
}
