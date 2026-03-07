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

  it('normalizes groove geometry to a full-length blind face cut and validates mortise targets', () => {
    const groove = getResolvedRectCutFeature(
      {
        id: 'feature-3',
        kind: 'rect_cut',
        version: 1,
        enabled: true,
        target: { type: 'face', face: 'top_face' },
        reference: { primaryFrom: 'min' },
        cutType: 'groove',
        parameters: {
          size: { length: 1, width: 0.25 },
          depthMode: 'blind',
          depth: 0.25
        },
        placement: { x: 3, z: 2 }
      },
      { length: 24, width: 8, thickness: 0.75 }
    );

    expect(groove.parameters.size).toEqual({ length: 24, width: 0.25 });
    expect(groove.placement).toEqual({ x: 0, z: 2 });

    const mortiseIssue = validateRectCutFeature(
      {
        id: 'feature-4',
        kind: 'rect_cut',
        version: 1,
        enabled: true,
        target: { type: 'edge', edge: 'top_front_edge' },
        reference: { primaryFrom: 'min' },
        cutType: 'mortise',
        parameters: {
          size: { length: 2, width: 0.75 },
          depthMode: 'blind',
          depth: 0.25
        },
        placement: { x: 2, z: 1 }
      },
      { length: 24, width: 8, thickness: 0.75 }
    );

    expect(mortiseIssue).toContain('top or bottom face');
  });

  it('normalizes stopped dado and stopped groove while preserving partial runs', () => {
    const stoppedDado = getResolvedRectCutFeature(
      {
        id: 'feature-5',
        kind: 'rect_cut',
        version: 1,
        enabled: true,
        target: { type: 'face', face: 'top_face' },
        reference: { primaryFrom: 'min' },
        cutType: 'stopped_dado',
        parameters: {
          size: { length: 3, width: 0.5 },
          depthMode: 'blind',
          depth: 0.375
        },
        placement: { x: 5, z: 2 }
      },
      { length: 24, width: 8, thickness: 0.75 }
    );

    expect(stoppedDado.parameters.size).toEqual({ length: 3, width: 8 });
    expect(stoppedDado.placement).toEqual({ x: 5, z: 0 });

    const stoppedGroove = getResolvedRectCutFeature(
      {
        id: 'feature-6',
        kind: 'rect_cut',
        version: 1,
        enabled: true,
        target: { type: 'face', face: 'bottom_face' },
        reference: { primaryFrom: 'min' },
        cutType: 'stopped_groove',
        parameters: {
          size: { length: 6, width: 0.25 },
          depthMode: 'blind',
          depth: 0.25
        },
        placement: { x: 4, z: 1 }
      },
      { length: 24, width: 8, thickness: 0.75 }
    );

    expect(stoppedGroove.parameters.size).toEqual({ length: 6, width: 0.25 });
    expect(stoppedGroove.placement).toEqual({ x: 4, z: 1 });
  });

  it('validates stopped dado and stopped groove bounds', () => {
    const stoppedDadoIssue = validateRectCutFeature(
      {
        id: 'feature-7',
        kind: 'rect_cut',
        version: 1,
        enabled: true,
        target: { type: 'face', face: 'top_face' },
        reference: { primaryFrom: 'min' },
        cutType: 'stopped_dado',
        parameters: {
          size: { length: 6, width: 0.5 },
          depthMode: 'blind',
          depth: 0.25
        },
        placement: { x: 20, z: 0 }
      },
      { length: 24, width: 8, thickness: 0.75 }
    );

    const stoppedGrooveIssue = validateRectCutFeature(
      {
        id: 'feature-8',
        kind: 'rect_cut',
        version: 1,
        enabled: true,
        target: { type: 'face', face: 'top_face' },
        reference: { primaryFrom: 'min' },
        cutType: 'stopped_groove',
        parameters: {
          size: { length: 4, width: 2 },
          depthMode: 'blind',
          depth: 0.25
        },
        placement: { x: 2, z: 7 }
      },
      { length: 24, width: 8, thickness: 0.75 }
    );

    expect(stoppedDadoIssue).toContain('extends past the blank');
    expect(stoppedGrooveIssue).toContain('width runs past the blank');
  });
});
