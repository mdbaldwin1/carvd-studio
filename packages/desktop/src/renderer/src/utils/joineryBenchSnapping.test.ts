import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, expect, it, vi } from 'vitest';
import { Euler, MathUtils, Quaternion, Vector3 } from 'three';
import { rotationFromQuaternion } from './rotation';
import { wouldTransformedPartsOverlap } from './overlapPolicy';
import { wouldPartOverlap } from '../components/properties/propertiesLogic';
import { useProjectStore } from '../store/projectStore';
import { useSelectionStore } from '../store/selectionStore';
import { detectFeatureMateSnaps, getPartBounds } from './snapToPartsUtil';
import { solvePartMoveSnapPreview } from './interactionMovePreview';
import type { AppSettings, Part } from '../types';
vi.unmock('three');
const directory = mkdtempSync(join(tmpdir(), 'carvd-bench-snaps-'));
const filename = join(directory, 'bench.carvd');
execFileSync(process.execPath, ['scripts/make-joinery-test-project.cjs', filename], { stdio: 'pipe' });
const bench = JSON.parse(readFileSync(filename, 'utf8')) as {
  parts: Part[];
  groups: { id: string; name: string }[];
  groupMembers: { groupId: string; memberId: string }[];
};
afterAll(() => rmSync(directory, { recursive: true, force: true }));
const settings = {
  snapToOrigin: true,
  enableSurfaceAnchors: true,
  enableFractionalAnchors: true,
  enableGoldenRatioAnchors: false,
  enableFeatureAnchors: true,
  enableAxisLegacySnaps: true
} as AppSettings;
const stations = bench.groups.map((group) => {
  const ids = new Set(
    bench.groupMembers.filter((member) => member.groupId === group.id).map((member) => member.memberId)
  );
  const parts = bench.parts.filter((part) => ids.has(part.id));
  const anchor = parts[0].position;
  return {
    name: group.name,
    parts: parts.map((part) => ({
      ...part,
      position: {
        x: part.position.x - anchor.x,
        y: part.position.y,
        z: part.position.z - anchor.z
      }
    }))
  };
});
function preview(
  original: Part,
  references: Part[],
  start = {
    x: original.position.x - 3,
    y: original.position.y + 3,
    z: original.position.z + 3
  },
  proposed = { x: original.position.x + 0.1, y: original.position.y + 0.1, z: original.position.z + 0.1 }
) {
  return solvePartMoveSnapPreview({
    part: { ...original, position: start },
    position: proposed,
    axes: { x: true, y: true, z: true },
    worldHalfHeight: 0,
    referenceParts: references,
    movingPartIds: [original.id],
    snapGuides: [],
    settings,
    snapThreshold: 0.5,
    latchedFaceSnap: null,
    resolveFeatureStage: () => 'feature'
  });
}
it('can evaluate snap geometry for every part in all 51 generated stations', () => {
  expect(stations).toHaveLength(51);
  for (const station of stations) {
    for (const part of station.parts) {
      const result = preview(
        part,
        station.parts.filter((other) => other.id !== part.id)
      );
      for (const value of Object.values(result.position))
        expect(Number.isFinite(value), `${station.name}: ${part.name}`).toBe(true);
    }
  }
}, 120000);
// Bore registration requires a physical connector. The bench now omits
// purchased hardware from fabrication; retain a test-only gauge to exercise
// connector snapping without selling it as wood stock in the example file.
function matingFixture(number: string) {
  const station = stations.find((entry) => entry.name.startsWith(number + ' '))!;
  if (number !== '29') return station;
  const post = station.parts[0];
  const boltGauge: Part = {
    ...post,
    id: 'test-only-bolt-gauge',
    name: 'Test-only bolt gauge',
    stockId: null,
    length: 4.5,
    width: 0.245,
    thickness: 0.245,
    blankShape: 'round',
    position: { ...post.position, x: post.position.x + 0.75 },
    features: [],
    grainSensitive: false
  };
  const rail = station.parts[1];
  const barrelGauge: Part = {
    ...boltGauge,
    id: 'test-only-barrel-gauge',
    name: 'Test-only barrel gauge',
    length: 0.75,
    width: 0.375,
    thickness: 0.375,
    rotation: { x: 0, y: 0, z: 90 },
    position: { ...rail.position, x: rail.position.x - rail.length / 2 + 1.5 },
    features: [
      {
        id: 'test-only-cross-bore',
        kind: 'circular_cut',
        version: 1,
        enabled: true,
        cutType: 'round_hole',
        target: { type: 'face', face: 'top_face' },
        reference: { primaryFrom: 'center', secondaryFrom: 'center' },
        placement: { primary: 0, secondary: 0, rotation: 0 },
        parameters: { diameter: 0.25, depthMode: 'through', tilt: 0, direction: 0 }
      }
    ]
  };
  return { ...station, parts: [...station.parts, barrelGauge, boltGauge] };
}
it.each(['05', '06', '07', '10', '11', '14', '26', '29', '36', '37', '39', '44', '48'])(
  'seats station %s from a nearby offset',
  (number) => {
    const station = matingFixture(number);
    const original = station.parts[1];
    const result = preview(
      original,
      station.parts.filter((other) => other.id !== original.id)
    );
    for (const axis of ['x', 'y', 'z'] as const) expect(result.position[axis]).toBeCloseTo(original.position[axis], 6);
    expect(result.mateConflict).toBeUndefined();
  }
);
it('finishes a small sliding-dovetail correction without generic face snaps taking its unchanged axes', () => {
  const station = stations.find((entry) => entry.name.startsWith('11 '))!;
  const original = station.parts[1];
  const result = preview(
    original,
    [station.parts[0]],
    { ...original.position, z: 0.2 },
    { x: original.position.x + 0.1, y: original.position.y + 0.1, z: 0.1 }
  );
  for (const axis of ['x', 'y', 'z'] as const) expect(result.position[axis]).toBeCloseTo(original.position[axis], 6);
  expect(result.mateHostPartId).toBe(station.parts[0].id);
});
it('seats the upper egg-crate panel from a small vertical offset', () => {
  const station = stations.find((entry) => entry.name.startsWith('48 '))!;
  const original = station.parts[0];
  const result = preview(original, [station.parts[1]], { ...original.position, y: 3.3 }, { x: 0.1, y: 3, z: 0.1 });
  expect(result.position).toEqual(expect.objectContaining({ y: 3 }));
  expect(result.position.x).toBeCloseTo(0, 6);
  expect(result.position.z).toBeCloseTo(0, 6);
});

