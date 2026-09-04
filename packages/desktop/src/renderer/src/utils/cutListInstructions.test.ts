import { describe, expect, it } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import { getInstructionFabricationLines, groupCutInstructions } from './cutListInstructions';

describe('cutListInstructions', () => {
  it('includes round-cut fabrication details and pattern spacing', () => {
    const part = createTestPart({
      features: [
        {
          id: 'feature-1',
          kind: 'circular_cut',
          version: 1,
          enabled: true,
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'min', secondaryFrom: 'min' },
          cutType: 'countersink',
          placement: { primary: 2, secondary: 1, rotation: 0 },
          parameters: {
            diameter: 0.25,
            depthMode: 'blind',
            depth: 0.5,
            tilt: 15,
            direction: 90,
            countersink: { majorDiameter: 0.5, includedAngle: 82 }
          },
          pattern: { type: 'linear', count: 4, spacing: 2, direction: 0 }
        }
      ]
    });
    const instruction = {
      partId: part.id,
      partName: part.name,
      cutLength: part.length,
      cutWidth: part.width,
      thickness: part.thickness,
      stockId: 'stock-1',
      stockName: 'Maple',
      grainSensitive: false,
      grainDirection: 'length' as const,
      isGlueUp: false,
      quantity: 1,
      features: part.features,
      notes: ''
    };

    expect(getInstructionFabricationLines(instruction, 'imperial')[0]).toBe(
      '1. 4-hole Linear Pattern on Top Face · 1/4" diameter · 2" spacing · 1/2" deep · 15° tilt toward 90°'
    );
  });

  it('does not group instructions whose circular patterns differ', () => {
    const base = {
      partId: 'part-1',
      partName: 'Rail',
      cutLength: 24,
      cutWidth: 4,
      thickness: 0.75,
      stockId: 'stock-1',
      stockName: 'Maple',
      grainSensitive: false,
      grainDirection: 'length' as const,
      isGlueUp: false,
      quantity: 1,
      notes: ''
    };
    const feature = {
      id: 'feature-1',
      kind: 'circular_cut' as const,
      version: 1 as const,
      enabled: true,
      target: { type: 'face' as const, face: 'top_face' as const },
      reference: { primaryFrom: 'min' as const, secondaryFrom: 'min' as const },
      cutType: 'round_hole' as const,
      placement: { primary: 1, secondary: 1, rotation: 0 },
      parameters: { diameter: 0.25, depthMode: 'through' as const, tilt: 0, direction: 0 }
    };

    const groups = groupCutInstructions([
      { ...base, features: [{ ...feature, pattern: { type: 'linear' as const, count: 2, spacing: 2, direction: 0 } }] },
      {
        ...base,
        partId: 'part-2',
        features: [
          { ...feature, id: 'feature-2', pattern: { type: 'linear' as const, count: 3, spacing: 2, direction: 0 } }
        ]
      }
    ]);
    expect(groups).toHaveLength(2);
  });

  it('preserves enabled feature order in numbered fabrication lines', () => {
    const part = createTestPart({
      features: [
        {
          id: 'feature-1',
          kind: 'end_cut',
          version: 1,
          enabled: true,
          label: 'Left mitre',
          target: { type: 'face', face: 'left_end' },
          reference: { primaryFrom: 'min' },
          cutType: 'mitre',
          lengthMode: 'long_point',
          parameters: { horizontalAngle: 45 }
        },
        {
          id: 'feature-2',
          kind: 'rect_cut',
          version: 1,
          enabled: true,
          label: 'Top cutout',
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'min' },
          cutType: 'cutout',
          parameters: {
            size: { length: 2, width: 1 },
            depthMode: 'through'
          },
          placement: { x: 2, z: 1 }
        }
      ]
    });

    const lines = getInstructionFabricationLines(
      {
        partId: part.id,
        partName: part.name,
        cutLength: part.length,
        cutWidth: part.width,
        thickness: part.thickness,
        stockId: 'stock-1',
        stockName: 'Maple',
        grainSensitive: false,
        grainDirection: 'length',
        isGlueUp: false,
        quantity: 1,
        features: part.features,
        notes: ''
      },
      'imperial'
    );

    expect(lines).toEqual(['1. Left mitre', '2. Top cutout']);
  });

  it('uses woodworking labels for dado and rabbet fabrication lines', () => {
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
          cutType: 'dado',
          parameters: {
            size: { length: 0.75, width: 8 },
            depthMode: 'blind',
            depth: 0.375
          },
          placement: { x: 4, z: 0 }
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
            size: { length: 24, width: 0.5 },
            depthMode: 'blind',
            depth: 0.25
          },
          placement: { x: 0, z: 0 }
        }
      ]
    });

    const lines = getInstructionFabricationLines(
      {
        partId: part.id,
        partName: part.name,
        cutLength: part.length,
        cutWidth: part.width,
        thickness: part.thickness,
        stockId: 'stock-1',
        stockName: 'Maple',
        grainSensitive: false,
        grainDirection: 'length',
        isGlueUp: false,
        quantity: 1,
        features: part.features,
        notes: ''
      },
      'imperial'
    );

    expect(lines[0]).toContain('Dado on Top Face');
    expect(lines[1]).toContain('Rabbet on Top-Front Edge');
  });

  it('uses woodworking labels for groove and mortise fabrication lines', () => {
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
          cutType: 'groove',
          parameters: {
            size: { length: 24, width: 0.25 },
            depthMode: 'blind',
            depth: 0.375
          },
          placement: { x: 0, z: 2 }
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
            size: { length: 2, width: 0.75 },
            depthMode: 'blind',
            depth: 0.25
          },
          placement: { x: 5, z: 1 }
        }
      ]
    });

    const lines = getInstructionFabricationLines(
      {
        partId: part.id,
        partName: part.name,
        cutLength: part.length,
        cutWidth: part.width,
        thickness: part.thickness,
        stockId: 'stock-1',
        stockName: 'Maple',
        grainSensitive: false,
        grainDirection: 'length',
        isGlueUp: false,
        quantity: 1,
        features: part.features,
        notes: ''
      },
      'imperial'
    );

    expect(lines[0]).toContain('Groove on Top Face');
    expect(lines[1]).toContain('Mortise on Top Face');
  });

  it('uses woodworking labels for stopped dado and stopped groove fabrication lines', () => {
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
          cutType: 'stopped_dado',
          parameters: {
            size: { length: 3, width: 8 },
            depthMode: 'blind',
            depth: 0.375
          },
          placement: { x: 4, z: 0 }
        },
        {
          id: 'feature-2',
          kind: 'rect_cut',
          version: 1,
          enabled: true,
          target: { type: 'face', face: 'bottom_face' },
          reference: { primaryFrom: 'min' },
          cutType: 'stopped_groove',
          parameters: {
            size: { length: 5, width: 0.25 },
            depthMode: 'blind',
            depth: 0.25
          },
          placement: { x: 3, z: 1 }
        }
      ]
    });

    const lines = getInstructionFabricationLines(
      {
        partId: part.id,
        partName: part.name,
        cutLength: part.length,
        cutWidth: part.width,
        thickness: part.thickness,
        stockId: 'stock-1',
        stockName: 'Maple',
        grainSensitive: false,
        grainDirection: 'length',
        isGlueUp: false,
        quantity: 1,
        features: part.features,
        notes: ''
      },
      'imperial'
    );

    expect(lines[0]).toContain('Stopped Dado on Top Face');
    expect(lines[1]).toContain('Stopped Groove on Bottom Face');
  });
});
