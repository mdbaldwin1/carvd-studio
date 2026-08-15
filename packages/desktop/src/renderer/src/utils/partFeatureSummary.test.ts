import { describe, expect, it } from 'vitest';
import type { EndCutFeature, PartFeature, RectCutFeature } from '../types';
import {
  getAuthoredFeatureCount,
  getEnabledFeatureCount,
  getFeatureBadgeLabel,
  getFeatureSummary,
  getFeatureTargetLabel,
  getPrimaryFeatureText
} from './partFeatureSummary';

function createEndCut(overrides?: {
  face?: 'left_end' | 'right_end';
  cutType?: EndCutFeature['cutType'];
  parameters?: Partial<EndCutFeature['parameters']>;
  enabled?: boolean;
  label?: string;
}): EndCutFeature {
  return {
    id: 'end-cut-1',
    kind: 'end_cut',
    version: 1,
    enabled: overrides?.enabled ?? true,
    label: overrides?.label,
    target: { type: 'face', face: overrides?.face ?? 'left_end' },
    reference: { primaryFrom: 'min' },
    cutType: overrides?.cutType ?? 'mitre',
    lengthMode: 'long_point',
    parameters: { horizontalAngle: 45, ...overrides?.parameters }
  };
}

function createRectCut(overrides?: {
  cutType?: RectCutFeature['cutType'];
  target?: RectCutFeature['target'];
  size?: { length: number; width: number };
  depthMode?: 'through' | 'blind';
  depth?: number;
  enabled?: boolean;
  label?: string;
}): RectCutFeature {
  return {
    id: 'rect-cut-1',
    kind: 'rect_cut',
    version: 1,
    enabled: overrides?.enabled ?? true,
    label: overrides?.label,
    target: overrides?.target ?? { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'min' },
    cutType: overrides?.cutType ?? 'cutout',
    parameters: {
      size: overrides?.size ?? { length: 2, width: 2 },
      depthMode: overrides?.depthMode ?? 'through',
      depth: overrides?.depth
    },
    placement: { x: 1, z: 1 }
  };
}

