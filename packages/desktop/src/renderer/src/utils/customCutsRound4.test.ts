import { CutsSection } from '@renderer/components/layout/sidebar/CutsSection';
import { SidebarProvider } from '@renderer/components/ui/sidebar';
import { getPartCutsDraftStatus } from '@renderer/utils/partCutsDraftStatus';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { CircularCutFeature, EndCutFeature, Part, RectCutFeature } from '../types';
import {
  clearPartGeometryCache,
  getPartLocalConvexVertices,
  getPartMaterialVolume,
  getPartRenderGeometry
} from './partFeatureGeometry';
import { partsOverlap } from './overlapPolicy';
import { validateRectCutFeature } from './rectCutUtils';
import { validateCircularCut } from './roundCutUtils';
import { getPartFeatureConflicts } from './partFeatureConflicts';
import { useProjectStore, validatePartsForCutList } from '../store/projectStore';
import { usePartCutsEditing } from '../hooks/usePartCutsEditing';
import { usePartCutsEditingStore } from '../store/partCutsEditingStore';
import { CutProperties } from '@renderer/components/part-cuts/CutProperties';
import { PartCutsEditorProvider } from '@renderer/components/part-cuts/PartCutsEditorContext';
import { PartCutsWorkspace } from '../components/part-cuts/PartCutsWorkspace';

vi.unmock('three');
const blank = (features: Part['features'] = []): Part =>
  createTestPart({ length: 10, width: 4, thickness: 1, position: { x: 0, y: 0, z: 0 }, features });
const end = (compound = false): EndCutFeature => ({
  id: 'end',
  kind: 'end_cut',
  version: 1 as const,
  enabled: true,
  cutType: compound ? 'compound' : 'mitre',
  target: { type: 'face', face: 'right_end' },
  reference: { primaryFrom: 'min' },
  lengthMode: 'long_point',
  parameters: { horizontalAngle: 15, verticalAngle: compound ? 20 : 0, horizontalFlip: false, verticalFlip: false }
});
const cutout = (x = 4, z = 0, length = 2, width = 1): RectCutFeature => ({
  id: `cut-${x}-${z}`,
  kind: 'rect_cut',
  version: 1 as const,
  enabled: true,
  cutType: 'cutout',
  target: { type: 'face', face: 'top_face' },
  reference: { primaryFrom: 'min' },
  placement: { x, z },
  parameters: { size: { length, width }, depthMode: 'through' }
});
const holes = (rows = 1): CircularCutFeature => ({
  id: 'holes',
  kind: 'circular_cut',
  version: 1 as const,
  enabled: true,
  cutType: 'round_hole',
  target: { type: 'face', face: 'top_face' },
  reference: { primaryFrom: 'center', secondaryFrom: 'center' },
  placement: { primary: -4, secondary: -1.5, rotation: 0 },
  parameters: { diameter: 0.1, depthMode: 'through', tilt: 0, direction: 0 },
  pattern: { type: 'grid', rows, columns: 16, columnSpacing: 0.5, rowSpacing: 0.4, rotation: 0 }
});

