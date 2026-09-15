import { describe, expect, it } from 'vitest';
import type { Part, SnapGuide } from '../types';
import { createGroupProxySnapContext, createPartSnapContext } from './interactionSnapContext';

function part(overrides: Partial<Part> = {}): Part {
  return {
    id: overrides.id ?? 'part-1',
    name: overrides.name ?? 'Part',
    length: overrides.length ?? 10,
    width: overrides.width ?? 4,
    thickness: overrides.thickness ?? 1,
    position: overrides.position ?? { x: 0, y: 0, z: 0 },
    rotation: overrides.rotation ?? { x: 0, y: 0, z: 0 },
    stockId: overrides.stockId ?? null,
    grainSensitive: overrides.grainSensitive ?? false,
    grainDirection: overrides.grainDirection ?? 'length',
    color: overrides.color ?? '#fff',
    features: overrides.features
  };
}

describe('interactionSnapContext', () => {
  it('creates a part snap context with staged detectors and guide/origin candidates', () => {
    const movingPart = part();
    const referenceParts = [movingPart, part({ id: 'part-2', position: { x: 12, y: 0, z: 0 } })];
    const snapGuides: SnapGuide[] = [{ id: 'guide-z', axis: 'z', position: 1 }];

    const context = createPartSnapContext({
      part: movingPart,
      position: { x: 0, y: 0, z: 1.02 },
      referenceParts,
      movingPartIds: [movingPart.id],
      snapGuides,
      snapThreshold: 0.2,
      snapToOrigin: true,
      enableGoldenRatioAnchors: false,
      enableAxisLegacySnaps: true
    });

    expect(context.subjectPart.id).toBe(movingPart.id);
    expect(context.guideSnaps?.z?.guideId).toBe('guide-z');
    expect(context.originSnaps).toBeDefined();
    expect(typeof context.advancedDetectors.surface).toBe('function');
    expect(typeof context.advancedDetectors.feature).toBe('function');
  });

  it('creates a group proxy snap context from bounds and delta', () => {
    const movingParts = [part({ id: 'part-1' }), part({ id: 'part-2', position: { x: 10, y: 0, z: 0 } })];
    const referenceParts = [...movingParts, part({ id: 'part-3', position: { x: 30, y: 0, z: 0 } })];

    const context = createGroupProxySnapContext({
      initialBounds: {
        id: 'group',
        minX: -5,
        maxX: 15,
        minY: -0.5,
        maxY: 0.5,
        minZ: -2,
        maxZ: 2,
        centerX: 5,
        centerY: 0,
        centerZ: 0
      },
      anchorPosition: { x: 5, y: 0, z: 0 },
      delta: { x: 2, y: 0, z: 3 },
      referenceParts,
      movingPartIds: movingParts.map((entry) => entry.id),
      movingParts,
      snapGuides: [],
      snapThreshold: 0.5,
      snapToOrigin: true,
      enableGoldenRatioAnchors: false,
      enableAxisLegacySnaps: true
    });

    expect(context.subjectPart.id).toBe('group-proxy');
    expect(context.subjectPart.length).toBe(20);
    expect(context.subjectPart.width).toBe(4);
    expect(context.facePosition).toEqual({ x: 7, y: 0, z: 3 });
    expect(context.originBounds.centerX).toBe(7);
    expect(typeof context.advancedDetectors.surface).toBe('function');
  });

  it('mates multiple grouped parts with one consensus rigid translation', () => {
    const socket = (id: string) => ({
      id,
      kind: 'rect_cut' as const,
      version: 1 as const,
      enabled: true,
      cutType: 'mortise' as const,
      target: { type: 'face' as const, face: 'top_face' as const },
      reference: { primaryFrom: 'min' as const, secondaryFrom: 'min' as const },
      parameters: { size: { length: 2, width: 2 }, depthMode: 'blind' as const, depth: 0.5 },
      placement: { x: 2, z: 1 }
    });
    const hosts = [-4, 4].map((x) =>
      part({
        id: `host-${x}`,
        length: 6,
        width: 4,
        thickness: 1,
        position: { x, y: 0.5, z: 0 },
        features: [socket(`socket-${x}`)]
      })
    );
    const movingParts = [-4, 4].map((x) =>
      part({ id: `moving-${x}`, length: 2, width: 2, thickness: 2, position: { x, y: 1.2, z: 0 } })
    );

    const context = createGroupProxySnapContext({
      initialBounds: {
        id: 'group',
        minX: -5,
        maxX: 5,
        minY: 0.2,
        maxY: 2.2,
        minZ: -1,
        maxZ: 1,
        centerX: 0,
        centerY: 1.2,
        centerZ: 0
      },
      anchorPosition: { x: 0, y: 1.2, z: 0 },
      delta: { x: 0, y: 0, z: 0 },
      referenceParts: hosts,
      movingPartIds: movingParts.map(({ id }) => id),
      movingParts,
      snapGuides: [],
      snapThreshold: 0.5,
      snapToOrigin: false,
      enableGoldenRatioAnchors: false,
      enableAxisLegacySnaps: false
    });

    const mate = context.advancedDetectors.mate();
    expect(mate.mateHostPartId).toBeDefined();
    expect(mate.snappedY).toBe(true);
    expect(mate.adjustedPosition.y).toBeCloseTo(1.5);
    expect(mate.snapLines).toHaveLength(2);

    const closerDecoy = {
      ...hosts[0],
      id: 'closer-decoy',
      position: { ...hosts[0].position, y: 0.3 }
    };
    const mateWithAmbiguousFirstJoint = createGroupProxySnapContext({
      initialBounds: context.originBounds,
      anchorPosition: { x: 0, y: 1.2, z: 0 },
      delta: { x: 0, y: 0, z: 0 },
      referenceParts: [closerDecoy, ...hosts],
      movingPartIds: movingParts.map(({ id }) => id),
      movingParts,
      snapGuides: [],
      snapThreshold: 0.5,
      snapToOrigin: false,
      enableGoldenRatioAnchors: false,
      enableAxisLegacySnaps: false
    }).advancedDetectors.mate();
    expect(mateWithAmbiguousFirstJoint.mateHostPartId).toBeDefined();
    expect(mateWithAmbiguousFirstJoint.adjustedPosition.y).toBeCloseTo(1.5);
    expect(mateWithAmbiguousFirstJoint.snapLines).toHaveLength(2);

    const conflicted = createGroupProxySnapContext({
      initialBounds: context.originBounds,
      anchorPosition: { x: 0, y: 1.2, z: 0 },
      delta: { x: 0, y: 0, z: 0 },
      referenceParts: [hosts[0], { ...hosts[1], position: { ...hosts[1].position, y: 0.7 } }],
      movingPartIds: movingParts.map(({ id }) => id),
      movingParts,
      snapGuides: [],
      snapThreshold: 0.5,
      snapToOrigin: false,
      enableGoldenRatioAnchors: false,
      enableAxisLegacySnaps: false
    }).advancedDetectors.mate();
    expect(conflicted.mateHostPartId).toBeUndefined();
    expect(conflicted.snapLines).toEqual([]);
    expect(conflicted.mateConflict?.candidateCount).toBe(2);
    expect(conflicted.mateConflict?.maxDisagreement).toBeCloseTo(0.2);
  });
  it('exposes a mate detector that snaps a part into a matching socket', () => {
    const hostPart = part({
      id: 'host',
      length: 24,
      width: 12,
      thickness: 1.5,
      position: { x: 0, y: 0.75, z: 0 },
      features: [
        {
          id: 'cutout-1',
          kind: 'rect_cut',
          version: 1 as const,
          enabled: true,
          cutType: 'cutout',
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'min' },
          parameters: { size: { length: 6, width: 4 }, depthMode: 'blind', depth: 0.5 },
          placement: { x: 3, z: 4 }
        }
      ]
    });
    const dragPart = part({
      id: 'drag',
      length: 6,
      width: 4,
      thickness: 2,
      position: { x: 0, y: 0, z: 0 }
    });

    const context = createPartSnapContext({
      part: dragPart,
      position: { x: -6, y: 2.5, z: 0 },
      referenceParts: [hostPart, dragPart],
      movingPartIds: ['drag'],
      snapGuides: [],
      snapThreshold: 0.5,
      snapToOrigin: false,
      enableGoldenRatioAnchors: false,
      enableAxisLegacySnaps: false
    });

    const mateResult = context.advancedDetectors.mate();
    expect(mateResult.snappedY).toBe(true);
    expect(mateResult.adjustedPosition.y).toBeCloseTo(2.0);
    expect(mateResult.snapLines.length).toBeGreaterThan(0);
  });
});
