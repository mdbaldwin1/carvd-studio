import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { CircularCutFeature, CutInstruction, EndCutFeature, RectCutFeature, RoundedCutFeature } from '../types';
import { clearPartGeometryCache, getPartRenderGeometry } from './partFeatureGeometry';
import { validateCircularCut } from './roundCutUtils';
import { clonePartFeature } from './partFeatures';
import { getPartFeatureSockets } from './snapToPartsUtil';
import { getPartEndCutProfiles } from './endCutUtils';
import { validatePartsForCutList } from '../store/projectStore';
import { createDowelJoint, getDowelVisualizations, validateDowelRelationships } from './dowelJointUtils';
import { getFeatureSummary } from './partFeatureSummary';
import { getInstructionFabricationLines } from './cutListInstructions';
import { mirrorFeature } from './partFeatureActions';
import { validateRectCutFeature } from './rectCutUtils';

vi.unmock('three');

const blank = () => createTestPart({ length: 10, width: 4, thickness: 1 });
const circular = (): CircularCutFeature => ({
  id: 'hole',
  kind: 'circular_cut',
  version: 1 as const,
  enabled: true,
  target: { type: 'face', face: 'top_face' },
  reference: { primaryFrom: 'center', secondaryFrom: 'center' },
  cutType: 'round_hole',
  placement: { primary: 0, secondary: 0, rotation: 0 },
  parameters: { diameter: 0.5, depthMode: 'blind', depth: 0.25, tilt: 0, direction: 0 }
});
const rounded = (): RoundedCutFeature => ({
  id: 'rounded',
  kind: 'rounded_cut',
  version: 1 as const,
  enabled: true,
  target: { type: 'face', face: 'bottom_face' },
  reference: { primaryFrom: 'center', secondaryFrom: 'center' },
  cutType: 'rounded_rectangle',
  placement: { primary: 0, secondary: 1, rotation: 0 },
  parameters: { length: 2, width: 0.5, cornerRadius: 0.1, depthMode: 'blind', depth: 0.25 }
});
const rect = (): RectCutFeature => ({
  id: 'rect',
  kind: 'rect_cut',
  version: 1 as const,
  enabled: true,
  target: { type: 'face', face: 'top_face' },
  reference: { primaryFrom: 'min', secondaryFrom: 'min' },
  cutType: 'cutout',
  placement: { x: 2, z: 1 },
  parameters: { size: { length: 1, width: 1 }, depthMode: 'through' }
});
function firstHit(part: ReturnType<typeof blank>, origin: number[], direction: number[]) {
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(getPartRenderGeometry(part), material);
  mesh.updateMatrixWorld(true);
  const hits = new THREE.Raycaster(new THREE.Vector3(...origin), new THREE.Vector3(...direction)).intersectObject(mesh);
  material.dispose();
  return hits[0]?.point;
}
function volume(part: ReturnType<typeof blank>): number {
  const geometry = getPartRenderGeometry(part);
  const positions = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const count = index?.count ?? positions.count;
  let signedVolume = 0;
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3();
  for (let i = 0; i < count; i += 3) {
    a.fromBufferAttribute(positions, index?.getX(i) ?? i);
    b.fromBufferAttribute(positions, index?.getX(i + 1) ?? i + 1);
    c.fromBufferAttribute(positions, index?.getX(i + 2) ?? i + 2);
    signedVolume += a.dot(b.cross(c)) / 6;
  }
  return Math.abs(signedVolume);
}

