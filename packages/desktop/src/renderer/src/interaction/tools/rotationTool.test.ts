import { describe, expect, it, vi } from 'vitest';

// Use real Three.js for quaternion-backed rotation math.
vi.unmock('three');
vi.mock('three', async () => await vi.importActual('three'));

import type { Part } from '../../types';
import { rotateAroundLocalAxis, rotateAroundWorldAxis } from '../../utils/rotation';
import { rotationTool, type RotationToolInput } from './rotationTool';

function makePart(overrides?: Partial<Part>): Part {
  return {
    id: 'p1',
    name: 'p1',
    length: 24,
    width: 12,
    thickness: 0.75,
    position: { x: 0, y: 0.375, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    stockId: null,
    grainSensitive: false,
    grainDirection: 'length',
    color: '#fff',
    ...overrides
  };
}

function makeInput(overrides?: Partial<RotationToolInput>): RotationToolInput {
  return {
    part: makePart(),
    axis: 'y',
    degrees: 90,
    space: 'local',
    ...overrides
  };
}

describe('rotationTool', () => {
  it('updates local-axis rotation using the shared rotation math', () => {
    const part = makePart({ rotation: { x: 10, y: 20, z: 30 } });
    const input = makeInput({ part, axis: 'x', degrees: 45, space: 'local' });
    const state = rotationTool.begin(input);

    const { preview } = rotationTool.update(input, state);

    expect(preview.rotation).toEqual(rotateAroundLocalAxis(part.rotation, 'x', 45));
  });

  it('updates world-axis rotation using the shared rotation math', () => {
    const part = makePart({ rotation: { x: 10, y: 20, z: 30 } });
    const input = makeInput({ part, axis: 'y', degrees: 90, space: 'world' });
    const state = rotationTool.begin(input);

    const { preview } = rotationTool.update(input, state);

    expect(preview.rotation).toEqual(rotateAroundWorldAxis(part.rotation, 'y', 90));
  });

  it('commit emits a single updatePartRotation instruction matching preview', () => {
    const part = makePart({ id: 'rotating' });
    const input = makeInput({ part, axis: 'z', degrees: 90, space: 'local' });
    const state = rotationTool.begin(input);
    const { preview } = rotationTool.update(input, state);

    expect(rotationTool.commit(state, preview)).toEqual([
      {
        kind: 'updatePartRotation',
        partId: 'rotating',
        rotation: preview.rotation
      }
    ]);
  });

  it('cancel does not throw', () => {
    const state = rotationTool.begin(makeInput());

    expect(() => rotationTool.cancel(state)).not.toThrow();
  });
});
