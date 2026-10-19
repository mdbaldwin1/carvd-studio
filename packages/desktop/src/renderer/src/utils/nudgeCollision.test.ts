import { describe, expect, it, vi } from 'vitest';
import { Euler, Quaternion, Vector3 } from 'three';
import { createTestPart } from '../../../../tests/helpers/factories';
import { partsOverlap, resolveSafeNudgeTranslationDelta } from './overlapPolicy';
import { useProjectStore } from '../store/projectStore';
import { useSelectionStore } from '../store/selectionStore';
import { useSnapStore } from '../store/snapStore';
vi.unmock('three');
function fixture() {
  const host = createTestPart({
    id: 'rail',
    length: 12,
    width: 3,
    thickness: 0.75,
    position: { x: 12.75, y: 0.375, z: 3.75 },
    features: [
      {
        id: '01d34fab-311b-4ef7-97a8-5a2c6ad8c8d0',
        kind: 'routed_path',
        version: 1,
        enabled: true,
        label: 'Open-ended wooden runner track',
        target: { type: 'face', face: 'top_face' },
        reference: { primaryFrom: 'center', secondaryFrom: 'center' },
        path: {
          points: [
            { primary: -6, secondary: 0 },
            { primary: 5, secondary: 0 }
          ]
        },
        bit: { profile: 't_slot', diameter: 0.5, shankDiameter: 0.25, cutterHeight: 0.1875 },
        parameters: { depthMode: 'blind', depth: 0.4375 }
      }
    ]
  });
  const runner = createTestPart({
    id: 'runner',
    length: 4,
    width: 0.47,
    thickness: 0.1675,
    position: { x: 12.75, y: 0.39625, z: 3.75 }
  });
  return { host, runner };
}
describe('continuous rectangular keyboard nudges', () => {
  it.each([false, true])('stops a captive T-slot runner at the lip (rotated=%s)', (rotated) => {
    const { host, runner } = fixture();
    let delta = new Vector3(0, 1, 0);
    if (rotated) {
      const q = new Quaternion().setFromEuler(new Euler(0.3, 0.7, -0.4));
      for (const part of [host, runner]) {
        const position = new Vector3(part.position.x, part.position.y, part.position.z).applyQuaternion(q);
        part.position = { x: position.x, y: position.y, z: position.z };
        part.rotation = { x: (0.3 * 180) / Math.PI, y: (0.7 * 180) / Math.PI, z: (-0.4 * 180) / Math.PI };
      }
      delta = delta.applyQuaternion(q);
    }
    expect(partsOverlap(runner, host)).toBe(false);
    expect(
      partsOverlap(
        {
          ...runner,
          position: { x: runner.position.x + delta.x, y: runner.position.y + delta.y, z: runner.position.z + delta.z }
        },
        host
      )
    ).toBe(false);
    const safe = resolveSafeNudgeTranslationDelta([runner, host], new Set([runner.id]), delta);
    expect(safe).not.toBeNull();
    expect(new Vector3(safe!.x, safe!.y, safe!.z).length()).toBeCloseTo(0.02, 3);
  });
  it('allows nine-inch axial withdrawal and reinsertion through the open end', () => {
    const { host, runner } = fixture();
    const delta = { x: -9, y: 0, z: 0 };
    expect(resolveSafeNudgeTranslationDelta([runner, host], new Set([runner.id]), delta)).toEqual(delta);
    runner.position.x -= 9;
    expect(resolveSafeNudgeTranslationDelta([runner, host], new Set([runner.id]), { x: 9, y: 0, z: 0 })).toEqual({
      x: 9,
      y: 0,
      z: 0
    });
  });
  it('stops a large nudge at a thin obstacle even with a clear endpoint', () => {
    const moving = createTestPart({ id: 'moving', length: 1, width: 1, thickness: 1, position: { x: 0, y: 1, z: 0 } });
    const wall = createTestPart({ id: 'wall', length: 0.001, width: 5, thickness: 5, position: { x: 2, y: 1, z: 0 } });
    const safe = resolveSafeNudgeTranslationDelta([moving, wall], new Set([moving.id]), { x: 5, y: 0, z: 0 });
    expect(safe?.x).toBeCloseTo(1.4995, 3);
  });
  it('preserves explicit overlap exceptions and rigid group movement', () => {
    const { host, runner } = fixture();
    const delta = { x: 0, y: 1, z: 0 };
    expect(resolveSafeNudgeTranslationDelta([runner, host], new Set([runner.id, host.id]), delta)).toEqual(delta);
    expect(
      resolveSafeNudgeTranslationDelta([{ ...runner, ignoreOverlap: true }, host], new Set([runner.id]), delta)
    ).toEqual(delta);
  });
  it('applies the path guard to selected-part nudges while preserving explicit numeric placement', () => {
    const { host, runner } = fixture();
    useProjectStore.setState({
      parts: [host, runner],
      stocks: [],
      groupMembers: [],
      stockConstraints: {
        constrainDimensions: false,
        constrainColor: false,
        constrainGrain: false,
        preventOverlap: true
      }
    });
    useSelectionStore.getState().clearSelection();
    useSelectionStore.getState().selectPart(runner.id);
    useSnapStore.setState({ snapToPartsEnabled: false });
    useProjectStore.getState().moveSelectedParts({ x: 0, y: 1, z: 0 });
    expect(useProjectStore.getState().parts.find((p) => p.id === runner.id)!.position.y).toBeCloseTo(0.41625, 3);
    expect(useProjectStore.getState().updatePart(runner.id, { position: { ...runner.position, y: 1.39625 } })).toBe(
      true
    );
  });
});
