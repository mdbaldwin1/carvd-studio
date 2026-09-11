import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createTestPart, createTestStock } from '../../../../tests/helpers/factories';
import type { CircularCutFeature, EndCutFeature, FaceTarget, Part, RectCutFeature, RoundedCutFeature } from '../types';
import { clearPartGeometryCache, getPartMaterialVolume, getPartRenderGeometry } from './partFeatureGeometry';
import { partsOverlap } from './overlapPolicy';
import { getPartFeatureConflicts } from './partFeatureConflicts';
import { validateRectCutFeature } from './rectCutUtils';
import { expandCircularCut, getFaceFrame, validateCircularCut, validateRoundedCut } from './roundCutUtils';
import { buildDraftFromFeature, buildFeatureFromDraft } from '../components/part-features/partFeatureEditorState';
import { createDowelJoint, validateDowelRelationships } from './dowelJointUtils';
import { useProjectStore, validatePartsForCutList } from '../store/projectStore';
import { deserializeToProject, parseCarvdFile, serializeProject } from './fileFormat';
import { mirrorFeature } from './partFeatureActions';

vi.unmock('three');
const blank = (features: Part['features'] = []): Part =>
  createTestPart({ length: 10, width: 4, thickness: 1, position: { x: 0, y: 0, z: 0 }, features });
const hole = (): CircularCutFeature => ({
  id: 'hole',
  kind: 'circular_cut',
  version: 1 as const,
  enabled: true,
  cutType: 'round_hole',
  target: { type: 'face', face: 'top_face' },
  reference: { primaryFrom: 'center', secondaryFrom: 'center' },
  placement: { primary: 0, secondary: 0, rotation: 0 },
  parameters: { diameter: 2, depthMode: 'through', tilt: 0, direction: 0 }
});
const slot = (): RoundedCutFeature => ({
  id: 'slot',
  kind: 'rounded_cut',
  version: 1 as const,
  enabled: true,
  cutType: 'rounded_slot',
  target: { type: 'face', face: 'top_face' },
  reference: { primaryFrom: 'center', secondaryFrom: 'center' },
  placement: { primary: 0, secondary: 0, rotation: 0 },
  parameters: { length: 4, width: 2, cornerRadius: 1, depthMode: 'through' }
});
const tenon = (
  face: 'left_end' | 'right_end',
  length: number,
  width = 2,
  offset = 1,
  thickness = 0.5
): RectCutFeature => ({
  id: `${face}-${length}-${offset}`,
  kind: 'rect_cut',
  version: 1 as const,
  enabled: true,
  cutType: 'tenon',
  target: { type: 'face', face },
  reference: { primaryFrom: 'min' },
  placement: { x: 0, z: offset },
  parameters: { size: { length, width }, depthMode: 'blind', depth: thickness }
});
function topHits(part: Part, x: number, z: number) {
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(getPartRenderGeometry(part), material);
  mesh.updateMatrixWorld(true);
  const hits = new THREE.Raycaster(new THREE.Vector3(x, 5, z), new THREE.Vector3(0, -1, 0)).intersectObject(mesh);
  material.dispose();
  return hits;
}

