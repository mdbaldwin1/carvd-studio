import { describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import { Euler, Quaternion, Vector3, MathUtils } from 'three';
import * as materialGeometry from './partFeatureGeometry';
import { partsOverlap, resolveSafeNudgeTranslationDelta } from './overlapPolicy';
import { useProjectStore } from '../store/projectStore';
import { useSelectionStore } from '../store/selectionStore';
import { useSnapStore } from '../store/snapStore';
vi.unmock('three');

describe('continuous keyboard nudges of round and rebated parts', () => {
  it.each(['round pin', 'rebated tongue'] as const)('%s cannot jump through a thin obstruction', (shape) => {
    const moving = createTestPart({
      id: 'moving',
      length: 1,
      width: 0.25,
      thickness: 0.25,
      position: { x: 0, y: 2, z: 0 },
      ...(shape === 'round pin'
        ? { blankShape: 'round' as const }
        : {
            features: [
              {
                id: 'rebate',
                kind: 'rect_cut' as const,
                version: 1 as const,
                enabled: true,
                cutType: 'cutout' as const,
                target: { type: 'face' as const, face: 'bottom_face' as const },
                reference: { primaryFrom: 'min' as const },
                placement: { x: 0, z: 0 },
                parameters: { size: { length: 0.25, width: 0.25 }, depthMode: 'blind' as const, depth: 0.125 }
              }
            ]
          })
    });
    const wall = createTestPart({ id: 'wall', length: 0.01, width: 2, thickness: 2, position: { x: 2, y: 2, z: 0 } });
    expect(partsOverlap(moving, wall)).toBe(false);
    expect(partsOverlap({ ...moving, position: { ...moving.position, x: 2 } }, wall)).toBe(true);
    expect(partsOverlap({ ...moving, position: { ...moving.position, x: 5 } }, wall)).toBe(false);
    useProjectStore.setState({
      parts: [moving, wall],
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
    useSelectionStore.getState().selectPart(moving.id);
    useSnapStore.setState({ snapToPartsEnabled: false });
    useProjectStore.getState().moveSelectedParts({ x: 5, y: 0, z: 0 });
    expect(useProjectStore.getState().parts.find((p) => p.id === moving.id)!.position.x).toBeLessThan(1.5);
  });
  it.each([false, true])('allows axial round-pin withdrawal and reinsertion through a bore, rotated=%s', (rotated) => {
    let pin = createTestPart({
      id: 'pin',
      length: 0.75,
      width: 0.25,
      thickness: 0.25,
      blankShape: 'round',
      position: { x: 0, y: 0.375, z: 0 },
      rotation: { x: 0, y: 0, z: 90 }
    });
    let host = createTestPart({
      id: 'host',
      length: 12,
      width: 3,
      thickness: 0.75,
      position: { x: 0, y: 0.375, z: 0 },
      features: [
        {
          id: 'bore',
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
    });
    let delta = new Vector3(0, 2, 0);
    if (rotated) {
      const q = new Quaternion().setFromEuler(new Euler(0.3, 0.7, -0.4));
      [pin, host] = [pin, host].map((part) => {
        const rotation = new Euler().setFromQuaternion(
          q
            .clone()
            .multiply(
              new Quaternion().setFromEuler(
                new Euler(
                  MathUtils.degToRad(part.rotation.x),
                  MathUtils.degToRad(part.rotation.y),
                  MathUtils.degToRad(part.rotation.z)
                )
              )
            )
        );
        const position = new Vector3(part.position.x, part.position.y, part.position.z).applyQuaternion(q);
        return {
          ...part,
          position: { x: position.x, y: position.y, z: position.z },
          rotation: {
            x: MathUtils.radToDeg(rotation.x),
            y: MathUtils.radToDeg(rotation.y),
            z: MathUtils.radToDeg(rotation.z)
          }
        };
      });
      delta.applyQuaternion(q);
    }
    expect(resolveSafeNudgeTranslationDelta([pin, host], new Set([pin.id]), delta)).toMatchObject({
      x: delta.x,
      y: delta.y,
      z: delta.z
    });
    pin.position = { x: pin.position.x + delta.x, y: pin.position.y + delta.y, z: pin.position.z + delta.z };
    delta.negate();
    expect(resolveSafeNudgeTranslationDelta([pin, host], new Set([pin.id]), delta)).toMatchObject({
      x: delta.x,
      y: delta.y,
      z: delta.z
    });
  });
  it('preserves a moving through-slot instead of sweeping its filled whole-blank hull', () => {
    const moving = createTestPart({
      id: 'slotted',
      length: 4,
      width: 1,
      thickness: 1,
      position: { x: 0, y: 2, z: 0 },
      features: [
        {
          id: 'slot',
          kind: 'rect_cut',
          version: 1,
          enabled: true,
          cutType: 'cutout',
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'min' },
          placement: { x: 1.75, z: 0 },
          parameters: { size: { length: 0.5, width: 1 }, depthMode: 'through' }
        }
      ]
    });
    const fixed = createTestPart({
      id: 'peg',
      length: 0.25,
      width: 0.25,
      thickness: 2,
      position: { x: 0, y: 2, z: 0 }
    });
    const delta = { x: 0, y: 0, z: 5 };
    expect(partsOverlap(moving, fixed)).toBe(false);
    expect(partsOverlap({ ...moving, features: [] }, fixed)).toBe(true);
    expect(resolveSafeNudgeTranslationDelta([moving, fixed], new Set([moving.id]), delta)).toEqual(delta);
  });
  it('rejects distant pairs before material sweep construction', () => {
    const moving = createTestPart({ id: 'pin', blankShape: 'round', length: 1, width: 0.25, thickness: 0.25 });
    const distant = Array.from({ length: 100 }, (_, index) =>
      createTestPart({ id: `far-${index}`, position: { x: 1000 + index * 20, y: 0, z: 0 } })
    );
    const materialTest = vi.spyOn(materialGeometry, 'partsOverlapInMaterial');
    try {
      expect(
        resolveSafeNudgeTranslationDelta([moving, ...distant], new Set([moving.id]), { x: 5, y: 0, z: 0 })
      ).toEqual({ x: 5, y: 0, z: 0 });
      expect(materialTest).not.toHaveBeenCalled();
    } finally {
      materialTest.mockRestore();
    }
  });
});