describe('whole-branch custom cut regression findings', () => {
  afterEach(clearPartGeometryCache);

  it('B checks the pilot entry as well as the asymmetric countersink opening', () => {
    const cut = circular();
    cut.cutType = 'countersink';
    cut.placement.primary = 4.8;
    cut.parameters = {
      diameter: 0.25,
      depthMode: 'through',
      tilt: 60,
      direction: 0,
      countersink: { majorDiameter: 0.252, includedAngle: (2 * Math.atan(0.5) * 180) / Math.PI }
    };
    // The cone's forward rim is inside x=5, but the pilot ellipse reaches x=5.05.
    expect(validateCircularCut(cut, blank())).toMatch(/profile extends beyond/);
  });

  it('B rejects the asymmetric countersink entry envelope near the stock edge', () => {
    const cut = circular();
    cut.cutType = 'countersink';
    cut.placement.primary = -4.74;
    cut.parameters = {
      diameter: 0.125,
      depthMode: 'through',
      tilt: 60,
      direction: 0,
      countersink: { majorDiameter: 0.25, includedAngle: (2 * Math.atan(0.0625 / 1.5) * 180) / Math.PI }
    };
    expect(validateCircularCut(cut, blank())).toMatch(/profile extends beyond/);
  });
  it('B rejects a countersink whose cone cannot form a bounded entry on the selected face', () => {
    const cut = circular();
    cut.cutType = 'countersink';
    cut.parameters = {
      diameter: 0.125,
      depthMode: 'through',
      tilt: 60,
      direction: 0,
      countersink: { majorDiameter: 0.25, includedAngle: 90 }
    };
    expect(validateCircularCut(cut, blank())).toMatch(/bounded entry/);
  });

  it.each([
    ['counterbore', 0.4711324865405],
    ['countersink', 0.4636730439511]
  ] as const)('B opens the complete tilted %s entry profile without an internal cutter cap', (cutType, expectedY) => {
    const cut = circular();
    cut.cutType = cutType;
    cut.parameters = {
      diameter: 0.125,
      depthMode: 'through',
      tilt: 60,
      direction: 0,
      ...(cutType === 'counterbore'
        ? { counterbore: { diameter: 0.25, depth: 1.5 } }
        : { countersink: { majorDiameter: 0.25, includedAngle: (2 * Math.atan(0.0625 / 1.5) * 180) / Math.PI } })
    };
    // Offset from the shared cylinder tessellation edge; the analytic wall
    // height changes by less than 0.000003 inches at this offset.
    for (const z of [-0.00001, 0.00001]) {
      expect(firstHit({ ...blank(), features: [cut] }, [-0.2, 2, z], [0, -1, 0])?.y).toBeCloseTo(expectedY, 5);
    }
  });

  it.each(['counterbore', 'countersink'] as const)(
    'B accepts a contained 1.5-inch axial %s at 60 degrees and renders its authored profile',
    (cutType) => {
      const cut = circular();
      cut.cutType = cutType;
      cut.parameters = {
        diameter: 0.125,
        depthMode: 'through',
        tilt: 60,
        direction: 0,
        ...(cutType === 'counterbore'
          ? { counterbore: { diameter: 0.25, depth: 1.5 } }
          : { countersink: { majorDiameter: 0.25, includedAngle: (2 * Math.atan(0.0625 / 1.5) * 180) / Math.PI } })
      };
      expect.soft(validateCircularCut(cut, blank())).toBeNull();
      // A ray parallel to the bore, outside the pilot radius, hits either the
      // flat recess floor (1.5 axial inches) or the cone's half-depth (.75).
      const depth = cutType === 'counterbore' ? 1.5 : 0.75;
      const z = cutType === 'counterbore' ? 0.1 : 0.09375;
      const hit = firstHit({ ...blank(), features: [cut] }, [-0.866025403784, 1, z], [0.866025403784, -0.5, 0]);
      expect.soft(hit?.x).toBeCloseTo(depth * 0.866025403784, 5);
      expect.soft(hit?.y).toBeCloseTo(0.5 - depth * 0.5, 5);
      // Increasing the same axial recess to 1.9 inches breaks the far-face
      // radial envelope even though the centerline has not exited the stock.
      if (cutType === 'counterbore') cut.parameters.counterbore!.depth = 1.9;
      else cut.parameters.countersink!.includedAngle = (2 * Math.atan(0.0625 / 1.9) * 180) / Math.PI;
      expect(validateCircularCut(cut, blank())).toMatch(/available material/);
    }
  );

  it.each(
    (['cutout', 'mortise'] as const).flatMap((cutType) =>
      (['front_face', 'back_face'] as const).flatMap((face) =>
        (['across_length', 'across_width'] as const).map((action) => ({ cutType, face, action }))
      )
    )
  )('A reflects side-face $cutType / $face / $action without moving height', ({ cutType, face, action }) => {
    const cut = rect();
    cut.cutType = cutType;
    cut.target = { type: 'face', face };
    cut.placement = { x: 2, z: 0.25 };
    cut.parameters = { size: { length: 2, width: 0.5 }, depthMode: 'blind', depth: 0.25 };
    const mirrored = mirrorFeature(cut, action, blank()) as RectCutFeature;
    expect.soft(validateRectCutFeature(mirrored, blank())).toBeNull();
    expect.soft(mirrored.placement.z).toBe(0.25);
    const targetFace = action === 'across_width' ? (face === 'front_face' ? 'back_face' : 'front_face') : face;
    expect.soft(mirrored.target).toEqual({ type: 'face', face: targetFace });
    const zSign = targetFace === 'front_face' ? 1 : -1;
    const x = action === 'across_length' ? 2 : -2;
    expect(firstHit({ ...blank(), features: [mirrored] }, [x, 0, 3 * zSign], [0, 0, -zSign])?.z).toBeCloseTo(
      1.75 * zSign,
      5
    );
  });

  it.each(
    (['bevel', 'compound'] as const).flatMap((cutType) =>
      (['left_end', 'right_end'] as const).flatMap((face) =>
        [false, true].map((verticalFlip) => ({ cutType, face, verticalFlip }))
      )
    )
  )('A physically reflects $cutType on $face (verticalFlip=$verticalFlip)', ({ cutType, face, verticalFlip }) => {
    const cut: EndCutFeature = {
      id: 'end-reflection',
      kind: 'end_cut',
      version: 1 as const,
      enabled: true,
      target: { type: 'face', face },
      reference: { primaryFrom: 'min' },
      cutType,
      lengthMode: 'long_point',
      parameters: { horizontalAngle: cutType === 'compound' ? 20 : 0, verticalAngle: 30, verticalFlip }
    };
    const mirrored = mirrorFeature(cut, 'opposite_end', blank()) as EndCutFeature;
    const sourceSign = face === 'left_end' ? -1 : 1;
    for (const y of [-0.49, 0, 0.49])
      for (const z of [-1.5, 0, 1.5]) {
        const sourcePoint = firstHit({ ...blank(), features: [cut] }, [6 * sourceSign, y, z], [-sourceSign, 0, 0]);
        const targetPoint = firstHit({ ...blank(), features: [mirrored] }, [-6 * sourceSign, y, z], [sourceSign, 0, 0]);
        expect.soft(sourcePoint).toBeDefined();
        expect.soft(targetPoint?.x).toBeCloseTo(-sourcePoint!.x, 5);
      }
    if (cutType === 'bevel' && face === 'left_end' && !verticalFlip) {
      expect
        .soft(firstHit({ ...blank(), features: [mirrored] }, [6, 0.5, 0], [-1, 0, 0])?.x)
        .toBeCloseTo(4.4226497308, 5);
      expect(getFeatureSummary(mirrored, 'imperial')).toContain('High point on Bottom');
    }
  });

  it.each([
    [0.755, '0.755"'],
    [0.74, '0.74"'],
    [0.75, '3/4"']
  ] as const)('R11 retains exact %s inch fabrication dimensions', (size, text) => {
    const cut = rect();
    cut.cutType = 'dado';
    cut.parameters.size.length = size;
    cut.parameters.depthMode = 'blind';
    cut.parameters.depth = 0.25;
    expect(getFeatureSummary(cut, 'imperial')).toContain(`${text} wide`);
    expect(getFeatureSummary(cut, 'metric')).toContain(`${Number((size * 25.4).toFixed(3))}mm wide`);
  });
  it('R12 emits unambiguous placement, rounded rotation, and complete grid dimensions', () => {
    const cut = rect();
    const opening = rounded();
    opening.placement = { primary: 2, secondary: 0, rotation: 45 };
    const grid = circular();
    grid.pattern = { type: 'grid', columns: 3, rows: 2, columnSpacing: 1, rowSpacing: 0.5, rotation: 30 };
    const instruction: CutInstruction = {
      partId: 'p',
      partName: 'Panel',
      cutLength: 10,
      cutWidth: 4,
      thickness: 1,
      stockId: 's',
      stockName: 'Stock',
      grainSensitive: false,
      canRotate: true,
      isGlueUp: false,
      features: [cut, opening, grid]
    };
    const lines = getInstructionFabricationLines(instruction, 'imperial');
    expect.soft(lines[0]).toContain('2" from Left');
    expect.soft(lines[0]).toContain('1" from Front');
    expect.soft(lines[1]).toContain('Primary 2" from center');
    expect.soft(lines[1]).toContain('45° rotation');
    expect(lines[2]).toContain('2 rows × 3 columns');
  });

  it('R12 reports only the along-edge offset for anchored edge notches', () => {
    const cut = rect();
    cut.cutType = 'edge_notch';
    cut.target = { type: 'edge', edge: 'top_back_edge' };
    const instruction: CutInstruction = {
      partId: 'p',
      partName: 'Panel',
      cutLength: 10,
      cutWidth: 4,
      thickness: 1,
      stockId: 's',
      stockName: 'Stock',
      grainSensitive: false,
      canRotate: true,
      isGlueUp: false,
      features: [cut]
    };
    expect(getInstructionFabricationLines(instruction, 'imperial')).toEqual([
      '1. Edge Notch on Back Side · 1" × 1" · Through · 2" from Left along the selected edge'
    ]);
  });

  it('R5 preserves an authored 80 degree slope and blocks fabrication when it exceeds stock', () => {
    const cut: EndCutFeature = {
      id: 'end',
      kind: 'end_cut',
      version: 1 as const,
      enabled: true,
      target: { type: 'face', face: 'left_end' },
      reference: { primaryFrom: 'min' },
      cutType: 'mitre',
      lengthMode: 'long_point',
      parameters: { horizontalAngle: 80 }
    };
    const part = { ...blank(), features: [cut] };
    expect.soft(getPartEndCutProfiles(part).left.horizontalInset).toBeCloseTo(22.6851272785, 8);
    expect(validatePartsForCutList([part], [])).toContainEqual(
      expect.objectContaining({ type: 'feature_validation', severity: 'error' })
    );
  });
  it.each([0.375, 0.5, 1.5])('R7 requires enough hole depth for a %s inch dowel', (dowelLength) => {
    const firstPart = { ...blank(), id: 'first', position: { x: 0, y: 0, z: 0 } };
    const secondPart = { ...blank(), id: 'second', position: { x: 0, y: 1, z: 0 } };
    const create = () =>
      createDowelJoint({
        firstPart,
        secondPart,
        firstFace: 'top_face',
        secondFace: 'bottom_face',
        diameter: 0.25,
        dowelLength,
        firstEmbedmentDepth: 0.25,
        secondEmbedmentDepth: 0.25,
        count: 1,
        spacing: 1,
        firstPrimary: 0,
        firstSecondary: 0
      });
    if (dowelLength > 0.5) expect(create).toThrow(/depth|length/i);
    else {
      const joint = create();
      const parts = [
        { ...firstPart, features: joint.firstFeatures },
        { ...secondPart, features: joint.secondFeatures }
      ];
      expect(validateDowelRelationships(parts)).toEqual([]);
      expect(getDowelVisualizations(parts)[0].aligned).toBe(true);
      for (const part of parts) part.features[0].metadata!.dowelJoint!.dowelLength = 1.5;
      expect(validateDowelRelationships(parts)).toHaveLength(1);
      expect(getDowelVisualizations(parts)[0].aligned).toBe(false);
    }
  });

  it.each([
    ['top_front_edge', 10, 0.5, 0, 1.75],
    ['top_back_edge', 10, 0.5, 0, -1.75],
    ['top_left_edge', 0.5, 4, -4.75, 0],
    ['top_right_edge', 0.5, 4, 4.75, 0]
  ] as const)('R10 puts %s sockets on the rendered rabbet', (edge, length, width, x, z) => {
    const cut = rect();
    cut.cutType = 'rabbet';
    cut.target = { type: 'edge', edge };
    cut.placement = { x: 0, z: 0 };
    cut.parameters = { size: { length, width }, depthMode: 'blind', depth: 0.25 };
    const part = { ...blank(), position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, features: [cut] };
    expect(getPartFeatureSockets(part)[0].openingCenter).toEqual({ x, y: 0.5, z });
    expect(firstHit(part, [x, 2, z], [0, -1, 0])?.y).toBeCloseTo(0.25, 5);
  });

  it.each([false, true])('R1 preserves disjoint exterior notches in either order (reverse=%s)', (reverse) => {
    const front = rect();
    front.cutType = 'edge_notch';
    front.target = { type: 'edge', edge: 'top_front_edge' };
    const back = rect();
    back.id = 'back';
    back.cutType = 'edge_notch';
    back.target = { type: 'edge', edge: 'top_back_edge' };
    back.placement.x = 6;
    const part = { ...blank(), features: reverse ? [back, front] : [front, back] };
    expect(volume(part)).toBeCloseTo(38, 5);
    expect(firstHit(part, [-2.5, 2, 1.5], [0, -1, 0])).toBeUndefined();
    expect(firstHit(part, [1.5, 2, -1.5], [0, -1, 0])).toBeUndefined();
    expect(firstHit(part, [0, 2, 0], [0, -1, 0])?.y).toBeCloseTo(0.5, 5);
  });
  it.each([false, true])('R2 unions overlapping interior rectangles (reverse=%s)', (reverse) => {
    const first = rect();
    first.parameters.size = { length: 2, width: 2 };
    const second = rect();
    second.id = 'second';
    second.parameters.size = { length: 2, width: 2 };
    second.placement.x = 3;
    const part = { ...blank(), features: reverse ? [second, first] : [first, second] };
    expect(volume(part)).toBeCloseTo(34, 5);
    expect(firstHit(part, [-1.5, 2, 0], [0, -1, 0])).toBeUndefined();
    expect(firstHit(part, [2, 2, 0], [0, -1, 0])?.y).toBeCloseTo(0.5, 5);
  });

  it.each([false, true])('R1 preserves a corner notch plus a disjoint flush cutout (reverse=%s)', (reverse) => {
    const corner = rect();
    corner.cutType = 'corner_notch';
    corner.target = { type: 'corner', corner: 'front_left_corner' };
    const flush = rect();
    flush.id = 'flush';
    flush.placement = { x: 6, z: 3 };
    const part = { ...blank(), features: reverse ? [flush, corner] : [corner, flush] };
    expect(volume(part)).toBeCloseTo(38, 5);
    expect(firstHit(part, [-4.5, 2, 1.5], [0, -1, 0])).toBeUndefined();
    expect(firstHit(part, [1.5, 2, -1.5], [0, -1, 0])).toBeUndefined();
    expect(firstHit(part, [0, 2, 0], [0, -1, 0])?.y).toBeCloseTo(0.5, 5);
  });

  it.each([
    ['front_face', 3, -1, 1.75],
    ['back_face', -3, 1, -1.75]
  ] as const)(
    'R3 drills a blind %s hole from the same named face as the picker',
    (face, originZ, directionZ, floorZ) => {
      const cut = circular();
      cut.target.face = face;
      const point = firstHit({ ...blank(), features: [cut] }, [0, 0, originZ], [0, 0, directionZ]);
      expect(point?.z).toBeCloseTo(floorZ, 5);
    }
  );
  it.each([0, 35, 90])('R4 keeps bottom rounded placement and rotation in the face frame (%s degrees)', (rotation) => {
    const cut = rounded();
    cut.placement.rotation = rotation;
    expect(firstHit({ ...blank(), features: [cut] }, [0, -2, -1], [0, 1, 0])?.y).toBeCloseTo(-0.25, 5);
    expect(firstHit({ ...blank(), features: [cut] }, [0, -2, 1], [0, 1, 0])?.y).toBeCloseTo(-0.5, 5);
  });
  it('R6 rejects a tilted entry ellipse that crosses the face boundary', () => {
    const cut = circular();
    cut.placement.primary = 4.4;
    cut.parameters = { diameter: 1, depthMode: 'through', tilt: 60, direction: 0 };
    expect(validateCircularCut(cut, blank())).toMatch(/profile extends beyond/);
  });
  it('R6 rejects a blind cutter radial envelope breaking through the far face', () => {
    const cut = circular();
    cut.parameters = { diameter: 1, depthMode: 'blind', depth: 1.5, tilt: 60, direction: 0 };
    expect(validateCircularCut(cut, blank())).toMatch(/available material/);
  });
  it('R14 renders imported blind corner notches from the documented top face', () => {
    const cut = rect();
    cut.cutType = 'corner_notch';
    cut.target = { type: 'corner', corner: 'front_left_corner' };
    cut.parameters.depthMode = 'blind';
    cut.parameters.depth = 0.25;
    const part = { ...blank(), features: [cut] };
    expect(volume(part)).toBeCloseTo(39.75, 5);
    expect(firstHit(part, [-4.5, 2, 1.5], [0, -1, 0])?.y).toBeCloseTo(0.25, 5);
  });
  it('R15 independently clones the nested end-cut length reference', () => {
    const cut: EndCutFeature = {
      id: 'end',
      kind: 'end_cut',
      version: 1 as const,
      enabled: true,
      target: { type: 'face', face: 'left_end' },
      reference: { primaryFrom: 'min' },
      cutType: 'mitre',
      lengthMode: 'long_point',
      parameters: { horizontalAngle: 45, reference: { mode: 'long_point', value: 10 } }
    };
    const clone = clonePartFeature(cut) as EndCutFeature;
    clone.parameters.reference!.mode = 'short_point';
    expect(cut.parameters.reference?.mode).toBe('long_point');
  });
});
