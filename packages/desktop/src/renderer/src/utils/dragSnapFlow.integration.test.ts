import { describe, expect, it } from 'vitest';
import type { AppSettings, GroupMember, Part, SnapLine } from '../types';
import {
  detectFeatureSnaps,
  detectFractionalFaceSnaps,
  detectSurfaceAnchorSnaps,
  getCombinedBounds,
  getPartOBB
} from './snapToPartsUtil';
import { createAxisSnapWinners, tryApplyAxisSnap } from './snapPriority';
import { solveGroupMoveSnapPreview, solvePartMoveSnapPreview } from './interactionMovePreview';
import { resolveSafeTranslationDelta } from './overlapPolicy';
import { resolveLiveGridReleasePosition } from '../components/workspace/partTypes';
import { resolveGroupReleaseMove, resolveMoveSelection } from './interactionMovement';

function createPart(overrides: Partial<Part> = {}): Part {
  return {
    id: overrides.id ?? 'part',
    name: overrides.name ?? 'Part',
    length: overrides.length ?? 6,
    width: overrides.width ?? 4,
    thickness: overrides.thickness ?? 1,
    position: overrides.position ?? { x: 0, y: 0, z: 0 },
    rotation: overrides.rotation ?? { x: 0, y: 0, z: 0 },
    stockId: overrides.stockId ?? null,
    grainSensitive: overrides.grainSensitive ?? false,
    grainDirection: overrides.grainDirection ?? 'length',
    color: overrides.color ?? '#ffffff',
    ignoreOverlap: overrides.ignoreOverlap,
    features: overrides.features
  };
}

const socketSettings: AppSettings = {
  defaultUnits: 'imperial',
  defaultGridSize: 0.0625,
  theme: 'system',
  confirmBeforeDelete: true,
  showHotkeyHints: true,
  stockConstraints: {
    constrainDimensions: true,
    constrainGrain: true,
    constrainColor: true,
    preventOverlap: true
  },
  liveGridSnap: false,
  snapSensitivity: 'normal',
  snapToOrigin: false,
  dimensionSnapSameTypeOnly: false,
  enableSurfaceAnchors: false,
  enableFractionalAnchors: false,
  enableGoldenRatioAnchors: false,
  enableFeatureAnchors: true,
  enableAxisLegacySnaps: false
};