describe('full review round 3 remediation', () => {
  afterEach(clearPartGeometryCache);
  it('K1 bounds collision between overlapping copied four-family solids', () => {
    const cut = hole();
    cut.parameters = { diameter: 0.25, depthMode: 'blind', depth: 0.5, tilt: 0, direction: 0 };
    cut.pattern = { type: 'linear', count: 3, spacing: 0.75, direction: 20 };
    const rounded = slot();
    rounded.parameters = { length: 3, width: 0.5, cornerRadius: 0.25, depthMode: 'through' };
    rounded.placement = { primary: 3, secondary: 2, rotation: 30 };
    const end: EndCutFeature = {
      id: 'end',
      kind: 'end_cut',
      version: 1 as const,
      enabled: true,
      cutType: 'mitre',
      target: { type: 'face', face: 'left_end' },
      reference: { primaryFrom: 'min' },
      lengthMode: 'long_point',
      parameters: { horizontalAngle: 30, horizontalFlip: true }
    };
    const dado: RectCutFeature = {
      id: 'dado',
      kind: 'rect_cut',
      version: 1 as const,
      enabled: true,
      cutType: 'dado',
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'min', secondaryFrom: 'min' },
      placement: { x: 6, z: 0 },
      parameters: { size: { length: 0.75, width: 4 }, depthMode: 'blind', depth: 0.375 }
    };
    const part = {
      ...blank([end, dado, cut, rounded]),
      length: 24,
      width: 10,
      thickness: 2,
      position: { x: 0, y: 1, z: 0 }
    };
    const copy = { ...part, id: 'copy', position: { x: 2, y: 1, z: 2 } };
    const start = performance.now();
    expect(partsOverlap(part, copy)).toBe(true);
    expect(partsOverlap(copy, part)).toBe(true);
    const elapsed = performance.now() - start;
    console.info(`K1 copied four-family solids: ${elapsed.toFixed(1)} ms`);
    expect(elapsed).toBeLessThan(1000);
  });
  it.each([1, 8])('K1 bounds cold material collision for a %s-row compound grid', (rows) => {
    const end: EndCutFeature = {
      id: 'end',
      kind: 'end_cut',
      version: 1 as const,
      enabled: true,
      cutType: 'compound',
      target: { type: 'face', face: 'right_end' },
      reference: { primaryFrom: 'max' },
      parameters: { horizontalAngle: 15, verticalAngle: 20, horizontalFlip: false, verticalFlip: false }
    };
    const cut = hole();
    cut.parameters.diameter = 0.1;
    cut.placement.primary = -4;
    cut.placement.secondary = -1.5;
    cut.pattern = { type: 'grid', rows, columns: 16, columnSpacing: 0.5, rowSpacing: 0.4, rotation: 0 };
    const part = blank([end, cut]);
    const timber = createTestPart({ length: 0.02, width: 0.02, thickness: 2, position: { x: -4, y: 0, z: -1.5 } });
    const start = performance.now();
    expect(partsOverlap(part, timber)).toBe(false);
    expect(partsOverlap(timber, part)).toBe(false);
    const elapsed = performance.now() - start;
    console.info(`K1 ${rows * 16} holes cold collision: ${elapsed.toFixed(1)} ms`);
    expect(elapsed).toBeLessThan(1000);
    expect(topHits(part, -4, -1.5)).toHaveLength(0);
    const polygonArea = 8 * 0.05 * 0.05 * Math.sin(Math.PI / 8); // Literal adaptive 16-sided small bore.
    expect(getPartMaterialVolume(part)).toBeCloseTo(
      40 - 8 * Math.tan(Math.PI / 12) - 2 * Math.tan(Math.PI / 9) - rows * 16 * polygonArea,
      4
    );
    const geometry = getPartRenderGeometry(part),
      positions = geometry.getAttribute('position').array.slice();
    expect(partsOverlap(part, { ...part, id: 'copy' })).toBe(true);
    expect(getPartRenderGeometry(part)).toBe(geometry);
    expect(geometry.getAttribute('position').array).toEqual(positions);
  });
  it.each([
    { x: 0, y: 0, z: 0 },
    { x: 30, y: 20, z: 40 }
  ])('K1 preserves blind floor contact at XYZ %j', (rotation) => {
    const cut = hole();
    cut.parameters.depthMode = 'blind';
    cut.parameters.depth = 0.5;
    const part = { ...blank([cut]), rotation };
    const q = new THREE.Quaternion().setFromEuler(
      new THREE.Euler((rotation.x * Math.PI) / 180, (rotation.y * Math.PI) / 180, (rotation.z * Math.PI) / 180, 'XYZ')
    );
    for (const y of [0.21, 0.2, 0.1999]) {
      const timber = createTestPart({
        length: 0.25,
        width: 0.25,
        thickness: 0.4,
        position: new THREE.Vector3(0, y, 0).applyQuaternion(q),
        rotation
      });
      expect(partsOverlap(part, timber)).toBe(y < 0.2);
      expect(partsOverlap(timber, part)).toBe(y < 0.2);
    }
  });
  it.each(['round', 'rounded'] as const)('K1 accepts a timber inside a rendered %s through opening', (kind) => {
    const board = blank([kind === 'round' ? hole() : slot()]);
    const timber = createTestPart({ length: 0.25, width: 0.25, thickness: 2, position: { x: 0, y: 0, z: 0 } });
    expect(topHits(board, 0, 0)).toHaveLength(0);
    expect(getPartFeatureConflicts(board.features ?? [], board)).toEqual([]);
    expect(partsOverlap(board, timber)).toBe(false);
    expect(partsOverlap(timber, board)).toBe(false);
  });
  it.each(
    (['top_face', 'bottom_face', 'front_face', 'back_face', 'left_end', 'right_end'] as FaceTarget[]).flatMap((face) =>
      [
        { x: 0, y: 0, z: 0 },
        { x: 30, y: 20, z: 40 },
        { x: 90, y: 90, z: 0 }
      ].map((rotation) => ({ face, rotation }))
    )
  )('K1 distinguishes circular wall contact on $face at XYZ $rotation', ({ face, rotation }) => {
    const cut = hole();
    cut.target.face = face;
    const board = { ...blank([cut]), thickness: 4, rotation, position: { x: 12.3, y: 9.1, z: -7.4 } };
    expect(validateCircularCut(cut, board)).toBeNull();
    const frame = getFaceFrame(board, face);
    const angle = Math.PI / 24; // Mid-normal of one rendered 24-segment bore facet.
    const ex = new THREE.Vector3(frame.primaryAxis.x, frame.primaryAxis.y, frame.primaryAxis.z)
      .multiplyScalar(Math.cos(angle))
      .addScaledVector(
        new THREE.Vector3(frame.secondaryAxis.x, frame.secondaryAxis.y, frame.secondaryAxis.z),
        Math.sin(angle)
      );
    const ey = new THREE.Vector3(frame.inwardNormal.x, frame.inwardNormal.y, frame.inwardNormal.z);
    const ez = ex.clone().cross(ey);
    const q = new THREE.Quaternion().setFromEuler(
      new THREE.Euler((rotation.x * Math.PI) / 180, (rotation.y * Math.PI) / 180, (rotation.z * Math.PI) / 180, 'XYZ')
    );
    const timberQ = q
      .clone()
      .multiply(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(ex, ey, ez)));
    const euler = new THREE.Euler().setFromQuaternion(timberQ, 'XYZ');
    for (const gap of [-0.01, 0, 0.0001]) {
      const position = ex
        .clone()
        .multiplyScalar(Math.cos(angle) - 0.125 + gap)
        .applyQuaternion(q)
        .add(new THREE.Vector3(12.3, 9.1, -7.4));
      const timber = createTestPart({
        length: 0.25,
        width: 0.25,
        thickness: 24,
        position,
        rotation: { x: (euler.x * 180) / Math.PI, y: (euler.y * 180) / Math.PI, z: (euler.z * 180) / Math.PI }
      });
      expect.soft(partsOverlap(board, timber)).toBe(gap > 0);
      expect.soft(partsOverlap(timber, board)).toBe(gap > 0);
    }
  });
  it.each(
    (['top_face', 'bottom_face'] as const).flatMap((face) =>
      [0, 37].flatMap((cutRotation) =>
        [
          { x: 0, y: 0, z: 0 },
          { x: 30, y: 20, z: 40 },
          { x: 90, y: 90, z: 0 }
        ].map((rotation) => ({ face, cutRotation, rotation }))
      )
    )
  )(
    'K1 distinguishes rounded slot wall contact on $face at $cutRotation / $rotation',
    ({ face, cutRotation, rotation }) => {
      const cut = slot();
      cut.target.face = face;
      cut.placement.rotation = cutRotation;
      const board = { ...blank([cut]), rotation, position: { x: 12.3, y: 9.1, z: -7.4 } };
      expect(validateRoundedCut(cut, board)).toBeNull();
      const frame = getFaceFrame(board, face),
        angle = (cutRotation * Math.PI) / 180;
      const ex = new THREE.Vector3(1, 0, 0)
        .multiplyScalar(Math.cos(angle))
        .addScaledVector(new THREE.Vector3(0, 0, frame.secondaryAxis.z), Math.sin(angle));
      const ey = new THREE.Vector3(0, frame.inwardNormal.y, 0),
        ez = ex.clone().cross(ey);
      const q = new THREE.Quaternion().setFromEuler(
        new THREE.Euler((rotation.x * Math.PI) / 180, (rotation.y * Math.PI) / 180, (rotation.z * Math.PI) / 180, 'XYZ')
      );
      const timberQ = q
        .clone()
        .multiply(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(ex, ey, ez)));
      const euler = new THREE.Euler().setFromQuaternion(timberQ, 'XYZ');
      for (const gap of [-0.01, 0, 0.0001]) {
        const position = ez
          .clone()
          .multiplyScalar(0.875 + gap)
          .applyQuaternion(q)
          .add(new THREE.Vector3(12.3, 9.1, -7.4));
        const timber = createTestPart({
          length: 0.25,
          width: 0.25,
          thickness: 2,
          position,
          rotation: { x: (euler.x * 180) / Math.PI, y: (euler.y * 180) / Math.PI, z: (euler.z * 180) / Math.PI }
        });
        expect.soft(partsOverlap(board, timber)).toBe(gap > 0);
        expect.soft(partsOverlap(timber, board)).toBe(gap > 0);
      }
    }
  );
  it.each([5, 6, 8])('K2 lengthening opposing tenons to %s cannot restore shoulder stock', (length) => {
    const cuts = [tenon('left_end', length), tenon('right_end', length)];
    const part = blank(cuts);
    cuts.forEach((cut) => expect(validateRectCutFeature(cut, part)).toBeNull());
    expect(getPartFeatureConflicts(cuts, part).filter((issue) => issue.severity === 'error')).toEqual([]);
    expect(getPartMaterialVolume(part)).toBeCloseTo(10, 6);
    expect(topHits(part, 0, 1.5)).toHaveLength(0);
    expect(topHits(part, 0, 0)[0].point.y).toBeCloseTo(0.25, 6);
  });
  it.each([false, true])('K3 composes every same-end tenon in order reversed=%s', (reverse) => {
    const cuts = [tenon('left_end', 2, 3, 0), tenon('left_end', 3, 2, 1)];
    if (reverse) cuts.reverse();
    const part = blank(cuts);
    cuts.forEach((cut) => expect(validateRectCutFeature(cut, part)).toBeNull());
    expect(getPartFeatureConflicts(cuts, part).filter((issue) => issue.severity === 'error')).toEqual([]);
    expect(getPartMaterialVolume(part)).toBeCloseTo(31, 6);
    expect(topHits(part, -2.5, 1.5)).toHaveLength(0);
  });
  it.each([
    [tenon('left_end', 6, 3, 0, 0.5), tenon('right_end', 8, 2, 1, 0.25)],
    [tenon('left_end', 2, 3, 0, 0.5), tenon('left_end', 3, 2, 2, 0.25)],
    [tenon('right_end', 2, 3, 0, 0.5), tenon('right_end', 3, 2, 2, 0.25)],
    [tenon('left_end', 2, 1, 0, 0.5), tenon('left_end', 2, 1, 3, 0.5)],
    [tenon('left_end', 1, 3, 0, 0.5), tenon('left_end', 3, 2, 1, 0.25), tenon('right_end', 8, 3, 1, 0.75)]
  ])('K2/K3 matches the literal intersection of retained stock for %j', (...cuts) => {
    const xValues = new Set([-5, 5]);
    const yValues = new Set([-0.5, 0.5]);
    const zValues = new Set([-2, 2]);
    for (const cut of cuts) {
      xValues.add(
        cut.target.type === 'face' && cut.target.face === 'left_end'
          ? -5 + cut.parameters.size.length
          : 5 - cut.parameters.size.length
      );
      yValues.add(-cut.parameters.depth! / 2);
      yValues.add(cut.parameters.depth! / 2);
      zValues.add(-2 + cut.placement.z);
      zValues.add(-2 + cut.placement.z + cut.parameters.size.width);
    }
    const xs = [...xValues].sort((a, b) => a - b),
      ys = [...yValues].sort((a, b) => a - b),
      zs = [...zValues].sort((a, b) => a - b);
    let volume = 0;
    for (let i = 1; i < xs.length; i++)
      for (let j = 1; j < ys.length; j++)
        for (let k = 1; k < zs.length; k++) {
          const x = (xs[i] + xs[i - 1]) / 2,
            y = (ys[j] + ys[j - 1]) / 2,
            z = (zs[k] + zs[k - 1]) / 2;
          const retained = cuts.every((cut) => {
            const inEnd =
              cut.target.type === 'face' && cut.target.face === 'left_end'
                ? x < -5 + cut.parameters.size.length
                : x > 5 - cut.parameters.size.length;
            return (
              !inEnd ||
              (Math.abs(y) < cut.parameters.depth! / 2 &&
                z > -2 + cut.placement.z &&
                z < -2 + cut.placement.z + cut.parameters.size.width)
            );
          });
          if (retained) volume += (xs[i] - xs[i - 1]) * (ys[j] - ys[j - 1]) * (zs[k] - zs[k - 1]);
        }
    for (const features of [cuts, [...cuts].reverse()])
      expect(getPartMaterialVolume(blank(features))).toBeCloseTo(volume, 6);
  });
  it('K5 blocks fabrication of a diameter-mismatched paired dowel', () => {
    const stock = createTestStock({ thickness: 1 });
    const firstPart = { ...blank(), stockId: stock.id };
    const secondPart = { ...blank(), stockId: stock.id, position: { x: 0, y: 1, z: 0 } };
    const joint = createDowelJoint({
      firstPart,
      secondPart,
      firstFace: 'top_face',
      secondFace: 'bottom_face',
      diameter: 0.375,
      dowelLength: 0.75,
      firstEmbedmentDepth: 0.5,
      secondEmbedmentDepth: 0.5,
      count: 1,
      spacing: 1,
      firstPrimary: 0,
      firstSecondary: 0
    });
    const paired = [
      { ...firstPart, features: joint.firstFeatures },
      { ...secondPart, features: joint.secondFeatures }
    ];
    expect(validatePartsForCutList(paired, [stock])).toEqual([]);
    joint.secondFeatures[0].parameters.diameter = 0.25;
    expect(validateDowelRelationships(paired)).toHaveLength(1);
    expect(validatePartsForCutList(paired, [stock])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: 'error', message: expect.stringMatching(/dowel|paired/i) })
      ])
    );
  });
  it.each(['depth', 'alignment', 'missing', 'interference'] as const)(
    'K5 reports one actionable %s relationship error before fabrication',
    (defect) => {
      const stock = createTestStock({ thickness: 1 });
      const firstPart = { ...blank(), stockId: stock.id };
      const secondPart = { ...blank(), stockId: stock.id, position: { x: 0, y: 1, z: 0 } };
      const joint = createDowelJoint({
        firstPart,
        secondPart,
        firstFace: 'top_face',
        secondFace: 'bottom_face',
        diameter: 0.375,
        dowelLength: 0.75,
        firstEmbedmentDepth: 0.5,
        secondEmbedmentDepth: 0.5,
        count: defect === 'interference' ? 2 : 1,
        spacing: 0.5,
        firstPrimary: 0,
        firstSecondary: 0
      });
      const paired = [
        { ...firstPart, features: joint.firstFeatures },
        { ...secondPart, features: joint.secondFeatures }
      ];
      if (defect === 'depth') joint.secondFeatures[0].parameters.depth = 0.25;
      if (defect === 'alignment') paired[1].position.x = 0.125;
      if (defect === 'missing') paired[1].features = [];
      if (defect === 'interference') {
        joint.firstFeatures[1].placement.primary = 0.1;
        joint.secondFeatures[1].placement.primary = 0.1;
      }
      expect(validateDowelRelationships(paired)).toHaveLength(1);
      const errors = validatePartsForCutList(paired, [stock]).filter((issue) => /dowel/i.test(issue.message));
      expect(errors).toHaveLength(1);
      expect(errors[0].severity).toBe('error');
      expect(errors[0].partId).toBe(firstPart.id);
      expect(errors[0].message).toMatch(/depth|align|matching|spacing/i);
    }
  );
  it.each(
    (['top_face', 'bottom_face', 'front_face', 'back_face', 'left_end', 'right_end'] as FaceTarget[]).flatMap((face) =>
      (['circular', 'rounded'] as const).map((kind) => ({ face, kind }))
    )
  )('K6 retains reference frames while renaming $kind on $face', ({ face, kind }) => {
    const part = { ...blank(), thickness: 4 };
    for (const primaryFrom of ['min', 'center', 'max'] as const)
      for (const secondaryFrom of ['min', 'center', 'max'] as const) {
        const feature = kind === 'circular' ? hole() : slot();
        feature.target.face = face;
        feature.reference = { primaryFrom, secondaryFrom };
        feature.placement = { primary: 1, secondary: 1, rotation: 0 };
        const rebuilt = buildFeatureFromDraft({ ...buildDraftFromFeature(feature, part), label: 'Renamed' });
        expect.soft(rebuilt.reference).toEqual(feature.reference);
        if (feature.kind === 'circular_cut' && rebuilt.kind === 'circular_cut')
          expect.soft(expandCircularCut(rebuilt, part)).toEqual(expandCircularCut(feature, part));
      }
  });
  it.each(
    (['top_face', 'bottom_face', 'front_face', 'back_face', 'left_end', 'right_end'] as FaceTarget[]).flatMap((face) =>
      (['linear', 'grid', 'circular'] as const).map((pattern) => ({ face, pattern }))
    )
  )('K6 preserves $pattern members on $face through edit, file reopen, and mirror', ({ face, pattern }) => {
    const part = { ...blank(), thickness: 4 };
    for (const primaryFrom of ['min', 'center', 'max'] as const)
      for (const secondaryFrom of ['min', 'center', 'max'] as const) {
        const feature = hole();
        feature.parameters.diameter = 0.25;
        feature.target.face = face;
        feature.reference = { primaryFrom, secondaryFrom };
        feature.placement = { primary: 1, secondary: 1, rotation: 0 };
        feature.pattern =
          pattern === 'linear'
            ? { type: pattern, count: 3, spacing: 0.25, direction: 15 }
            : pattern === 'grid'
              ? { type: pattern, rows: 2, columns: 2, rowSpacing: 0.25, columnSpacing: 0.25, rotation: 15 }
              : { type: pattern, count: 3, radius: 0.25, startAngle: 15 };
        const edited = buildFeatureFromDraft({
          ...buildDraftFromFeature(feature, part),
          label: 'Renamed'
        }) as CircularCutFeature;
        const file = serializeProject({ ...useProjectStore.getState(), parts: [{ ...part, features: [edited] }] });
        const parsed = parseCarvdFile(JSON.stringify(file));
        expect(parsed.valid).toBe(true);
        const reopened = deserializeToProject(parsed.data!).parts[0].features![0] as CircularCutFeature;
        expect(expandCircularCut(reopened, part)).toEqual(expandCircularCut(feature, part));
        for (const action of ['across_length', 'across_width'] as const) {
          const mirrored = mirrorFeature(reopened, action, part) as CircularCutFeature;
          const rebuilt = buildFeatureFromDraft({
            ...buildDraftFromFeature(mirrored, part),
            label: 'Mirror renamed'
          }) as CircularCutFeature;
          expect(expandCircularCut(rebuilt, part)).toEqual(expandCircularCut(mirrored, part));
          expect(rebuilt.reference).toEqual(mirrored.reference);
        }
      }
  });
  it.each(['top_face', 'bottom_face'] as const)(
    'K6 keeps literal rounded-profile position on %s through reference edits, file reopen and mirror',
    (face) => {
      for (const primaryFrom of ['min', 'center', 'max'] as const)
        for (const secondaryFrom of ['min', 'center', 'max'] as const) {
          const cut = slot();
          cut.cutType = 'rounded_rectangle';
          cut.target.face = face;
          cut.reference = { primaryFrom, secondaryFrom };
          cut.parameters = { length: 0.5, width: 0.5, cornerRadius: 0.125, depthMode: 'through' };
          cut.placement = { primary: 1, secondary: 1, rotation: 23 };
          const part = blank([cut]);
          expect(validateRoundedCut(cut, part)).toBeNull();
          const edited = buildFeatureFromDraft({
            ...buildDraftFromFeature(cut, part),
            label: 'Renamed'
          }) as RoundedCutFeature;
          const parsed = parseCarvdFile(
            JSON.stringify(
              serializeProject({ ...useProjectStore.getState(), parts: [{ ...part, features: [edited] }] })
            )
          );
          expect(parsed.valid).toBe(true);
          const reopened = deserializeToProject(parsed.data!).parts[0];
          expect(getPartRenderGeometry(reopened).getAttribute('position').array).toEqual(
            getPartRenderGeometry(part).getAttribute('position').array
          );
          const x = primaryFrom === 'min' ? -4 : primaryFrom === 'max' ? 4 : 1;
          const secondary = secondaryFrom === 'min' ? -1 : 1,
            z = face === 'top_face' ? secondary : -secondary;
          expect(topHits(reopened, x, z)).toHaveLength(0);
          for (const action of ['across_length', 'across_width'] as const) {
            const mirrored = mirrorFeature(edited, action, part);
            const renamed = buildFeatureFromDraft({
              ...buildDraftFromFeature(mirrored, part),
              label: 'Renamed mirror'
            });
            expect(getPartRenderGeometry({ ...part, features: [renamed] }).getAttribute('position').array).toEqual(
              getPartRenderGeometry({ ...part, features: [mirrored] }).getAttribute('position').array
            );
          }
        }
    }
  );
  it.each(['circular', 'rounded'] as const)('K6 retains legacy omitted secondary reference for %s', (kind) => {
    const cut = kind === 'circular' ? hole() : slot();
    cut.reference = { primaryFrom: 'min' };
    const rebuilt = buildFeatureFromDraft({ ...buildDraftFromFeature(cut, blank()), label: 'Legacy edit' });
    expect(rebuilt.reference).toEqual({ primaryFrom: 'min' });
  });
});
