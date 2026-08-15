import { fireEvent, render, screen } from '@testing-library/react';
import { createElement, forwardRef, type ReactNode } from 'react';
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
  buildRectDimensionOverlay,
  clamp,
  getEditableHandleOverlay,
  nudgeDraft,
  PartCutsPreviewCanvas,
  supportsPreviewHandles
} from './PartCutsPreviewCanvas';

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
      horizontalAngle: 45,
      horizontalFlip: false,
      verticalAngle: 0
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
          version: 1,
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
      horizontalAngle: 30,
      horizontalFlip: true,
      verticalAngle: 10
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
  });

  it('rejects unsupported cut types and side faces', () => {
    expect(supportsPreviewHandles(createRectDraft('dado'))).toBe(false);
    expect(supportsPreviewHandles(createRectDraft('mortise', { faceTarget: 'front_face' }))).toBe(false);
  });
});

describe('buildRectDimensionOverlay', () => {
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

    expect(applyHandleDelta(part, draft, 'move', 1, 1)).toBe(draft);
  });

  it('moves the pocket and clamps to the part bounds', () => {
    const draft = createRectDraft('mortise', { placementX: 4, placementZ: 3 });

    const moved = applyHandleDelta(part, draft, 'move', 2, 1);
    expect(moved.placementX).toBeCloseTo(6);
    expect(moved.placementZ).toBeCloseTo(4);

    const clampedHigh = applyHandleDelta(part, draft, 'move', 100, 100);
    expect(clampedHigh.placementX).toBeCloseTo(24 - draft.sizeLength);
    expect(clampedHigh.placementZ).toBeCloseTo(12 - draft.sizeWidth);

    const clampedLow = applyHandleDelta(part, draft, 'move', -100, -100);
    expect(clampedLow.placementX).toBe(0);
    expect(clampedLow.placementZ).toBe(0);
  });

  it('pins stopped dado moves to the front of the board', () => {
    const draft = createRectDraft('stopped_dado', { placementX: 2 });

    const moved = applyHandleDelta(part, draft, 'move', 1, 5);

    expect(moved.placementX).toBeCloseTo(3);
    expect(moved.placementZ).toBe(0);
  });

  it('resizes the run and clamps to the available length', () => {
    const draft = createRectDraft('mortise', { placementX: 4 });

    expect(applyHandleDelta(part, draft, 'length', 1, 0).sizeLength).toBeCloseTo(draft.sizeLength + 1);
    expect(applyHandleDelta(part, draft, 'length', -100, 0).sizeLength).toBeCloseTo(0.125);
    expect(applyHandleDelta(part, draft, 'length', 100, 0).sizeLength).toBeCloseTo(24 - draft.placementX);
  });

  it('resizes the width but ignores width drags for stopped dados', () => {
    const mortise = createRectDraft('mortise');
    expect(applyHandleDelta(part, mortise, 'width', 0, 0.5).sizeWidth).toBeCloseTo(mortise.sizeWidth + 0.5);

    const stoppedDado = createRectDraft('stopped_dado');
    expect(applyHandleDelta(part, stoppedDado, 'width', 0, 0.5).sizeWidth).toBe(stoppedDado.sizeWidth);
  });
});

describe('nudgeDraft', () => {
  const part = createTestPart({ length: 24, width: 12, thickness: 0.75 });

  it('nudges moves along both axes', () => {
    const draft = createRectDraft('mortise', { placementX: 4, placementZ: 3 });

    const nudged = nudgeDraft(part, draft, 'move', 1);
    expect(nudged.placementX).toBeCloseTo(4.25);
    expect(nudged.placementZ).toBeCloseTo(3.25);

    const nudgedBack = nudgeDraft(part, draft, 'move', -1);
    expect(nudgedBack.placementX).toBeCloseTo(3.75);
    expect(nudgedBack.placementZ).toBeCloseTo(2.75);
  });

  it('nudges the run length and width independently', () => {
    const draft = createRectDraft('mortise');

    expect(nudgeDraft(part, draft, 'length', 1).sizeLength).toBeCloseTo(draft.sizeLength + 0.25);
    expect(nudgeDraft(part, draft, 'length', -1).sizeLength).toBeCloseTo(draft.sizeLength - 0.25);
    expect(nudgeDraft(part, draft, 'width', 1).sizeWidth).toBeCloseTo(draft.sizeWidth + 0.25);
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

  it('renders the scene with interactive handles for supported pockets', () => {
    const draft = createRectDraft('mortise', { placementX: 4, placementZ: 3 });

    const { container } = renderCanvas(draft, { pendingTarget: { type: 'face', face: 'top_face' } });

    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    expect(screen.getByText('Preview Selection')).toBeInTheDocument();
    expect(screen.getByText('Mortise on Top Face')).toBeInTheDocument();
    expect(screen.getByText(/drag the preview handles/i)).toBeInTheDocument();
    expect(screen.getByText(/Active target:/i)).toBeInTheDocument();
    // Base part mesh plus move/length/width handles and the area overlay
    expect(container.querySelectorAll('mesh').length).toBeGreaterThanOrEqual(5);
  });

  it('renders dimension-only overlays and pick targets for end cuts', () => {
    const draft = createEndCutDraft();

    const { container, onHoverTarget, onActivateTarget } = renderCanvas(draft);

    expect(screen.getByText(/Hover or click a highlighted target/i)).toBeInTheDocument();
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

  it('omits the width handle mesh for stopped dados', () => {
    const withWidth = renderCanvas(createRectDraft('mortise', { placementX: 4, placementZ: 3 }));
    const meshCountWithWidth = withWidth.container.querySelectorAll('mesh').length;
    withWidth.unmount();

    const withoutWidth = renderCanvas(createRectDraft('stopped_dado'));
    const meshCountWithoutWidth = withoutWidth.container.querySelectorAll('mesh').length;

    expect(meshCountWithoutWidth).toBeLessThan(meshCountWithWidth);
  });
});
