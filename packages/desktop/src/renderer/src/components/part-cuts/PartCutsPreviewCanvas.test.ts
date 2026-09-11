import { fireEvent, render, screen, within } from '@testing-library/react';
import { createElement, forwardRef, useState, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../../tests/helpers/factories';
import {
  buildDraftFromPreset,
  buildFeatureFromDraft,
  FeatureDraft,
  OperationPreset
} from '@renderer/components/part-features/partFeatureEditorState';
import {
  applyHandleDelta,
  buildEndCutDimensionLines,
  buildPreviewPart,
  buildBlankDimensionLines,
  buildRectDimensionOverlay,
  clamp,
  computePreviewCameraFit,
  getEditableHandleOverlay,
  getPreviewGeometrySignature,
  nudgeDraft,
  PartCutsPreviewCanvas,
  supportsPreviewHandles
} from './PartCutsPreviewCanvas';
import { clearPartGeometryCache, getPartRenderGeometry } from '@renderer/utils/partFeatureGeometry';
import { formatMeasurementWithUnit } from '@renderer/utils/fractions';

// The global setup mocks 'three' with a minimal surface; the preview geometry
// builders need the real library (same pattern as partFeatureGeometry.test.ts).
vi.unmock('three');

// Mock the WebGL-bound libraries so the real (non-fallback) scene tree can render
// inside happy-dom. Three.js JSX intrinsics (<mesh>, <group>, ...) render as inert
// unknown elements while React still wires their pointer/click handlers.
vi.mock('@react-three/drei', () => ({
  Edges: () => null,
  Html: ({ children }: { children?: ReactNode }) => createElement('div', null, children),
  Line: () => null,
  OrbitControls: forwardRef(() => null)
}));

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children?: ReactNode }) => createElement('div', { 'data-testid': 'r3f-canvas' }, children),
  useFrame: () => {},
  useThree: () => ({ camera: { position: { x: 10, y: 10, z: 10 } } })
}));

type RectDraft = Extract<FeatureDraft, { mode: 'rect_cut' }>;
type EndCutDraft = Extract<FeatureDraft, { mode: 'end_cut' }>;
type CircularDraft = Extract<FeatureDraft, { mode: 'circular_cut' }>;
type RoundedDraft = Extract<FeatureDraft, { mode: 'rounded_cut' }>;

const PART_DEFAULTS = { partLength: 24, partWidth: 12, partThickness: 0.75 };

function createRectDraft(preset: OperationPreset, overrides: Partial<RectDraft> = {}): RectDraft {
  return {
    ...(buildDraftFromPreset(preset, PART_DEFAULTS) as RectDraft),
    ...overrides
  };
}

function createEndCutDraft(overrides: Partial<EndCutDraft> = {}): EndCutDraft {
  return {
    ...(buildDraftFromPreset('end_cut') as EndCutDraft),
    ...overrides
  };
}

function createCircularDraft(overrides: Partial<CircularDraft> = {}): CircularDraft {
  return { ...(buildDraftFromPreset('round_hole', PART_DEFAULTS) as CircularDraft), ...overrides };
}

function createRoundedDraft(
  preset: 'rounded_slot' | 'rounded_rectangle',
  overrides: Partial<RoundedDraft> = {}
): RoundedDraft {
  return { ...(buildDraftFromPreset(preset, PART_DEFAULTS) as RoundedDraft), ...overrides };
}

// applyHandleDelta and nudgeDraft always return a draft of the same mode they
// were given; this narrows the result back to that member of the union.
function sameMode<T extends FeatureDraft>(original: T, next: FeatureDraft): T {
  if (next.mode !== original.mode) {
    throw new Error(`expected a ${original.mode} draft, got ${next.mode}`);
  }
  return next as T;
}

