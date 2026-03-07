import { afterEach, describe, expect, it, vi } from 'vitest';

vi.unmock('three');
import { clearPartGeometryCache, getPartRenderGeometry, hasRenderablePartFeatures } from './partFeatureGeometry';
import { createTestPart } from '../../../../tests/helpers/factories';

describe('partFeatureGeometry', () => {
  afterEach(() => {
    clearPartGeometryCache();
  });

  it('detects when a part needs the feature geometry path', () => {
    expect(hasRenderablePartFeatures(createTestPart())).toBe(false);
    expect(
      hasRenderablePartFeatures(
        createTestPart({
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
            }
          ]
        })
      )
    ).toBe(true);
  });

  it('caches identical feature geometries', () => {
    const part = createTestPart({
      features: [
        {
          id: 'feature-1',
          kind: 'end_cut',
          version: 1,
          enabled: true,
          target: { type: 'face', face: 'right_end' },
          reference: { primaryFrom: 'max' },
          cutType: 'mitre',
          lengthMode: 'long_point',
          parameters: { horizontalAngle: 30 }
        }
      ]
    });

    const first = getPartRenderGeometry(part);
    const second = getPartRenderGeometry(part);
    expect(second).toBe(first);
  });

  it('shortens the profile on mitred ends', () => {
    const geometry = getPartRenderGeometry(
      createTestPart({
        length: 24,
        width: 4,
        thickness: 0.75,
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
          }
        ]
      })
    );

    geometry.computeBoundingBox();
    expect(geometry.boundingBox).not.toBeNull();
    expect(geometry.boundingBox!.max.x).toBeCloseTo(12);
    expect(geometry.boundingBox!.min.x).toBeCloseTo(-12);
  });

  it('creates through-holes for top-face cutouts', () => {
    const geometry = getPartRenderGeometry(
      createTestPart({
        length: 24,
        width: 12,
        thickness: 0.75,
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
              size: { length: 3, width: 2 },
              depthMode: 'through'
            },
            placement: { x: 4, z: 3 }
          }
        ]
      })
    );

    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.max.y).toBeCloseTo(0.375);
    expect(geometry.boundingBox!.min.y).toBeCloseTo(-0.375);
    expect(geometry.getAttribute('position').count).toBeGreaterThan(0);
  });
});
