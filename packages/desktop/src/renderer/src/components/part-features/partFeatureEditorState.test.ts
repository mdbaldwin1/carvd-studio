import { describe, expect, it } from 'vitest';
import type { EndCutFeature, PartFeature, RectCutFeature } from '@renderer/types';
import {
  applyTargetToFeatureDraft,
  buildDraftFromFeature,
  buildDraftFromPreset,
  buildFeatureFromDraft,
  duplicateFeature,
  edgeNotchSideToTarget,
  edgeTargetToSide,
  generateFeatureId,
  getFeatureDraftTarget,
  getPresetHint,
  getPresetLabel,
  normalizeRectCutDraft,
  type FeatureDraft,
  type OperationPreset
} from './partFeatureEditorState';

const PART_DEFAULTS = { partLength: 24, partWidth: 8, partThickness: 0.75 };

type RectDraft = Extract<FeatureDraft, { mode: 'rect_cut' }>;
type EndCutDraft = Extract<FeatureDraft, { mode: 'end_cut' }>;

function createRectDraft(overrides?: Partial<RectDraft>): RectDraft {
  return {
    mode: 'rect_cut',
    featureId: null,
    label: '',
    enabled: true,
    cutType: 'cutout',
    faceTarget: 'top_face',
    edgeTarget: 'top_front_edge',
    cornerTarget: 'front_left_corner',
    sizeLength: 2,
    sizeWidth: 2,
    depthMode: 'through',
    depth: 0.25,
    placementX: 1,
    placementZ: 1,
    ...overrides
  };
}

function createEndCutDraft(overrides?: Partial<EndCutDraft>): EndCutDraft {
  return {
    mode: 'end_cut',
    featureId: null,
    label: '',
    enabled: true,
    targetFace: 'left_end',
    cutType: 'mitre',
    lengthMode: 'long_point',
    referenceMode: null,
    referenceValue: null,
    horizontalAngle: 45,
    horizontalFlip: false,
    verticalAngle: 0,
    verticalFlip: false,
    ...overrides
  };
}