describe('drag snap flow integration', () => {
  it('keeps a compatible dado mate seated through overlap prevention without exempting unrelated solids', () => {
    const host = createPart({
      id: 'dado-host',
      length: 12,
      width: 6,
      thickness: 0.75,
      position: { x: 0, y: 0.375, z: 0 },
      features: [
        {
          id: 'dado-socket',
          kind: 'rect_cut',
          version: 1 as const,
          enabled: true,
          cutType: 'dado',
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'min', secondaryFrom: 'min' },
          placement: { x: 5.6225, z: 0 },
          parameters: { size: { length: 0.755, width: 6 }, depthMode: 'blind', depth: 0.375 }
        }
      ]
    });
    const divider = createPart({
      id: 'divider',
      length: 4,
      width: 6,
      thickness: 0.75,
      position: { x: 2, y: 2.8, z: 0 },
      rotation: { x: 0, y: 0, z: 90 }
    });

    const snapPreview = solvePartMoveSnapPreview({
      part: divider,
      position: { x: 0.01, y: 2.8, z: 0 },
      axes: { x: true, y: true, z: true },
      worldHalfHeight: 2,
      referenceParts: [host],
      movingPartIds: [divider.id],
      snapGuides: [],
      settings: socketSettings,
      snapThreshold: 0.5,
      latchedFaceSnap: null,
      resolveFeatureStage: () => 'feature'
    });

    expect(snapPreview.position.x).toBeCloseTo(0, 8);
    expect(snapPreview.position.y).toBeCloseTo(2.375, 8);
    expect(snapPreview.position.z).toBeCloseTo(0, 8);
    const proposedDelta = {
      x: snapPreview.position.x - divider.position.x,
      y: snapPreview.position.y - divider.position.y,
      z: snapPreview.position.z - divider.position.z
    };
    const clampedWithoutMateIdentity = resolveSafeTranslationDelta(
      [host, divider],
      new Set([divider.id]),
      proposedDelta
    );
    expect(clampedWithoutMateIdentity).not.toEqual(proposedDelta);
    expect(snapPreview.mateHostPartId).toBe(host.id);

    const seated = resolveSafeTranslationDelta(
      [host, divider],
      new Set([divider.id]),
      proposedDelta,
      undefined,
      snapPreview.mateHostPartId
    );
    expect(seated).toEqual(proposedDelta);

    const unrelatedSolid = createPart({
      id: 'unrelated-solid',
      length: 1,
      width: 6,
      thickness: 1,
      position: { x: 0, y: 2, z: 0 }
    });
    expect(
      resolveSafeTranslationDelta(
        [host, divider, unrelatedSolid],
        new Set([divider.id]),
        proposedDelta,
        undefined,
        snapPreview.mateHostPartId
      )
    ).not.toEqual(proposedDelta);
  });

  it('keeps the socket mate selectable with the production snap families enabled', () => {
    const host = createPart({
      id: 'offset-dado-host',
      length: 12,
      width: 6,
      thickness: 0.75,
      position: { x: 4, y: 0.375, z: 4 },
      features: [
        {
          id: 'offset-dado-socket',
          kind: 'rect_cut',
          version: 1 as const,
          enabled: true,
          cutType: 'dado',
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'min', secondaryFrom: 'min' },
          placement: { x: 5.6225, z: 0 },
          parameters: { size: { length: 0.755, width: 6 }, depthMode: 'blind', depth: 0.375 }
        }
      ]
    });
    const divider = createPart({
      id: 'offset-divider',
      length: 4,
      width: 6,
      thickness: 0.75,
      position: { x: 4.1, y: 2.8, z: 4.1 },
      rotation: { x: 0, y: 0, z: 90 }
    });
    const preview = solvePartMoveSnapPreview({
      part: divider,
      position: { x: 4.086, y: 2.8, z: 4.086 },
      axes: { x: true, y: true, z: true },
      worldHalfHeight: 2,
      referenceParts: [host],
      movingPartIds: [divider.id],
      snapGuides: [],
      settings: {
        ...socketSettings,
        snapToOrigin: true,
        enableSurfaceAnchors: true,
        enableFractionalAnchors: true,
        enableAxisLegacySnaps: true
      },
      snapThreshold: 0.55,
      latchedFaceSnap: null,
      resolveFeatureStage: () => 'feature'
    });

    expect(preview.position.x).toBeCloseTo(4, 8);
    expect(preview.position.y).toBeCloseTo(2.375, 8);
    expect(preview.position.z).toBeCloseTo(4, 8);
    expect(preview.mateHostPartId).toBe(host.id);
  });

  it('preserves every off-grid holistic mate axis when live grid snapping is enabled', () => {
    const host = createPart({
      id: 'off-grid-dado-host',
      length: 12,
      width: 6,
      thickness: 0.75,
      position: { x: 4.03, y: 0.375, z: 4.07 },
      features: [
        {
          id: 'off-grid-dado-socket',
          kind: 'rect_cut',
          version: 1 as const,
          enabled: true,
          cutType: 'dado',
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'min', secondaryFrom: 'min' },
          placement: { x: 5.6225, z: 0 },
          parameters: { size: { length: 0.755, width: 6 }, depthMode: 'blind', depth: 0.375 }
        }
      ]
    });
    const divider = createPart({
      id: 'off-grid-divider',
      length: 4,
      width: 6,
      thickness: 0.75,
      position: { x: 5, y: 2.8, z: 5 },
      rotation: { x: 0, y: 0, z: 90 }
    });

    const preview = solvePartMoveSnapPreview({
      part: divider,
      position: { x: 4.04, y: 2.8, z: 4.08 },
      axes: { x: true, y: true, z: true },
      worldHalfHeight: 2,
      referenceParts: [host],
      movingPartIds: [divider.id],
      snapGuides: [],
      settings: { ...socketSettings, liveGridSnap: true },
      snapThreshold: 0.5,
      latchedFaceSnap: null,
      resolveFeatureStage: () => 'feature'
    });

    expect(preview.position).toEqual({ x: 4.03, y: 2.375, z: 4.07 });
    expect(preview.snappedAxes).toEqual({ x: true, y: true, z: true });
    expect(preview.mateHostPartId).toBe(host.id);
    expect(resolveLiveGridReleasePosition(preview.position, preview.snappedAxes, true)).toEqual(preview.position);
  });

  it('preserves zero-delta off-grid mate tangents when only the insertion axis moves', () => {
    const host = createPart({
      id: 'zero-delta-dado-host',
      length: 12,
      width: 6,
      thickness: 0.75,
      position: { x: 4.03, y: 0.375, z: 4.07 },
      features: [
        {
          id: 'zero-delta-dado-socket',
          kind: 'rect_cut',
          version: 1 as const,
          enabled: true,
          cutType: 'dado',
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'min', secondaryFrom: 'min' },
          placement: { x: 5.6225, z: 0 },
          parameters: { size: { length: 0.755, width: 6 }, depthMode: 'blind', depth: 0.375 }
        }
      ]
    });
    const divider = createPart({
      id: 'zero-delta-divider',
      length: 4,
      width: 6,
      thickness: 0.75,
      position: { x: 4.03, y: 2.8, z: 4.07 },
      rotation: { x: 0, y: 0, z: 90 }
    });

    const preview = solvePartMoveSnapPreview({
      part: divider,
      position: divider.position,
      axes: { x: false, y: true, z: false },
      worldHalfHeight: 2,
      referenceParts: [host],
      movingPartIds: [divider.id],
      snapGuides: [],
      settings: { ...socketSettings, liveGridSnap: true },
      snapThreshold: 0.5,
      latchedFaceSnap: null,
      resolveFeatureStage: () => 'feature'
    });

    expect(preview.position).toEqual({ x: 4.03, y: 2.375, z: 4.07 });
    expect(preview.snappedAxes).toEqual({ x: true, y: true, z: true });
    expect(preview.mateHostPartId).toBe(host.id);
    expect(resolveLiveGridReleasePosition(preview.position, preview.snappedAxes, true)).toEqual(preview.position);
  });

  it('suppresses socket mating for a multi-selection preview', () => {
    const host = createPart({
      id: 'multi-dado-host',
      length: 12,
      width: 6,
      thickness: 0.75,
      position: { x: 0, y: 0.375, z: 0 },
      features: [
        {
          id: 'multi-dado-socket',
          kind: 'rect_cut',
          version: 1 as const,
          enabled: true,
          cutType: 'dado',
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'min', secondaryFrom: 'min' },
          placement: { x: 5.6225, z: 0 },
          parameters: { size: { length: 0.755, width: 6 }, depthMode: 'blind', depth: 0.375 }
        }
      ]
    });
    const divider = createPart({
      id: 'multi-divider',
      length: 4,
      width: 6,
      thickness: 0.75,
      position: { x: 2, y: 2.8, z: 0 },
      rotation: { x: 0, y: 0, z: 90 }
    });
    const companion = createPart({ id: 'multi-companion', position: { x: 20, y: 0.5, z: 0 } });

    const preview = solvePartMoveSnapPreview({
      part: divider,
      position: { x: 0.01, y: 2.8, z: 0 },
      axes: { x: true, y: true, z: true },
      worldHalfHeight: 2,
      referenceParts: [host],
      movingPartIds: [divider.id, companion.id],
      snapGuides: [],
      settings: socketSettings,
      snapThreshold: 0.5,
      latchedFaceSnap: null,
      resolveFeatureStage: () => 'feature'
    });

    expect(preview.mateHostPartId).toBeUndefined();
    expect(preview.position.y).not.toBeCloseTo(2.375);
  });

  it('keeps a selected one-member group preview and release on the ordinary collision path', () => {
    const host = createPart({
      id: 'selected-group-dado-host',
      length: 12,
      width: 6,
      thickness: 0.75,
      position: { x: 0, y: 0.375, z: 0 },
      features: [
        {
          id: 'selected-group-dado-socket',
          kind: 'rect_cut',
          version: 1 as const,
          enabled: true,
          cutType: 'dado',
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'min', secondaryFrom: 'min' },
          placement: { x: 5.6225, z: 0 },
          parameters: { size: { length: 0.755, width: 6 }, depthMode: 'blind', depth: 0.375 }
        }
      ]
    });
    const groupedDivider = createPart({
      id: 'selected-group-divider',
      length: 0.75,
      width: 6,
      thickness: 4,
      position: { x: 2, y: 2.8, z: 0 },
      rotation: { x: 0, y: 0, z: 0 }
    });
    const groupMembers: GroupMember[] = [
      { id: 'selected-group-member', groupId: 'selected-group', memberType: 'part', memberId: groupedDivider.id }
    ];
    const selection = { selectedPartIds: [], selectedGroupIds: ['selected-group'], editingGroupId: null };
    const parts = [host, groupedDivider];
    const moveSelection = resolveMoveSelection(selection, parts, groupMembers);
    const preview = solveGroupMoveSnapPreview({
      initialBounds: getCombinedBounds(moveSelection.affectedParts),
      anchorPosition: moveSelection.anchorPosition,
      delta: { x: -1.99, y: 0, z: 0 },
      axes: { x: true, y: true, z: true },
      referenceParts: parts,
      movingPartIds: moveSelection.affectedPartIds,
      movingParts: moveSelection.affectedParts,
      snapGuides: [],
      settings: socketSettings,
      snapThreshold: 0.5
    });
    const release = resolveGroupReleaseMove({
      parts,
      groupMembers,
      selection,
      proposedDelta: preview.delta,
      fallbackDeltaOnOverlap: preview.delta,
      preventOverlap: true
    });
    expect(moveSelection.affectedPartIds).toEqual([groupedDivider.id]);
    expect(groupedDivider.position.y + preview.delta.y).not.toBeCloseTo(2.375);
    expect(release.constrained.delta).toEqual(preview.delta);
    expect(release.constrained.overlapBlocked).toBe(false);
  });

  it('centers a holistic mortise mate across locked axes and axes that return to the drag origin', () => {
    const host = createPart({
      id: 'mortise-host',
      length: 12,
      width: 6,
      thickness: 1,
      position: { x: 4, y: 0.5, z: 4 },
      features: [
        {
          id: 'mortise-socket',
          kind: 'rect_cut',
          version: 1 as const,
          enabled: true,
          cutType: 'mortise',
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'min', secondaryFrom: 'min' },
          placement: { x: 5.745, z: 2.495 },
          parameters: { size: { length: 0.51, width: 1.01 }, depthMode: 'blind', depth: 0.75 }
        }
      ]
    });
    const rail = createPart({
      id: 'tenon-rail',
      length: 4,
      width: 2,
      thickness: 1,
      position: { x: 4, y: 3.0625, z: 4 },
      rotation: { x: 0, y: 0, z: 90 },
      features: [
        {
          id: 'rail-tenon',
          kind: 'rect_cut',
          version: 1 as const,
          enabled: true,
          cutType: 'tenon',
          target: { type: 'face', face: 'left_end' },
          reference: { primaryFrom: 'min', secondaryFrom: 'min' },
          placement: { x: 0, z: 0.5 },
          parameters: { size: { length: 0.75, width: 1 }, depthMode: 'blind', depth: 0.5 }
        }
      ]
    });

    const preview = solvePartMoveSnapPreview({
      part: rail,
      position: { x: 4.02, y: 2.75, z: 4.1 },
      axes: { x: false, y: true, z: false },
      worldHalfHeight: 2,
      referenceParts: [host],
      movingPartIds: [rail.id],
      snapGuides: [],
      settings: socketSettings,
      snapThreshold: 0.5,
      latchedFaceSnap: null,
      resolveFeatureStage: () => 'feature'
    });

    expect(preview.position).toEqual({ x: 4, y: 2.25, z: 4 });
    expect(preview.mateHostPartId).toBe(host.id);
    const seatedDelta = {
      x: preview.position.x - rail.position.x,
      y: preview.position.y - rail.position.y,
      z: preview.position.z - rail.position.z
    };
    expect(
      resolveSafeTranslationDelta([host, rail], new Set([rail.id]), seatedDelta, undefined, preview.mateHostPartId)
    ).toEqual(seatedDelta);

    const allAxesPreview = solvePartMoveSnapPreview({
      part: rail,
      position: { x: 4.02, y: 2.75, z: 4.1 },
      axes: { x: true, y: true, z: true },
      worldHalfHeight: 2,
      referenceParts: [host],
      movingPartIds: [rail.id],
      snapGuides: [],
      settings: socketSettings,
      snapThreshold: 0.5,
      latchedFaceSnap: null,
      resolveFeatureStage: () => 'feature'
    });
    expect(allAxesPreview.position).toEqual({ x: 4, y: 2.25, z: 4 });
    expect(allAxesPreview.mateHostPartId).toBe(host.id);
  });

  it('keeps face winner on contact axis while allowing tangential surface winner', () => {
    const winners = createAxisSnapWinners();
    const lines: SnapLine[] = [];
    const faceLine: SnapLine = {
      axis: 'x',
      type: 'face',
      family: 'face',
      state: 'winner',
      start: { x: 0, y: 0, z: 0 },
      end: { x: 0, y: 1, z: 0 },
      snapValue: 0
    };
    const surfaceLine: SnapLine = {
      axis: 'x',
      type: 'center',
      family: 'surface-anchor',
      state: 'winner',
      start: { x: 0, y: 0, z: 0 },
      end: { x: 0, y: 1, z: 0 },
      snapValue: 0
    };
    const tangentialSurfaceLine: SnapLine = {
      axis: 'z',
      type: 'center',
      family: 'surface-anchor',
      state: 'winner',
      start: { x: 0, y: 0, z: 0 },
      end: { x: 1, y: 0, z: 0 },
      snapValue: 0
    };

    expect(tryApplyAxisSnap('x', 'face', winners, lines, [faceLine])).toBe(true);
    expect(tryApplyAxisSnap('x', 'surface', winners, lines, [surfaceLine])).toBe(false);
    expect(tryApplyAxisSnap('z', 'surface', winners, lines, [tangentialSurfaceLine])).toBe(true);

    expect(winners.x).toBe('face');
    expect(winners.z).toBe('surface');
  });

  it('prefers explicit surface anchors over fractional anchors when both are valid', () => {
    const dragging = createPart({
      id: 'dragging',
      length: 2,
      width: 2,
      thickness: 1,
      position: { x: 0, y: 0.28, z: 0.24 }
    });
    const target = createPart({
      id: 'target',
      length: 8,
      width: 8,
      thickness: 1,
      position: { x: 5.1, y: 0, z: 0 }
    });
    const all = [dragging, target];
    const snapThreshold = 0.5;

    const surface = detectSurfaceAnchorSnaps(dragging, dragging.position, all, ['dragging'], snapThreshold);
    const fraction = detectFractionalFaceSnaps(dragging, dragging.position, all, ['dragging'], snapThreshold);

    const winners = createAxisSnapWinners();
    const lines: SnapLine[] = [];

    if (surface.snappedY) {
      tryApplyAxisSnap(
        'y',
        'surface',
        winners,
        lines,
        surface.snapLines.filter((l) => l.axis === 'y')
      );
    }
    if (surface.snappedZ) {
      tryApplyAxisSnap(
        'z',
        'surface',
        winners,
        lines,
        surface.snapLines.filter((l) => l.axis === 'z')
      );
    }
    if (fraction.snappedY) {
      tryApplyAxisSnap(
        'y',
        'fraction',
        winners,
        lines,
        fraction.snapLines.filter((l) => l.axis === 'y')
      );
    }
    if (fraction.snappedZ) {
      tryApplyAxisSnap(
        'z',
        'fraction',
        winners,
        lines,
        fraction.snapLines.filter((l) => l.axis === 'z')
      );
    }

    expect(winners.y === 'surface' || winners.z === 'surface').toBe(true);
  });

  it('falls back to feature snaps when face/surface/fraction are not available', () => {
    const dragging = createPart({
      id: 'dragging',
      length: 6,
      width: 2,
      thickness: 1,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 45, z: 0 }
    });
    const obb = getPartOBB(dragging);
    const normal = obb.axes[2];
    const target = createPart({
      id: 'target',
      length: 6,
      width: 2,
      thickness: 1,
      position: { x: normal.x * 2.2, y: 0, z: normal.z * 2.2 },
      rotation: { x: 0, y: 45, z: 0 }
    });

    const feature = detectFeatureSnaps(dragging, dragging.position, [dragging, target], ['dragging'], 0.5);
    expect(feature.snappedX || feature.snappedY || feature.snappedZ).toBe(true);
    expect(feature.snapLines.some((line) => line.family === 'feature')).toBe(true);
  });
});
