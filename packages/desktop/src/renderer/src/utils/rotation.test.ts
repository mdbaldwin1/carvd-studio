import { expect, it, vi } from 'vitest';
import { Euler, MathUtils, Quaternion, Vector3 } from 'three';
import { quaternionFromRotation, rotateAroundWorldAxis, rotationFromQuaternion } from './rotation';

vi.unmock('three');

it.each([-90, -89.999, -45, 0, 45, 89.999, 90])(
  'preserves a compound orientation when converting through Euler angles near Y=%s',
  (y) => {
    const original = new Quaternion().setFromEuler(
      new Euler(MathUtils.degToRad(37), MathUtils.degToRad(y), MathUtils.degToRad(12))
    );
    const restored = quaternionFromRotation(rotationFromQuaternion(original));
    for (const axis of [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)]) {
      expect(axis.clone().applyQuaternion(original).distanceTo(axis.clone().applyQuaternion(restored))).toBeLessThan(
        1e-9
      );
    }
  }
);

it('keeps orientation in step with full-precision positions across incremental compound turns', () => {
  let rotation = { x: 23, y: 37, z: 11 };
  const expected = quaternionFromRotation(rotation);
  for (let step = 0; step < 120; step++) {
    for (const axis of ['x', 'y', 'z'] as const) {
      const degrees = 0.137;
      rotation = rotateAroundWorldAxis(rotation, axis, degrees);
      expected.premultiply(
        new Quaternion().setFromAxisAngle(
          new Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0),
          MathUtils.degToRad(degrees)
        )
      );
    }
  }
  const point = new Vector3(48, 3, 1);
  expect(
    point.clone().applyQuaternion(quaternionFromRotation(rotation)).distanceTo(point.applyQuaternion(expected))
  ).toBeLessThan(1e-8);
});
