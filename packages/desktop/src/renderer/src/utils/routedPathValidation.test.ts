import { describe, expect, it, vi } from 'vitest';
import { createTestPart, createTestStock } from '../../../../tests/helpers/factories';
import type { FaceTarget, RoutedPathFeature } from '../types';
import { validateRoutedPath } from './routedPathValidation';
import { validatePartsForCutList } from '../store/projectStore';

vi.unmock('three');
const route = (face: FaceTarget, depth: number): RoutedPathFeature => ({
  id: 'route',
  kind: 'routed_path',
  version: 1,
  enabled: true,
  target: { type: 'face', face },
  reference: { primaryFrom: 'center', secondaryFrom: 'center' },
  path: {
    points: [
      { primary: -1, secondary: 0 },
      { primary: 1, secondary: 0 }
    ],
    closed: false
  },
  bit: { profile: 'straight', diameter: 0.25 },
  parameters: { depthMode: 'blind', depth }
});

describe('shared routed path fabrication validation', () => {
  it.each([
    ['top_face', 0.75],
    ['bottom_face', 0.75],
    ['front_face', 4],
    ['back_face', 4],
    ['left_end', 12],
    ['right_end', 12]
  ] as const)('checks local material depth on %s regardless of world rotation', (face, material) => {
    const part = createTestPart({ length: 12, width: 4, thickness: 0.75, rotation: { x: 23, y: 41, z: 17 } });
    expect(validateRoutedPath(route(face, material + 0.1), part)).toMatch(/Route depth/);
    expect(validateRoutedPath(route(face, material / 2), part)).toBeNull();
    const through = route(face, material + 0.1);
    through.parameters = { depthMode: 'through' };
    expect(validateRoutedPath(through, part)).toBeNull();
  });

  it('blocks imported invalid machining in reports while leaving the operation repairable', () => {
    const stock = createTestStock({ id: 'stock', form: 'board' });
    const feature = route('top_face', 2);
    const part = createTestPart({ stockId: stock.id, features: [feature] });
    expect(validatePartsForCutList([part], [stock])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'error',
          featureId: 'route',
          type: 'feature_validation',
          message: expect.stringContaining('Route depth')
        })
      ])
    );
    expect(feature.parameters.depth).toBe(2);
    expect(validatePartsForCutList([{ ...part, features: [{ ...feature, enabled: false }] }], [stock])).toEqual([]);
  });

  it('uses the same cutter envelope limits for reports and editing', () => {
    const part = createTestPart({ thickness: 0.75 });
    const feature = route('top_face', 0.4);
    feature.bit = { profile: 'ball_nose', diameter: 0.25 };
    expect(validateRoutedPath(feature, part)).toMatch(/round-bottom bit/);
  });
});
