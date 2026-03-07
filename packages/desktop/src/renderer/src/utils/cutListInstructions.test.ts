import { describe, expect, it } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import { getInstructionFabricationLines } from './cutListInstructions';

describe('cutListInstructions', () => {
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
});
