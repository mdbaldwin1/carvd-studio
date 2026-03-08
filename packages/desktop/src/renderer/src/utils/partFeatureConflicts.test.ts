import { describe, expect, it } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import { getPartFeatureConflicts } from './partFeatureConflicts';

describe('getPartFeatureConflicts', () => {
  it('flags duplicate enabled end cuts on the same end', () => {
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
          parameters: { horizontalAngle: 45 }
        },
        {
          id: 'feature-2',
          kind: 'end_cut',
          version: 1,
          enabled: true,
          target: { type: 'face', face: 'left_end' },
          reference: { primaryFrom: 'min' },
          cutType: 'bevel',
          lengthMode: 'centerline',
          parameters: { horizontalAngle: 0, verticalAngle: 15 }
        }
      ]
    });

    const conflicts = getPartFeatureConflicts(part.features ?? [], part);
    expect(conflicts.some((conflict) => conflict.featureId === 'feature-1' && conflict.severity === 'error')).toBe(
      true
    );
  });

  it('flags overlapping rectangular removals', () => {
    const part = createTestPart({
      features: [
        {
          id: 'feature-1',
          kind: 'rect_cut',
          version: 1,
          enabled: true,
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'min' },
          cutType: 'cutout',
          parameters: {
            size: { length: 4, width: 4 },
            depthMode: 'through'
          },
          placement: { x: 1, z: 1 }
        },
        {
          id: 'feature-2',
          kind: 'rect_cut',
          version: 1,
          enabled: true,
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'min' },
          cutType: 'cutout',
          parameters: {
            size: { length: 4, width: 4 },
            depthMode: 'through'
          },
          placement: { x: 3, z: 3 }
        }
      ]
    });

    const conflicts = getPartFeatureConflicts(part.features ?? [], part);
    expect(conflicts.some((conflict) => conflict.featureId === 'feature-1' && conflict.severity === 'warning')).toBe(
      true
    );
  });

  it('flags later removals that start inside previously removed material', () => {
    const part = createTestPart({
      width: 8,
      features: [
        {
          id: 'feature-1',
          kind: 'rect_cut',
          version: 1,
          enabled: true,
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'min' },
          cutType: 'cutout',
          parameters: {
            size: { length: 6, width: 4 },
            depthMode: 'through'
          },
          placement: { x: 1, z: 2 }
        },
        {
          id: 'feature-2',
          kind: 'rect_cut',
          version: 1,
          enabled: true,
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'min' },
          cutType: 'mortise',
          parameters: {
            size: { length: 2, width: 1 },
            depthMode: 'blind',
            depth: 0.25
          },
          placement: { x: 2, z: 3 }
        }
      ]
    });

    const conflicts = getPartFeatureConflicts(part.features ?? [], part);
    expect(
      conflicts.some(
        (conflict) =>
          conflict.featureId === 'feature-2' && conflict.code === 'rect_consumed' && conflict.severity === 'error'
      )
    ).toBe(true);
  });

  it('flags anchor-dependent removals when a prior cut removes their starting material', () => {
    const part = createTestPart({
      width: 8,
      features: [
        {
          id: 'feature-1',
          kind: 'rect_cut',
          version: 1,
          enabled: true,
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'min' },
          cutType: 'cutout',
          parameters: {
            size: { length: 4, width: 1 },
            depthMode: 'through'
          },
          placement: { x: 0, z: 0 }
        },
        {
          id: 'feature-2',
          kind: 'rect_cut',
          version: 1,
          enabled: true,
          target: { type: 'edge', edge: 'top_front_edge' },
          reference: { primaryFrom: 'min' },
          cutType: 'rabbet',
          parameters: {
            size: { length: 0.5, width: 0.5 },
            depthMode: 'blind',
            depth: 0.25
          },
          placement: { x: 0, z: 0 }
        }
      ]
    });

    const conflicts = getPartFeatureConflicts(part.features ?? [], part);
    expect(
      conflicts.some(
        (conflict) =>
          conflict.featureId === 'feature-2' && conflict.code === 'rect_anchor_removed' && conflict.severity === 'error'
      )
    ).toBe(true);
  });

  it('does not escalate blind top-face overlaps against bottom-face work', () => {
    const part = createTestPart({
      width: 8,
      features: [
        {
          id: 'feature-1',
          kind: 'rect_cut',
          version: 1,
          enabled: true,
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'min' },
          cutType: 'mortise',
          parameters: {
            size: { length: 4, width: 2 },
            depthMode: 'blind',
            depth: 0.25
          },
          placement: { x: 1, z: 2 }
        },
        {
          id: 'feature-2',
          kind: 'rect_cut',
          version: 1,
          enabled: true,
          target: { type: 'face', face: 'bottom_face' },
          reference: { primaryFrom: 'min' },
          cutType: 'mortise',
          parameters: {
            size: { length: 4, width: 2 },
            depthMode: 'blind',
            depth: 0.25
          },
          placement: { x: 1, z: 2 }
        }
      ]
    });

    const conflicts = getPartFeatureConflicts(part.features ?? [], part);
    expect(
      conflicts.every((conflict) => conflict.code !== 'rect_consumed' && conflict.code !== 'rect_anchor_removed')
    ).toBe(true);
  });
});