describe('partFeatureSummary', () => {
  describe('getFeatureTargetLabel', () => {
    it('labels face targets', () => {
      expect(getFeatureTargetLabel(createEndCut({ face: 'left_end' }))).toBe('Left End');
      expect(getFeatureTargetLabel(createRectCut({ target: { type: 'face', face: 'bottom_face' } }))).toBe(
        'Bottom Face'
      );
    });

    it('labels regular edge targets with the full edge name', () => {
      expect(
        getFeatureTargetLabel(createRectCut({ cutType: 'rabbet', target: { type: 'edge', edge: 'top_back_edge' } }))
      ).toBe('Top-Back Edge');
    });

    it('labels edge notches with simplified side names', () => {
      const sides: Array<[RectCutFeature['target'], string]> = [
        [{ type: 'edge', edge: 'top_front_edge' }, 'Front Side'],
        [{ type: 'edge', edge: 'bottom_back_edge' }, 'Back Side'],
        [{ type: 'edge', edge: 'top_left_edge' }, 'Left Side'],
        [{ type: 'edge', edge: 'top_right_edge' }, 'Right Side']
      ];
      for (const [target, label] of sides) {
        expect(getFeatureTargetLabel(createRectCut({ cutType: 'edge_notch', target }))).toBe(label);
      }
    });

    it('labels corner targets', () => {
      expect(
        getFeatureTargetLabel(
          createRectCut({ cutType: 'corner_notch', target: { type: 'corner', corner: 'back_right_corner' } })
        )
      ).toBe('Back-Right Corner');
    });
  });

  describe('getFeatureSummary — end cuts', () => {
    it('summarizes a mitre with its angle and long point direction', () => {
      expect(getFeatureSummary(createEndCut({ cutType: 'mitre' }), 'imperial')).toBe(
        'Mitre 45° on Left End · Long point on Front'
      );
    });

    it('moves the long point to the back when horizontally flipped', () => {
      expect(
        getFeatureSummary(
          createEndCut({ cutType: 'mitre', parameters: { horizontalAngle: 45, horizontalFlip: true } }),
          'imperial'
        )
      ).toBe('Mitre 45° on Left End · Long point on Back');
    });

    it('mirrors the long point on the right end', () => {
      expect(getFeatureSummary(createEndCut({ cutType: 'mitre', face: 'right_end' }), 'imperial')).toBe(
        'Mitre 45° on Right End · Long point on Back'
      );
    });

    it('summarizes a bevel with the vertical angle and high point', () => {
      expect(
        getFeatureSummary(
          createEndCut({ cutType: 'bevel', face: 'right_end', parameters: { horizontalAngle: 0, verticalAngle: 30 } }),
          'imperial'
        )
      ).toBe('Bevel 30° bevel on Right End · High point on Top');
    });

    it('moves the high point to the bottom when vertically flipped', () => {
      expect(
        getFeatureSummary(
          createEndCut({
            cutType: 'bevel',
            face: 'right_end',
            parameters: { horizontalAngle: 0, verticalAngle: 30, verticalFlip: true }
          }),
          'imperial'
        )
      ).toBe('Bevel 30° bevel on Right End · High point on Bottom');
    });

    it('omits angle and direction text for a bevel with no vertical angle', () => {
      expect(
        getFeatureSummary(
          createEndCut({ cutType: 'bevel', parameters: { horizontalAngle: 0, verticalAngle: 0 } }),
          'imperial'
        )
      ).toBe('Bevel on Left End');
    });

    it('summarizes a compound cut with both angles and directions', () => {
      expect(
        getFeatureSummary(
          createEndCut({ cutType: 'compound', parameters: { horizontalAngle: 45, verticalAngle: 30 } }),
          'imperial'
        )
      ).toBe('Compound 45° / 30° bevel on Left End · Long point on Front · High point on Bottom');
    });
  });

  describe('getFeatureSummary — rect cuts', () => {
    it('summarizes a dado in imperial units', () => {
      expect(
        getFeatureSummary(
          createRectCut({ cutType: 'dado', size: { length: 0.75, width: 8 }, depthMode: 'blind', depth: 0.25 }),
          'imperial'
        )
      ).toBe('Dado on Top Face · 3/4" wide × 1/4" deep');
    });

    it('summarizes a stopped dado in metric units', () => {
      expect(
        getFeatureSummary(
          createRectCut({ cutType: 'stopped_dado', size: { length: 3, width: 8 }, depthMode: 'blind', depth: 0.25 }),
          'metric'
        )
      ).toBe('Stopped Dado on Top Face · 76.2mm run × 6.4mm deep');
    });

    it('uses the width as the rabbet shoulder on front/back edges', () => {
      expect(
        getFeatureSummary(
          createRectCut({
            cutType: 'rabbet',
            target: { type: 'edge', edge: 'top_front_edge' },
            size: { length: 24, width: 0.5 },
            depthMode: 'blind',
            depth: 0.375
          }),
          'imperial'
        )
      ).toBe('Rabbet on Top-Front Edge · 1/2" shoulder × 3/8" deep');
    });

    it('uses the length as the rabbet shoulder on left/right edges', () => {
      expect(
        getFeatureSummary(
          createRectCut({
            cutType: 'rabbet',
            target: { type: 'edge', edge: 'top_left_edge' },
            size: { length: 0.75, width: 8 },
            depthMode: 'blind',
            depth: 0.25
          }),
          'imperial'
        )
      ).toBe('Rabbet on Top-Left Edge · 3/4" shoulder × 1/4" deep');
    });

    it('summarizes grooves, stopped grooves, and mortises', () => {
      expect(
        getFeatureSummary(
          createRectCut({ cutType: 'groove', size: { length: 24, width: 0.5 }, depthMode: 'blind', depth: 0.25 }),
          'imperial'
        )
      ).toBe('Groove on Top Face · 1/2" wide × 1/4" deep');
      expect(
        getFeatureSummary(
          createRectCut({
            cutType: 'stopped_groove',
            size: { length: 4, width: 0.5 },
            depthMode: 'blind',
            depth: 0.25
          }),
          'imperial'
        )
      ).toBe('Stopped Groove on Top Face · 4" run × 1/2" wide × 1/4" deep');
      expect(
        getFeatureSummary(
          createRectCut({ cutType: 'mortise', size: { length: 2, width: 0.75 }, depthMode: 'blind', depth: 0.5 }),
          'imperial'
        )
      ).toBe('Mortise on Top Face · 2" × 3/4" × 1/2" deep');
    });

    it('reports a zero depth when a blind cut has no stored depth', () => {
      expect(
        getFeatureSummary(
          createRectCut({ cutType: 'dado', size: { length: 0.75, width: 8 }, depthMode: 'blind' }),
          'imperial'
        )
      ).toBe('Dado on Top Face · 3/4" wide × 0" deep');
    });

    it('falls back to a generic size summary for cutouts and notches', () => {
      expect(getFeatureSummary(createRectCut({ size: { length: 3, width: 2 } }), 'imperial')).toBe(
        'Cutout on Top Face · 3" × 2"'
      );
      expect(
        getFeatureSummary(
          createRectCut({
            cutType: 'corner_notch',
            target: { type: 'corner', corner: 'front_left_corner' },
            size: { length: 2, width: 2 }
          }),
          'imperial'
        )
      ).toBe('Corner Notch on Front-Left Corner · 2" × 2"');
      expect(
        getFeatureSummary(
          createRectCut({
            cutType: 'edge_notch',
            target: { type: 'edge', edge: 'top_front_edge' },
            size: { length: 2, width: 1 }
          }),
          'metric'
        )
      ).toBe('Edge Notch on Front Side · 50.8mm × 25.4mm');
    });
  });

  describe('feature counts and labels', () => {
    it('counts authored and enabled features, defaulting to zero', () => {
      expect(getAuthoredFeatureCount()).toBe(0);
      expect(getEnabledFeatureCount()).toBe(0);

      const features: PartFeature[] = [createEndCut(), createRectCut({ enabled: false })];
      expect(getAuthoredFeatureCount(features)).toBe(2);
      expect(getEnabledFeatureCount(features)).toBe(1);
    });

    it('returns a badge label only when features exist', () => {
      expect(getFeatureBadgeLabel()).toBeNull();
      expect(getFeatureBadgeLabel([])).toBeNull();
      expect(getFeatureBadgeLabel([createEndCut(), createRectCut()])).toBe('Ops 2');
    });
  });

  describe('getPrimaryFeatureText', () => {
    it('returns null when there are no features', () => {
      expect(getPrimaryFeatureText(undefined, 'imperial')).toBeNull();
      expect(getPrimaryFeatureText([], 'imperial')).toBeNull();
    });

    it('prefers the first enabled feature and its trimmed label', () => {
      const features: PartFeature[] = [
        createEndCut({ enabled: false, label: 'Disabled mitre' }),
        createRectCut({ label: '  Shelf notch  ' })
      ];
      expect(getPrimaryFeatureText(features, 'imperial')).toBe('Shelf notch');
    });

    it('falls back to the summary when labels are ignored', () => {
      const features: PartFeature[] = [createEndCut({ label: 'My mitre' })];
      expect(getPrimaryFeatureText(features, 'imperial', { preferLabel: false })).toBe(
        'Mitre 45° on Left End · Long point on Front'
      );
    });

    it('marks the summary as disabled when no enabled feature exists', () => {
      const features: PartFeature[] = [createEndCut({ enabled: false })];
      expect(getPrimaryFeatureText(features, 'imperial')).toBe(
        'Mitre 45° on Left End · Long point on Front (disabled)'
      );
    });
  });
  it('summarizes long-edge bevels with edge and high point', () => {
    const summary = getFeatureSummary(
      {
        id: 'eb-1',
        kind: 'end_cut',
        version: 1,
        enabled: true,
        target: { type: 'face', face: 'front_face' },
        reference: { primaryFrom: 'min' },
        cutType: 'bevel',
        lengthMode: 'long_point',
        parameters: { horizontalAngle: 0, verticalAngle: 45, verticalFlip: true }
      },
      'imperial'
    );
    expect(summary).toBe('Edge Bevel 45\u00b0 on Front Edge \u00b7 High point on Top');
  });
});