it('accepts restoring every authored wood and insert part through both commit and Properties validation', () => {
  for (const station of stations)
    for (const part of station.parts) {
      const away = { ...part, position: { x: 900, y: 900, z: 900 } };
      const parts = station.parts.map((candidate) => (candidate.id === part.id ? away : candidate));
      const context = `${station.name}: ${part.name}`;
      expect(wouldTransformedPartsOverlap(parts, new Map([[part.id, part]])), context).toBe(false);
      expect(wouldPartOverlap(away, part.position, parts), context).toBe(false);
    }
}, 120000);

it('still refuses a Properties edit that puts an uncut board inside another', () => {
  const station = stations.find((entry) => entry.name.startsWith('01 '))!;
  const [first, second] = station.parts;
  expect(wouldPartOverlap(second, first.position, station.parts)).toBe(true);
});

const rotationCases = [
  [0, 30, 0],
  [0, -45, 0],
  [0, 137, 0],
  [23, 37, 11],
  [-17, 61, -29],
  [90, 22.5, 0],
  [0, 0, 45],
  [17, 0, 0],
  [37, 89.999, 12],
  [-121, 77, 163],
  [0, 180, 0],
  [0, 0, 0]
];
function rotateStation(parts: Part[], angles: number[]) {
  const rotation = new Quaternion().setFromEuler(
    new Euler(MathUtils.degToRad(angles[0]), MathUtils.degToRad(angles[1]), MathUtils.degToRad(angles[2]))
  );
  return parts.map((part) => {
    const position = new Vector3(part.position.x, part.position.y, part.position.z).applyQuaternion(rotation);
    const local = new Quaternion().setFromEuler(
      new Euler(
        MathUtils.degToRad(part.rotation.x),
        MathUtils.degToRad(part.rotation.y),
        MathUtils.degToRad(part.rotation.z)
      )
    );
    const rotated = rotationFromQuaternion(rotation.clone().multiply(local));
    return {
      ...part,
      position: { x: position.x + 100, y: position.y + 100, z: position.z + 100 },
      rotation: rotated
    };
  });
}
it.each(rotationCases)(
  'preserves valid fits and finite snap previews across all stations at (%s, %s, %s)',
  (x, y, z) => {
    const failures: string[] = [];
    for (const station of stations) {
      const parts = rotateStation(station.parts, [x, y, z]);
      for (const part of parts) {
        const away = { ...part, position: { x: 900, y: 900, z: 900 } };
        const context = parts.map((candidate) => (candidate.id === part.id ? away : candidate));
        if (wouldTransformedPartsOverlap(context, new Map([[part.id, part]])))
          failures.push(`${station.name}: ${part.name}: commit overlap`);
        if (wouldPartOverlap(away, part.position, context))
          failures.push(`${station.name}: ${part.name}: properties overlap`);
        const result = preview(
          part,
          parts.filter((other) => other.id !== part.id)
        );
        if (!Object.values(result.position).every(Number.isFinite))
          failures.push(`${station.name}: ${part.name}: nonfinite snap`);
      }
    }
    expect(failures).toEqual([]);
  },
  120000
);
it.each(rotationCases)(
  'preserves mating snaps at (%s, %s, %s)',
  (x, y, z) => {
    const failures: string[] = [];
    for (const number of ['05', '06', '07', '10', '11', '14', '26', '29', '36', '37', '39', '44', '48']) {
      const station = matingFixture(number);
      const parts = rotateStation(station.parts, [x, y, z]);
      const part = parts[1];
      const result = preview(
        part,
        parts.filter((other) => other.id !== part.id)
      );
      const error = new Vector3(result.position.x, result.position.y, result.position.z).distanceTo(
        new Vector3(part.position.x, part.position.y, part.position.z)
      );
      if (error > 1e-5 || result.mateConflict)
        failures.push(`${station.name}: error ${error}, conflict ${JSON.stringify(result.mateConflict)}`);
    }
    expect(failures).toEqual([]);
  },
  120000
);

