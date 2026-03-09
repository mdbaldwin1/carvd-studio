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

  it('moves a mitred end when the stored reference length changes', () => {
    const fullLengthReference = getPartRenderGeometry(
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
            parameters: {
              horizontalAngle: 45,
              reference: {
                mode: 'long_point',
                value: 24
              }
            }
          }
        ]
      })
    );

    const shorterReference = getPartRenderGeometry(
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
            parameters: {
              horizontalAngle: 45,
              reference: {
                mode: 'long_point',
                value: 20
              }
            }
          }
        ]
      })
    );

    fullLengthReference.computeBoundingBox();
    shorterReference.computeBoundingBox();

    expect(fullLengthReference.boundingBox!.min.x).toBeCloseTo(-12);
    expect(shorterReference.boundingBox!.min.x).toBeCloseTo(-8);
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

  it('uses list order when multiple end cuts target the same end in preview geometry', () => {
    const partA = createTestPart({
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
          parameters: { horizontalAngle: 0, verticalAngle: 10 }
        }
      ]
    });

    const partB = createTestPart({
      ...partA,
      features: [...(partA.features ?? [])].reverse()
    });

    const geometryA = getPartRenderGeometry(partA);
    const geometryB = getPartRenderGeometry(partB);
    const positionsA = geometryA.getAttribute('position');
    const positionsB = geometryB.getAttribute('position');
    let topLeftMinXA = Infinity;
    let topLeftMinXB = Infinity;

    for (let i = 0; i < positionsA.count; i += 1) {
      const x = positionsA.getX(i);
      const y = positionsA.getY(i);
      if (x > 0 || y <= 0.49) continue;
      topLeftMinXA = Math.min(topLeftMinXA, x);
    }

    for (let i = 0; i < positionsB.count; i += 1) {
      const x = positionsB.getX(i);
      const y = positionsB.getY(i);
      if (x > 0 || y <= 0.49) continue;
      topLeftMinXB = Math.min(topLeftMinXB, x);
    }

    expect(topLeftMinXA).toBeLessThan(topLeftMinXB);
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

  it('renders stopped dado and stopped groove geometry through the face-cut path', () => {
    const geometry = getPartRenderGeometry(
      createTestPart({
        length: 24,
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
            cutType: 'stopped_dado',
            parameters: {
              size: { length: 3, width: 8 },
              depthMode: 'blind',
              depth: 0.25
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
              size: { length: 5, width: 0.5 },
              depthMode: 'blind',
              depth: 0.125
            },
            placement: { x: 6, z: 2 }
          }
        ]
      })
    );

    geometry.computeBoundingBox();
    expect(geometry.boundingBox).not.toBeNull();
    expect(geometry.boundingBox!.max.x).toBeCloseTo(12);
    expect(geometry.boundingBox!.min.x).toBeCloseTo(-12);
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

  it('renders dado and rabbet operations through the constrained rect-cut path', () => {
    const geometry = getPartRenderGeometry(
      createTestPart({
        length: 24,
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
            cutType: 'dado',
            parameters: {
              size: { length: 0.75, width: 1 },
              depthMode: 'blind',
              depth: 0.375
            },
            placement: { x: 6, z: 0 }
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
      })
    );

    expect(geometry.getAttribute('position').count).toBeGreaterThan(24);
    geometry.computeBoundingBox();
    expect(geometry.boundingBox?.min.x).toBeCloseTo(-12);
    expect(geometry.boundingBox?.max.x).toBeCloseTo(12);
  });

  it('renders groove and mortise operations through the constrained face-cut path', () => {
    const geometry = getPartRenderGeometry(
      createTestPart({
        length: 24,
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
            cutType: 'groove',
            parameters: {
              size: { length: 0.25, width: 0.25 },
              depthMode: 'blind',
              depth: 0.25
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
            placement: { x: 4, z: 1 }
          }
        ]
      })
    );

    expect(geometry.getAttribute('position').count).toBeGreaterThan(24);
    geometry.computeBoundingBox();
    expect(geometry.boundingBox?.min.x).toBeCloseTo(-12);
    expect(geometry.boundingBox?.max.x).toBeCloseTo(12);
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
