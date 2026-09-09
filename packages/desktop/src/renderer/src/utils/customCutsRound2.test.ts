import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { CircularCutFeature, EndCutFeature, Part, RectCutFeature, RoundedCutFeature } from '../types';
import { clearPartGeometryCache, getPartLocalConvexVertices, getPartRenderGeometry } from './partFeatureGeometry';
import { validateEndCutFeature } from './endCutUtils';
import { getResolvedRectCutFeature, validateRectCutFeature } from './rectCutUtils';
import { useProjectStore, validatePartsForCutList } from '../store/projectStore';
import { validateCircularCut, validateRoundedCut } from './roundCutUtils';
import { mirrorFeature } from './partFeatureActions';
import { getPartFeatureConflicts } from './partFeatureConflicts';
import { createDowelJoint, getDowelVisualizations, validateDowelRelationships } from './dowelJointUtils';

vi.unmock('three');
const blank = (features: Part['features'] = []): Part =>
  createTestPart({ length: 10, width: 4, thickness: 1, position: { x: 0, y: 0, z: 0 }, features });
const tenon = (): RectCutFeature => ({
  id: 'tenon',
  label: 'Rail tenon',
  kind: 'rect_cut',
  version: 1,
  enabled: true,
  target: { type: 'face', face: 'left_end' },
  reference: { primaryFrom: 'min' },
  cutType: 'tenon',
  parameters: { size: { length: 1, width: 3 }, depthMode: 'blind', depth: 0.5 },
  placement: { x: 0, z: 1 }
});
const hole = (id = 'hole'): CircularCutFeature => ({
  id,
  kind: 'circular_cut',
  version: 1,
  enabled: true,
  target: { type: 'face', face: 'top_face' },
  reference: { primaryFrom: 'center', secondaryFrom: 'center' },
  cutType: 'round_hole',
  placement: { primary: 0, secondary: 0, rotation: 0 },
  parameters: { diameter: 0.25, depthMode: 'through', tilt: 0, direction: 0 }
});
const endCut = (face: 'left_end' | 'right_end', cutType: EndCutFeature['cutType']): EndCutFeature => ({
  id: 'end',
  kind: 'end_cut',
  version: 1,
  enabled: true,
  target: { type: 'face', face },
  reference: { primaryFrom: 'min' },
  cutType,
  lengthMode: 'long_point',
  parameters: {
    horizontalAngle: cutType === 'bevel' ? 0 : 45,
    verticalAngle: cutType === 'mitre' ? 0 : 30,
    horizontalFlip: false,
    verticalFlip: false
  }
});
function volume(part: Part) {
  const geometry = getPartRenderGeometry(part);
  const positions = geometry.getAttribute('position');
  const index = geometry.index;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let result = 0;
  for (let i = 0; i < (index?.count ?? positions.count); i += 3) {
    a.fromBufferAttribute(positions, index ? index.getX(i) : i);
    b.fromBufferAttribute(positions, index ? index.getX(i + 1) : i + 1);
    c.fromBufferAttribute(positions, index ? index.getX(i + 2) : i + 2);
    result += a.dot(b.cross(c)) / 6;
  }
  return Math.abs(result);
}
function firstHit(part: Part, origin: number[], direction: number[]) {
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(getPartRenderGeometry(part), material);
  mesh.updateMatrixWorld(true);
  const hits = new THREE.Raycaster(new THREE.Vector3(...origin), new THREE.Vector3(...direction)).intersectObject(mesh);
  material.dispose();
  return hits[0]?.point;
}