describe('partFeatureEditorState', () => {
  it('preserves end-cut length semantics when round-tripping through the draft model', () => {
    const feature = {
      id: 'feature-1',
      kind: 'end_cut' as const,
      version: 1 as const,
      enabled: true,
      target: { type: 'face' as const, face: 'left_end' as const },
      reference: { primaryFrom: 'min' as const },
      cutType: 'mitre' as const,
      lengthMode: 'centerline' as const,
      parameters: {
        horizontalAngle: 45,
        reference: {
          mode: 'centerline' as const,
          value: 23.5
        }
      }
    };

    const draft = buildDraftFromFeature(feature);
    const rebuilt = buildFeatureFromDraft(draft);

    expect(draft).toMatchObject({
      lengthMode: 'centerline',
      referenceMode: 'centerline',
      referenceValue: 23.5
    });
    expect(rebuilt).toMatchObject({
      lengthMode: 'centerline',
      parameters: {
        reference: {
          mode: 'centerline',
          value: 23.5
        }
      }
    });
  });

  describe('edge notch side mapping', () => {
    it('maps sides to canonical top edges and back', () => {
      expect(edgeNotchSideToTarget('front')).toBe('top_front_edge');
      expect(edgeNotchSideToTarget('back')).toBe('top_back_edge');
      expect(edgeNotchSideToTarget('left')).toBe('top_left_edge');
      expect(edgeNotchSideToTarget('right')).toBe('top_right_edge');

      expect(edgeTargetToSide('bottom_front_edge')).toBe('front');
      expect(edgeTargetToSide('bottom_back_edge')).toBe('back');
      expect(edgeTargetToSide('bottom_left_edge')).toBe('left');
      expect(edgeTargetToSide('top_right_edge')).toBe('right');
    });
  });

  describe('normalizeRectCutDraft', () => {
    it('forces blind depth for blind-only cut types and clamps the depth to the part thickness', () => {
      const normalized = normalizeRectCutDraft(
        createRectDraft({ cutType: 'dado', depthMode: 'through', depth: 5 }),
        PART_DEFAULTS
      );
      expect(normalized.depthMode).toBe('blind');
      expect(normalized.depth).toBeCloseTo(0.749);
    });

    it('replaces non-positive or non-finite blind depths with usable values', () => {
      expect(normalizeRectCutDraft(createRectDraft({ cutType: 'mortise', depth: 0 }), PART_DEFAULTS).depth).toBe(0.25);
      expect(
        normalizeRectCutDraft(createRectDraft({ cutType: 'mortise', depth: Number.NaN }), PART_DEFAULTS).depth
      ).toBe(0.25);
      expect(normalizeRectCutDraft(createRectDraft({ cutType: 'mortise', depth: 0.01 }), PART_DEFAULTS).depth).toBe(
        0.125
      );
    });

    it('sanitizes non-finite sizes and placements', () => {
      const normalized = normalizeRectCutDraft(
        createRectDraft({ sizeLength: Number.NaN, sizeWidth: Number.NaN, placementX: Number.NaN, placementZ: -3 }),
        PART_DEFAULTS
      );
      expect(normalized.sizeLength).toBe(0.75);
      expect(normalized.sizeWidth).toBe(0.75);
      expect(normalized.placementX).toBe(0);
      expect(normalized.placementZ).toBe(0);
    });

    it('coerces face targets to top/bottom for face-based cut types', () => {
      for (const cutType of ['cutout', 'dado', 'stopped_dado', 'groove', 'stopped_groove', 'mortise'] as const) {
        const normalized = normalizeRectCutDraft(createRectDraft({ cutType, faceTarget: 'front_face' }), PART_DEFAULTS);
        expect(normalized.faceTarget).toBe('top_face');
      }
      const bottom = normalizeRectCutDraft(createRectDraft({ faceTarget: 'bottom_face' }), PART_DEFAULTS);
      expect(bottom.faceTarget).toBe('bottom_face');
    });

    it('forces edge notches through-depth and canonicalizes legacy edge targets', () => {
      const frontNotch = normalizeRectCutDraft(
        createRectDraft({ cutType: 'edge_notch', depthMode: 'blind', edgeTarget: 'bottom_front_edge', placementZ: 2 }),
        PART_DEFAULTS
      );
      expect(frontNotch.depthMode).toBe('through');
      expect(frontNotch.edgeTarget).toBe('top_front_edge');
      expect(frontNotch.placementZ).toBe(0);

      const leftNotch = normalizeRectCutDraft(
        createRectDraft({ cutType: 'edge_notch', edgeTarget: 'bottom_left_edge', placementX: 2, placementZ: 1 }),
        PART_DEFAULTS
      );
      expect(leftNotch.edgeTarget).toBe('top_left_edge');
      expect(leftNotch.placementX).toBe(0);
      expect(leftNotch.placementZ).toBe(1);
    });

    it('keeps top/bottom rabbet edges but replaces side edges with the default', () => {
      const kept = normalizeRectCutDraft(
        createRectDraft({ cutType: 'rabbet', edgeTarget: 'bottom_back_edge' }),
        PART_DEFAULTS
      );
      expect(kept.edgeTarget).toBe('bottom_back_edge');

      const replaced = normalizeRectCutDraft(
        createRectDraft({ cutType: 'rabbet', edgeTarget: 'front_left_edge' }),
        PART_DEFAULTS
      );
      expect(replaced.edgeTarget).toBe('top_front_edge');
    });

    it('zeroes corner notch placement', () => {
      const normalized = normalizeRectCutDraft(
        createRectDraft({ cutType: 'corner_notch', placementX: 3, placementZ: 4 }),
        PART_DEFAULTS
      );
      expect(normalized.placementX).toBe(0);
      expect(normalized.placementZ).toBe(0);
    });

    it('locks dado and stopped dado width to the part width', () => {
      for (const cutType of ['dado', 'stopped_dado'] as const) {
        const normalized = normalizeRectCutDraft(
          createRectDraft({ cutType, sizeWidth: 3, placementZ: 2 }),
          PART_DEFAULTS
        );
        expect(normalized.sizeWidth).toBe(8);
        expect(normalized.placementZ).toBe(0);
      }
    });

    it('locks groove run to the part length', () => {
      const normalized = normalizeRectCutDraft(
        createRectDraft({ cutType: 'groove', sizeLength: 3, placementX: 2 }),
        PART_DEFAULTS
      );
      expect(normalized.sizeLength).toBe(24);
      expect(normalized.placementX).toBe(0);
    });

    it('derives rabbet run and shoulder from the target edge', () => {
      const frontRabbet = normalizeRectCutDraft(
        createRectDraft({
          cutType: 'rabbet',
          edgeTarget: 'top_front_edge',
          sizeWidth: 0.5,
          placementX: 3,
          placementZ: 2
        }),
        PART_DEFAULTS
      );
      expect(frontRabbet.sizeLength).toBe(24);
      expect(frontRabbet.sizeWidth).toBe(0.5);
      expect(frontRabbet.placementX).toBe(0);
      expect(frontRabbet.placementZ).toBe(0);

      const sideRabbet = normalizeRectCutDraft(
        createRectDraft({ cutType: 'rabbet', edgeTarget: 'top_left_edge', sizeLength: 0.625 }),
        PART_DEFAULTS
      );
      expect(sideRabbet.sizeLength).toBe(0.625);
      expect(sideRabbet.sizeWidth).toBe(8);

      const zeroShoulder = normalizeRectCutDraft(
        createRectDraft({ cutType: 'rabbet', edgeTarget: 'top_front_edge', sizeWidth: 0 }),
        PART_DEFAULTS
      );
      expect(zeroShoulder.sizeWidth).toBe(0.5);
    });

    it('clamps placement within the remaining part footprint', () => {
      const normalized = normalizeRectCutDraft(
        createRectDraft({ sizeLength: 4, sizeWidth: 4, placementX: 30, placementZ: 30 }),
        PART_DEFAULTS
      );
      expect(normalized.placementX).toBe(20);
      expect(normalized.placementZ).toBe(4);
    });

    it('uses fallback part dimensions when defaults are omitted', () => {
      const normalized = normalizeRectCutDraft(createRectDraft({ sizeLength: 4, sizeWidth: 4, placementX: 30 }));
      expect(normalized.placementX).toBe(0);
      expect(normalized.placementZ).toBe(0);
    });
  });

  describe('buildDraftFromPreset', () => {
    it('builds the default end cut draft', () => {
      expect(buildDraftFromPreset('end_cut')).toEqual({
        mode: 'end_cut',
        featureId: null,
        label: '',
        enabled: true,
        targetFace: 'left_end',
        cutType: 'mitre',
        lengthMode: 'long_point',
        referenceMode: null,
        referenceValue: null,
        horizontalAngle: 45,
        horizontalFlip: false,
        verticalAngle: 0,
        verticalFlip: false
      });
    });

    it('builds normalized rect cut drafts with per-type default sizes', () => {
      const dado = buildDraftFromPreset('dado', PART_DEFAULTS);
      expect(dado).toMatchObject({
        mode: 'rect_cut',
        cutType: 'dado',
        sizeLength: 0.75,
        sizeWidth: 8,
        depthMode: 'blind'
      });

      const rabbet = buildDraftFromPreset('rabbet', PART_DEFAULTS);
      expect(rabbet).toMatchObject({ mode: 'rect_cut', cutType: 'rabbet', sizeLength: 24, sizeWidth: 0.5 });

      const mortise = buildDraftFromPreset('mortise', PART_DEFAULTS);
      expect(mortise).toMatchObject({ mode: 'rect_cut', cutType: 'mortise', sizeLength: 2, depthMode: 'blind' });

      const stoppedGroove = buildDraftFromPreset('stopped_groove', PART_DEFAULTS);
      expect(stoppedGroove).toMatchObject({
        mode: 'rect_cut',
        cutType: 'stopped_groove',
        sizeLength: 4,
        sizeWidth: 0.5
      });

      const cutout = buildDraftFromPreset('cutout', PART_DEFAULTS);
      expect(cutout).toMatchObject({ mode: 'rect_cut', cutType: 'cutout', depthMode: 'through', sizeLength: 0.75 });
    });
  });

  describe('buildDraftFromFeature / buildFeatureFromDraft round trips', () => {
    it('round-trips a rect cut feature preserving id, label, and blind depth', () => {
      const feature: RectCutFeature = {
        id: 'rect-1',
        kind: 'rect_cut',
        version: 1,
        enabled: false,
        label: 'Shelf dado',
        target: { type: 'face', face: 'bottom_face' },
        reference: { primaryFrom: 'min' },
        cutType: 'dado',
        parameters: { size: { length: 0.75, width: 8 }, depthMode: 'blind', depth: 0.375 },
        placement: { x: 2, z: 0 }
      };

      const draft = buildDraftFromFeature(feature, { length: 24, width: 8, thickness: 0.75 });
      expect(draft).toMatchObject({
        mode: 'rect_cut',
        featureId: 'rect-1',
        label: 'Shelf dado',
        enabled: false,
        cutType: 'dado',
        faceTarget: 'bottom_face',
        depthMode: 'blind',
        depth: 0.375
      });

      const rebuilt = buildFeatureFromDraft(draft);
      expect(rebuilt).toMatchObject({
        id: 'rect-1',
        kind: 'rect_cut',
        enabled: false,
        label: 'Shelf dado',
        cutType: 'dado',
        target: { type: 'face', face: 'bottom_face' },
        parameters: { size: { length: 0.75, width: 8 }, depthMode: 'blind', depth: 0.375 },
        placement: { x: 2, z: 0 }
      });
    });

    it('maps corner and edge targets into the draft and back', () => {
      const cornerFeature: RectCutFeature = {
        id: 'corner-1',
        kind: 'rect_cut',
        version: 1,
        enabled: true,
        target: { type: 'corner', corner: 'back_right_corner' },
        reference: { primaryFrom: 'min', secondaryFrom: 'min' },
        cutType: 'corner_notch',
        parameters: { size: { length: 2, width: 2 }, depthMode: 'through' },
        placement: { x: 0, z: 0 }
      };
      const cornerDraft = buildDraftFromFeature(cornerFeature);
      expect(cornerDraft).toMatchObject({ mode: 'rect_cut', cornerTarget: 'back_right_corner' });
      const rebuiltCorner = buildFeatureFromDraft(cornerDraft);
      expect(rebuiltCorner).toMatchObject({
        target: { type: 'corner', corner: 'back_right_corner' },
        reference: { primaryFrom: 'min', secondaryFrom: 'min' },
        placement: { x: 0, z: 0 }
      });

      const edgeFeature: RectCutFeature = {
        id: 'edge-1',
        kind: 'rect_cut',
        version: 1,
        enabled: true,
        target: { type: 'edge', edge: 'top_back_edge' },
        reference: { primaryFrom: 'min' },
        cutType: 'edge_notch',
        parameters: { size: { length: 2, width: 1 }, depthMode: 'through' },
        placement: { x: 3, z: 0 }
      };
      const edgeDraft = buildDraftFromFeature(edgeFeature);
      expect(edgeDraft).toMatchObject({ mode: 'rect_cut', edgeTarget: 'top_back_edge' });
      expect(buildFeatureFromDraft(edgeDraft)).toMatchObject({ target: { type: 'edge', edge: 'top_back_edge' } });
    });

    it('generates a new id and omits empty labels when building from a fresh draft', () => {
      const rebuilt = buildFeatureFromDraft(createRectDraft());
      expect(rebuilt.id).toBeTruthy();
      expect(rebuilt.label).toBeUndefined();
      if (rebuilt.kind !== 'rect_cut') throw new Error('expected rect cut');
      expect(rebuilt.parameters.depth).toBeUndefined();
    });

    it('anchors the end cut reference to the targeted end', () => {
      const left = buildFeatureFromDraft(createEndCutDraft({ targetFace: 'left_end' }));
      expect(left.reference).toEqual({ primaryFrom: 'min' });
      const right = buildFeatureFromDraft(createEndCutDraft({ targetFace: 'right_end' }));
      expect(right.reference).toEqual({ primaryFrom: 'max' });
    });

    it('normalizes end cut parameters per cut type', () => {
      const bevel = buildFeatureFromDraft(
        createEndCutDraft({ cutType: 'bevel', horizontalAngle: 45, verticalAngle: 30, verticalFlip: true })
      ) as EndCutFeature;
      expect(bevel.parameters.horizontalAngle).toBe(0);
      expect(bevel.parameters.verticalAngle).toBe(30);
      expect(bevel.parameters.verticalFlip).toBe(true);

      const mitre = buildFeatureFromDraft(
        createEndCutDraft({ cutType: 'mitre', verticalAngle: 30, verticalFlip: true })
      ) as EndCutFeature;
      expect(mitre.parameters.horizontalAngle).toBe(45);
      expect(mitre.parameters.verticalAngle).toBeUndefined();
      expect(mitre.parameters.verticalFlip).toBeUndefined();
      expect(mitre.parameters.reference).toBeUndefined();
    });

    it('defaults missing end cut angles and flips when building the draft', () => {
      const feature: EndCutFeature = {
        id: 'end-1',
        kind: 'end_cut',
        version: 1,
        enabled: true,
        target: { type: 'face', face: 'right_end' },
        reference: { primaryFrom: 'max' },
        cutType: 'mitre',
        lengthMode: 'long_point',
        parameters: { horizontalAngle: 30 }
      };
      const draft = buildDraftFromFeature(feature);
      expect(draft).toMatchObject({
        mode: 'end_cut',
        label: '',
        referenceMode: null,
        referenceValue: null,
        horizontalFlip: false,
        verticalAngle: 0,
        verticalFlip: false
      });
    });
  });

  describe('getFeatureDraftTarget', () => {
    it('returns the appropriate target per draft shape', () => {
      expect(getFeatureDraftTarget(createEndCutDraft({ targetFace: 'right_end' }))).toEqual({
        type: 'face',
        face: 'right_end'
      });
      expect(
        getFeatureDraftTarget(createRectDraft({ cutType: 'corner_notch', cornerTarget: 'back_left_corner' }))
      ).toEqual({
        type: 'corner',
        corner: 'back_left_corner'
      });
      expect(getFeatureDraftTarget(createRectDraft({ cutType: 'rabbet', edgeTarget: 'top_back_edge' }))).toEqual({
        type: 'edge',
        edge: 'top_back_edge'
      });
      expect(getFeatureDraftTarget(createRectDraft({ faceTarget: 'bottom_face' }))).toEqual({
        type: 'face',
        face: 'bottom_face'
      });
    });
  });

  describe('applyTargetToFeatureDraft', () => {
    it('applies only valid end targets to end cut drafts', () => {
      const draft = createEndCutDraft();
      expect(applyTargetToFeatureDraft(draft, { type: 'face', face: 'right_end' })).toMatchObject({
        targetFace: 'right_end'
      });
      expect(applyTargetToFeatureDraft(draft, { type: 'face', face: 'top_face' })).toBe(draft);
      expect(applyTargetToFeatureDraft(draft, { type: 'edge', edge: 'top_front_edge' })).toBe(draft);
    });

    it('applies corner targets only to corner notch drafts', () => {
      const draft = createRectDraft({ cutType: 'corner_notch' });
      expect(applyTargetToFeatureDraft(draft, { type: 'corner', corner: 'back_right_corner' })).toMatchObject({
        cornerTarget: 'back_right_corner'
      });
      expect(applyTargetToFeatureDraft(draft, { type: 'face', face: 'top_face' })).toBe(draft);
    });

    it('applies edge targets to edge notch and rabbet drafts', () => {
      const notch = createRectDraft({ cutType: 'edge_notch' });
      expect(applyTargetToFeatureDraft(notch, { type: 'edge', edge: 'top_back_edge' })).toMatchObject({
        edgeTarget: 'top_back_edge'
      });
      expect(applyTargetToFeatureDraft(notch, { type: 'corner', corner: 'back_left_corner' })).toBe(notch);
    });

    it('applies only top/bottom faces to face-cut drafts', () => {
      const draft = createRectDraft();
      expect(applyTargetToFeatureDraft(draft, { type: 'face', face: 'bottom_face' })).toMatchObject({
        faceTarget: 'bottom_face'
      });
      expect(applyTargetToFeatureDraft(draft, { type: 'face', face: 'left_end' })).toBe(draft);
      expect(applyTargetToFeatureDraft(draft, { type: 'edge', edge: 'top_front_edge' })).toBe(draft);
    });
  });

  describe('duplicateFeature and generateFeatureId', () => {
    it('duplicates a feature with a fresh id and independent nested objects', () => {
      const feature: PartFeature = {
        id: 'rect-1',
        kind: 'rect_cut',
        version: 1,
        enabled: true,
        target: { type: 'face', face: 'top_face' },
        reference: { primaryFrom: 'min' },
        cutType: 'cutout',
        parameters: { size: { length: 2, width: 2 }, depthMode: 'through' },
        placement: { x: 1, z: 1 }
      };

      const duplicate = duplicateFeature(feature);
      expect(duplicate.id).not.toBe(feature.id);
      expect({ ...duplicate, id: feature.id }).toEqual(feature);
      if (duplicate.kind !== 'rect_cut') throw new Error('expected rect cut');
      duplicate.parameters.size.length = 99;
      expect(feature.parameters.size.length).toBe(2);
    });

    it('generates unique feature ids', () => {
      expect(generateFeatureId()).not.toBe(generateFeatureId());
    });
  });

  describe('preset labels and hints', () => {
    const presets: OperationPreset[] = [
      'end_cut',
      'corner_notch',
      'edge_notch',
      'cutout',
      'dado',
      'stopped_dado',
      'rabbet',
      'groove',
      'stopped_groove',
      'mortise'
    ];

    it('provides a label and hint for every preset', () => {
      for (const preset of presets) {
        expect(getPresetLabel(preset)).toBeTruthy();
        expect(getPresetHint(preset)).toBeTruthy();
      }
      expect(getPresetLabel('stopped_dado')).toBe('Stopped Dado');
      expect(getPresetHint('mortise')).toContain('blind face pocket');
    });
  });
});