it.each(rotationCases)(
  'keeps feature alignment rotation-invariant for every part at (%s, %s, %s)',
  (x, y, z) => {
    const rotation = new Quaternion().setFromEuler(
      new Euler(MathUtils.degToRad(x), MathUtils.degToRad(y), MathUtils.degToRad(z))
    );
    const failures: string[] = [];
    const offset = { x: 0.1, y: 0.1, z: 0.1 };
    const rotatePoint = (point: Part['position']) => {
      const v = new Vector3(point.x, point.y, point.z).applyQuaternion(rotation);
      return { x: v.x + 100, y: v.y + 100, z: v.z + 100 };
    };
    for (const station of stations) {
      const rotated = rotateStation(station.parts, [x, y, z]);
      for (const [index, original] of station.parts.entries()) {
        const start = { x: original.position.x - 3, y: original.position.y + 3, z: original.position.z + 3 };
        const proposed = {
          x: original.position.x + offset.x,
          y: original.position.y + offset.y,
          z: original.position.z + offset.z
        };
        const baseline = detectFeatureMateSnaps(
          { ...original, position: start },
          proposed,
          station.parts,
          [original.id],
          0.5
        );
        const result = detectFeatureMateSnaps(
          { ...rotated[index], position: rotatePoint(start) },
          rotatePoint(proposed),
          rotated,
          [original.id],
          0.5
        );
        const expected = rotatePoint(baseline.adjustedPosition);
        const error = new Vector3(
          result.adjustedPosition.x,
          result.adjustedPosition.y,
          result.adjustedPosition.z
        ).distanceTo(new Vector3(expected.x, expected.y, expected.z));
        if (error > 1e-5 || !!result.mateConflict !== !!baseline.mateConflict)
          failures.push(
            `${station.name}: ${original.name}: error ${error}, conflict ${JSON.stringify(result.mateConflict)}`
          );
      }
    }
    expect(failures).toEqual([]);
  },
  120000
);

it.each([5, 15, 30])('does not offer an exact joint mate for a member tilted %s degrees', (angle) => {
  const failures: string[] = [];
  for (const number of ['05', '06', '07', '10', '11', '14', '26', '29', '36', '37', '39', '44', '48']) {
    const station = stations.find((entry) => entry.name.startsWith(number + ' '))!;
    const part = station.parts[1];
    const tilted = rotateStation([{ ...part, position: { x: 0, y: 0, z: 0 } }], [angle, angle, angle])[0];
    tilted.position = { ...part.position };
    const result = detectFeatureMateSnaps(
      tilted,
      { x: part.position.x + 0.1, y: part.position.y + 0.1, z: part.position.z + 0.1 },
      station.parts,
      [part.id],
      0.5
    );
    if (result.mateHostPartId) failures.push(`${station.name}: incorrect angular mate`);
  }
  expect(failures).toEqual([]);
});

it('rotates every station rigidly above the work plane through the viewport store action', () => {
  for (const station of stations) {
    useProjectStore.setState({
      parts: station.parts,
      groupMembers: [],
      stockConstraints: { ...useProjectStore.getState().stockConstraints, preventOverlap: true }
    });
    useSelectionStore.setState({
      selectedPartIds: station.parts.map((part) => part.id),
      selectedGroupIds: [],
      editingGroupId: null
    });
    for (const [axis, angle] of [
      ['x', 23],
      ['y', 37],
      ['z', -29]
    ] as const) {
      const before = useProjectStore.getState().parts;
      const rotation = new Quaternion().setFromAxisAngle(
        new Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0),
        MathUtils.degToRad(angle)
      );
      useProjectStore.getState().rotateSelectedParts(axis, angle, before[0].position);
      const after = useProjectStore.getState().parts;
      for (let index = 0; index < before.length; index++) {
        const expected = new Vector3(
          before[index].position.x - before[0].position.x,
          before[index].position.y - before[0].position.y,
          before[index].position.z - before[0].position.z
        ).applyQuaternion(rotation);
        const actual = new Vector3(
          after[index].position.x - after[0].position.x,
          after[index].position.y - after[0].position.y,
          after[index].position.z - after[0].position.z
        );
        expect(actual.distanceTo(expected), station.name).toBeLessThan(1e-6);
        expect(getPartBounds(after[index]).minY, `${station.name}: ground`).toBeGreaterThanOrEqual(-1e-6);
      }
    }
  }
  useSelectionStore.setState({ selectedPartIds: [] });
}, 120000);
