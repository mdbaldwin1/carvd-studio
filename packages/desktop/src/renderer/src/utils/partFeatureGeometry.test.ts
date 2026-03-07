import { afterEach, describe, expect, it, vi } from 'vitest';

vi.unmock('three');
import {
  clearPartGeometryCache,
  getPartRenderGeometry,
  getPartWorldAABB,
  getPartWorldHalfHeight,
  hasRenderablePartFeatures
} from './partFeatureGeometry';
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

  it('slopes the end plane across thickness for bevel cuts', () => {
    const geometry = getPartRenderGeometry(
      createTestPart({
        length: 24,
        width: 4,
        thickness: 1,
        features: [
          {
            id: 'feature-1',
            kind: 'end_cut',
            version: 1,
            enabled: true,
            target: { type: 'face', face: 'left_end' },
            reference: { primaryFrom: 'min' },
            cutType: 'bevel',
            lengthMode: 'long_point',
            parameters: { horizontalAngle: 0, verticalAngle: 45 }
          }
        ]
      })
    );

    const positions = geometry.getAttribute('position');
    let topLeftMinX = Infinity;
    let bottomLeftMinX = Infinity;

    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      if (x > 0) continue;
      if (y > 0.49) topLeftMinX = Math.min(topLeftMinX, x);
      if (y < -0.49) bottomLeftMinX = Math.min(bottomLeftMinX, x);
    }

    expect(bottomLeftMinX).toBeCloseTo(-12, 3);
    expect(topLeftMinX).toBeCloseTo(-11, 3);
  });

  it('combines mitre and bevel shaping for compound cuts', () => {
    const geometry = getPartRenderGeometry(
      createTestPart({
        length: 24,
        width: 4,
        thickness: 1,
        features: [
          {
            id: 'feature-1',
            kind: 'end_cut',
            version: 1,
            enabled: true,
            target: { type: 'face', face: 'left_end' },
            reference: { primaryFrom: 'min' },
            cutType: 'compound',
            lengthMode: 'long_point',
            parameters: { horizontalAngle: 45, verticalAngle: 45 }
          }
        ]
      })
    );

    const positions = geometry.getAttribute('position');
    let leftmostX = Infinity;
    let nearestZeroLeftX = -Infinity;

    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      if (x > 0) continue;
      leftmostX = Math.min(leftmostX, x);
      nearestZeroLeftX = Math.max(nearestZeroLeftX, x);
    }

    expect(leftmostX).toBeCloseTo(-12, 3);
    expect(nearestZeroLeftX).toBeCloseTo(-8, 3);
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

  it('returns feature-aware world bounds for a corner notch', () => {
    const bounds = getPartWorldAABB(
      createTestPart({
        position: { x: 10, y: 2, z: -3 },
        features: [
          {
            id: 'feature-1',
            kind: 'rect_cut',
            version: 1,
            enabled: true,
            target: { type: 'corner', corner: 'front_bottom_left_corner' },
            reference: { primaryFrom: 'min', secondaryFrom: 'min' },
            cutType: 'corner_notch',
            parameters: {
              size: { length: 2, width: 2 },
              depthMode: 'through'
            },
            placement: { x: 0, z: 0 }
          }
        ]
      })
    );

    expect(bounds.minX).toBeCloseTo(-2);
    expect(bounds.maxX).toBeCloseTo(22);
    expect(bounds.minZ).toBeCloseTo(-9);
    expect(bounds.maxZ).toBeCloseTo(3);
  });

  it('renders blind top-face cutouts as recessed pockets', () => {
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
              size: { length: 4, width: 3 },
              depthMode: 'blind',
              depth: 0.25
            },
            placement: { x: 2, z: 2 }
          }
        ]
      })
    );

    const positions = geometry.getAttribute('position');
    const positiveYLevels = new Set<number>();

    for (let i = 0; i < positions.count; i += 1) {
      const y = positions.getY(i);
      if (y > 0) positiveYLevels.add(Number(y.toFixed(3)));
    }

    expect([...positiveYLevels]).toContain(0.125);
    expect([...positiveYLevels]).toContain(0.375);
  });

  it('renders blind top-edge notches as layered recesses', () => {
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
            target: { type: 'edge', edge: 'top_front_edge' },
            reference: { primaryFrom: 'min' },
            cutType: 'edge_notch',
            parameters: {
              size: { length: 4, width: 2 },
              depthMode: 'blind',
              depth: 0.25
            },
            placement: { x: 3, z: 0 }
          }
        ]
      })
    );

    const positions = geometry.getAttribute('position');
    const positiveYLevels = new Set<number>();

    for (let i = 0; i < positions.count; i += 1) {
      const y = positions.getY(i);
      if (y > 0) positiveYLevels.add(Number(y.toFixed(3)));
    }

    expect([...positiveYLevels]).toContain(0.125);
    expect([...positiveYLevels]).toContain(0.375);
  });

  it('uses rendered geometry for ground-contact half-height', () => {
    const halfHeight = getPartWorldHalfHeight(
      createTestPart({
        rotation: { x: 35, y: 20, z: 0 },
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

    expect(halfHeight).toBeGreaterThan(0);
  });
});
