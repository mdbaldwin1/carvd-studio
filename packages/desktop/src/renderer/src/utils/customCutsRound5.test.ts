import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { createTestPart, createTestStock } from '../../../../tests/helpers/factories';
import type { Part, RectCutFeature } from '../types';
import { clearPartGeometryCache, getPartMaterialVolume, partsOverlapInPlan } from './partFeatureGeometry';
import { partsOverlap } from './overlapPolicy';
import { getPartOBB, getPartSubOBBs, getPartVertices } from './snapToPartsUtil';
import { getPartFeatureConflicts } from './partFeatureConflicts';
import { validateRectCutFeature } from './rectCutUtils';
import {
  buildDraftFromFeature,
  buildFeatureFromDraft,
  normalizeRectCutDraft
} from '../components/part-features/partFeatureEditorState';
import { validatePartsForCutList } from '../store/projectStore';
import { PartCutsWorkspace } from '../components/part-cuts/PartCutsWorkspace';

vi.unmock('three');
const cutout = (x = 2, z = 1, length = 1, width = 1): RectCutFeature => ({
  id: `cut-${x}-${z}`,
  kind: 'rect_cut',
  version: 1,
  enabled: true,
  cutType: 'cutout',
  target: { type: 'face', face: 'top_face' },
  reference: { primaryFrom: 'min' },
  placement: { x, z },
  parameters: { size: { length, width }, depthMode: 'through' }
});
const blank = (features: Part['features'] = [cutout()]): Part =>
  createTestPart({ length: 10, width: 4, thickness: 1, position: { x: 0, y: 0, z: 0 }, features });
const quaternion = (rotation: Part['rotation']) =>
  new THREE.Quaternion().setFromEuler(
    new THREE.Euler((rotation.x * Math.PI) / 180, (rotation.y * Math.PI) / 180, (rotation.z * Math.PI) / 180, 'XYZ')
  );
const malformedCases = (['corner_notch', 'dado', 'stopped_dado'] as const).flatMap((cutType) =>
  (cutType === 'corner_notch' ? (['x', 'z'] as const) : (['z'] as const)).flatMap((coordinate) =>
    [NaN, Infinity, -Infinity].map((value) => ({ cutType, coordinate, value }))
  )
);