describe('closure review disconnected stock and pattern performance', () => {
  afterEach(() => {
    cleanup();
    usePartCutsEditingStore.getState().finishEditing();
    clearPartGeometryCache();
  });
  it('E separating stock cannot restore collision in an earlier opening', () => {
    const before = blank([end(), cutout()]);
    const after = { ...before, features: [...before.features!, cutout(2, 0, 1, 4)] };
    const probe = createTestPart({ length: 0.1, width: 0.1, thickness: 0.1, position: { x: 0, y: 0, z: 1.5 } });
    expect(getPartMaterialVolume(before)).toBeCloseTo(35.85640646, 5);
    expect(getPartMaterialVolume(after)).toBeCloseTo(31.85640646, 5);
    expect(getPartFeatureConflicts(after.features ?? [], after)).toEqual([]);
    expect(partsOverlap(before, probe)).toBe(false);
    expect(partsOverlap(after, probe)).toBe(false);
  });
  it.each(
    (['none', 'left_end', 'right_end'] as const).flatMap((face) =>
      [false, true].flatMap((flip) =>
        [0, 90].flatMap((rotation) => [false, true].map((back) => ({ face, flip, rotation, back })))
      )
    )
  )(
    'E retains all disconnected contours for $face flip=$flip rotation=$rotation back=$back',
    ({ face, flip, rotation, back }) => {
      const mitre = end();
      if (face !== 'none') mitre.target.face = face;
      mitre.parameters.horizontalFlip = flip;
      const opening = cutout(4, back ? 3 : 0);
      const split = cutout(2, 0, 1, 4);
      const endFeatures = face === 'none' ? [] : [mitre];
      const before = blank([...endFeatures, opening]);
      before.position = { x: 12, y: 0.5, z: -7 };
      before.rotation.y = rotation;
      for (const features of [
        [...endFeatures, opening, split],
        [split, opening, ...endFeatures]
      ]) {
        const after = { ...before, features };
        expect(getPartMaterialVolume(after)).toBeCloseTo(getPartMaterialVolume(before) - 4, 5);
        for (const [x, z, overlap] of [
          [0, back ? -1.5 : 1.5, false],
          [-2.5, 0, false],
          [0, 0, true],
          [-3.5, 0, true],
          [3.5, 0, true]
        ] as const) {
          const position = new THREE.Vector3(x, 0, z)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), (rotation * Math.PI) / 180)
            .add(new THREE.Vector3(12, 0.5, -7));
          const probe = createTestPart({ length: 0.1, width: 0.1, thickness: 0.1, position });
          expect(partsOverlap(after, probe)).toBe(overlap);
          if (!partsOverlap(before, probe)) expect(partsOverlap(after, probe)).toBe(false);
        }
      }
    }
  );
  it.each(['x', 'z'] as const)('G rejects nonfinite %s before full-blank solid evaluation', (coordinate) => {
    const cut = cutout(0, 0, 10, 4);
    cut.placement[coordinate] = NaN;
    const part = blank([cut]);
    expect.soft(validateRectCutFeature(cut, part)).toEqual(expect.stringMatching(/finite|valid number/i));
    expect(() => getPartFeatureConflicts(part.features ?? [], part)).not.toThrow();
    expect(validatePartsForCutList([part], [])).toContainEqual(
      expect.objectContaining({ type: 'feature_validation', severity: 'error' })
    );
  });
  it.each([0, 90])('E preserves interior holes and disconnected stock tilted %s degrees', (rotation) => {
    const part = blank([cutout(4, 1, 2, 2), cutout(2, 0, 1, 4)]);
    part.rotation.x = rotation;
    for (const [x, z, overlap] of [
      [0, 0, false],
      [-2.5, 0, false],
      [0, 1.5, true],
      [-4, 0, true]
    ] as const) {
      const position = new THREE.Vector3(x, 0, z).applyEuler(new THREE.Euler((rotation * Math.PI) / 180, 0, 0));
      const probe = createTestPart({ length: 0.1, width: 0.1, thickness: 0.1, position });
      expect(partsOverlap(part, probe)).toBe(overlap);
    }
  });
  it.each(
    (
      [
        'corner_notch',
        'edge_notch',
        'cutout',
        'dado',
        'stopped_dado',
        'rabbet',
        'groove',
        'stopped_groove',
        'mortise',
        'tenon'
      ] as const
    ).flatMap((cutType) =>
      (['x', 'z'] as const).flatMap((coordinate) =>
        [NaN, Infinity, -Infinity].map((value) => ({ cutType, coordinate, value }))
      )
    )
  )(
    'G rejects raw $coordinate=$value on $cutType before resolver defaults hide it',
    ({ cutType, coordinate, value }) => {
      const cut = cutout(0, 0, 1, 1);
      cut.cutType = cutType;
      cut.parameters = { size: { length: 1, width: 1 }, depthMode: 'blind', depth: 0.25 };
      if (cutType === 'corner_notch') cut.target = { type: 'corner', corner: 'front_left_corner' };
      if (cutType === 'edge_notch' || cutType === 'rabbet') cut.target = { type: 'edge', edge: 'top_front_edge' };
      if (cutType === 'tenon') cut.target = { type: 'face', face: 'right_end' };
      expect(validateRectCutFeature(cut, blank())).toBeNull();
      cut.placement[coordinate] = value;
      expect(validateRectCutFeature(cut, blank([cut]))).toEqual(expect.stringMatching(/finite|valid number/i));
    }
  );
  it.each(['x', 'z'] as const)('G prevents nonfinite %s in authoring and final-save transactions', (coordinate) => {
    const cut = cutout(0, 0, 1, 1);
    cut.label = 'Malformed opening';
    cut.placement[coordinate] = NaN;
    const part = blank();
    useProjectStore.setState({ parts: [part], units: 'imperial' });
    const hook = renderHook(() => usePartCutsEditing());
    act(() => usePartCutsEditingStore.getState().startEditingPartCuts(part.id, part.name, []));
    act(() => hook.result.current.setDraftFeatures([cut]));
    let saved = true;
    act(() => {
      saved = hook.result.current.saveAndExit();
    });
    expect.soft(saved).toBe(false);
    expect.soft(useProjectStore.getState().parts[0].features).toEqual([]);
    hook.unmount();
    render(
      createElement(
        SidebarProvider,
        null,
        createElement(
          PartCutsEditorProvider,
          {
            part,
            draftFeatures: [cut],
            units: 'imperial',
            selectedFeatureId: null,
            hoveredTarget: null,
            pendingTarget: null,
            hasUnsavedChanges: true,
            onSelectFeature: vi.fn(),
            onDraftFeaturesChange: vi.fn(),
            onHoveredTargetChange: vi.fn(),
            onPendingTargetChange: vi.fn(),
            onExit: vi.fn()
          },
          createElement(CutsSection, { isCollapsed: false, onOpenChange: () => {} }),
          createElement(PartCutsWorkspace),
          createElement(CutProperties)
        )
      )
    );
    // Save lives in the app header now; assert the invalidity it reports.
    expect.soft(getPartCutsDraftStatus(part, [cut]).firstInvalidIndex).toBeGreaterThanOrEqual(0);
    fireEvent.click(screen.getByRole('button', { name: /^1\. Malformed opening/ }));
    expect(
      within(screen.getByRole('complementary', { name: 'Cut properties' })).getByRole('alert')
    ).toBeInTheDocument();
    expect(screen.getAllByRole('alert').at(-1)).toHaveTextContent(/finite|valid number/i);
  });
  it.each([1, 8])(
    'F builds a cold %s-row compound grid within an interactive budget with exact stock',
    (rows) => {
      const feature = holes(rows);
      const part = blank([end(true), feature]);
      expect(validateCircularCut(feature, part)).toBeNull();
      const started = performance.now();
      const geometry = getPartRenderGeometry(part);
      const elapsed = performance.now() - started;
      console.info(`F cold ${16 * rows} holes: ${elapsed.toFixed(1)}ms`);
      expect.soft(elapsed).toBeLessThan(1000);
      const polygonArea = 8 * 0.05 ** 2 * Math.sin(Math.PI / 8);
      expect(getPartMaterialVolume(part)).toBeCloseTo(
        40 - 8 * Math.tan(Math.PI / 12) - 2 * Math.tan(Math.PI / 9) - 16 * rows * polygonArea,
        5
      );
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
      const ray = new THREE.Raycaster(new THREE.Vector3(10, 0, 0), new THREE.Vector3(-1, 0, 0));
      expect(ray.intersectObject(mesh)[0].point.x).toBeCloseTo(
        5 - 2 * Math.tan(Math.PI / 12) - 0.5 * Math.tan(Math.PI / 9),
        5
      );
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < 16; column += 1) {
          ray.set(new THREE.Vector3(-4 + column * 0.5, 3, -1.5 + row * 0.4), new THREE.Vector3(0, -1, 0));
          expect(ray.intersectObject(mesh)).toHaveLength(0);
        }
      }
      ray.set(new THREE.Vector3(-4.25, 3, -1.5), new THREE.Vector3(0, -1, 0));
      expect(ray.intersectObject(mesh)[0].point.y).toBeCloseTo(0.5, 6);
      const cachedAt = performance.now();
      expect(
        getPartRenderGeometry({
          ...part,
          features: part.features!.map((cut) => ({ ...cut, id: `${cut.id}-copy`, label: 'Renamed' }))
        })
      ).toBe(geometry);
      expect(performance.now() - cachedAt).toBeLessThan(50);
      const downstreamAt = performance.now();
      const vertices = getPartLocalConvexVertices(part);
      expect(vertices.length).toBeGreaterThanOrEqual(8);
      expect(getPartFeatureConflicts(part.features ?? [], part).filter((issue) => issue.severity === 'error')).toEqual(
        []
      );
      expect(validatePartsForCutList([part], []).filter((issue) => issue.type === 'feature_validation')).toEqual([]);
      const downstreamMs = performance.now() - downstreamAt;
      console.info(`F ${16 * rows} holes collision/validation: ${downstreamMs.toFixed(1)}ms`);
      expect(downstreamMs).toBeLessThan(1000);
      mesh.material.dispose();
    },
    30000
  );
  it('F keeps valid holes interactive beside nearly meeting end planes', () => {
    const left = end();
    left.id = 'left';
    left.target.face = 'left_end';
    left.parameters.horizontalAngle = (Math.atan(1.24875) * 180) / Math.PI;
    const right = { ...left, id: 'right', target: { type: 'face' as const, face: 'right_end' as const } };
    const feature = holes();
    feature.placement.secondary = 1.5;
    const part = blank([left, right, feature]);
    expect(validateCircularCut(feature, part)).toBeNull();
    const start = performance.now();
    getPartRenderGeometry(part);
    const elapsed = performance.now() - start;
    console.info(`F near-meeting planes: ${elapsed.toFixed(1)}ms`);
    expect.soft(elapsed).toBeLessThan(1000);
    expect(getPartMaterialVolume(part)).toBeCloseTo(20.02 - 16 * 8 * 0.05 ** 2 * Math.sin(Math.PI / 8), 5);
  }, 30000);
  it.each(
    (['left_end', 'right_end'] as const).flatMap((endFace) =>
      [false, true].flatMap((horizontalFlip) =>
        [false, true].flatMap((verticalFlip) =>
          (['top_face', 'bottom_face'] as const).map((face) => ({ endFace, horizontalFlip, verticalFlip, face }))
        )
      )
    )
  )(
    'F keeps 128 layered counterbores exact for $endFace h=$horizontalFlip v=$verticalFlip $face',
    ({ endFace, horizontalFlip, verticalFlip, face }) => {
      const compound = end(true);
      compound.target.face = endFace;
      compound.parameters.horizontalFlip = horizontalFlip;
      compound.parameters.verticalFlip = verticalFlip;
      const feature = holes(8);
      feature.target.face = face;
      feature.cutType = 'counterbore';
      feature.placement.primary = -3;
      feature.pattern = { type: 'grid', rows: 8, columns: 16, rowSpacing: 0.4, columnSpacing: 0.4, rotation: 0 };
      feature.parameters.counterbore = { diameter: 0.2, depth: 0.25 };
      const part = blank([compound, feature]);
      expect(validateCircularCut(feature, part)).toBeNull();
      const started = performance.now();
      const geometry = getPartRenderGeometry(part);
      expect(performance.now() - started).toBeLessThan(1000);
      const pilot = 8 * 0.05 ** 2 * Math.sin(Math.PI / 8);
      const major = 8 * 0.1 ** 2 * Math.sin(Math.PI / 8);
      expect(getPartMaterialVolume(part)).toBeCloseTo(
        40 - 8 * Math.tan(Math.PI / 12) - 2 * Math.tan(Math.PI / 9) - 128 * (pilot + (major - pilot) * 0.25),
        5
      );
      const side = endFace === 'right_end' ? 1 : -1;
      const ny = side * (verticalFlip ? 1 : -1) * Math.tan(Math.PI / 9);
      const nz = (horizontalFlip ? 1 : -1) * Math.tan(Math.PI / 12);
      const limit = 5 - 2 * Math.tan(Math.PI / 12) - 0.5 * Math.tan(Math.PI / 9);
      const positions = geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i += 1) {
        expect(side * positions.getX(i) + ny * positions.getY(i) + nz * positions.getZ(i)).toBeLessThanOrEqual(
          limit + 1e-6
        );
      }
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
      const entrySign = face === 'top_face' ? 1 : -1;
      const ray = new THREE.Raycaster(
        new THREE.Vector3(-2.92, entrySign * 3, entrySign * -1.5),
        new THREE.Vector3(0, -entrySign, 0)
      );
      expect(ray.intersectObject(mesh)[0].point.y).toBeCloseTo(entrySign * 0.25, 5);
      mesh.material.dispose();
    }
  );
});
