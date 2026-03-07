import { describe, expect, it } from 'vitest';
import { getResolvedRectCutFeature, validateRectCutFeature } from './rectCutUtils';

describe('rectCutUtils', () => {
  it('normalizes dado geometry to a full-width blind face cut', () => {
    const resolved = getResolvedRectCutFeature(
      {
        id: 'feature-1',
        kind: 'rect_cut',
        version: 1,
        enabled: true,
        target: { type: 'face', face: 'top_face' },
        reference: { primaryFrom: 'min' },
        cutType: 'dado',
        parameters: {
          size: { length: 0.75, width: 0.5 },
          depthMode: 'blind',
          depth: 0.375
        },
        placement: { x: 2, z: 4 }
      },
      { length: 24, width: 8, thickness: 0.75 }
    );

    expect(resolved.parameters.size).toEqual({ length: 0.75, width: 8 });
    expect(resolved.placement).toEqual({ x: 2, z: 0 });
  });

  it('validates rabbets against the supported top/bottom edge targets', () => {
    const issue = validateRectCutFeature(
      {
        id: 'feature-2',
        kind: 'rect_cut',
        version: 1,
        enabled: true,
        target: { type: 'edge', edge: 'front_left_edge' },
        reference: { primaryFrom: 'min' },
        cutType: 'rabbet',
        parameters: {
          size: { length: 0.5, width: 0.5 },
          depthMode: 'blind',
          depth: 0.25
        },
        placement: { x: 0, z: 0 }
      },
      { length: 24, width: 8, thickness: 0.75 }
    );

    expect(issue).toContain('supported top or bottom edge');
  });
});