describe('closure review exact contact, XYZ axes, and hidden offsets', () => {
  afterEach(() => {
    cleanup();
    clearPartGeometryCache();
  });
  it.each([0, 0.00001, -0.0001])(
    'H classifies 88.9-degree end contact with gap %s without a topology exception',
    (gap) => {
      const part = blank();
      part.rotation.y = 88.9;
      const position = new THREE.Vector3(5.1 + gap, 0, 0).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        (88.9 * Math.PI) / 180
      );
      const probe = createTestPart({ length: 0.2, width: 0.2, thickness: 0.2, position, rotation: part.rotation });
      expect(partsOverlap(part, probe)).toBe(gap < 0);
      expect(partsOverlap(probe, part)).toBe(gap < 0);
    }
  );
  it.each([
    -179.99, -91.1, -88.9, -45.1, -0.1, 0, 0.1, 12.345, 30.2, 45.1, 88.9, 89.999, 90.001, 91.1, 179.99, 270.01, 359.9
  ])('H preserves exact contact and real intrusion across decimal Y angle %s', (angle) => {
    for (const tolerance of [1e-8, 1e-6, 1e-4]) {
      for (const gap of [0, 2 * tolerance, -4 * tolerance]) {
        const part = blank();
        part.rotation.y = angle;
        part.position = { x: 123.456, y: 0, z: -987.654 };
        const position = new THREE.Vector3(5.1 + gap, 0, 0)
          .applyQuaternion(quaternion(part.rotation))
          .add(new THREE.Vector3(part.position.x, 0, part.position.z));
        const probe = createTestPart({ length: 0.2, width: 0.2, thickness: 0.2, position, rotation: part.rotation });
        expect(partsOverlapInPlan(part, probe, tolerance)).toBe(gap < 0);
        expect(partsOverlapInPlan(probe, part, tolerance)).toBe(gap < 0);
      }
    }
  });
  it.each([
    { x: 90, y: 90, z: 0 },
    { x: 30, y: 20, z: 40 }
  ])('I matches rendered retained material and openings at XYZ $x/$y/$z', (rotation) => {
    const part = blank([cutout(4, 1, 2, 2), cutout(2, 0, 1, 4)]);
    part.rotation = rotation;
    expect(getPartMaterialVolume(part)).toBeCloseTo(32, 6);
    expect(getPartFeatureConflicts(part.features, part)).toEqual([]);
    for (const [x, y, z, overlap] of [
      [0, 0, 1.5, true],
      [-4, 0, 0, true],
      [3, 0, 1, true],
      [0, 0, 0, false],
      [-2.5, 0, 0, false]
    ] as const) {
      const position = new THREE.Vector3(x, y, z).applyQuaternion(quaternion(rotation));
      const probe = createTestPart({ length: 0.1, width: 0.1, thickness: 0.1, position, rotation });
      expect.soft(partsOverlap(part, probe)).toBe(overlap);
      expect.soft(partsOverlap(probe, part)).toBe(overlap);
    }
  });
  it.each([
    { x: 90, y: 90, z: 0 },
    { x: 30, y: 20, z: 40 },
    { x: -34.5, y: 123.4, z: 270.1 }
  ])('I gives OBBs and snap vertices the rendered XYZ basis $x/$y/$z', (rotation) => {
    const part = blank([cutout(4, 1, 2, 2), cutout(2, 0, 1, 4)]);
    const localVertices = getPartVertices(part, part.position);
    const localCells = getPartSubOBBs(part);
    part.rotation = rotation;
    part.position = { x: 12.3, y: -9.1, z: 15.7 };
    const transform = (point: { x: number; y: number; z: number }) =>
      new THREE.Vector3(point.x, point.y, point.z).applyQuaternion(quaternion(rotation));
    const near = (actual: { x: number; y: number; z: number }, expected: { x: number; y: number; z: number }) => {
      expect.soft(actual.x).toBeCloseTo(expected.x, 10);
      expect.soft(actual.y).toBeCloseTo(expected.y, 10);
      expect.soft(actual.z).toBeCloseTo(expected.z, 10);
    };
    const expectedAxes = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ].map(([x, y, z]) => transform({ x, y, z }));
    const worldPoint = (point: { x: number; y: number; z: number }) =>
      transform(point).add(new THREE.Vector3(part.position.x, part.position.y, part.position.z));
    getPartOBB(part).axes.forEach((axis, i) => near(axis, expectedAxes[i]));
    getPartSubOBBs(part).forEach((cell, i) => {
      near(cell.center, worldPoint(localCells[i].center));
      cell.axes.forEach((axis, j) => near(axis, expectedAxes[j]));
    });
    getPartVertices(part, part.position).forEach((vertex, i) => near(vertex, worldPoint(localVertices[i])));
  });
  it.each(malformedCases)(
    'J requires explicit correction of $cutType hidden $coordinate=$value',
    ({ cutType, coordinate, value }) => {
      const cut = cutout(0, 0, 1, 1);
      cut.label = 'Malformed cut';
      cut.cutType = cutType;
      if (cutType === 'corner_notch') cut.target = { type: 'corner', corner: 'front_left_corner' };
      else cut.parameters = { size: { length: 1, width: 4 }, depthMode: 'blind', depth: 0.25 };
      const part = blank([]);
      const stock = createTestStock({ length: 96, width: 48, thickness: 1 });
      part.stockId = stock.id;
      expect(validateRectCutFeature(cut, part)).toBeNull();
      cut.placement[coordinate] = value;
      const draft = buildDraftFromFeature(cut, part);
      const rebuilt = buildFeatureFromDraft(draft) as RectCutFeature;
      expect.soft(validateRectCutFeature(rebuilt, part)).toEqual(expect.stringMatching(/finite|valid number/i));
      expect(validatePartsForCutList([{ ...part, features: [cut] }], [stock])).toEqual(
        expect.arrayContaining([expect.objectContaining({ message: expect.stringMatching(/finite|valid number/i) })])
      );
      if (draft.mode !== 'rect_cut') throw new Error('Expected rectangular draft');
      const edited = normalizeRectCutDraft(
        { ...draft, label: 'Renamed' },
        { partLength: 10, partWidth: 4, partThickness: 1 }
      );
      expect
        .soft(validateRectCutFeature(buildFeatureFromDraft(edited) as RectCutFeature, part))
        .toEqual(expect.stringMatching(/finite|valid number/i));
      const onDraftFeaturesChange = vi.fn();
      render(
        createElement(PartCutsWorkspace, {
          part,
          draftFeatures: [cut],
          units: 'imperial',
          selectedFeatureId: null,
          hoveredTarget: null,
          pendingTarget: null,
          hasUnsavedChanges: true,
          onSelectFeature: vi.fn(),
          onDraftFeaturesChange,
          onHoveredTargetChange: vi.fn(),
          onPendingTargetChange: vi.fn(),
          onExit: vi.fn(),
          onSave: vi.fn()
        })
      );
      expect(screen.getByRole('button', { name: 'Save Part' })).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: /^1\. Malformed cut/ }));
      expect.soft(screen.getByRole('button', { name: 'Save Cut' })).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));
      expect(onDraftFeaturesChange).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Reset invalid offsets to zero' }));
      expect(screen.getByRole('button', { name: 'Save Cut' })).toBeEnabled();
      fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));
      const saved = onDraftFeaturesChange.mock.calls[0][0][0] as RectCutFeature;
      expect(saved.placement[coordinate]).toBe(0);
      expect(validateRectCutFeature(saved, part)).toBeNull();
      expect(validatePartsForCutList([{ ...part, features: [saved] }], [stock])).toEqual([]);
    }
  );
  it.each(
    (['tenon', 'edge_notch', 'groove', 'rabbet'] as const).flatMap((cutType) =>
      (['x', 'z'] as const).flatMap((coordinate) =>
        [NaN, Infinity, -Infinity].map((value) => ({ cutType, coordinate, value }))
      )
    )
  )('J preserves adjacent $cutType $coordinate=$value during unrelated edits', ({ cutType, coordinate, value }) => {
    const cut = cutout();
    cut.cutType = cutType;
    cut.placement[coordinate] = value;
    const draft = buildDraftFromFeature(cut, blank([]));
    if (draft.mode !== 'rect_cut') throw new Error('Expected rectangular draft');
    const edited = normalizeRectCutDraft(
      { ...draft, label: 'Renamed' },
      { partLength: 10, partWidth: 4, partThickness: 1 }
    );
    expect(edited[coordinate === 'x' ? 'placementX' : 'placementZ']).toBe(value);
  });
  it.each(['corner_notch', 'dado', 'stopped_dado'] as const)('J retains finite canonical offsets for %s', (cutType) => {
    const cut = cutout();
    cut.cutType = cutType;
    const draft = buildDraftFromFeature(cut, blank([]));
    const feature = buildFeatureFromDraft(draft) as RectCutFeature;
    expect(feature.placement.z).toBe(0);
    expect(feature.placement.x).toBe(cutType === 'corner_notch' ? 0 : 2);
  });
});