describe('independent review round 2', () => {
  afterEach(clearPartGeometryCache);
  it.each([5, 15])(
    'Q9 validates the blind bore between entry and end across a tenon shoulder at %s degrees',
    (tilt) => {
      const tongue = tenon();
      tongue.target = { type: 'face', face: 'right_end' };
      tongue.parameters.size.width = 2;
      const cut = hole();
      cut.target.face = 'right_end';
      cut.parameters = { ...cut.parameters, diameter: 0.125, depthMode: 'blind', depth: 1.3, tilt, direction: 90 };
      const result = validateCircularCut(cut, blank([tongue, cut]));
      // At 15 degrees, the bore clears the tongue's upper shoulder before
      // entering the body, even though its entry and blind end disks both fit.
      expect(result).toEqual(tilt === 5 ? null : expect.stringContaining('remaining material'));
    }
  );
  it('Q10 keeps an empty preview finite even with an additional solid countersink cutter', () => {
    const cut: RectCutFeature = {
      id: 'empty',
      kind: 'rect_cut',
      version: 1,
      enabled: true,
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'min' },
      cutType: 'cutout',
      placement: { x: 0, z: 0 },
      parameters: { size: { length: 10, width: 4 }, depthMode: 'through' }
    };
    const sink = hole();
    sink.cutType = 'countersink';
    sink.parameters.countersink = { majorDiameter: 0.75, includedAngle: 90 };
    const geometry = getPartRenderGeometry(blank([cut, sink]));
    expect(geometry.getAttribute('position').count).toBe(0);
    expect([...geometry.boundingBox!.min.toArray(), ...geometry.boundingBox!.max.toArray()]).toEqual([
      0, 0, 0, 0, 0, 0
    ]);
  });
  it.each(
    (['mitre', 'bevel', 'tenon'] as const).flatMap((kind) =>
      ['removed', 'partial', 'contained'].map((location) => ({ kind, location }))
    )
  )('Q9 validates $location entry material after a $kind', ({ kind, location }) => {
    const cut = hole();
    cut.parameters = { ...cut.parameters, depthMode: 'blind', depth: 0.25 };
    const removal = kind === 'tenon' ? tenon() : endCut('right_end', kind);
    if (removal.kind === 'rect_cut') {
      removal.target = { type: 'face', face: 'right_end' };
      removal.parameters.size.width = 2;
    }
    if (removal.kind === 'end_cut' && kind === 'bevel') removal.parameters.verticalFlip = true;
    cut.placement.primary =
      kind === 'mitre'
        ? location === 'removed'
          ? 4
          : location === 'partial'
            ? 1.95
            : 1.8
        : kind === 'bevel'
          ? location === 'removed'
            ? 4.7
            : location === 'partial'
              ? 4.4
              : 4.2
          : location === 'removed'
            ? 4.5
            : location === 'partial'
              ? 3.95
              : 3.8;
    cut.placement.secondary = kind === 'mitre' ? -1 : 0;
    const part = blank([removal, cut]);
    if (location === 'contained') expect(validateCircularCut(cut, part)).toBeNull();
    else {
      expect.soft(validateCircularCut(cut, part)).toMatch(/remaining material|removed material/i);
      expect
        .soft(
          getPartFeatureConflicts([removal, cut], part).some((c) => c.featureId === cut.id && c.severity === 'error')
        )
        .toBe(true);
      expect(validatePartsForCutList([part]).some((error) => error.type === 'feature_validation')).toBe(true);
    }
  });
  it('Q9 contains the entire blind bore, not only its entry, against a bevel plane', () => {
    const bevel = endCut('right_end', 'bevel');
    const cut = hole();
    cut.placement.primary = 4.8;
    cut.parameters = { ...cut.parameters, depthMode: 'blind', depth: 0.5 };
    expect(validateCircularCut(cut, blank([bevel, cut]))).toMatch(/remaining material/i);
  });
  it.each(['cutout', 'edge_notch', 'corner_notch'] as const)('Q10 blocks a full-blank through $cutType', (cutType) => {
    const cut: RectCutFeature = {
      id: 'empty',
      kind: 'rect_cut',
      version: 1,
      enabled: true,
      cutType,
      target:
        cutType === 'cutout'
          ? { type: 'face', face: 'top_face' }
          : cutType === 'edge_notch'
            ? { type: 'edge', edge: 'top_front_edge' }
            : { type: 'corner', corner: 'front_left_corner' },
      reference: { primaryFrom: 'min' },
      placement: { x: 0, z: 0 },
      parameters: { size: { length: 10, width: 4 }, depthMode: 'through' }
    };
    expect.soft(validateRectCutFeature(cut, blank())).toMatch(/entire|no material/i);
    expect.soft(getPartFeatureConflicts([cut], blank()).some((c) => c.severity === 'error')).toBe(true);
    expect(validatePartsForCutList([blank([cut])]).some((error) => error.type === 'feature_validation')).toBe(true);
  });
  it('Q10 blocks cumulative removal of the blank, while retaining a thin web', () => {
    const a: RectCutFeature = {
      id: 'a',
      kind: 'rect_cut',
      version: 1,
      enabled: true,
      cutType: 'cutout',
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'min' },
      placement: { x: 0, z: 0 },
      parameters: { size: { length: 5, width: 4 }, depthMode: 'through' }
    };
    const b = { ...a, id: 'b', placement: { x: 5, z: 0 } };
    expect(validateRectCutFeature(a, blank())).toBeNull();
    expect(validateRectCutFeature(b, blank())).toBeNull();
    expect
      .soft(
        getPartFeatureConflicts([a, b], blank()).some(
          (c) => c.severity === 'error' && /no material|entire/i.test(c.message)
        )
      )
      .toBe(true);
    expect
      .soft(validatePartsForCutList([blank([a, b])]).some((error) => error.type === 'feature_validation'))
      .toBe(true);
    b.placement.x = 5.0001;
    b.parameters = { ...b.parameters, size: { length: 4.9999, width: 4 } };
    expect(getPartFeatureConflicts([a, b], blank()).filter((c) => c.severity === 'error')).toEqual([]);
  });
  it.each(
    (['top_face', 'bottom_face'] as const).flatMap((face) =>
      [0.2, 0.36, 0.3749, 0.3751].map((radius) => ({ face, radius }))
    )
  )('Q8 renders a continuous $face countersink at radius $radius', ({ face, radius }) => {
    const sink = hole();
    sink.cutType = 'countersink';
    sink.target.face = face;
    sink.parameters.countersink = { majorDiameter: 0.75, includedAngle: 90 };
    const sign = face === 'top_face' ? 1 : -1;
    const hit = firstHit(blank([sink]), [radius, sign * 2, 0], [0, -sign, 0]);
    expect(hit?.y).toBeCloseTo(sign * (0.5 - Math.max(0, 0.375 - radius)), 5);
  });
  it.each(
    (['left_end', 'right_end'] as const).flatMap((face) =>
      (['mitre', 'bevel', 'compound'] as const).map((cutType) => ({ face, cutType }))
    )
  )('Q1 composes an opposite tenon with $face $cutType in either order', ({ face, cutType }) => {
    const end = endCut(face, cutType);
    const tongue = tenon();
    tongue.parameters.size.width = 2;
    tongue.target = { type: 'face', face: face === 'left_end' ? 'right_end' : 'left_end' };
    const horizontal = cutType === 'bevel' ? 0 : 4;
    const vertical = cutType === 'mitre' ? 0 : Math.tan(Math.PI / 6);
    const sign = face === 'right_end' ? 1 : -1;
    const expectedX = sign * (5 - horizontal / 2 - vertical * (face === 'right_end' ? 0.1 : 0.9));
    for (const features of [
      [end, tongue],
      [tongue, end]
    ]) {
      const part = blank(features);
      expect(validateEndCutFeature(end, part)).toBeNull();
      expect(validateRectCutFeature(tongue, part)).toBeNull();
      expect(getPartFeatureConflicts(features, part).filter((c) => c.severity === 'error')).toEqual([]);
      expect.soft(firstHit(part, [sign * 10, 0.4, 0], [-sign, 0, 0])?.x).toBeCloseTo(expectedX, 5);
      // End wedge and opposite tenon shoulders are disjoint: V = 40 - 2(h+v) - 3.
      expect(volume(part)).toBeCloseTo(37 - 2 * (horizontal + vertical), 5);
    }
  });
  it.each(
    (['left_end', 'right_end'] as const).flatMap((face) =>
      (['front_face', 'back_face'] as const).flatMap((edgeFace) =>
        [false, true].flatMap((flip) =>
          [false, true].flatMap((layered) =>
            (['mitre', 'bevel', 'compound'] as const).flatMap((cutType) =>
              [false, true].map((horizontalFlip) => ({ face, edgeFace, flip, layered, cutType, horizontalFlip }))
            )
          )
        )
      )
    )
  )(
    'Q2 intersects $face $cutType (horizontalFlip=$horizontalFlip) and $edgeFace bevel flip=$flip layered=$layered',
    ({ face, edgeFace, flip, layered, cutType, horizontalFlip }) => {
      const end = endCut(face, cutType);
      end.parameters.horizontalFlip = horizontalFlip;
      const edge: EndCutFeature = {
        ...endCut('right_end', 'bevel'),
        id: 'edge',
        target: { type: 'face', face: edgeFace },
        parameters: { horizontalAngle: 0, verticalAngle: 45, verticalFlip: flip }
      };
      const marker = hole();
      marker.parameters.depthMode = 'blind';
      marker.parameters.depth = 0.125;
      const part = blank(layered ? [end, edge, marker] : [end, edge]);
      const sign = face === 'right_end' ? 1 : -1;
      const h = cutType === 'bevel' ? 0 : 1;
      const v = cutType === 'mitre' ? 0 : Math.tan(Math.PI / 6);
      const orientation = horizontalFlip ? -1 : 1;
      const heightRatio = (y: number) => (face === 'left_end' ? y + 0.5 : 0.5 - y);
      expect
        .soft(firstHit(part, [sign * 10, 0.4, 0], [-sign, 0, 0])?.x)
        .toBeCloseTo(sign * (5 - h * 2 - v * heightRatio(0.4)), 5);
      const y = flip ? -0.5 : 0.5;
      const z = edgeFace === 'front_face' ? 1 : -1;
      const expectedX = sign * (5 - h * (2 - orientation * z) - v * heightRatio(y));
      const vertices = getPartRenderGeometry(part).getAttribute('position');
      const corner = Array.from({ length: vertices.count }, (_, i) => [
        vertices.getX(i),
        vertices.getY(i),
        vertices.getZ(i)
      ]).some(([x, vy, vz]) => Math.abs(x - expectedX) < 1e-5 && Math.abs(vy - y) < 1e-5 && Math.abs(vz - z) < 1e-5);
      expect.soft(corner).toBe(true);
      expect(
        getPartLocalConvexVertices(part).some(
          (p) => Math.abs(p.x - expectedX) < 1e-5 && Math.abs(p.y - y) < 1e-5 && Math.abs(p.z - z) < 1e-5
        )
      ).toBe(true);
      // Integrate the exact linear end/edge planes. The cross-section area is
      // quadratic in Y, so Simpson's rule here is algebraically exact.
      const area = (height: number) => {
        const edgeInset = flip ? 0.5 - height : 0.5 + height;
        const minZ = -2 + (edgeFace === 'back_face' ? edgeInset : 0);
        const maxZ = 2 - (edgeFace === 'front_face' ? edgeInset : 0);
        return (
          (10 - v * heightRatio(height)) * (maxZ - minZ) -
          h * (2 * (maxZ - minZ) - (orientation * (maxZ ** 2 - minZ ** 2)) / 2)
        );
      };
      const markerVolume = layered ? 8 * 0.125 ** 2 * Math.sin(Math.PI / 8) * 0.125 : 0;
      expect(volume(part)).toBeCloseTo((area(-0.5) + 4 * area(0) + area(0.5)) / 6 - markerVolume, 5);
    }
  );
  it('Q6 rejects intersecting dowels at authoring and diagnoses matching edits to both halves', () => {
    const first = blank();
    const second = { ...blank(), position: { x: 0, y: 1, z: 0 } };
    const input = {
      firstPart: first,
      secondPart: second,
      firstFace: 'top_face' as const,
      secondFace: 'bottom_face' as const,
      diameter: 0.375,
      dowelLength: 0.75,
      firstEmbedmentDepth: 0.375,
      secondEmbedmentDepth: 0.375,
      count: 2,
      spacing: 0.1,
      firstPrimary: 0,
      firstSecondary: 0
    };
    expect.soft(() => createDowelJoint(input)).toThrow(/spacing.*diameter/i);
    const joint = createDowelJoint({ ...input, spacing: 0.375 });
    const parts = [
      { ...first, features: joint.firstFeatures },
      { ...second, features: joint.secondFeatures }
    ];
    expect(validateDowelRelationships(parts)).toEqual([]);
    joint.firstFeatures[1].placement.primary = 0.1;
    joint.secondFeatures[1].placement.primary = 0.1;
    expect.soft(validateDowelRelationships(parts).some((error) => /overlap/i.test(error))).toBe(true);
    expect(getDowelVisualizations(parts).every((visual) => !visual.aligned)).toBe(true);
  });
  it('Q6 rejects a new joint overlapping existing hardware without modifying the project', () => {
    const first = blank();
    const second = { ...blank(), position: { x: 0, y: 1, z: 0 } };
    const input = {
      firstPart: first,
      secondPart: second,
      firstFace: 'top_face' as const,
      secondFace: 'bottom_face' as const,
      diameter: 0.375,
      dowelLength: 0.75,
      firstEmbedmentDepth: 0.375,
      secondEmbedmentDepth: 0.375,
      count: 1,
      spacing: 1,
      firstPrimary: 0,
      firstSecondary: 0
    };
    const joint = createDowelJoint(input);
    const parts = [
      { ...first, features: joint.firstFeatures },
      { ...second, features: joint.secondFeatures }
    ];
    expect
      .soft(() => createDowelJoint({ ...input, firstPart: parts[0], secondPart: parts[1], firstPrimary: 0.1 }))
      .toThrow(/overlap/i);
    useProjectStore.setState({ parts });
    expect
      .soft(
        useProjectStore
          .getState()
          .addDowelJoint({ ...input, firstPartId: first.id, secondPartId: second.id, firstPrimary: 0.1 })
      )
      .toBeNull();
    expect(useProjectStore.getState().parts).toEqual(parts);
  });
  it.each([
    { offset: 0.3, overlap: true },
    { offset: 0.375, overlap: false },
    { offset: 0.4, overlap: false }
  ])('Q6 checks finite perpendicular dowels with X offset $offset', ({ offset, overlap }) => {
    const first = blank();
    const upper = { ...blank(), position: { x: 0, y: 1, z: 0 } };
    const front = { ...blank(), position: { x: 0, y: 0, z: 4 } };
    const input = {
      firstPart: first,
      secondPart: upper,
      firstFace: 'top_face' as const,
      secondFace: 'bottom_face' as const,
      diameter: 0.375,
      dowelLength: 0.75,
      firstEmbedmentDepth: 0.375,
      secondEmbedmentDepth: 0.375,
      count: 1,
      spacing: 1,
      firstPrimary: offset,
      firstSecondary: 1.8
    };
    const topJoint = createDowelJoint(input);
    const frontJoint = createDowelJoint({
      ...input,
      secondPart: front,
      firstFace: 'front_face',
      secondFace: 'back_face',
      firstPrimary: 0,
      firstSecondary: 0.3
    });
    const parts = [
      { ...first, features: [...topJoint.firstFeatures, ...frontJoint.firstFeatures] },
      { ...upper, features: topJoint.secondFeatures },
      { ...front, features: frontJoint.secondFeatures }
    ];
    expect.soft(validateDowelRelationships(parts).some((error) => /overlap/i.test(error))).toBe(overlap);
    expect(getDowelVisualizations(parts).every((visual) => visual.aligned)).toBe(!overlap);
  });
  it('Q5 permits distinct perpendicular patterns sharing only one member', () => {
    const a = hole('a');
    const b = hole('b');
    a.placement = b.placement = { primary: -1, secondary: -1, rotation: 0 };
    a.pattern = { type: 'linear', count: 3, spacing: 1, direction: 0 };
    b.pattern = { type: 'linear', count: 3, spacing: 1, direction: 90 };
    const conflicts = getPartFeatureConflicts([a, b], blank());
    expect(conflicts.filter((c) => c.severity === 'error')).toEqual([]);
    expect(conflicts.some((c) => c.code === 'round_overlap')).toBe(true);
  });
  it.each([true, false])('Q5 compares complete counterbore recesses (coaxial=$coaxial)', (coaxial) => {
    const a = hole('a');
    const b = hole('b');
    a.cutType = b.cutType = 'counterbore';
    a.parameters.counterbore = { diameter: 1, depth: 0.25 };
    b.parameters.counterbore = { diameter: coaxial ? 0.5 : 1, depth: 0.5 };
    if (!coaxial) b.placement.primary = 0.8;
    const conflicts = getPartFeatureConflicts([a, b], blank());
    expect(conflicts.filter((c) => c.severity === 'error')).toEqual([]);
    expect(conflicts.some((c) => c.code === 'round_overlap')).toBe(true);
  });
  it('Q5 still rejects the same complete member set described in reverse order', () => {
    const a = hole('a');
    const b = hole('b');
    a.placement.primary = -1;
    b.placement.primary = 1;
    a.pattern = { type: 'linear', count: 3, spacing: 1, direction: 0 };
    b.pattern = { type: 'linear', count: 3, spacing: 1, direction: 180 };
    expect(
      getPartFeatureConflicts([a, b], blank()).some((c) => c.code === 'duplicate_round_cut' && c.severity === 'error')
    ).toBe(true);
  });
  it('Q7 rejects an inverted capsule with length shorter than its diameter', () => {
    const cut: RoundedCutFeature = {
      id: 'slot',
      kind: 'rounded_cut',
      version: 1,
      enabled: true,
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'center', secondaryFrom: 'center' },
      cutType: 'rounded_slot',
      placement: { primary: 0, secondary: 0, rotation: 0 },
      parameters: { length: 1, width: 2, cornerRadius: 0.5, depthMode: 'through' }
    };
    expect(validateRoundedCut(cut, blank())).toEqual(expect.stringContaining('Slot length'));
  });
  it.each(
    (['rounded_rectangle', 'rounded_slot'] as const).flatMap((cutType) =>
      [0, 0.0857864376269049, 0.0858864376269049].map((offset) => ({ cutType, offset }))
    )
  )('Q7 uses the actual $cutType support at 45 degrees and offset $offset', ({ cutType, offset }) => {
    const cut: RoundedCutFeature = {
      id: 'rounded',
      kind: 'rounded_cut',
      version: 1,
      enabled: true,
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'center', secondaryFrom: 'center' },
      cutType,
      placement: { primary: offset, secondary: 0, rotation: 45 },
      parameters: {
        length: 4,
        width: cutType === 'rounded_slot' ? 2 : 4,
        cornerRadius: cutType === 'rounded_slot' ? 0.25 : 1,
        depthMode: 'through'
      }
    };
    // Rectangle support = 1 + sqrt(2); capsule support = 1 + 1/sqrt(2).
    const size = cutType === 'rounded_slot' ? 3.585786437626905 : 5;
    const part = { ...blank(), length: size, width: size };
    const valid = offset < 0.0858;
    for (const candidate of [
      cut,
      mirrorFeature(cut, 'across_length', part) as RoundedCutFeature,
      mirrorFeature(cut, 'across_width', part) as RoundedCutFeature
    ]) {
      expect(validateRoundedCut(candidate, part)).toEqual(valid ? null : expect.stringContaining('beyond'));
    }
  });
  it('Q3 preserves authored tenon size after a main-canvas resize and blocks fabrication', () => {
    const cut = tenon();
    const part = blank([cut]);
    expect(validateRectCutFeature(cut, part)).toBeNull();
    useProjectStore.setState({ parts: [part] });
    expect(useProjectStore.getState().updatePart(part.id, { width: 2 })).toBe(true);
    const resized = useProjectStore.getState().parts[0];
    expect(resized.features).toEqual([cut]);
    const resolved = getResolvedRectCutFeature(cut, resized);
    expect.soft(resolved.parameters.size.width).toBe(3);
    expect.soft(resolved.placement.z).toBe(1);
    expect.soft(validateRectCutFeature(cut, resized)).toEqual(expect.stringContaining('Tenon width'));
    expect(validatePartsForCutList([resized], [])).toContainEqual(
      expect.objectContaining({
        type: 'feature_validation',
        severity: 'error',
        message: expect.stringContaining('Rail tenon')
      })
    );
  });
  it.each([0.999, 0.9995, 0.9999, 0.9999995].flatMap((depth) => [false, true].map((bottom) => ({ depth, bottom }))))(
    'Q11 retains the authored blind floor at depth $depth / bottom=$bottom',
    ({ depth, bottom }) => {
      const cut: RectCutFeature = {
        ...tenon(),
        cutType: 'cutout',
        target: { type: 'face', face: bottom ? 'bottom_face' : 'top_face' },
        parameters: { size: { length: 1, width: 1 }, depthMode: 'blind', depth },
        placement: { x: 2, z: 1 }
      };
      const part = blank([cut]);
      expect(validateRectCutFeature(cut, part)).toBeNull();
      expect(firstHit(part, [-2.5, bottom ? -2 : 2, 0.5], [0, bottom ? 1 : -1, 0])?.y).toBeCloseTo(
        bottom ? depth - 0.5 : 0.5 - depth,
        7
      );
    }
  );
});
