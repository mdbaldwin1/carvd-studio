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
});
