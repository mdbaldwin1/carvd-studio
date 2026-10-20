import { describe, expect, it } from 'vitest';
import type {
  CircularCutFeature,
  EdgeProfileFeature,
  EndCutFeature,
  PartFeature,
  RectCutFeature,
  RoundedCutFeature,
  RoutedPathFeature
} from '../types';
import {
  getAuthoredFeatureCount,
  getEnabledFeatureCount,
  getFeatureBadgeLabel,
  getFeatureSummary,
  getFeaturePlacementSummary,
  getFeatureTargetLabel,
  getPrimaryFeatureText
} from './partFeatureSummary';

function createEndCut(overrides?: {
  face?: EndCutFeature['target']['face'];
  cutType?: EndCutFeature['cutType'];
  parameters?: Partial<EndCutFeature['parameters']>;
  enabled?: boolean;
  label?: string;
}): EndCutFeature {
  return {
    id: 'end-cut-1',
    kind: 'end_cut',
    version: 1 as const,
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
    version: 1 as const,
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

function createCircularCut(overrides: Partial<CircularCutFeature> = {}): CircularCutFeature {
  return {
    id: 'hole-1',
    kind: 'circular_cut',
    version: 1 as const,
    enabled: true,
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'min', secondaryFrom: 'min' },
    cutType: 'round_hole',
    placement: { primary: 2, secondary: 1, rotation: 0 },
    parameters: { diameter: 0.375, depthMode: 'through', tilt: 0, direction: 0 },
    ...overrides
  };
}

function createRoundedCut(overrides: Partial<RoundedCutFeature> = {}): RoundedCutFeature {
  return {
    id: 'slot-1',
    kind: 'rounded_cut',
    version: 1 as const,
    enabled: true,
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'center', secondaryFrom: 'center' },
    cutType: 'rounded_slot',
    placement: { primary: 0, secondary: 0, rotation: 0 },
    parameters: { length: 3, width: 1, cornerRadius: 0.5, depthMode: 'through' },
    ...overrides
  };
}

