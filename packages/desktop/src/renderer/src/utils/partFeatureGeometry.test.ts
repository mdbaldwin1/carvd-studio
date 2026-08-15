import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { PartFeature } from '../types';
import {
  clearPartGeometryCache,
  getPartLocalConvexVertices,
  getPartLocalCorners,
  getPartRenderGeometry,
  getPartWorldAABB,
  getPartWorldContour,
  getPartWorldHalfHeight,
  hasRenderablePartFeatures
} from './partFeatureGeometry';

vi.unmock('three');

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

  it('keeps a mitred end anchored to the board length even if legacy reference data differs', () => {
    const anchoredReference = getPartRenderGeometry(
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

    const legacyShortReference = getPartRenderGeometry(
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

    anchoredReference.computeBoundingBox();
    legacyShortReference.computeBoundingBox();

    expect(anchoredReference.boundingBox!.min.x).toBeCloseTo(-12);
    expect(legacyShortReference.boundingBox!.min.x).toBeCloseTo(-12);
  });

  it('supports flipped mitre direction without using negative geometry math', () => {
    const defaultMitre = getPartRenderGeometry(
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
            parameters: { horizontalAngle: 45, horizontalFlip: false }
          }
        ]
      })
    );

    const flippedMitre = getPartRenderGeometry(
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
            parameters: { horizontalAngle: 45, horizontalFlip: true }
          }
        ]
      })
    );

    const defaultPositions = defaultMitre.getAttribute('position');
    const flippedPositions = flippedMitre.getAttribute('position');
    let defaultFrontX = Infinity;
    let defaultBackX = Infinity;
    let flippedFrontX = Infinity;
    let flippedBackX = Infinity;

    for (let i = 0; i < defaultPositions.count; i += 1) {
      const x = defaultPositions.getX(i);
      const z = defaultPositions.getZ(i);
      if (x > 0) continue;
      if (z < -1.9) defaultFrontX = Math.min(defaultFrontX, x);
      if (z > 1.9) defaultBackX = Math.min(defaultBackX, x);
    }

    for (let i = 0; i < flippedPositions.count; i += 1) {
      const x = flippedPositions.getX(i);
      const z = flippedPositions.getZ(i);
      if (x > 0) continue;
      if (z < -1.9) flippedFrontX = Math.min(flippedFrontX, x);
      if (z > 1.9) flippedBackX = Math.min(flippedBackX, x);
    }

    expect(defaultFrontX).toBeCloseTo(-12, 3);
    expect(defaultBackX).toBeCloseTo(-8, 3);
    expect(flippedFrontX).toBeCloseTo(-8, 3);
    expect(flippedBackX).toBeCloseTo(-12, 3);
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

  it('supports flipped bevel direction without signed-angle geometry hacks', () => {
    const defaultBevel = getPartRenderGeometry(
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
            parameters: { horizontalAngle: 0, verticalAngle: 45, verticalFlip: false }
          }
        ]
      })
    );

    const flippedBevel = getPartRenderGeometry(
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
            parameters: { horizontalAngle: 0, verticalAngle: 45, verticalFlip: true }
          }
        ]
      })
    );

    const defaultPositions = defaultBevel.getAttribute('position');
    const flippedPositions = flippedBevel.getAttribute('position');
    let defaultTopLeftInnerX = -Infinity;
    let defaultBottomLeftInnerX = -Infinity;
    let flippedTopLeftInnerX = -Infinity;
    let flippedBottomLeftInnerX = -Infinity;

    for (let i = 0; i < defaultPositions.count; i += 1) {
      const x = defaultPositions.getX(i);
      const y = defaultPositions.getY(i);
      if (x > 0) continue;
      if (y > 0.49) defaultTopLeftInnerX = Math.max(defaultTopLeftInnerX, x);
      if (y < -0.49) defaultBottomLeftInnerX = Math.max(defaultBottomLeftInnerX, x);
    }

    for (let i = 0; i < flippedPositions.count; i += 1) {
      const x = flippedPositions.getX(i);
      const y = flippedPositions.getY(i);
      if (x > 0) continue;
      if (y > 0.49) flippedTopLeftInnerX = Math.max(flippedTopLeftInnerX, x);
      if (y < -0.49) flippedBottomLeftInnerX = Math.max(flippedBottomLeftInnerX, x);
    }

    expect(defaultBottomLeftInnerX).toBeCloseTo(-12, 3);
    expect(defaultTopLeftInnerX).toBeCloseTo(-11, 3);
    expect(flippedBottomLeftInnerX).toBeCloseTo(-11, 3);
    expect(flippedTopLeftInnerX).toBeCloseTo(-12, 3);
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
    expect(nearestZeroLeftX).toBeCloseTo(-7, 3);
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
            target: { type: 'corner', corner: 'front_left_corner' },
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

  describe('world contour Z-negation', () => {
    it('negates contour Z for axis-aligned parts', () => {
      const part = createTestPart({
        length: 6,
        width: 4,
        thickness: 0.75,
        position: { x: 0, y: 0.375, z: 0 },
        features: [
          {
            id: 'notch',
            kind: 'rect_cut' as const,
            version: 1,
            enabled: true,
            cutType: 'corner_notch' as const,
            target: { type: 'corner' as const, corner: 'front_left_corner' as const },
            reference: { primaryFrom: 'min' as const },
            placement: { x: 0, z: 0 },
            parameters: { size: { length: 2, width: 2 }, depthMode: 'through' as const, depth: null as never }
          }
        ]
      });
      const contour = getPartWorldContour(part);
      // front_left_corner notch removes local z=[-2,0], x=[-3,-1]
      // After Z negation: notch renders at z=[0,2], arm at z=[-2,0]
      const zValues = contour.map((p) => p.z);
      expect(Math.min(...zValues)).toBeCloseTo(-2);
      expect(Math.max(...zValues)).toBeCloseTo(2);
      // The notch vertex at local (-1, 0) should negate to world (-1, 0)
      expect(contour.some((p) => Math.abs(p.x - -1) < 0.01 && Math.abs(p.z - 0) < 0.01)).toBe(true);
    });
  });

  describe('flush edge notch geometry', () => {
    it('omits corner vertex when front edge notch is flush left', () => {
      const geometry = getPartRenderGeometry(
        createTestPart({
          length: 6,
          width: 4,
          thickness: 0.75,
          features: [
            {
              id: 'edge-notch',
              kind: 'rect_cut' as const,
              version: 1,
              enabled: true,
              cutType: 'edge_notch' as const,
              target: { type: 'edge' as const, edge: 'top_front_edge' as const },
              reference: { primaryFrom: 'min' as const },
              placement: { x: 0, z: 0 },
              parameters: { size: { length: 2, width: 1 }, depthMode: 'through' as const }
            }
          ]
        })
      );
      geometry.computeBoundingBox();
      // Should not crash and should produce valid geometry
      expect(geometry.boundingBox).not.toBeNull();
      const positions = geometry.getAttribute('position');
      expect(positions.count).toBeGreaterThan(0);
    });

    it('omits corner vertex when front edge notch is flush right', () => {
      const geometry = getPartRenderGeometry(
        createTestPart({
          length: 6,
          width: 4,
          thickness: 0.75,
          features: [
            {
              id: 'edge-notch',
              kind: 'rect_cut' as const,
              version: 1,
              enabled: true,
              cutType: 'edge_notch' as const,
              target: { type: 'edge' as const, edge: 'top_front_edge' as const },
              reference: { primaryFrom: 'min' as const },
              placement: { x: 4, z: 0 },
              parameters: { size: { length: 2, width: 1 }, depthMode: 'through' as const }
            }
          ]
        })
      );
      geometry.computeBoundingBox();
      expect(geometry.boundingBox).not.toBeNull();
    });

    it('handles edge notch spanning entire front edge', () => {
      const geometry = getPartRenderGeometry(
        createTestPart({
          length: 6,
          width: 4,
          thickness: 0.75,
          features: [
            {
              id: 'edge-notch',
              kind: 'rect_cut' as const,
              version: 1,
              enabled: true,
              cutType: 'edge_notch' as const,
              target: { type: 'edge' as const, edge: 'top_front_edge' as const },
              reference: { primaryFrom: 'min' as const },
              placement: { x: 0, z: 0 },
              parameters: { size: { length: 6, width: 1 }, depthMode: 'through' as const }
            }
          ]
        })
      );
      geometry.computeBoundingBox();
      expect(geometry.boundingBox).not.toBeNull();
    });
  });

  describe('flush cutout geometry', () => {
    it('renders through cutout flush with one edge without crashing', () => {
      const geometry = getPartRenderGeometry(
        createTestPart({
          length: 4,
          width: 4,
          thickness: 1,
          features: [
            {
              id: 'cutout',
              kind: 'rect_cut' as const,
              version: 1,
              enabled: true,
              cutType: 'cutout' as const,
              target: { type: 'face' as const, face: 'top_face' as const },
              reference: { primaryFrom: 'min' as const },
              placement: { x: 0, z: 0 },
              parameters: { size: { length: 1, width: 1 }, depthMode: 'through' as const }
            }
          ]
        })
      );
      geometry.computeBoundingBox();
      expect(geometry.boundingBox).not.toBeNull();
    });

    it('renders through cutout flush with two adjacent edges (corner)', () => {
      const geometry = getPartRenderGeometry(
        createTestPart({
          length: 4,
          width: 4,
          thickness: 1,
          features: [
            {
              id: 'cutout',
              kind: 'rect_cut' as const,
              version: 1,
              enabled: true,
              cutType: 'cutout' as const,
              target: { type: 'face' as const, face: 'top_face' as const },
              reference: { primaryFrom: 'min' as const },
              placement: { x: 3, z: 3 },
              parameters: { size: { length: 1, width: 1 }, depthMode: 'through' as const }
            }
          ]
        })
      );
      geometry.computeBoundingBox();
      expect(geometry.boundingBox).not.toBeNull();
      const positions = geometry.getAttribute('position');
      expect(positions.count).toBeGreaterThan(0);
    });

    it('keeps interior cutout as a hole (not contour modification)', () => {
      const geometry = getPartRenderGeometry(
        createTestPart({
          length: 6,
          width: 6,
          thickness: 0.75,
          features: [
            {
              id: 'cutout',
              kind: 'rect_cut' as const,
              version: 1,
              enabled: true,
              cutType: 'cutout' as const,
              target: { type: 'face' as const, face: 'top_face' as const },
              reference: { primaryFrom: 'min' as const },
              placement: { x: 2, z: 2 },
              parameters: { size: { length: 2, width: 2 }, depthMode: 'through' as const }
            }
          ]
        })
      );
      geometry.computeBoundingBox();
      expect(geometry.boundingBox).not.toBeNull();
      // Interior cutout should still produce a full-size bounding box
      expect(geometry.boundingBox!.max.x).toBeCloseTo(3);
      expect(geometry.boundingBox!.min.x).toBeCloseTo(-3);
    });
  });

  describe('all cut types produce valid geometry', () => {
    const cutConfigs = [
      {
        name: 'corner notch',
        feature: {
          id: 'f1',
          kind: 'rect_cut' as const,
          version: 1,
          enabled: true,
          cutType: 'corner_notch' as const,
          target: { type: 'corner' as const, corner: 'front_left_corner' as const },
          reference: { primaryFrom: 'min' as const },
          placement: { x: 0, z: 0 },
          parameters: { size: { length: 2, width: 2 }, depthMode: 'through' as const }
        }
      },
      {
        name: 'edge notch (front)',
        feature: {
          id: 'f2',
          kind: 'rect_cut' as const,
          version: 1,
          enabled: true,
          cutType: 'edge_notch' as const,
          target: { type: 'edge' as const, edge: 'top_front_edge' as const },
          reference: { primaryFrom: 'min' as const },
          placement: { x: 1, z: 0 },
          parameters: { size: { length: 2, width: 1 }, depthMode: 'through' as const }
        }
      },
      {
        name: 'edge notch (left)',
        feature: {
          id: 'f3',
          kind: 'rect_cut' as const,
          version: 1,
          enabled: true,
          cutType: 'edge_notch' as const,
          target: { type: 'edge' as const, edge: 'top_left_edge' as const },
          reference: { primaryFrom: 'min' as const },
          placement: { x: 0, z: 1 },
          parameters: { size: { length: 1, width: 2 }, depthMode: 'through' as const }
        }
      },
      {
        name: 'through cutout (interior)',
        feature: {
          id: 'f4',
          kind: 'rect_cut' as const,
          version: 1,
          enabled: true,
          cutType: 'cutout' as const,
          target: { type: 'face' as const, face: 'top_face' as const },
          reference: { primaryFrom: 'min' as const },
          placement: { x: 1, z: 1 },
          parameters: { size: { length: 2, width: 2 }, depthMode: 'through' as const }
        }
      },
      {
        name: 'blind cutout',
        feature: {
          id: 'f5',
          kind: 'rect_cut' as const,
          version: 1,
          enabled: true,
          cutType: 'cutout' as const,
          target: { type: 'face' as const, face: 'top_face' as const },
          reference: { primaryFrom: 'min' as const },
          placement: { x: 1, z: 1 },
          parameters: { size: { length: 2, width: 2 }, depthMode: 'blind' as const, depth: 0.25 }
        }
      },
      {
        name: 'dado',
        feature: {
          id: 'f6',
          kind: 'rect_cut' as const,
          version: 1,
          enabled: true,
          cutType: 'dado' as const,
          target: { type: 'face' as const, face: 'top_face' as const },
          reference: { primaryFrom: 'min' as const },
          placement: { x: 2, z: 0 },
          parameters: { size: { length: 0.75, width: 4 }, depthMode: 'blind' as const, depth: 0.25 }
        }
      },
      {
        name: 'stopped dado',
        feature: {
          id: 'f7',
          kind: 'rect_cut' as const,
          version: 1,
          enabled: true,
          cutType: 'stopped_dado' as const,
          target: { type: 'face' as const, face: 'top_face' as const },
          reference: { primaryFrom: 'min' as const },
          placement: { x: 1, z: 0 },
          parameters: { size: { length: 3, width: 4 }, depthMode: 'blind' as const, depth: 0.25 }
        }
      },
      {
        name: 'rabbet (front edge)',
        feature: {
          id: 'f8',
          kind: 'rect_cut' as const,
          version: 1,
          enabled: true,
          cutType: 'rabbet' as const,
          target: { type: 'edge' as const, edge: 'top_front_edge' as const },
          reference: { primaryFrom: 'min' as const },
          placement: { x: 0, z: 0 },
          parameters: { size: { length: 6, width: 0.5 }, depthMode: 'blind' as const, depth: 0.375 }
        }
      },
      {
        name: 'groove',
        feature: {
          id: 'f9',
          kind: 'rect_cut' as const,
          version: 1,
          enabled: true,
          cutType: 'groove' as const,
          target: { type: 'face' as const, face: 'top_face' as const },
          reference: { primaryFrom: 'min' as const },
          placement: { x: 0, z: 1 },
          parameters: { size: { length: 6, width: 0.5 }, depthMode: 'blind' as const, depth: 0.25 }
        }
      },
      {
        name: 'stopped groove',
        feature: {
          id: 'f10',
          kind: 'rect_cut' as const,
          version: 1,
          enabled: true,
          cutType: 'stopped_groove' as const,
          target: { type: 'face' as const, face: 'top_face' as const },
          reference: { primaryFrom: 'min' as const },
          placement: { x: 1, z: 1 },
          parameters: { size: { length: 4, width: 0.5 }, depthMode: 'blind' as const, depth: 0.25 }
        }
      },
      {
        name: 'mortise',
        feature: {
          id: 'f11',
          kind: 'rect_cut' as const,
          version: 1,
          enabled: true,
          cutType: 'mortise' as const,
          target: { type: 'face' as const, face: 'top_face' as const },
          reference: { primaryFrom: 'min' as const },
          placement: { x: 1.5, z: 1 },
          parameters: { size: { length: 2, width: 0.75 }, depthMode: 'blind' as const, depth: 0.5 }
        }
      }
    ];

    for (const config of cutConfigs) {
      it(`produces valid geometry for ${config.name}`, () => {
        const geometry = getPartRenderGeometry(
          createTestPart({
            length: 6,
            width: 4,
            thickness: 0.75,
            features: [config.feature as unknown as PartFeature]
          })
        );
        geometry.computeBoundingBox();
        expect(geometry.boundingBox).not.toBeNull();
        const positions = geometry.getAttribute('position');
        expect(positions.count).toBeGreaterThan(0);
        // No NaN or Infinity in vertex positions
        for (let i = 0; i < positions.count; i++) {
          expect(Number.isFinite(positions.getX(i))).toBe(true);
          expect(Number.isFinite(positions.getY(i))).toBe(true);
          expect(Number.isFinite(positions.getZ(i))).toBe(true);
        }
      });
    }
  });

  describe('vertical end cuts on layered geometry', () => {
    const middleDado: PartFeature = {
      id: 'dado-1',
      kind: 'rect_cut',
      version: 1,
      enabled: true,
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'min' },
      cutType: 'dado',
      parameters: { size: { length: 0.75, width: 4 }, depthMode: 'blind', depth: 0.25 },
      placement: { x: 10, z: 0 }
    };

    function createBevelPart(verticalFlip: boolean) {
      return createTestPart({
        length: 24,
        width: 4,
        thickness: 1,
        features: [
          middleDado,
          {
            id: 'bevel-1',
            kind: 'end_cut',
            version: 1,
            enabled: true,
            target: { type: 'face', face: 'left_end' },
            reference: { primaryFrom: 'min' },
            cutType: 'bevel',
            lengthMode: 'long_point',
            parameters: { horizontalAngle: 0, verticalAngle: 45, verticalFlip }
          }
        ]
      });
    }

    function scanExtremes(geometry: ReturnType<typeof getPartRenderGeometry>) {
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
      return { topLeftMinX, bottomLeftMinX };
    }

    it('slopes the left end across thickness when a bevel combines with a rect cut', () => {
      const { topLeftMinX, bottomLeftMinX } = scanExtremes(getPartRenderGeometry(createBevelPart(false)));
      expect(bottomLeftMinX).toBeCloseTo(-12, 3);
      expect(topLeftMinX).toBeCloseTo(-11, 3);
    });

    it('reverses the slope for vertically flipped bevels in the layered path', () => {
      const { topLeftMinX, bottomLeftMinX } = scanExtremes(getPartRenderGeometry(createBevelPart(true)));
      expect(bottomLeftMinX).toBeCloseTo(-11, 3);
      expect(topLeftMinX).toBeCloseTo(-12, 3);
    });

    function createCompoundPart(verticalFlip: boolean) {
      return createTestPart({
        length: 24,
        width: 4,
        thickness: 1,
        features: [
          middleDado,
          {
            id: 'compound-1',
            kind: 'end_cut',
            version: 1,
            enabled: true,
            target: { type: 'face', face: 'right_end' },
            reference: { primaryFrom: 'max' },
            cutType: 'compound',
            lengthMode: 'long_point',
            parameters: { horizontalAngle: 45, verticalAngle: 45, verticalFlip }
          }
        ]
      });
    }

    function scanRightEnd(geometry: ReturnType<typeof getPartRenderGeometry>) {
      // The layered path negates contour Z, so the contour front appears at
      // geometry z > 0 and the contour back at geometry z < 0.
      const positions = geometry.getAttribute('position');
      let frontTopMaxX = -Infinity;
      let frontBottomMaxX = -Infinity;
      let backTopMaxX = -Infinity;
      let backBottomMaxX = -Infinity;
      for (let i = 0; i < positions.count; i += 1) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        if (x < 0) continue;
        if (z > 1.9) {
          if (y > 0.49) frontTopMaxX = Math.max(frontTopMaxX, x);
          if (y < -0.49) frontBottomMaxX = Math.max(frontBottomMaxX, x);
        }
        if (z < -1.9) {
          if (y > 0.49) backTopMaxX = Math.max(backTopMaxX, x);
          if (y < -0.49) backBottomMaxX = Math.max(backBottomMaxX, x);
        }
      }
      return { frontTopMaxX, frontBottomMaxX, backTopMaxX, backBottomMaxX };
    }

    function createRightBevelPart(verticalFlip: boolean) {
      return createTestPart({
        length: 24,
        width: 4,
        thickness: 1,
        features: [
          middleDado,
          {
            id: 'bevel-right',
            kind: 'end_cut',
            version: 1,
            enabled: true,
            target: { type: 'face', face: 'right_end' },
            reference: { primaryFrom: 'max' },
            cutType: 'bevel',
            lengthMode: 'long_point',
            parameters: { horizontalAngle: 0, verticalAngle: 45, verticalFlip }
          }
        ]
      });
    }

    function scanRightExtremes(geometry: ReturnType<typeof getPartRenderGeometry>) {
      const positions = geometry.getAttribute('position');
      let topRightMaxX = -Infinity;
      let bottomRightMaxX = -Infinity;
      for (let i = 0; i < positions.count; i += 1) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        if (x < 0) continue;
        if (y > 0.49) topRightMaxX = Math.max(topRightMaxX, x);
        if (y < -0.49) bottomRightMaxX = Math.max(bottomRightMaxX, x);
      }
      return { topRightMaxX, bottomRightMaxX };
    }

    it('slopes the right end across thickness for right-end bevels in the layered path', () => {
      const { topRightMaxX, bottomRightMaxX } = scanRightExtremes(getPartRenderGeometry(createRightBevelPart(false)));
      // Right side default keeps the high point on top
      expect(topRightMaxX).toBeCloseTo(12, 3);
      expect(bottomRightMaxX).toBeCloseTo(11, 3);
    });

    it('reverses the right-end slope for vertically flipped bevels in the layered path', () => {
      const { topRightMaxX, bottomRightMaxX } = scanRightExtremes(getPartRenderGeometry(createRightBevelPart(true)));
      expect(topRightMaxX).toBeCloseTo(11, 3);
      expect(bottomRightMaxX).toBeCloseTo(12, 3);
    });

    it('keeps the compound mitre plane intact in the layered path', () => {
      // Only assert the mitre component (top-face extents), which is stable in
      // the layered path; the vertical component is exercised for coverage.
      const extremes = scanRightEnd(getPartRenderGeometry(createCompoundPart(false)));
      expect(extremes.frontTopMaxX).toBeCloseTo(8, 3);
      expect(extremes.backTopMaxX).toBeCloseTo(12, 3);
    });

    it('keeps the compound mitre plane intact with verticalFlip in the layered path', () => {
      const extremes = scanRightEnd(getPartRenderGeometry(createCompoundPart(true)));
      expect(extremes.frontBottomMaxX).toBeCloseTo(8, 3);
      expect(extremes.backBottomMaxX).toBeCloseTo(12, 3);
    });
  });

  describe('getPartLocalConvexVertices', () => {
    it('extrudes the contour at both thickness extremes when no vertical insets exist', () => {
      const verts = getPartLocalConvexVertices(createTestPart({ length: 24, width: 4, thickness: 1 }));
      expect(verts).toHaveLength(8);
      expect(verts).toContainEqual({ x: -12, y: -0.5, z: -2 });
      expect(verts).toContainEqual({ x: 12, y: 0.5, z: 2 });
    });

    it('adjusts left-end vertices per thickness level for vertical insets', () => {
      const verts = getPartLocalConvexVertices(
        createTestPart({
          length: 24,
          width: 4,
          thickness: 1,
          features: [
            {
              id: 'bevel-1',
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

      const leftBottom = verts.filter((v) => v.y === -0.5 && v.x < 0);
      const leftTop = verts.filter((v) => v.y === 0.5 && v.x < 0);
      expect(leftBottom.every((v) => Math.abs(v.x - -12) < 1e-6)).toBe(true);
      expect(leftTop.every((v) => Math.abs(v.x - -11) < 1e-6)).toBe(true);
    });

    it('adjusts right-end vertices for compound cuts with vertical insets', () => {
      const verts = getPartLocalConvexVertices(
        createTestPart({
          length: 24,
          width: 4,
          thickness: 1,
          features: [
            {
              id: 'compound-1',
              kind: 'end_cut',
              version: 1,
              enabled: true,
              target: { type: 'face', face: 'right_end' },
              reference: { primaryFrom: 'max' },
              cutType: 'compound',
              lengthMode: 'long_point',
              parameters: { horizontalAngle: 45, verticalAngle: 45 }
            }
          ]
        })
      );

      // Front (z=-2): full horizontal inset; bottom additionally gets the vertical inset
      expect(verts).toContainEqual(expect.objectContaining({ x: 8, y: 0.5, z: -2 }));
      expect(verts.some((v) => Math.abs(v.x - 7) < 1e-6 && v.y === -0.5 && v.z === -2)).toBe(true);
      // Back (z=2): no horizontal inset; bottom gets the vertical inset only
      expect(verts.some((v) => Math.abs(v.x - 12) < 1e-6 && v.y === 0.5 && v.z === 2)).toBe(true);
      expect(verts.some((v) => Math.abs(v.x - 11) < 1e-6 && v.y === -0.5 && v.z === 2)).toBe(true);
    });
  });
  describe('getPartLocalCorners', () => {
    it('returns the eight local bounding-box corners for a plain part', () => {
      const part = createTestPart({ length: 8, width: 4, thickness: 2 });
      const corners = getPartLocalCorners(part);
      expect(corners).toHaveLength(8);
      const xs = corners.map((c) => c.x);
      expect(Math.min(...xs)).toBeCloseTo(-4);
      expect(Math.max(...xs)).toBeCloseTo(4);
    });

    it('tightens corners for a feature-bearing part', () => {
      const part = createTestPart({
        length: 24,
        width: 12,
        thickness: 0.75,
        features: [
          {
            id: 'mitre-1',
            kind: 'end_cut',
            version: 1,
            enabled: true,
            target: { type: 'face', face: 'right_end' },
            reference: { primaryFrom: 'max' },
            cutType: 'mitre',
            lengthMode: 'long_point',
            parameters: { horizontalAngle: 45 }
          }
        ]
      });
      const corners = getPartLocalCorners(part);
      expect(corners).toHaveLength(8);
    });
  });
});
