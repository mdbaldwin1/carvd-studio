import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { CircularCutFeature, Part, RectCutFeature, RoundedCutFeature } from '../types';
import { getPartRenderGeometry } from './partFeatureGeometry';
vi.unmock('three');

const W = 4; // part width  -> local z spans -2 .. 2
const L = 10;
const T = 1;

/** Where the top surface sits at a given (x, z): 0.5 means uncut. */
function surfaceAt(part: Part, x: number, z: number): number | null {
  const mesh = new THREE.Mesh(getPartRenderGeometry(part), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  mesh.updateMatrixWorld(true);
  const hit = new THREE.Raycaster(new THREE.Vector3(x, 5, z), new THREE.Vector3(0, -1, 0)).intersectObject(mesh)[0];
  return hit ? Number(hit.point.y.toFixed(3)) : null;
}

/** The band of local z where this cut removed material, sampled. */
function removedZ(part: Part, x: number): string {
  const hits: number[] = [];
  for (let z = -1.75; z <= 1.76; z += 0.5) if (surfaceAt(part, x, z) !== 0.5) hits.push(Number(z.toFixed(2)));
  return hits.length ? `z ${hits[0]} .. ${hits[hits.length - 1]}` : 'nothing removed';
}

/**
 * Every kind of cut measures its cross-board offset from the same edge.
 *
 * They did not always. A rectangular cut placed at zero sat against the
 * board's front edge while a hole or a rounded opening placed at `min` sat
 * against the back, so the same number put a cut on the opposite side of the
 * board when its type changed -- and the editor gave no hint, labelling both
 * fields "offset across". Named targets were right all along, which is what
 * made it hard to see: only the face-placed rectangle was reversed.
 */
describe('every cut measures across the board from the same edge', () => {
  it('puts zero at the back for all four families', () => {
    const lines: string[] = [`part ${L} x ${W} x ${T}; local z runs -2 (back) .. +2 (front)`];

    const rectAt = (over: Partial<RectCutFeature>): RectCutFeature => ({
      id: 'r',
      kind: 'rect_cut',
      version: 1,
      enabled: true,
      cutType: 'cutout',
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'min', secondaryFrom: 'min' },
      placement: { x: 4, z: 0 },
      parameters: { size: { length: 2, width: 1 }, depthMode: 'through' },
      ...over
    });

    for (const [label, f] of [
      ['face cut, placement.z = 0', rectAt({})],

      ['edge notch, top_back_edge', rectAt({ cutType: 'edge_notch', target: { type: 'edge', edge: 'top_back_edge' } })],

      [
        'corner notch, back_left',
        rectAt({ cutType: 'corner_notch', target: { type: 'corner', corner: 'back_left_corner' } })
      ]
    ] as const) {
      const p = createTestPart({ length: L, width: W, thickness: T, features: [f] });
      const x =
        f.target.type === 'corner' || (f.target.type === 'edge' && String(f.target.edge).includes('left')) ? -4 : 0;
      lines.push(`  ${label.padEnd(32)} -> ${removedZ(p, x)}`);
    }

    const round: RoundedCutFeature = {
      id: 'o',
      kind: 'rounded_cut',
      version: 1,
      enabled: true,
      cutType: 'rounded_rectangle',
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'min', secondaryFrom: 'min' },
      parameters: { length: 2, width: 1, cornerRadius: 0.1, depthMode: 'through' },
      placement: { primary: 5, secondary: 0.5, rotation: 0 }
    };
    lines.push(
      `  ${'rounded, secondary = 0.5 (min)'.padEnd(32)} -> ${removedZ(createTestPart({ length: L, width: W, thickness: T, features: [round] }), 0)}`
    );

    const hole: CircularCutFeature = {
      id: 'h',
      kind: 'circular_cut',
      version: 1,
      enabled: true,
      cutType: 'round_hole',
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'min', secondaryFrom: 'min' },
      placement: { primary: 5, secondary: 0.5, rotation: 0 },
      parameters: { diameter: 1, depthMode: 'through', tilt: 0, direction: 0 }
    };
    lines.push(
      `  ${'hole, secondary = 0.5 (min)'.padEnd(32)} -> ${removedZ(createTestPart({ length: L, width: W, thickness: T, features: [hole] }), 0)}`
    );

    // Zero, or `min`, is the back edge for every one of them.
    for (const line of lines.slice(1)) expect(line, line).toContain('z -1.75 .. -1.25');
  });
});