function createRoutedPath(overrides: Partial<RoutedPathFeature> = {}): RoutedPathFeature {
  return {
    id: 'route-1',
    kind: 'routed_path',
    version: 1,
    enabled: true,
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'center', secondaryFrom: 'center' },
    path: {
      points: [
        { primary: -2, secondary: 0 },
        { primary: 0, secondary: 1 },
        { primary: 2, secondary: 0 }
      ]
    },
    bit: { profile: 'straight', diameter: 0.25 },
    parameters: { depthMode: 'blind', depth: 0.125 },
    ...overrides
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
    it.each(['mitre', 'bevel', 'compound'] as const)(
      'shows the partial-thickness %s band measured from Bottom',
      (cutType) => {
        const feature = createEndCut({
          cutType,
          parameters: { horizontalAngle: 45, verticalAngle: 15, band: { from: 0.375, to: 0.75 } }
        });
        expect(getFeatureSummary(feature, 'imperial')).toContain('Cut band 3/8" to 3/4" from Bottom');
        expect(getFeatureSummary(feature, 'metric')).toContain('Cut band 9.525mm to 19.05mm from Bottom');
      }
    );
    it('retains the band in a long-edge bevel summary', () => {
      const feature = createEndCut({
        cutType: 'bevel',
        face: 'front_face',
        parameters: { horizontalAngle: 0, verticalAngle: 45, band: { from: 0, to: 0.375 } }
      });
      expect(getFeatureSummary(feature, 'imperial')).toContain('Cut band 0" to 3/8" from Bottom');
    });

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

    it('reports the rendered front long point on the right end', () => {
      expect(getFeatureSummary(createEndCut({ cutType: 'mitre', face: 'right_end' }), 'imperial')).toBe(
        'Mitre 45° on Right End · Long point on Front'
      );
    });

    it('reports the rendered back long point on a flipped right-end compound cut', () => {
      expect(
        getFeatureSummary(
          createEndCut({
            cutType: 'compound',
            face: 'right_end',
            parameters: { horizontalAngle: 22.5, horizontalFlip: true, verticalAngle: 15, verticalFlip: false }
          }),
          'imperial'
        )
      ).toBe('Compound 22.5° / 15° bevel on Right End · Long point on Back · High point on Top');
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
      ).toBe('Stopped Dado on Top Face · 76.2mm run × 6.35mm deep');
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
        // A mortise says how its corners come out, because the mating tenon
        // has to match: square if chopped, rounded if routed.
      ).toBe('Mortise on Top Face · 2" × 3/4" × 1/2" deep · square corners');
    });

    it.each([5, -5])('includes signed mortise end-wall shaping (%s degrees)', (wallAngle) => {
      const feature = createRectCut({ cutType: 'mortise', depthMode: 'blind', depth: 1 });
      feature.parameters.wallAngle = wallAngle;
      feature.parameters.sideWallAngle = 3;
      for (const units of ['imperial', 'metric'] as const) {
        const summary = getFeatureSummary(feature, units);
        expect(summary).toContain(`5° end walls, ${wallAngle > 0 ? 'widening' : 'narrowing'} with depth`);
        expect(summary).toContain('3° side walls, widening with depth');
      }
    });

    it('reports a zero depth when a blind cut has no stored depth', () => {
      expect(
        getFeatureSummary(
          createRectCut({ cutType: 'dado', size: { length: 0.75, width: 8 }, depthMode: 'blind' }),
          'imperial'
        )
      ).toBe('Dado on Top Face · 3/4" wide × 0" deep');
    });

    it('includes through and blind termination in cutout and notch fabrication summaries', () => {
      expect(
        getFeatureSummary(createRectCut({ size: { length: 3, width: 2 }, depthMode: 'blind', depth: 0.25 }), 'imperial')
      ).toBe('Cutout on Top Face · 3" × 2" × 1/4" deep');
      expect(
        getFeatureSummary(
          createRectCut({
            cutType: 'corner_notch',
            target: { type: 'corner', corner: 'front_left_corner' },
            size: { length: 2, width: 2 }
          }),
          'imperial'
        )
      ).toBe('Corner Notch on Front-Left Corner · 2" × 2" · Through');
      expect(
        getFeatureSummary(
          createRectCut({
            cutType: 'edge_notch',
            target: { type: 'edge', edge: 'top_front_edge' },
            size: { length: 2, width: 1 }
          }),
          'metric'
        )
      ).toBe('Edge Notch on Front Side · 50.8mm × 25.4mm · Through');
    });
  });

  describe('getFeatureSummary — round and rounded cuts', () => {
    it.each(['round_hole', 'counterbore', 'countersink'] as const)(
      'uses the editor face angle for a 15-degree %s, including patterns',
      (cutType) => {
        const cut = createCircularCut({
          cutType,
          parameters: {
            diameter: 0.25,
            depthMode: 'blind',
            depth: 1,
            tilt: 75,
            direction: 180,
            counterbore: { diameter: 0.5, depth: 0.125 },
            countersink: { majorDiameter: 0.5, includedAngle: 82 }
          }
        });
        expect(getFeatureSummary(cut, 'imperial')).toContain('15° from face toward 180°');
        expect(
          getFeatureSummary({ ...cut, pattern: { type: 'linear', count: 2, spacing: 1, direction: 0 } }, 'metric')
        ).toContain('15° from face toward 180°');
      }
    );

    it('summarizes through, angled blind, countersunk, and counterbored holes', () => {
      expect(getFeatureSummary(createCircularCut(), 'imperial')).toBe(
        'Round Hole on Top Face · 3/8" diameter · Through'
      );
      expect(
        getFeatureSummary(
          createCircularCut({
            parameters: { diameter: 0.25, depthMode: 'blind', depth: 1, tilt: 15, direction: 90 }
          }),
          'imperial'
        )
      ).toBe('Round Hole on Top Face · 1/4" diameter × 1" deep · 75° from face toward 90°');
      expect(
        getFeatureSummary(
          createCircularCut({
            cutType: 'countersink',
            parameters: {
              diameter: 0.25,
              depthMode: 'through',
              tilt: 0,
              direction: 0,
              countersink: { majorDiameter: 0.5, includedAngle: 82 }
            }
          }),
          'imperial'
        )
      ).toBe('Countersink on Top Face · 1/4" hole × 1/2" major · 82° · Through');
      expect(
        getFeatureSummary(
          createCircularCut({
            cutType: 'counterbore',
            parameters: {
              diameter: 0.25,
              depthMode: 'through',
              tilt: 0,
              direction: 0,
              counterbore: { diameter: 0.5, depth: 0.25 }
            }
          }),
          'imperial'
        )
      ).toBe('Counterbore on Top Face · 1/4" hole · 1/2" × 1/4" recess · Through');
    });

    it('summarizes patterns and rounded profiles as one authored operation', () => {
      expect(
        getFeatureSummary(
          createCircularCut({ pattern: { type: 'linear', count: 4, spacing: 2, direction: 20 } }),
          'imperial'
        )
      ).toBe('4-hole Linear Pattern on Top Face · 3/8" diameter · 2" spacing · 20° direction · Through');
      expect(
        getFeatureSummary(
          createCircularCut({
            pattern: { type: 'grid', rows: 2, columns: 3, rowSpacing: 1, columnSpacing: 2, rotation: 15 }
          }),
          'imperial'
        )
      ).toBe('6-hole Grid Pattern on Top Face · 3/8" diameter · 2" × 1" spacing · 15° rotation · Through');
      expect(
        getFeatureSummary(
          createCircularCut({ pattern: { type: 'circular', count: 4, radius: 2, startAngle: 30 } }),
          'imperial'
        )
      ).toBe('4-hole Circular Pattern on Top Face · 3/8" diameter · 2" radius · 30° start angle · Through');
      expect(getFeatureSummary(createRoundedCut(), 'imperial')).toBe('Rounded Slot on Top Face · 3" × 1" · Through');
      expect(
        getFeatureSummary(
          createRoundedCut({
            cutType: 'rounded_rectangle',
            parameters: { length: 4, width: 2, cornerRadius: 0.25, depthMode: 'blind', depth: 0.5 }
          }),
          'metric'
        )
      ).toBe('Rounded Rectangle on Top Face · 101.6mm × 50.8mm · 6.35mm radius × 12.7mm deep');
    });
  });

  describe('getFeatureSummary — routed paths', () => {
    it('keeps omitted and zero-radius corners visually sharp in the summary', () => {
      expect(getFeatureSummary(createRoutedPath(), 'imperial')).toBe(
        'Routed Path on Top Face · Open 3-point path · Flat Bottom, 1/4" diameter · 1/8" deep'
      );
      expect(
        getFeatureSummary(
          createRoutedPath({
            path: {
              points: [
                { primary: -2, secondary: 0, cornerRadius: 0 },
                { primary: 0, secondary: 1 },
                { primary: 2, secondary: 0 }
              ]
            }
          }),
          'imperial'
        )
      ).not.toContain('rounded');
    });

    it('reports the number of rounded corners', () => {
      expect(
        getFeatureSummary(
          createRoutedPath({
            path: {
              points: [
                { primary: -2, secondary: 0, cornerRadius: 0.25 },
                { primary: 0, secondary: 1, cornerRadius: 0.5 },
                { primary: 2, secondary: 0 }
              ]
            }
          }),
          'imperial'
        )
      ).toContain('2 rounded corners');
    });

    it.each([
      [
        { profile: 'dovetail', diameter: 0.5, shankDiameter: 0.25, includedAngle: 14 } as const,
        'Dovetail 7° slope · 1/4" shank'
      ],
      [
        { profile: 't_slot', diameter: 0.75, shankDiameter: 0.25, cutterHeight: 0.125 } as const,
        'T Slot · 1/4" shank × 1/8" cutter height'
      ],
      [
        { profile: 'keyhole', diameter: 0.375, shankDiameter: 0.125, cutterHeight: 0.25 } as const,
        'Keyhole · 1/8" shank × 1/4" cutter height'
      ]
    ])('summarizes undercut bit dimensions', (bit, expected) => {
      const summary = getFeatureSummary(createRoutedPath({ bit }), 'imperial');
      expect(summary).toContain(expected);
      expect(summary).toContain('max diameter');
    });
  });

  describe('getFeatureSummary — edge-profile tools', () => {
    const edge = (routerToolSnapshot?: EdgeProfileFeature['routerToolSnapshot']): EdgeProfileFeature => ({
      id: 'edge-1',
      kind: 'edge_profile',
      version: 1,
      enabled: true,
      target: { type: 'edge', edge: 'top_front_edge' },
      reference: { primaryFrom: 'min' },
      profile: 'cove',
      parameters: { size: 0.5, depth: 0.5 },
      routerToolSnapshot
    });

    it('states explicitly when no physical tool is assigned', () => {
      expect(getFeatureSummary(edge(), 'imperial')).toContain('Generic profile / no physical tool assigned');
    });

    it('includes assigned manufacturer and SKU metadata', () => {
      expect(
        getFeatureSummary(
          edge({
            version: 1,
            id: 'tool-1',
            name: 'Catalog Cove',
            source: 'manufacturer',
            manufacturer: 'Example Tool Co',
            sku: 'CV-100',
            profileFamily: 'cove',
            cutterDiameter: 1,
            shankDiameter: 0.5,
            cuttingHeight: 0.5
          }),
          'imperial'
        )
      ).toContain('Tool: Catalog Cove (Example Tool Co CV-100)');
    });

    it('distinguishes detailed axial tooling from a legacy envelope', () => {
      const legacy = getFeatureSummary(
        edge({
          version: 1,
          id: 'legacy',
          name: 'Legacy',
          source: 'generic',
          profileFamily: 'cove',
          cutterDiameter: 1,
          shankDiameter: 0.5,
          cuttingHeight: 0.5
        }),
        'imperial'
      );
      const detailed = getFeatureSummary(
        edge({
          version: 1,
          id: 'detailed',
          name: 'Detailed',
          source: 'generic',
          profileFamily: 'cove',
          cutterDiameter: 1,
          shankDiameter: 0.5,
          cuttingHeight: 0.5,
          envelopeVersion: 1,
          sections: [
            { role: 'cutter', start: 0, end: 0.5, diameter: 1 },
            { role: 'shank', start: 0.5, end: 2, diameter: 0.5 }
          ],
          overallLength: 3
        }),
        'imperial'
      );
      expect(legacy).toContain('legacy axial envelope');
      expect(detailed).toContain('2 axial sections · 3" overall');
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
        version: 1 as const,
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

describe('edge groove placement notes', () => {
  it.each(['front_face', 'back_face'] as const)('measures a %s groove from the bottom', (face) => {
    const cut = createRectCut({ cutType: 'groove', target: { type: 'face', face } });
    cut.placement.z = 0.25;
    expect(getFeaturePlacementSummary(cut, 'imperial')).toBe('1/4" from Bottom; full length');
  });
});

describe('rectangular cut reference edges', () => {
  it.each(['top_face', 'bottom_face'] as const)('uses the back edge for rectangular cuts on %s', (face) => {
    for (const cutType of ['groove', 'stopped_groove', 'mortise', 'cutout'] as const) {
      const cut = createRectCut({ cutType, target: { type: 'face', face } });
      expect(getFeaturePlacementSummary(cut, 'imperial')).toContain('1" from Back');
    }
  });

  it('uses the back edge for a short-edge notch but preserves the tenon shoulder convention', () => {
    const notch = createRectCut({ cutType: 'edge_notch', target: { type: 'edge', edge: 'top_left_edge' } });
    expect(getFeaturePlacementSummary(notch, 'imperial')).toBe('1" from Back along the selected edge');
    const tenon = createRectCut({ cutType: 'tenon', target: { type: 'face', face: 'right_end' } });
    expect(getFeaturePlacementSummary(tenon, 'imperial')).toContain('1" from Front');
  });
});
