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

  it('flags opposing-face blind cuts that intersect through the thickness', () => {
    const part = createTestPart({
      width: 8,
      thickness: 0.75,
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
            depth: 0.5
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
            depth: 0.4
          },
          placement: { x: 1, z: 2 }
        }
      ]
    });

    const conflicts = getPartFeatureConflicts(part.features ?? [], part);
    expect(
      conflicts.some(
        (conflict) =>
          conflict.featureId === 'feature-2' &&
          conflict.code === 'rect_depth_intersection' &&
          conflict.severity === 'error'
      )
    ).toBe(true);
  });

  it('uses authored operation numbering even when disabled cuts exist earlier in the list', () => {
    const part = createTestPart({
      features: [
        {
          id: 'feature-0',
          kind: 'rect_cut',
          version: 1,
          enabled: false,
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'min' },
          cutType: 'cutout',
          parameters: {
            size: { length: 1, width: 1 },
            depthMode: 'through'
          },
          placement: { x: 0, z: 0 }
        },
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
          lengthMode: 'long_point',
          parameters: { horizontalAngle: 0, verticalAngle: 15 }
        }
      ]
    });

    const conflicts = getPartFeatureConflicts(part.features ?? [], part);
    expect(conflicts[0]?.message).toContain('Operation 3');
    expect(conflicts[0]?.message).toContain('Operation 2');
  });
  const rectCut = (
    id: string,
    cutType: 'cutout' | 'corner_notch' | 'edge_notch' | 'dado' | 'mortise',
    target: { type: 'face'; face: string } | { type: 'corner'; corner: string } | { type: 'edge'; edge: string },
    parameters: Record<string, unknown>,
    placement: { x: number; z: number } = { x: 0, z: 0 }
  ) =>
    ({
      id,
      kind: 'rect_cut',
      version: 1,
      enabled: true,
      cutType,
      target,
      reference: { primaryFrom: 'min', secondaryFrom: 'min' },
      parameters,
      placement
    }) as never;

  it('detects overlap between corner notches on right/back corners', () => {
    const part = createTestPart({ length: 24, width: 12, thickness: 1 });
    const conflicts = getPartFeatureConflicts(
      [
        rectCut(
          'n1',
          'corner_notch',
          { type: 'corner', corner: 'back_right_corner' },
          {
            size: { length: 6, width: 6 },
            depthMode: 'through'
          }
        ),
        rectCut(
          'n2',
          'corner_notch',
          { type: 'corner', corner: 'back_right_corner' },
          {
            size: { length: 4, width: 4 },
            depthMode: 'through'
          }
        )
      ],
      part
    );
    expect(conflicts.some((c) => c.code !== 'none')).toBe(true);
    expect(conflicts[0].message).toMatch(/Operation 2/);
  });

  it('detects overlap between front and back edge notches sharing footprint', () => {
    const part = createTestPart({ length: 24, width: 6, thickness: 1 });
    const conflicts = getPartFeatureConflicts(
      [
        rectCut(
          'e1',
          'edge_notch',
          { type: 'edge', edge: 'top_back_edge' },
          { size: { length: 8, width: 4 }, depthMode: 'through' },
          { x: 4, z: 0 }
        ),
        rectCut(
          'e2',
          'edge_notch',
          { type: 'edge', edge: 'top_front_edge' },
          { size: { length: 8, width: 4 }, depthMode: 'through' },
          { x: 6, z: 0 }
        )
      ],
      part
    );
    expect(conflicts.length).toBeGreaterThan(0);
  });

  it('detects overlap between left and right edge notches meeting mid-board', () => {
    const part = createTestPart({ length: 10, width: 12, thickness: 1 });
    const conflicts = getPartFeatureConflicts(
      [
        rectCut(
          'e1',
          'edge_notch',
          { type: 'edge', edge: 'top_left_edge' },
          { size: { length: 7, width: 5 }, depthMode: 'through' },
          { x: 0, z: 3 }
        ),
        rectCut(
          'e2',
          'edge_notch',
          { type: 'edge', edge: 'top_right_edge' },
          { size: { length: 7, width: 5 }, depthMode: 'through' },
          { x: 0, z: 4 }
        )
      ],
      part
    );
    expect(conflicts.length).toBeGreaterThan(0);
  });

  it('treats a through cutout as reaching both faces for opposing-blind analysis', () => {
    const part = createTestPart({ length: 24, width: 12, thickness: 1 });
    const conflicts = getPartFeatureConflicts(
      [
        rectCut(
          'through-cutout',
          'cutout',
          { type: 'face', face: 'top_face' },
          { size: { length: 6, width: 4 }, depthMode: 'through' },
          { x: 4, z: 4 }
        ),
        rectCut(
          'bottom-mortise',
          'mortise',
          { type: 'face', face: 'bottom_face' },
          { size: { length: 4, width: 3 }, depthMode: 'blind', depth: 0.4 },
          { x: 5, z: 4.5 }
        )
      ],
      part
    );
    expect(conflicts.length).toBeGreaterThan(0);
  });

  it('does not flag blind cuts on opposite faces whose depths do not meet', () => {
    const part = createTestPart({ length: 24, width: 12, thickness: 2 });
    const conflicts = getPartFeatureConflicts(
      [
        rectCut(
          'top-pocket',
          'mortise',
          { type: 'face', face: 'top_face' },
          { size: { length: 4, width: 3 }, depthMode: 'blind', depth: 0.5 },
          { x: 4, z: 4 }
        ),
        rectCut(
          'bottom-pocket',
          'mortise',
          { type: 'face', face: 'bottom_face' },
          { size: { length: 4, width: 3 }, depthMode: 'blind', depth: 0.5 },
          { x: 4, z: 4 }
        )
      ],
      part
    );
    expect(conflicts.every((c) => c.code !== 'rect_depth_intersection')).toBe(true);
  });
  it('flags opposing side-face pockets whose depths meet', () => {
    const part = createTestPart({ length: 20, width: 2, thickness: 2 });
    const pocket = (id: string, face: 'front_face' | 'back_face', depth: number) =>
      rectCut(
        id,
        'mortise',
        { type: 'face', face },
        {
          size: { length: 3, width: 1 },
          depthMode: 'blind',
          depth
        },
        { x: 4, z: 0.5 }
      );

    const meeting = getPartFeatureConflicts([pocket('f', 'front_face', 1.2), pocket('b', 'back_face', 1.2)], part);
    expect(meeting.some((c) => c.code === 'rect_depth_intersection' && c.severity === 'error')).toBe(true);

    const clearing = getPartFeatureConflicts([pocket('f', 'front_face', 0.5), pocket('b', 'back_face', 0.5)], part);
    expect(clearing.every((c) => c.code !== 'rect_depth_intersection')).toBe(true);
  });
});
