import { describe, expect, it } from 'vitest';
import type { RectCutFeature } from '../types';
import {
  getRectCutDepth,
  getRectCutPreviewSupport,
  getResolvedRectCutFeature,
  isBottomTarget,
  isTopOrBottomFace,
  isTopTarget,
  validateRectCutFeature
} from './rectCutUtils';

const PART = { length: 24, width: 8, thickness: 0.75 };

function createRectCut(overrides?: {
  cutType?: RectCutFeature['cutType'];
  target?: RectCutFeature['target'];
  size?: { length: number; width: number };
  depthMode?: 'through' | 'blind';
  depth?: number;
  placement?: { x: number; z: number };
}): RectCutFeature {
  return {
    id: 'rect-cut-1',
    kind: 'rect_cut',
    version: 1,
    enabled: true,
    target: overrides?.target ?? { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'min' },
    cutType: overrides?.cutType ?? 'cutout',
    parameters: {
      size: overrides?.size ?? { length: 2, width: 2 },
      depthMode: overrides?.depthMode ?? 'blind',
      depth: overrides?.depth ?? 0.25
    },
    placement: overrides?.placement ?? { x: 1, z: 1 }
  };
}

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
          size: { length: 2, width: 0.5 },
          depthMode: 'blind',
          depth: 0.25
        },
        placement: { x: 2, z: 0 }
      },
      { length: 24, width: 8, thickness: 0.75 }
    );

    expect(mortiseIssue).toContain('top, bottom, front, or back face');
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

  describe('getRectCutDepth', () => {
    it('returns full thickness for through cuts', () => {
      const feature = createRectCut({ depthMode: 'through' });
      expect(getRectCutDepth(feature, 0.75)).toBe(0.75);
    });

    it('clamps blind depth between zero and the thickness', () => {
      expect(getRectCutDepth(createRectCut({ depth: -1 }), 0.75)).toBe(0);
      expect(getRectCutDepth(createRectCut({ depth: 0.25 }), 0.75)).toBe(0.25);
      expect(getRectCutDepth(createRectCut({ depth: 5 }), 0.75)).toBe(0.75);
    });

    it('treats missing blind depth as zero', () => {
      const feature = createRectCut();
      feature.parameters.depth = undefined;
      expect(getRectCutDepth(feature, 0.75)).toBe(0);
    });

    it('snaps blind depth to full thickness when within tolerance', () => {
      expect(getRectCutDepth(createRectCut({ depth: 0.7495 }), 0.75)).toBe(0.75);
      expect(getRectCutDepth(createRectCut({ depth: 0.7485 }), 0.75)).toBe(0.7485);
    });
  });

  describe('target helpers', () => {
    it('identifies top and bottom faces', () => {
      expect(isTopOrBottomFace('top_face')).toBe(true);
      expect(isTopOrBottomFace('bottom_face')).toBe(true);
      expect(isTopOrBottomFace('left_end')).toBe(false);
    });

    it('classifies top targets across face, edge, and corner targets', () => {
      expect(isTopTarget(createRectCut({ target: { type: 'face', face: 'top_face' } }))).toBe(true);
      expect(isTopTarget(createRectCut({ target: { type: 'edge', edge: 'top_front_edge' } }))).toBe(true);
      expect(isTopTarget(createRectCut({ target: { type: 'edge', edge: 'bottom_front_edge' } }))).toBe(false);
      expect(isTopTarget(createRectCut({ target: { type: 'corner', corner: 'front_left_corner' } }))).toBe(false);
    });

    it('classifies bottom targets across face, edge, and corner targets', () => {
      expect(isBottomTarget(createRectCut({ target: { type: 'face', face: 'bottom_face' } }))).toBe(true);
      expect(isBottomTarget(createRectCut({ target: { type: 'face', face: 'top_face' } }))).toBe(false);
      expect(isBottomTarget(createRectCut({ target: { type: 'edge', edge: 'bottom_left_edge' } }))).toBe(true);
      expect(isBottomTarget(createRectCut({ target: { type: 'corner', corner: 'back_right_corner' } }))).toBe(false);
    });
  });

  describe('getResolvedRectCutFeature clamping and defaults', () => {
    it('defaults dado targets to the top face when the stored target is not a face', () => {
      const resolved = getResolvedRectCutFeature(
        createRectCut({ cutType: 'dado', target: { type: 'edge', edge: 'top_front_edge' } }),
        PART
      );
      expect(resolved.target).toEqual({ type: 'face', face: 'top_face' });
      expect(resolved.parameters.depthMode).toBe('blind');
    });

    it('defaults stopped dado targets to the top face when the stored target is not a face', () => {
      const resolved = getResolvedRectCutFeature(
        createRectCut({ cutType: 'stopped_dado', target: { type: 'corner', corner: 'front_left_corner' } }),
        PART
      );
      expect(resolved.target).toEqual({ type: 'face', face: 'top_face' });
    });

    it('runs rabbets along the full length on front/back edges', () => {
      const resolved = getResolvedRectCutFeature(
        createRectCut({
          cutType: 'rabbet',
          target: { type: 'edge', edge: 'top_back_edge' },
          size: { length: 3, width: 0.5 },
          placement: { x: 2, z: 1 }
        }),
        PART
      );
      expect(resolved.parameters.size).toEqual({ length: 24, width: 0.5 });
      expect(resolved.placement).toEqual({ x: 0, z: 1 });
    });

    it('runs rabbets along the full width on left/right edges', () => {
      const resolved = getResolvedRectCutFeature(
        createRectCut({
          cutType: 'rabbet',
          target: { type: 'edge', edge: 'top_left_edge' },
          size: { length: 0.5, width: 3 },
          placement: { x: 2, z: 1 }
        }),
        PART
      );
      expect(resolved.parameters.size).toEqual({ length: 0.5, width: 8 });
      expect(resolved.placement).toEqual({ x: 2, z: 0 });
    });

    it('defaults rabbet targets to the top front edge when the stored target is not an edge', () => {
      const resolved = getResolvedRectCutFeature(
        createRectCut({ cutType: 'rabbet', target: { type: 'face', face: 'top_face' } }),
        PART
      );
      expect(resolved.target).toEqual({ type: 'edge', edge: 'top_front_edge' });
    });

    it('keeps non-face groove targets untouched while forcing blind depth', () => {
      const resolved = getResolvedRectCutFeature(
        createRectCut({
          cutType: 'groove',
          target: { type: 'edge', edge: 'top_front_edge' },
          depthMode: 'through',
          size: { length: 2, width: 0.5 }
        }),
        PART
      );
      expect(resolved.target).toEqual({ type: 'edge', edge: 'top_front_edge' });
      expect(resolved.parameters.depthMode).toBe('blind');
      expect(resolved.parameters.size.length).toBe(24);
    });

    it('forces blind depth for stopped grooves and mortises without moving placement', () => {
      const stoppedGroove = getResolvedRectCutFeature(
        createRectCut({
          cutType: 'stopped_groove',
          target: { type: 'edge', edge: 'top_front_edge' },
          depthMode: 'through',
          placement: { x: 4, z: 2 }
        }),
        PART
      );
      expect(stoppedGroove.target).toEqual({ type: 'edge', edge: 'top_front_edge' });
      expect(stoppedGroove.parameters.depthMode).toBe('blind');
      expect(stoppedGroove.placement).toEqual({ x: 4, z: 2 });

      const mortise = getResolvedRectCutFeature(
        createRectCut({ cutType: 'mortise', depthMode: 'through', placement: { x: 3, z: 1 } }),
        PART
      );
      expect(mortise.target).toEqual({ type: 'face', face: 'top_face' });
      expect(mortise.parameters.depthMode).toBe('blind');
      expect(mortise.placement).toEqual({ x: 3, z: 1 });
    });

    it('clones passthrough cut types without sharing nested objects', () => {
      const original = createRectCut({
        cutType: 'corner_notch',
        target: { type: 'corner', corner: 'back_right_corner' },
        depthMode: 'through'
      });
      const resolved = getResolvedRectCutFeature(original, PART);

      expect(resolved).toEqual(original);
      expect(resolved).not.toBe(original);
      expect(resolved.parameters.size).not.toBe(original.parameters.size);
      expect(resolved.placement).not.toBe(original.placement);
      expect(resolved.target).not.toBe(original.target);

      original.parameters.size.length = 99;
      original.placement.x = 99;
      expect(resolved.parameters.size.length).toBe(2);
      expect(resolved.placement.x).toBe(1);
    });
  });

  describe('getRectCutPreviewSupport', () => {
    it('supports face cuts on top and bottom faces', () => {
      expect(getRectCutPreviewSupport(createRectCut({ cutType: 'cutout' })).supported).toBe(true);
      expect(
        getRectCutPreviewSupport(createRectCut({ cutType: 'mortise', target: { type: 'face', face: 'bottom_face' } }))
          .supported
      ).toBe(true);
    });

    it('reports a cut-specific reason when a face cut targets an unsupported face', () => {
      const cases: Array<[RectCutFeature['cutType'], string]> = [
        ['dado', 'Dado previews'],
        ['stopped_dado', 'Stopped dado previews'],
        ['groove', 'Groove previews'],
        ['stopped_groove', 'Stopped groove previews'],
        ['mortise', 'Mortise previews'],
        ['cutout', 'Cutout previews']
      ];

      for (const [cutType, reasonPrefix] of cases) {
        const support = getRectCutPreviewSupport(
          createRectCut({ cutType, target: { type: 'face', face: 'front_face' } })
        );
        if (cutType === 'mortise' || cutType === 'cutout') {
          // Side-face pockets are now first-class (leg mortises).
          expect(support.supported).toBe(true);
          continue;
        }
        expect(support.supported).toBe(false);
        if (!support.supported) {
          expect(support.reason).toContain(reasonPrefix);
        }
      }
    });

    it('supports through cuts for non-rabbet notch types regardless of target', () => {
      const support = getRectCutPreviewSupport(
        createRectCut({
          cutType: 'edge_notch',
          target: { type: 'edge', edge: 'front_left_edge' },
          depthMode: 'through'
        })
      );
      expect(support.supported).toBe(true);
    });

    it('supports blind edge notches and rabbets only on top/bottom edges', () => {
      expect(
        getRectCutPreviewSupport(
          createRectCut({ cutType: 'edge_notch', target: { type: 'edge', edge: 'bottom_back_edge' } })
        ).supported
      ).toBe(true);
      expect(
        getRectCutPreviewSupport(createRectCut({ cutType: 'rabbet', target: { type: 'edge', edge: 'top_right_edge' } }))
          .supported
      ).toBe(true);

      const unsupported = getRectCutPreviewSupport(
        createRectCut({ cutType: 'edge_notch', target: { type: 'edge', edge: 'front_left_edge' } })
      );
      expect(unsupported.supported).toBe(false);
      if (!unsupported.supported) {
        expect(unsupported.reason).toContain('Blind notch previews');
      }
    });

    it('supports blind corner notches only on the four plan-view corners', () => {
      expect(
        getRectCutPreviewSupport(
          createRectCut({ cutType: 'corner_notch', target: { type: 'corner', corner: 'back_left_corner' } })
        ).supported
      ).toBe(true);

      const unsupported = getRectCutPreviewSupport(
        createRectCut({ cutType: 'corner_notch', target: { type: 'face', face: 'top_face' } })
      );
      expect(unsupported.supported).toBe(false);
    });
  });

  describe('validateRectCutFeature', () => {
    it('accepts a valid dado, rabbet, and corner notch', () => {
      expect(
        validateRectCutFeature(
          createRectCut({ cutType: 'dado', size: { length: 0.75, width: 8 }, placement: { x: 2, z: 0 } }),
          PART
        )
      ).toBeNull();
      expect(
        validateRectCutFeature(
          createRectCut({
            cutType: 'rabbet',
            target: { type: 'edge', edge: 'top_front_edge' },
            size: { length: 24, width: 0.5 },
            placement: { x: 0, z: 0 }
          }),
          PART
        )
      ).toBeNull();
      expect(
        validateRectCutFeature(
          createRectCut({
            cutType: 'corner_notch',
            target: { type: 'corner', corner: 'front_left_corner' },
            depthMode: 'through',
            size: { length: 2, width: 2 },
            placement: { x: 0, z: 0 }
          }),
          PART
        )
      ).toBeNull();
    });

    it('rejects non-positive or non-finite removal sizes', () => {
      expect(validateRectCutFeature(createRectCut({ size: { length: 0, width: 2 } }), PART)).toBe(
        'Removal size must be greater than zero.'
      );
      expect(validateRectCutFeature(createRectCut({ size: { length: 2, width: -1 } }), PART)).toBe(
        'Removal size must be greater than zero.'
      );
      expect(validateRectCutFeature(createRectCut({ size: { length: Number.NaN, width: 2 } }), PART)).toBe(
        'Removal size must be greater than zero.'
      );
    });

    it('rejects blind depths outside the open (0, thickness) range', () => {
      expect(validateRectCutFeature(createRectCut({ depth: 0 }), PART)).toBe('Blind depth must be greater than zero.');
      const missingDepth = createRectCut();
      missingDepth.parameters.depth = undefined;
      expect(validateRectCutFeature(missingDepth, PART)).toBe('Blind depth must be greater than zero.');
      expect(validateRectCutFeature(createRectCut({ depth: 0.75 }), PART)).toBe(
        'Blind depth must stay less than part thickness.'
      );
    });

    it('validates dado placement bounds', () => {
      expect(
        validateRectCutFeature(
          createRectCut({ cutType: 'dado', size: { length: 0.75, width: 8 }, placement: { x: -1, z: 0 } }),
          PART
        )
      ).toBe('Dado offset cannot be negative.');
      expect(
        validateRectCutFeature(
          createRectCut({ cutType: 'dado', size: { length: 6, width: 8 }, placement: { x: 20, z: 0 } }),
          PART
        )
      ).toBe('Dado width runs past the blank.');
    });

    it('validates stopped dado negative offsets', () => {
      expect(
        validateRectCutFeature(
          createRectCut({ cutType: 'stopped_dado', size: { length: 3, width: 8 }, placement: { x: -0.5, z: 0 } }),
          PART
        )
      ).toBe('Stopped dado offset cannot be negative.');
    });

    it('validates groove placement bounds', () => {
      expect(
        validateRectCutFeature(
          createRectCut({ cutType: 'groove', size: { length: 24, width: 0.5 }, placement: { x: 0, z: -1 } }),
          PART
        )
      ).toBe('Groove offset cannot be negative.');
      expect(
        validateRectCutFeature(
          createRectCut({ cutType: 'groove', size: { length: 24, width: 3 }, placement: { x: 0, z: 6 } }),
          PART
        )
      ).toBe('Groove width runs past the blank.');
    });

    it('validates stopped groove negative offsets and run bounds', () => {
      expect(
        validateRectCutFeature(
          createRectCut({ cutType: 'stopped_groove', size: { length: 4, width: 0.5 }, placement: { x: -1, z: 0 } }),
          PART
        )
      ).toBe('Stopped groove offsets cannot be negative.');
      expect(
        validateRectCutFeature(
          createRectCut({ cutType: 'stopped_groove', size: { length: 10, width: 0.5 }, placement: { x: 20, z: 1 } }),
          PART
        )
      ).toBe('Stopped groove run extends past the blank.');
    });

    it('validates cutout offsets and bounds', () => {
      expect(validateRectCutFeature(createRectCut({ placement: { x: -1, z: 0 } }), PART)).toBe(
        'Cutout offsets cannot be negative.'
      );
      expect(
        validateRectCutFeature(createRectCut({ size: { length: 10, width: 2 }, placement: { x: 20, z: 1 } }), PART)
      ).toBe('Cutout length runs past the blank.');
      expect(
        validateRectCutFeature(createRectCut({ size: { length: 2, width: 4 }, placement: { x: 1, z: 6 } }), PART)
      ).toBe('Cutout width runs past the blank.');
    });

    it('validates mortise bounds through the shared cutout checks', () => {
      expect(
        validateRectCutFeature(
          createRectCut({ cutType: 'mortise', size: { length: 10, width: 0.75 }, placement: { x: 20, z: 1 } }),
          PART
        )
      ).toBe('Cutout length runs past the blank.');
    });

    it('validates edge notch bounds along front/back edges', () => {
      expect(
        validateRectCutFeature(
          createRectCut({
            cutType: 'edge_notch',
            target: { type: 'edge', edge: 'top_front_edge' },
            depthMode: 'through',
            size: { length: 10, width: 2 },
            placement: { x: 20, z: 0 }
          }),
          PART
        )
      ).toBe('Edge notch length runs past the blank.');
      expect(
        validateRectCutFeature(
          createRectCut({
            cutType: 'edge_notch',
            target: { type: 'edge', edge: 'top_back_edge' },
            depthMode: 'through',
            size: { length: 2, width: 10 },
            placement: { x: 0, z: 0 }
          }),
          PART
        )
      ).toBe('Edge notch width runs past the blank.');
    });

    it('validates edge notch bounds along left/right edges', () => {
      expect(
        validateRectCutFeature(
          createRectCut({
            cutType: 'edge_notch',
            target: { type: 'edge', edge: 'top_left_edge' },
            depthMode: 'through',
            size: { length: 2, width: 6 },
            placement: { x: 0, z: 4 }
          }),
          PART
        )
      ).toBe('Edge notch width runs past the blank.');
      expect(
        validateRectCutFeature(
          createRectCut({
            cutType: 'edge_notch',
            target: { type: 'edge', edge: 'top_right_edge' },
            depthMode: 'through',
            size: { length: 30, width: 2 },
            placement: { x: 0, z: 0 }
          }),
          PART
        )
      ).toBe('Edge notch length runs past the blank.');
    });

    it('rejects negative notch offsets for rabbets', () => {
      expect(
        validateRectCutFeature(
          createRectCut({
            cutType: 'rabbet',
            target: { type: 'edge', edge: 'top_front_edge' },
            size: { length: 24, width: 0.5 },
            placement: { x: 0, z: -1 }
          }),
          PART
        )
      ).toBe('Notch offsets cannot be negative.');
    });

    it('validates corner notch sizes against the blank', () => {
      expect(
        validateRectCutFeature(
          createRectCut({
            cutType: 'corner_notch',
            target: { type: 'corner', corner: 'front_left_corner' },
            depthMode: 'through',
            size: { length: 30, width: 2 },
            placement: { x: 0, z: 0 }
          }),
          PART
        )
      ).toBe('Corner notch size runs past the blank.');
    });

    it('surfaces the preview-support reason for otherwise valid but unsupported cuts', () => {
      const issue = validateRectCutFeature(
        createRectCut({
          cutType: 'edge_notch',
          target: { type: 'edge', edge: 'front_left_edge' },
          depthMode: 'blind',
          depth: 0.25,
          size: { length: 2, width: 2 },
          placement: { x: 0, z: 0 }
        }),
        PART
      );
      expect(issue).toContain('Blind notch previews');
    });
  });
  describe('tenon', () => {
    const tenon = (overrides: Record<string, unknown> = {}) =>
      ({
        id: 'tenon-1',
        kind: 'rect_cut',
        version: 1,
        enabled: true,
        cutType: 'tenon',
        target: { type: 'face', face: 'right_end' },
        reference: { primaryFrom: 'max', secondaryFrom: 'min' },
        parameters: { size: { length: 1.5, width: 2 }, depthMode: 'blind', depth: 0.5 },
        placement: { x: 0, z: 1 },
        ...overrides
      }) as never;

    const part = { length: 24, width: 4, thickness: 1.5 };

    it('accepts a well-formed tenon and clamps the tongue inside the blank', () => {
      expect(validateRectCutFeature(tenon(), part)).toBeNull();

      const resolved = getResolvedRectCutFeature(tenon({ placement: { x: 3, z: 9 } }), part);
      // Offset clamps so the tongue stays on the board; placement.x is unused.
      expect(resolved.placement.x).toBe(0);
      expect(resolved.placement.z).toBe(2);
      expect(resolved.parameters.depthMode).toBe('blind');
    });

    it('coerces a non-end target back onto an end', () => {
      const resolved = getResolvedRectCutFeature(tenon({ target: { type: 'face', face: 'top_face' } }), part);
      expect(resolved.target).toEqual({ type: 'face', face: 'right_end' });
    });

    it('rejects tenons that are not physically cuttable', () => {
      expect(
        validateRectCutFeature(
          tenon({ parameters: { size: { length: 1.5, width: 2 }, depthMode: 'blind', depth: 1.5 } }),
          part
        )
      ).toContain('less than part thickness');
      expect(
        validateRectCutFeature(
          tenon({ parameters: { size: { length: 30, width: 2 }, depthMode: 'blind', depth: 0.5 } }),
          part
        )
      ).toContain('less than part length');
    });

    it('clamps an oversized tongue to the blank instead of failing', () => {
      const oversized = tenon({ parameters: { size: { length: 1.5, width: 9 }, depthMode: 'blind', depth: 0.5 } });
      // Width is a resolver-clamped dimension: typing too wide gives a
      // full-width (bare-faced) tenon rather than a validation error.
      expect(validateRectCutFeature(oversized, part)).toBeNull();
      expect(getResolvedRectCutFeature(oversized, part).parameters.size.width).toBe(4);
    });

    it('supports preview only on end targets', () => {
      expect(getRectCutPreviewSupport(getResolvedRectCutFeature(tenon(), part)).supported).toBe(true);
      const onFace = getRectCutPreviewSupport(tenon({ target: { type: 'face', face: 'top_face' } }));
      expect(onFace.supported).toBe(false);
    });
  });
  describe('placement validation per cut type', () => {
    const part = { length: 24, width: 8, thickness: 1.5 };
    const rect = (cutType: string, overrides: Record<string, unknown>) =>
      ({
        id: 'v-1',
        kind: 'rect_cut',
        version: 1,
        enabled: true,
        cutType,
        target: { type: 'face', face: 'top_face' },
        reference: { primaryFrom: 'min', secondaryFrom: 'min' },
        parameters: { size: { length: 2, width: 2 }, depthMode: 'blind', depth: 0.25 },
        placement: { x: 0, z: 0 },
        ...overrides
      }) as never;

    const cases: Array<[string, never, RegExp]> = [
      ['dado pushed off the left end', rect('dado', { placement: { x: -1, z: 0 } }), /offset cannot be negative/i],
      [
        'dado running past the blank',
        rect('dado', {
          parameters: { size: { length: 4, width: 2 }, depthMode: 'blind', depth: 0.25 },
          placement: { x: 23, z: 0 }
        }),
        /past the blank/i
      ],
      [
        'stopped dado pushed off the left end',
        rect('stopped_dado', { placement: { x: -2, z: 0 } }),
        /offset cannot be negative/i
      ],
      [
        'stopped dado running past the blank',
        rect('stopped_dado', {
          parameters: { size: { length: 6, width: 2 }, depthMode: 'blind', depth: 0.25 },
          placement: { x: 22, z: 0 }
        }),
        /extends past the blank/i
      ],
      [
        'groove pushed off the front edge',
        rect('groove', { placement: { x: 0, z: -1 } }),
        /offset cannot be negative/i
      ],
      [
        'groove running past the width',
        rect('groove', {
          parameters: { size: { length: 2, width: 3 }, depthMode: 'blind', depth: 0.25 },
          placement: { x: 0, z: 7 }
        }),
        /runs past the blank/i
      ],
      [
        'side-face pocket deeper than the board is wide',
        rect('mortise', {
          target: { type: 'face', face: 'front_face' },
          parameters: { size: { length: 2, width: 1 }, depthMode: 'blind', depth: 9 }
        }),
        /less than part width/i
      ]
    ];

    for (const [name, feature, expected] of cases) {
      it(`rejects a ${name}`, () => {
        expect(validateRectCutFeature(feature, part)).toMatch(expected);
      });
    }

    it('accepts the same cuts once they sit inside the blank', () => {
      expect(validateRectCutFeature(rect('dado', { placement: { x: 4, z: 0 } }), part)).toBeNull();
      expect(validateRectCutFeature(rect('stopped_dado', { placement: { x: 4, z: 0 } }), part)).toBeNull();
      expect(validateRectCutFeature(rect('groove', { placement: { x: 0, z: 2 } }), part)).toBeNull();
    });
  });
});
