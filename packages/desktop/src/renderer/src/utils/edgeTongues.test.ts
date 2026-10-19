import { describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { Part, RectCutFeature } from '../types';
import { getEdgeTongues } from './edgeTongues';
import { suggestAssembly, planAssembly } from './assemblyLayout';
import { planHousingFit } from './fitHousing';
import { partsOverlapInMaterial } from './partFeatureGeometry';
vi.unmock('three');
const fixture = () => ({
  host: createTestPart({
    id: 'beaded-host',
    length: 12,
    width: 3,
    thickness: 0.75,
    features: [
      {
        id: 'a50bf779-0cd3-47df-b1d0-cc40f64c7380',
        kind: 'rect_cut',
        version: 1,
        enabled: true,
        target: { type: 'face', face: 'front_face' },
        reference: { primaryFrom: 'min' },
        cutType: 'groove',
        parameters: { size: { length: 12, width: 0.25 }, depthMode: 'blind', depth: 0.375 },
        placement: { x: 0, z: 0.25 }
      },
      {
        id: 'fa874b35-fca4-4881-beea-9f2d3a430be8',
        kind: 'edge_profile',
        version: 1,
        enabled: true,
        target: { type: 'edge', edge: 'top_front_edge' },
        reference: { primaryFrom: 'min', secondaryFrom: 'min' },
        profile: 'bead',
        parameters: { size: 0.125, depth: 0.125 }
      }
    ]
  }),
  board: createTestPart({
    id: 'beaded-tongue',
    length: 12,
    width: 3,
    thickness: 0.75,
    features: [
      {
        id: 'aedc893a-f7ae-4075-85fc-20f962f6bfd7',
        kind: 'rect_cut',
        version: 1,
        enabled: true,
        label: 'Tongue shoulder top',
        target: { type: 'face', face: 'top_face' },
        reference: { primaryFrom: 'min' },
        cutType: 'cutout',
        parameters: { size: { length: 12, width: 0.375 }, depthMode: 'blind', depth: 0.25 },
        placement: { x: 0, z: 0 }
      },
      {
        id: '407273a6-d70b-4fd2-afb4-d11537160c2f',
        kind: 'rect_cut',
        version: 1,
        enabled: true,
        label: 'Tongue shoulder underside',
        target: { type: 'face', face: 'bottom_face' },
        reference: { primaryFrom: 'min' },
        cutType: 'cutout',
        parameters: { size: { length: 12, width: 0.375 }, depthMode: 'blind', depth: 0.25 },
        placement: { x: 0, z: 0 }
      },
      {
        id: 'b3897ee1-0090-44dc-9a1f-2d7bf92adde2',
        kind: 'routed_path',
        version: 1,
        enabled: true,
        label: 'Shoulder chamfer',
        target: { type: 'face', face: 'top_face' },
        reference: { primaryFrom: 'center', secondaryFrom: 'center' },
        path: {
          points: [
            { primary: -6, secondary: -1.125 },
            { primary: 6, secondary: -1.125 }
          ]
        },
        bit: { profile: 'v_bit', diameter: 0.25, includedAngle: 90 },
        parameters: { depthMode: 'blind', depth: 0.125 }
      }
    ]
  })
});
describe('face-cutout long-edge tongues', () => {
  for (const front of [false, true])
    for (const rotated of [false, true])
      for (const reversed of [false, true]) {
        it(`seats the native beaded-board tongue front=${front} rotated=${rotated} reversed=${reversed}`, () => {
          const { host, board } = fixture();
          if (front) {
            for (const cut of board.features!) {
              if (cut.kind === 'rect_cut') cut.placement.z = 2.625;
              if (cut.kind === 'routed_path')
                cut.path.points.forEach((point) => {
                  point.secondary *= -1;
                });
            }
          }
          if (rotated) host.rotation = { x: 17, y: 31, z: 23 };
          const tongue = getEdgeTongues(board)[0];
          expect(tongue).toMatchObject({
            face: front ? 'front_face' : 'back_face',
            thickness: 0.25,
            projection: 0.375
          });
          const pair: [Part, Part] = reversed ? [board, host] : [host, board];
          const suggestion = suggestAssembly(pair);
          const moving = pair[suggestion.swapped ? 1 : 0],
            fixed = pair[suggestion.swapped ? 0 : 1];
          expect(moving.id).toBe(board.id);
          expect(suggestion.options.movingReference).toBe(tongue.id);
          expect(suggestion.options.insertion).toBe(0);
          const placed = planAssembly(moving, fixed, suggestion.options)!;
          expect(partsOverlapInMaterial(placed, fixed)).toBe(false);
          expect(partsOverlapInMaterial(placed, { ...fixed, features: [] })).toBe(true);
          expect(planHousingFit(placed, fixed)).toMatchObject({ usesTongue: true, width: 0.25, changed: false });
        });
      }
  it.each(['partial', 'mismatched', 'through', 'angled', 'deep-chamfer', 'extra-notch'])(
    'does not infer an intact matching tongue from %s cuts',
    (kind) => {
      const { board } = fixture();
      const first = board.features![0] as RectCutFeature;
      if (kind === 'partial') first.parameters.size.length = 6;
      if (kind === 'mismatched') first.parameters.size.width = 0.5;
      if (kind === 'through') first.parameters.depthMode = 'through';
      if (kind === 'angled') first.parameters.wallAngle = 10;
      if (kind === 'deep-chamfer') {
        const route = board.features![2];
        if (route.kind === 'routed_path') route.parameters.depth = 0.3;
      }
      if (kind === 'extra-notch')
        board.features!.push({
          ...first,
          id: 'notch',
          parameters: { ...first.parameters, size: { length: 1, width: 0.5 } }
        });
      expect(getEdgeTongues(board)).toEqual([]);
    }
  );
});