describe('buildPreviewPart', () => {
  it('includes a new unsaved end-cut draft in the preview part', () => {
    const part = createTestPart({ length: 24, width: 4, thickness: 0.75 });

    const previewPart = buildPreviewPart(part, [], {
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

    expect(previewPart.features).toHaveLength(1);
    expect(previewPart.features?.[0]).toMatchObject({
      kind: 'end_cut',
      target: { type: 'face', face: 'left_end' },
      parameters: {
        horizontalAngle: 45,
        horizontalFlip: false
      }
    });
  });

  it('replaces the matching saved feature with the current draft', () => {
    const part = createTestPart({
      features: [
        {
          id: 'feature-1',
          kind: 'end_cut',
          version: 1 as const,
          enabled: true,
          target: { type: 'face', face: 'left_end' },
          reference: { primaryFrom: 'min' },
          cutType: 'mitre',
          lengthMode: 'long_point',
          parameters: {
            horizontalAngle: 45,
            reference: { mode: 'long_point', value: 24 }
          }
        }
      ]
    });

    const previewPart = buildPreviewPart(part, part.features ?? [], {
      mode: 'end_cut',
      featureId: 'feature-1',
      label: '',
      enabled: true,
      targetFace: 'left_end',
      cutType: 'compound',
      lengthMode: 'long_point',
      referenceMode: null,
      referenceValue: null,
      horizontalAngle: 30,
      horizontalFlip: true,
      verticalAngle: 10,
      verticalFlip: false
    });

    expect(previewPart.features).toHaveLength(1);
    expect(previewPart.features?.[0]).toMatchObject({
      id: 'feature-1',
      kind: 'end_cut',
      cutType: 'compound',
      parameters: {
        horizontalAngle: 30,
        horizontalFlip: true,
        verticalAngle: 10
      }
    });
  });

  it('returns the draft features unchanged when there is no active draft', () => {
    const part = createTestPart();
    const features = [buildFeatureFromDraft(createRectDraft('mortise'))];

    const previewPart = buildPreviewPart(part, features, null);

    expect(previewPart.features).toBe(features);
  });

  it('falls back to an empty feature list without draft features', () => {
    const part = createTestPart();

    const previewPart = buildPreviewPart(part, undefined, null);

    expect(previewPart.features).toEqual([]);
  });
});

describe('getPreviewGeometrySignature', () => {
  it('changes when an enabled cut changes the rendered blank geometry', () => {
    const part = createTestPart({ length: 24, width: 12, thickness: 0.75 });
    const uncutSignature = getPreviewGeometrySignature(part);
    const cutPart = buildPreviewPart(part, [], createRectDraft('mortise', { sizeLength: 3, sizeWidth: 2 }));

    expect(getPreviewGeometrySignature(cutPart)).not.toBe(uncutSignature);
  });

  it('does not dispose feature geometry borrowed from the render cache', () => {
    const cutPart = buildPreviewPart(
      createTestPart({ length: 24, width: 12, thickness: 0.75 }),
      [],
      createRectDraft('mortise', { sizeLength: 3, sizeWidth: 2 })
    );
    const cachedGeometry = getPartRenderGeometry(cutPart);
    const onDispose = vi.fn();
    cachedGeometry.addEventListener('dispose', onDispose);

    try {
      getPreviewGeometrySignature(cutPart);

      expect(onDispose).not.toHaveBeenCalled();
      expect(getPartRenderGeometry(cutPart)).toBe(cachedGeometry);
    } finally {
      cachedGeometry.removeEventListener('dispose', onDispose);
      clearPartGeometryCache();
    }
  });

  it('renders an intersecting dado, hole, and cutout stack deterministically without empty geometry', () => {
    const part = createTestPart({ length: 24, width: 12, thickness: 0.75 });
    const features = [
      buildFeatureFromDraft(createRectDraft('dado', { placementX: 8, sizeLength: 6, depth: 0.25 })),
      buildFeatureFromDraft(createCircularDraft({ depthMode: 'blind', depth: 0.25 })),
      buildFeatureFromDraft(createRectDraft('cutout', { placementX: 11, placementZ: 5, sizeLength: 2, sizeWidth: 2 }))
    ];
    const stacked = buildPreviewPart(part, features, null);

    const signature = getPreviewGeometrySignature(stacked);
    expect(signature).not.toBe('empty');
    expect(signature).not.toBe(getPreviewGeometrySignature(part));
    expect(getPreviewGeometrySignature(stacked)).toBe(signature);
  });
});

describe('clamp', () => {
  it('clamps values into the given range', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
});

describe('supportsPreviewHandles', () => {
  it('returns false without a draft', () => {
    expect(supportsPreviewHandles(null)).toBe(false);
  });

  it('returns false for end cuts', () => {
    expect(supportsPreviewHandles(createEndCutDraft())).toBe(false);
  });

  it('supports face-targeted pocket operations on top or bottom faces', () => {
    expect(supportsPreviewHandles(createRectDraft('mortise'))).toBe(true);
    expect(supportsPreviewHandles(createRectDraft('mortise', { faceTarget: 'bottom_face' }))).toBe(true);
    expect(supportsPreviewHandles(createRectDraft('cutout'))).toBe(true);
    expect(supportsPreviewHandles(createRectDraft('stopped_dado'))).toBe(true);
    expect(supportsPreviewHandles(createRectDraft('stopped_groove'))).toBe(true);
    expect(supportsPreviewHandles(createCircularDraft())).toBe(true);
    expect(supportsPreviewHandles(createRoundedDraft('rounded_slot'))).toBe(true);
    expect(supportsPreviewHandles(createRoundedDraft('rounded_rectangle'))).toBe(true);
  });

  it('rejects unsupported cut types and side faces', () => {
    expect(supportsPreviewHandles(createRectDraft('dado'))).toBe(false);
    expect(supportsPreviewHandles(createRectDraft('mortise', { faceTarget: 'front_face' }))).toBe(false);
  });
});

describe('buildBlankDimensionLines', () => {
  const part = createTestPart({ length: 24, width: 12, thickness: 0.75 });

  it('measures the blank along each axis, outside its own footprint', () => {
    const [length, width, thickness] = buildBlankDimensionLines(part, 'imperial');

    // The length line runs the full length in X, beyond the front edge.
    expect(length.points[0][0]).toBeCloseTo(-12);
    expect(length.points[1][0]).toBeCloseTo(12);
    expect(length.points[0][2]).toBeGreaterThan(part.width / 2);
    expect(length.label).toBe('24"');

    // The width line runs the full width in Z, beyond the right end.
    expect(width.points[0][2]).toBeCloseTo(-6);
    expect(width.points[1][2]).toBeCloseTo(6);
    expect(width.points[0][0]).toBeGreaterThan(part.length / 2);
    expect(width.label).toBe('12"');

    // The thickness line is the only vertical one.
    expect(thickness.points[0][1]).toBeCloseTo(-0.375);
    expect(thickness.points[1][1]).toBeCloseTo(0.375);
    expect(thickness.label).toBe('3/4"');
  });

  it('labels a metric project in millimetres', () => {
    expect(buildBlankDimensionLines(part, 'metric').map((line) => line.label)).toEqual([
      formatMeasurementWithUnit(24, 'metric'),
      formatMeasurementWithUnit(12, 'metric'),
      formatMeasurementWithUnit(0.75, 'metric')
    ]);
  });

  it('stands the lines further off a larger blank so they clear its edges', () => {
    const sheet = createTestPart({ length: 96, width: 48, thickness: 0.75 });
    const smallGap = buildBlankDimensionLines(part, 'imperial')[0].points[0][2] - part.width / 2;
    const sheetGap = buildBlankDimensionLines(sheet, 'imperial')[0].points[0][2] - sheet.width / 2;

    expect(sheetGap).toBeGreaterThan(smallGap);
  });
});

describe('buildRectDimensionOverlay', () => {
  it('labels a metric project in millimetres rather than inches', () => {
    const part = createTestPart({ length: 24, width: 12, thickness: 0.75 });
    const draft = createRectDraft('mortise');
    const imperial = buildRectDimensionOverlay(part, draft, 'imperial');
    const metric = buildRectDimensionOverlay(part, draft, 'metric');

    // These labels were hardcoded to imperial, so a metric project measured
    // its cuts in inches.
    expect(imperial!.lines.map((line) => line.label)).not.toEqual(metric!.lines.map((line) => line.label));
    expect(metric!.lines.every((line) => line.label.endsWith('mm'))).toBe(true);
  });

  const part = createTestPart({ length: 24, width: 12, thickness: 0.75 });

  it('returns null for non-rect features', () => {
    expect(buildRectDimensionOverlay(part, createEndCutDraft())).toBeNull();
  });

  it('builds size, offset, and depth data for an interior pocket', () => {
    const draft = createRectDraft('mortise', { placementX: 4, placementZ: 3 });

    const overlay = buildRectDimensionOverlay(part, draft);

    expect(overlay).not.toBeNull();
    // cut length, cut width, left, right, front, and back offsets
    expect(overlay?.lines).toHaveLength(6);
    expect(overlay?.x0).toBeCloseTo(-8);
    expect(overlay?.x1).toBeCloseTo(-6);
    expect(overlay?.y).toBeGreaterThan(part.thickness / 2);
    expect(overlay?.depthData.topY).toBeCloseTo(0.375);
    expect(overlay?.depthData.bottomY).toBeCloseTo(0.125);
    expect(overlay?.depthData.label).not.toContain('thru');
  });

  it('skips width and front/back offsets for full-width channels', () => {
    const draft = createRectDraft('dado', { placementX: 4 });

    const overlay = buildRectDimensionOverlay(part, draft);

    // cut length, left offset, right offset only
    expect(overlay?.lines).toHaveLength(3);
  });

  it('marks through cuts in the depth label', () => {
    const draft = createRectDraft('cutout', { depthMode: 'through', placementX: 2, placementZ: 2 });

    const overlay = buildRectDimensionOverlay(part, draft);

    expect(overlay?.depthData.label).toContain('(thru)');
  });

  it('flips the overlay below the part for bottom-face targets', () => {
    const draft = createRectDraft('mortise', { faceTarget: 'bottom_face', placementX: 4, placementZ: 3 });

    const overlay = buildRectDimensionOverlay(part, draft);

    expect(overlay?.y).toBeLessThan(0);
    expect(overlay?.depthData.topY).toBeCloseTo(-0.375);
    expect(overlay?.depthData.bottomY).toBeCloseTo(-0.125);
  });
});

describe('buildEndCutDimensionLines', () => {
  const part = createTestPart({ length: 24, width: 12, thickness: 0.75 });

  function linesFor(draft: FeatureDraft) {
    return buildEndCutDimensionLines(part, draft, [buildFeatureFromDraft(draft)]);
  }

  it('returns empty results for rect drafts', () => {
    expect(buildEndCutDimensionLines(part, createRectDraft('mortise'))).toEqual({ lines: [], arcs: [] });
  });

  it('builds a mitre arc and inset dimension for a left-end mitre', () => {
    const { lines, arcs } = linesFor(createEndCutDraft());

    expect(arcs).toHaveLength(1);
    expect(arcs[0].label).toBe('45°');
    expect(arcs[0].points.length).toBeGreaterThan(2);
    expect(lines).toHaveLength(1);
  });

  it('supports flipped mitres and right-end targets', () => {
    const flipped = linesFor(createEndCutDraft({ horizontalFlip: true }));
    expect(flipped.arcs).toHaveLength(1);

    const rightEnd = linesFor(createEndCutDraft({ targetFace: 'right_end' }));
    expect(rightEnd.arcs).toHaveLength(1);
    expect(rightEnd.lines).toHaveLength(1);
  });

  it('builds a bevel arc for vertical angles', () => {
    const { arcs } = linesFor(createEndCutDraft({ cutType: 'bevel', verticalAngle: 15 }));

    expect(arcs).toHaveLength(1);
    expect(arcs[0].label).toBe('15°');
  });

  it('handles flipped bevels', () => {
    const { arcs } = linesFor(createEndCutDraft({ cutType: 'bevel', verticalAngle: 15, verticalFlip: true }));

    expect(arcs).toHaveLength(1);
  });

  it('builds both arcs for compound cuts', () => {
    const { arcs } = linesFor(createEndCutDraft({ cutType: 'compound', horizontalAngle: 30, verticalAngle: 10 }));

    expect(arcs).toHaveLength(2);
    expect(arcs.map((arc) => arc.label)).toEqual(['30°', '10°']);
  });

  it('returns nothing when the cut produces no inset', () => {
    const draft = createEndCutDraft({ horizontalAngle: 0 });

    const { lines, arcs } = buildEndCutDimensionLines(part, draft, []);

    expect(lines).toHaveLength(0);
    expect(arcs).toHaveLength(0);
  });
});

describe('getEditableHandleOverlay', () => {
  const part = createTestPart({ length: 24, width: 12, thickness: 0.75 });

  it('returns null without a draft', () => {
    expect(getEditableHandleOverlay(part, null)).toBeNull();
  });

  it('builds a dimension-only overlay for end cuts', () => {
    const draft = createEndCutDraft();
    const overlay = getEditableHandleOverlay(part, draft, [buildFeatureFromDraft(draft)]);

    expect(overlay).not.toBeNull();
    expect(overlay?.center).toBeUndefined();
    expect(overlay?.dimensionLines?.length).toBeGreaterThan(0);
    expect(overlay?.angleArcs?.length).toBe(1);
    expect(overlay?.operationLabel).toBe('mitre');
  });

  it('returns null for end cuts without any visible geometry', () => {
    const draft = createEndCutDraft({ horizontalAngle: 0 });

    expect(getEditableHandleOverlay(part, draft, [])).toBeNull();
  });

  it('builds interactive handles for supported pockets', () => {
    const overlay = getEditableHandleOverlay(part, createRectDraft('mortise', { placementX: 4, placementZ: 3 }));

    expect(overlay?.center).toBeDefined();
    expect(overlay?.lengthHandle).toBeDefined();
    expect(overlay?.widthHandle).toBeDefined();
    expect(overlay?.areaPosition).toBeDefined();
    expect(overlay?.depthInfo).toBeDefined();
    expect(overlay?.operationLabel).toBe('mortise');
  });

  it('omits the width handle for stopped dados', () => {
    const overlay = getEditableHandleOverlay(part, createRectDraft('stopped_dado'));

    expect(overlay?.lengthHandle).toBeDefined();
    expect(overlay?.widthHandle).toBeNull();
  });

  it('builds a handle-free overlay for unsupported rect cuts', () => {
    const overlay = getEditableHandleOverlay(part, createRectDraft('dado'));

    expect(overlay?.center).toBeUndefined();
    expect(overlay?.lengthHandle).toBeUndefined();
    expect(overlay?.areaPosition).toBeDefined();
    expect(overlay?.operationLabel).toBe('dado');
  });
});

describe('applyHandleDelta', () => {
  const part = createTestPart({ length: 24, width: 12, thickness: 0.75 });

  it('returns the draft unchanged for unsupported drafts', () => {
    const draft = createEndCutDraft();

    expect(sameMode(draft, applyHandleDelta(part, draft, 'move', 1, 1))).toBe(draft);
  });

  it.each([
    [
      'round-hole pattern origin',
      createCircularDraft({ pattern: { type: 'linear', count: 2, spacing: 1, direction: 0 } })
    ],
    ['rounded slot', createRoundedDraft('rounded_slot')],
    ['rounded rectangle', createRoundedDraft('rounded_rectangle')]
  ] as const)('moves and resizes the %s through preview handles', (_label, draft) => {
    const moved = sameMode(draft, applyHandleDelta(part, draft, 'move', 1, 0.5));
    const resized = sameMode(moved, applyHandleDelta(part, moved, 'length', 0.5, 0));

    expect(moved.placementPrimary).toBeCloseTo(draft.placementPrimary + 1);
    expect(moved.placementSecondary).toBeCloseTo(draft.placementSecondary + 0.5);
    if (draft.mode === 'circular_cut' && resized.mode === 'circular_cut') {
      expect(resized.diameter).toBeCloseTo(draft.diameter + 0.5);
    } else if (draft.mode === 'rounded_cut' && resized.mode === 'rounded_cut') {
      expect(resized.length).toBeCloseTo(draft.length + 0.5);
    }
  });

  it('clamps circular and rotated rounded handle drags at their valid physical edge', () => {
    const circular = createCircularDraft({ placementPrimary: 11, placementSecondary: 0 });
    const circularAtEdge = sameMode(circular, applyHandleDelta(part, circular, 'move', 100, 0));
    expect(circularAtEdge.placementPrimary).toBeCloseTo(11.875);
    expect(sameMode(circularAtEdge, applyHandleDelta(part, circularAtEdge, 'move', 1, 0)).placementPrimary).toBeCloseTo(
      11.875
    );

    const rotated = createRoundedDraft('rounded_rectangle', { rotation: 90 });
    const lengthened = sameMode(rotated, applyHandleDelta(part, rotated, 'length', 0, 1));
    expect(lengthened.length).toBeCloseTo(rotated.length + 1);
    const overlay = getEditableHandleOverlay(part, rotated);
    expect(overlay?.lengthHandle?.[0]).toBeCloseTo(0);
    expect(overlay?.lengthHandle?.[2]).toBeCloseTo(-rotated.length / 2);
  });

  it('clamps rounded moves and resizes at the exact physical edge', () => {
    const rounded = createRoundedDraft('rounded_rectangle');
    const moved = sameMode(rounded, applyHandleDelta(part, rounded, 'move', 100, 0));
    expect(moved.placementPrimary).toBeCloseTo(10.5);
    expect(sameMode(moved, applyHandleDelta(part, moved, 'move', 1, 0)).placementPrimary).toBeCloseTo(10.5);
    const resized = sameMode(rounded, applyHandleDelta(part, rounded, 'length', 100, 0));
    expect(resized.length).toBeCloseTo(part.length);
  });

  it('moves the pocket and clamps to the part bounds', () => {
    const draft = createRectDraft('mortise', { placementX: 4, placementZ: 3 });

    const moved = sameMode(draft, applyHandleDelta(part, draft, 'move', 2, 1));
    expect(moved.placementX).toBeCloseTo(6);
    expect(moved.placementZ).toBeCloseTo(4);

    const clampedHigh = sameMode(draft, applyHandleDelta(part, draft, 'move', 100, 100));
    expect(clampedHigh.placementX).toBeCloseTo(24 - draft.sizeLength);
    expect(clampedHigh.placementZ).toBeCloseTo(12 - draft.sizeWidth);

    const clampedLow = sameMode(draft, applyHandleDelta(part, draft, 'move', -100, -100));
    expect(clampedLow.placementX).toBe(0);
    expect(clampedLow.placementZ).toBe(0);
  });

  it('pins stopped dado moves to the front of the board', () => {
    const draft = createRectDraft('stopped_dado', { placementX: 2 });

    const moved = sameMode(draft, applyHandleDelta(part, draft, 'move', 1, 5));

    expect(moved.placementX).toBeCloseTo(3);
    expect(moved.placementZ).toBe(0);
  });

  it('resizes the run and clamps to the available length', () => {
    const draft = createRectDraft('mortise', { placementX: 4 });

    expect(sameMode(draft, applyHandleDelta(part, draft, 'length', 1, 0)).sizeLength).toBeCloseTo(draft.sizeLength + 1);
    expect(sameMode(draft, applyHandleDelta(part, draft, 'length', -100, 0)).sizeLength).toBeCloseTo(0.125);
    expect(sameMode(draft, applyHandleDelta(part, draft, 'length', 100, 0)).sizeLength).toBeCloseTo(
      24 - draft.placementX
    );
  });

  it('resizes the width but ignores width drags for stopped dados', () => {
    const mortise = createRectDraft('mortise');
    expect(sameMode(mortise, applyHandleDelta(part, mortise, 'width', 0, 0.5)).sizeWidth).toBeCloseTo(
      mortise.sizeWidth + 0.5
    );

    const stoppedDado = createRectDraft('stopped_dado');
    expect(sameMode(stoppedDado, applyHandleDelta(part, stoppedDado, 'width', 0, 0.5)).sizeWidth).toBe(
      stoppedDado.sizeWidth
    );
  });

  it.each([
    ['cutout', true],
    ['stopped_dado', false],
    ['stopped_groove', true],
    ['mortise', true]
  ] as const)('keeps %s handle moves and resizes inside the blank', (cutType, hasWidthHandle) => {
    const draft = createRectDraft(cutType, { placementX: 20, placementZ: 9, sizeLength: 2, sizeWidth: 1 });

    const moved = sameMode(draft, applyHandleDelta(part, draft, 'move', 100, 100));
    const lengthened = sameMode(moved, applyHandleDelta(part, moved, 'length', 100, 0));
    const widened = sameMode(moved, applyHandleDelta(part, moved, 'width', 0, 100));

    expect(moved.placementX + moved.sizeLength).toBeCloseTo(part.length);
    expect(moved.placementZ + moved.sizeWidth).toBeLessThanOrEqual(part.width);
    expect(lengthened.placementX + lengthened.sizeLength).toBeCloseTo(part.length);
    if (hasWidthHandle) expect(widened.placementZ + widened.sizeWidth).toBeCloseTo(part.width);
    else expect(widened.sizeWidth).toBe(draft.sizeWidth);
  });
});

describe('nudgeDraft', () => {
  const part = createTestPart({ length: 24, width: 12, thickness: 0.75 });

  it('nudges moves along the length only, matching the Move Left/Right buttons', () => {
    const draft = createRectDraft('mortise', { placementX: 4, placementZ: 3 });

    const nudged = sameMode(draft, nudgeDraft(part, draft, 'move', 1));
    expect(nudged.placementX).toBeCloseTo(4.25);
    expect(nudged.placementZ).toBeCloseTo(3);

    const nudgedBack = sameMode(draft, nudgeDraft(part, draft, 'move', -1));
    expect(nudgedBack.placementX).toBeCloseTo(3.75);
    expect(nudgedBack.placementZ).toBeCloseTo(3);
  });

  it('nudges the run length and width independently', () => {
    const draft = createRectDraft('mortise');

    expect(sameMode(draft, nudgeDraft(part, draft, 'length', 1)).sizeLength).toBeCloseTo(draft.sizeLength + 0.25);
    expect(sameMode(draft, nudgeDraft(part, draft, 'length', -1)).sizeLength).toBeCloseTo(draft.sizeLength - 0.25);
    expect(sameMode(draft, nudgeDraft(part, draft, 'width', 1)).sizeWidth).toBeCloseTo(draft.sizeWidth + 0.25);
  });

  it.each([90, 37])('nudges rotated rounded dimensions by the full local step at %i°', (rotation) => {
    const draft = createRoundedDraft('rounded_rectangle', { rotation });
    expect(sameMode(draft, nudgeDraft(part, draft, 'length', 1)).length).toBeCloseTo(draft.length + 0.25);
    expect(sameMode(draft, nudgeDraft(part, draft, 'width', 1)).width).toBeCloseTo(draft.width + 0.25);
  });
});

describe('PartCutsPreviewCanvas (webgl runtime branch)', () => {
  beforeEach(() => {
    // Leave test mode so shouldUseFallbackPreview() returns false and the
    // real canvas + scene tree renders (against the mocked r3f libraries).
    vi.stubEnv('MODE', 'development');
    // React warns about the three.js JSX intrinsics (<mesh>, <boxGeometry>, ...)
    // rendered outside a real r3f Canvas; that noise is expected here.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function renderCanvas(draft: FeatureDraft | null, extra: Record<string, unknown> = {}) {
    const onHoverTarget = vi.fn();
    const onActivateTarget = vi.fn();
    const onDraftChange = vi.fn();
    const part = createTestPart({ name: 'Panel', length: 24, width: 12, thickness: 0.75 });

    const utils = render(
      createElement(PartCutsPreviewCanvas, {
        part,
        draftFeatures: [],
        units: 'imperial',
        draft,
        selectedFeatureSummary: 'Mortise on Top Face',
        selectedFeatureTargetLabel: 'Top Face',
        hoveredTarget: null,
        pendingTarget: null,
        onHoverTarget,
        onActivateTarget,
        onDraftChange,
        ...extra
      })
    );

    return { ...utils, onHoverTarget, onActivateTarget, onDraftChange };
  }

  function StatefulCanvas({ initialDraft }: { initialDraft: FeatureDraft }) {
    const [draft, setDraft] = useState(initialDraft);
    return createElement(PartCutsPreviewCanvas, {
      part: createTestPart({ name: 'Panel', length: 24, width: 12, thickness: 0.75 }),
      draftFeatures: [],
      units: 'imperial',
      draft,
      selectedFeatureSummary: null,
      selectedFeatureTargetLabel: 'Top Face',
      hoveredTarget: null,
      pendingTarget: null,
      onHoverTarget: () => {},
      onActivateTarget: () => {},
      onDraftChange: setDraft
    });
  }

  it.each([
    ['round hole', createCircularDraft(), 'Enlarge Hole'],
    ['rounded slot', createRoundedDraft('rounded_slot'), 'Extend Length'],
    ['rounded rectangle', createRoundedDraft('rounded_rectangle'), 'Extend Length']
  ] as const)('updates rendered %s geometry through its accessible preview affordance', (_label, draft, resize) => {
    render(createElement(StatefulCanvas, { initialDraft: draft }));

    const preview = screen.getByRole('img', { name: 'Part cuts geometry preview' });
    const before = preview.getAttribute('data-geometry-signature');
    fireEvent.click(within(preview).getByRole('button', { name: resize }));

    expect(preview.getAttribute('data-geometry-signature')).not.toBe(before);
  });

  it('renders the scene with interactive handles for supported pockets', () => {
    const draft = createRectDraft('mortise', { placementX: 4, placementZ: 3 });

    const { container } = renderCanvas(draft, { pendingTarget: { type: 'face', face: 'top_face' } });

    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    // One merged overlay card: what the cut is, where it sits, and what to do.
    expect(screen.getByText('Mortise on Top Face')).toBeInTheDocument();
    expect(screen.getByText('On Top Face')).toBeInTheDocument();
    expect(screen.getByText(/drag the handles to size it/i)).toBeInTheDocument();
    // Base part mesh plus move/length/width handles and the area overlay
    expect(container.querySelectorAll('mesh').length).toBeGreaterThanOrEqual(5);
  });

  it('renders dimension-only overlays and pick targets for end cuts', () => {
    const draft = createEndCutDraft();

    const { container, onHoverTarget, onActivateTarget } = renderCanvas(draft);

    expect(screen.getByText(/Click a highlighted face, edge, or corner/i)).toBeInTheDocument();
    expect(screen.getByText('45°')).toBeInTheDocument();

    const meshes = Array.from(container.querySelectorAll('mesh'));
    expect(meshes.length).toBeGreaterThan(1);
    for (const mesh of meshes) {
      fireEvent.pointerOver(mesh);
      fireEvent.pointerOut(mesh);
      fireEvent.click(mesh);
    }

    expect(onHoverTarget).toHaveBeenCalledWith(expect.objectContaining({ type: 'face' }));
    expect(onHoverTarget).toHaveBeenCalledWith(null);
    expect(onActivateTarget).toHaveBeenCalled();
  });

  it('renders a bare scene without an active draft', () => {
    renderCanvas(null, { selectedFeatureSummary: null, selectedFeatureTargetLabel: null });

    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    expect(screen.queryByText(/highlighted target/i)).not.toBeInTheDocument();
  });

  it('measures the blank on the part, with no cut open and in the project units', () => {
    // The sidebar no longer states the blank size, so these have to be here
    // whether or not a cut is being edited.
    const canvas = renderCanvas(null).getByTestId('r3f-canvas');

    expect(within(canvas).getByText('24"')).toBeInTheDocument();
    expect(within(canvas).getByText('12"')).toBeInTheDocument();
    expect(within(canvas).getByText('3/4"')).toBeInTheDocument();
  });

  it('measures the blank in millimetres for a metric project', () => {
    const { getByTestId } = renderCanvas(null, { units: 'metric' });
    const canvas = getByTestId('r3f-canvas');

    expect(within(canvas).getByText(formatMeasurementWithUnit(24, 'metric'))).toBeInTheDocument();
    expect(within(canvas).queryByText('24"')).not.toBeInTheDocument();
  });

  it('omits the width handle mesh for stopped dados', () => {
    const withWidth = renderCanvas(createRectDraft('mortise', { placementX: 4, placementZ: 3 }));
    const meshCountWithWidth = withWidth.container.querySelectorAll('mesh').length;
    withWidth.unmount();

    const withoutWidth = renderCanvas(createRectDraft('stopped_dado'));
    const meshCountWithoutWidth = withoutWidth.container.querySelectorAll('mesh').length;

    expect(meshCountWithoutWidth).toBeLessThan(meshCountWithWidth);
  });
  it('offers to move the cut when a different target is hovered', () => {
    const draft = createRectDraft('mortise', { placementX: 4, placementZ: 3 });

    // Committed target is the top face; the pointer is over the bottom face.
    renderCanvas(draft, { hoveredTarget: { type: 'face', face: 'bottom_face' } });

    expect(screen.getByText(/Click to move this cut to the Bottom Face/i)).toBeInTheDocument();
    // The generic instruction is replaced while a move is on offer.
    expect(screen.queryByText(/drag the handles to size it/i)).not.toBeInTheDocument();
  });
  describe('computePreviewCameraFit', () => {
    const viewport = { fov: 38, aspect: 16 / 9 };

    it('pulls the camera back far enough to frame the whole blank', () => {
      const rail = computePreviewCameraFit({ length: 24, width: 4, thickness: 1.5 }, viewport);

      // Half the diagonal of the blank must fit inside the vertical frustum.
      const radius = Math.hypot(12, 0.75, 2);
      const halfFovTan = Math.tan((38 * Math.PI) / 360);
      expect(rail.distance).toBeGreaterThan(radius / halfFovTan);
      // ...but not wastefully far: the old fixed placement sat at ~87 units.
      expect(rail.distance).toBeLessThan(50);
    });

    it('scales with the part, so a small block is not framed like a long rail', () => {
      const rail = computePreviewCameraFit({ length: 24, width: 4, thickness: 1.5 }, viewport);
      const block = computePreviewCameraFit({ length: 4, width: 4, thickness: 4 }, viewport);

      expect(block.distance).toBeLessThan(rail.distance);
      // Both keep the same three-quarter viewing direction.
      const direction = (fit: typeof rail) => fit.position.map((v) => v / fit.distance);
      expect(direction(block)[0]).toBeCloseTo(direction(rail)[0], 6);
      expect(direction(block)[1]).toBeCloseTo(direction(rail)[1], 6);
    });

    it('pulls back further for a tall, narrow viewport', () => {
      const wide = computePreviewCameraFit({ length: 24, width: 4, thickness: 1.5 }, { fov: 38, aspect: 2 });
      const narrow = computePreviewCameraFit({ length: 24, width: 4, thickness: 1.5 }, { fov: 38, aspect: 0.5 });

      expect(narrow.distance).toBeGreaterThan(wide.distance);
    });

    it('stays finite for degenerate blanks and viewports', () => {
      const fit = computePreviewCameraFit({ length: 0, width: 0, thickness: 0 }, { fov: 0, aspect: 0 });

      expect(Number.isFinite(fit.distance)).toBe(true);
      expect(fit.distance).toBeGreaterThan(0);
      expect(fit.near).toBeGreaterThan(0);
      expect(fit.far).toBeGreaterThan(fit.near);
    });
  });
});

describe('camera parity with the main canvas', () => {
  it('frames a blank from any orbit angle using its bounding sphere', () => {
    // The fit must hold after the user orbits, since framing is now only the
    // entry placement rather than a cage the camera is held inside.
    const fit = computePreviewCameraFit({ length: 96, width: 12, thickness: 0.75 }, { fov: 38, aspect: 1.6 });
    const radius = Math.hypot(96 / 2, 0.75 / 2, 12 / 2);
    expect(fit.distance).toBeGreaterThan(radius);
    expect(fit.far).toBeGreaterThan(fit.distance);
    expect(fit.near).toBeGreaterThan(0);
  });

  it('keeps a long board reachable within the preview zoom range', () => {
    // enablePan was false and maxDistance was maxDimension * 6, so a cut on
    // the far end of a long board could not be brought into view.
    const blank = { length: 96, width: 12, thickness: 0.75 };
    const maxDimension = Math.max(blank.length, blank.width, blank.thickness, 1);
    const fit = computePreviewCameraFit(blank, { fov: 38, aspect: 1.6 });
    expect(maxDimension * 40).toBeGreaterThan(fit.distance);
    expect(Math.min(0.5, maxDimension * 0.05)).toBeLessThan(fit.distance);
  });
});
