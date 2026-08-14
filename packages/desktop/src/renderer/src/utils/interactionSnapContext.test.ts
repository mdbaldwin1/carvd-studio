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
    color: overrides.color ?? '#fff'
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
});
