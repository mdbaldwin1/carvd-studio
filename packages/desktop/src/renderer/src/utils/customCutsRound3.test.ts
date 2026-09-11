import { getPartCutsDraftStatus } from '@renderer/utils/partCutsDraftStatus';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { CircularCutFeature, EndCutFeature, Part, RectCutFeature, RoundedCutFeature } from '../types';
import {
  clearPartGeometryCache,
  getPartLocalConvexVertices,
  getPartMaterialVolume,
  getPartRenderGeometry
} from './partFeatureGeometry';
import { partsOverlap } from './overlapPolicy';
import { validateEndCutFeature } from './endCutUtils';
import { validateRectCutFeature } from './rectCutUtils';
import { validateRoundedCut } from './roundCutUtils';
import { getPartFeatureConflicts } from './partFeatureConflicts';
import { useProjectStore, validatePartsForCutList } from '../store/projectStore';
import { CutsSection } from '@renderer/components/layout/sidebar/CutsSection';
import { SidebarProvider } from '@renderer/components/ui/sidebar';
import { CutProperties } from '@renderer/components/part-cuts/CutProperties';
import { PartCutsEditorProvider } from '@renderer/components/part-cuts/PartCutsEditorContext';
import { PartCutsWorkspace } from '../components/part-cuts/PartCutsWorkspace';
import { usePartCutsEditing } from '../hooks/usePartCutsEditing';
import { usePartCutsEditingStore } from '../store/partCutsEditingStore';

vi.unmock('three');
const blank = (features: Part['features'] = []): Part =>
  createTestPart({ length: 10, width: 4, thickness: 1, position: { x: 0, y: 0, z: 0 }, features });
const end = (
  face: EndCutFeature['target']['face'] = 'right_end',
  cutType: EndCutFeature['cutType'] = 'mitre'
): EndCutFeature => ({
  id: face,
  kind: 'end_cut',
  version: 1 as const,
  enabled: true,
  cutType,
  target: { type: 'face', face },
  reference: { primaryFrom: 'min' },
  lengthMode: 'long_point',
  parameters: {
    horizontalAngle: cutType === 'bevel' ? 0 : 45,
    verticalAngle: cutType === 'mitre' ? 0 : 45,
    horizontalFlip: false,
    verticalFlip: false
  }
});
const pocket = (): RectCutFeature => ({
  id: 'pocket',
  kind: 'rect_cut',
  version: 1 as const,
  enabled: true,
  cutType: 'mortise',
  target: { type: 'face', face: 'top_face' },
  reference: { primaryFrom: 'min' },
  placement: { x: 8.75, z: 2.75 },
  parameters: { size: { length: 0.5, width: 0.5 }, depthMode: 'blind', depth: 0.25 }
});
const rounded = (): RoundedCutFeature => ({
  id: 'rounded',
  kind: 'rounded_cut',
  version: 1 as const,
  enabled: true,
  cutType: 'rounded_rectangle',
  target: { type: 'face', face: 'top_face' },
  reference: { primaryFrom: 'center', secondaryFrom: 'center' },
  placement: { primary: 4, secondary: -1, rotation: 0 },
  parameters: { length: 0.5, width: 0.5, cornerRadius: 0.125, depthMode: 'blind', depth: 0.25 }
});
const bore = (): CircularCutFeature => ({
  id: 'bore',
  kind: 'circular_cut',
  version: 1 as const,
  enabled: true,
  cutType: 'round_hole',
  target: { type: 'face', face: 'top_face' },
  reference: { primaryFrom: 'center', secondaryFrom: 'center' },
  placement: { primary: 0, secondary: 0, rotation: 0 },
  parameters: { diameter: 0.25, depthMode: 'blind', depth: 0.25, tilt: 0, direction: 0 }
});
function roundedRemovalFixture(width = 4) {
  const left = end('left_end', 'compound');
  left.parameters.horizontalFlip = true;
  const back = end('back_face', 'bevel');
  back.parameters.verticalFlip = true;
  const stock = blank([left, end('right_end', 'compound'), end('front_face', 'bevel'), back]);
  const cut = rounded();
  cut.label = 'Final opening';
  cut.placement = { primary: 0, secondary: 0, rotation: 0 };
  cut.parameters = { length: 10, width, cornerRadius: 0.25, depthMode: 'through' };
  return { stock, cut, part: { ...stock, features: [...stock.features!, cut] } };
}

describe('independent review round 3', () => {
  beforeEach(() => {
    usePartCutsEditingStore.getState().finishEditing();
    useProjectStore.setState({ parts: [], units: 'imperial' });
  });
  afterEach(() => {
    cleanup();
    clearPartGeometryCache();
  });
  it.each(['rounded', 'rectangular', 'no-material'] as const)(
    'B/C blocks authoring and final save of the complete %s candidate stack',
    (kind) => {
      const cut = kind === 'rectangular' ? pocket() : rounded();
      cut.label = 'Invalid pocket';
      const part = kind === 'no-material' ? roundedRemovalFixture().part : blank([end(), cut]);
      const last = part.features!.at(-1)!;
      // Keep the persisted part uncut so both paths must use the unsaved stack.
      const original = { ...part, features: [] };
      useProjectStore.setState({ parts: [original] });
      const hook = renderHook(() => usePartCutsEditing());
      act(() => usePartCutsEditingStore.getState().startEditingPartCuts(part.id, part.name, []));
      act(() => hook.result.current.setDraftFeatures(part.features!));
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
              part: original,
              draftFeatures: part.features!,
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
      expect.soft(getPartCutsDraftStatus(original, part.features!).firstInvalidIndex).toBeGreaterThanOrEqual(0);
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${part.features!.length}\\. ${last.label}`) }));
      expect(
        within(screen.getByRole('complementary', { name: 'Cut properties' })).getByRole('alert')
      ).toBeInTheDocument();
      expect(screen.getAllByRole('alert').at(-1)).toHaveTextContent(
        kind === 'no-material' ? /entire blank/ : /remaining material/
      );
    }
  );
  it.each(
    (['left_end', 'right_end', 'front_face', 'back_face'] as const).flatMap((face) =>
      (face.endsWith('_end') ? (['mitre', 'bevel', 'compound'] as const) : (['bevel'] as const)).flatMap((cutType) =>
        [false, true].flatMap((flip) => [0, 1, 2, 3].map((boundary) => ({ face, cutType, flip, boundary })))
      )
    )
  )(
    'A keeps $face $cutType flip=$flip hull inside its plane after boundary cut $boundary',
    ({ face, cutType, flip, boundary }) => {
      const bevel = end(face, cutType);
      bevel.parameters.horizontalFlip = flip;
      bevel.parameters.verticalFlip = flip;
      const cut = pocket();
      cut.cutType = 'cutout';
      cut.parameters = {
        size: boundary < 2 ? { length: 0.5, width: 2 } : { length: 2, width: 0.5 },
        depthMode: 'through'
      };
      cut.placement = [
        { x: 0, z: 0 },
        { x: 9.5, z: 0 },
        { x: 4, z: 0 },
        { x: 4, z: 3.5 }
      ][boundary];
      const side = face === 'left_end' || face === 'back_face' ? -1 : 1;
      const isEnd = face.endsWith('_end');
      const nx = isEnd ? side : 0;
      const ny = cutType === 'mitre' ? 0 : (isEnd ? -side : 1) * (flip ? -1 : 1);
      const nz = isEnd ? (cutType === 'bevel' ? 0 : flip ? 1 : -1) : side;
      const limit = isEnd ? (cutType === 'bevel' ? 4.5 : cutType === 'mitre' ? 3 : 2.5) : 1.5;
      const probe = createTestPart({
        length: 0.1,
        width: 0.1,
        thickness: 0.1,
        position: {
          x: isEnd ? side * (limit - ny * 0.4 + 0.2) : 0,
          y: 0.4,
          z: isEnd ? 0 : side * (limit - ny * 0.4 + 0.2)
        }
      });
      const stock = blank([bevel]);
      expect(partsOverlap(stock, probe)).toBe(false);
      for (const features of [
        [bevel, cut],
        [cut, bevel]
      ]) {
        const part = { ...stock, features };
        const vertices = getPartLocalConvexVertices(part);
        expect(vertices.length).toBeGreaterThan(0);
        expect(vertices.every(({ x, y, z }) => nx * x + ny * y + nz * z <= limit + 1e-6)).toBe(true);
        expect(partsOverlap(part, probe)).toBe(false);
        expect(getPartMaterialVolume(part)).toBeLessThanOrEqual(getPartMaterialVolume(stock) + 1e-6);
      }
    }
  );
  it('A removal cannot create collision outside the authored bevel plane', () => {
    const bevel = end('right_end', 'bevel');
    const notch = pocket();
    notch.cutType = 'cutout';
    notch.placement = { x: 9.5, z: 0 };
    notch.parameters = { size: { length: 0.5, width: 2 }, depthMode: 'through' };
    const before = blank([bevel]);
    const after = { ...before, features: [bevel, notch] };
    const probe = createTestPart({ length: 0.1, width: 0.1, thickness: 0.1, position: { x: 4.3, y: -0.4, z: -1 } });
    expect(validateEndCutFeature(bevel, after)).toBeNull();
    expect(validateRectCutFeature(notch, after)).toBeNull();
    expect(getPartFeatureConflicts(after.features!, after)).toEqual([]);
    expect(partsOverlap(before, probe)).toBe(false);
    expect.soft(getPartLocalConvexVertices(after).every(({ x, y }) => x - y <= 4.5 + 1e-6)).toBe(true);
    expect(partsOverlap(after, probe)).toBe(false);
  });
  it.each(['rounded', 'rectangular'] as const)(
    'B rejects a %s pocket wholly outside remaining mitred stock',
    (kind) => {
      const cut = kind === 'rounded' ? rounded() : pocket();
      const part = blank([end(), cut]);
      const issue = cut.kind === 'rounded_cut' ? validateRoundedCut(cut, part) : validateRectCutFeature(cut, part);
      expect.soft(getPartMaterialVolume(part)).toBeCloseTo(32, 6);
      expect.soft(issue).toEqual(expect.stringContaining('remaining material'));
      expect
        .soft(getPartFeatureConflicts(part.features!, part))
        .toContainEqual(expect.objectContaining({ code: 'material_removed', severity: 'error' }));
      expect(validatePartsForCutList([part], [])).toContainEqual(
        expect.objectContaining({ type: 'feature_validation', severity: 'error' })
      );
    }
  );
  it.each(
    (['rounded', 'rectangular'] as const).flatMap((kind) =>
      (['top_face', 'bottom_face'] as const).flatMap((face) => [1, 2, 4].map((primary) => ({ kind, face, primary })))
    )
  )('B checks the complete $kind $face pocket at x=$primary in either operation order', ({ kind, face, primary }) => {
    const cut = kind === 'rounded' ? rounded() : pocket();
    cut.target = { type: 'face', face };
    if (cut.kind === 'rounded_cut') cut.placement = { primary, secondary: face === 'top_face' ? -1 : 1, rotation: 30 };
    else cut.placement.x = primary + 4.75;
    for (const features of [
      [end(), cut],
      [cut, end()]
    ]) {
      const part = blank(features);
      const issue = cut.kind === 'rounded_cut' ? validateRoundedCut(cut, part) : validateRectCutFeature(cut, part);
      expect(issue).toEqual(primary === 1 ? null : expect.stringContaining('remaining material'));
    }
  });
  it('B preserves intentional through-boundary cutouts and full-width dados across a mitre', () => {
    const through = pocket();
    through.cutType = 'cutout';
    through.parameters.depthMode = 'through';
    through.placement.x = 6.75;
    const dado = pocket();
    dado.cutType = 'dado';
    dado.placement = { x: 6.75, z: 0 };
    expect(validateRectCutFeature(through, blank([end(), through]))).toBeNull();
    expect(validateRectCutFeature(dado, blank([end(), dado]))).toBeNull();
    const opening = rounded();
    opening.parameters.depthMode = 'through';
    opening.placement.primary = 2;
    expect(validateRoundedCut(opening, blank([end(), opening]))).toBeNull();
  });
  it.each(
    (['rounded', 'rectangular'] as const).flatMap((kind) =>
      (['bevel', 'tenon'] as const).flatMap((removal) => [3.5, 3.9, 4.5].map((primary) => ({ kind, removal, primary })))
    )
  )('B supports $kind pockets after $removal at x=$primary', ({ kind, removal, primary }) => {
    const cut = kind === 'rounded' ? rounded() : pocket();
    if (cut.kind === 'rounded_cut') cut.placement = { primary, secondary: 0, rotation: 30 };
    else cut.placement = { x: primary + 4.75, z: 1.75 };
    const bevel = end('right_end', 'bevel');
    bevel.parameters.verticalFlip = true;
    const tongue: RectCutFeature = {
      ...pocket(),
      cutType: 'tenon',
      target: { type: 'face', face: 'right_end' },
      placement: { x: 0, z: 1 },
      parameters: { size: { length: 1, width: 2 }, depthMode: 'blind', depth: 0.5 }
    };
    const part = blank([removal === 'bevel' ? bevel : tongue, cut]);
    const issue = cut.kind === 'rounded_cut' ? validateRoundedCut(cut, part) : validateRectCutFeature(cut, part);
    expect(issue).toEqual(primary === 3.5 ? null : expect.stringContaining('remaining material'));
  });
  it.each((['front_face', 'back_face'] as const).flatMap((face) => [4.2, 4.4].map((primary) => ({ face, primary }))))(
    'B checks the full $face pocket depth at x=$primary',
    ({ face, primary }) => {
      const cut = pocket();
      cut.target = { type: 'face', face };
      cut.placement = { x: primary + 4.75, z: 0.375 };
      cut.parameters = { size: { length: 0.5, width: 0.25 }, depthMode: 'blind', depth: 0.5 };
      const mitre = end();
      mitre.parameters.horizontalFlip = face === 'back_face';
      expect(validateRectCutFeature(cut, blank([mitre, cut]))).toEqual(
        primary === 4.2 ? null : expect.stringContaining('remaining material')
      );
    }
  );
  it('C rejects complete removal by rounded and end-cut families without a rectangular cut', () => {
    const { stock, part } = roundedRemovalFixture();
    expect(getPartMaterialVolume(stock)).toBeCloseTo(15, 6);
    expect(getPartMaterialVolume(part)).toBe(0);
    expect(getPartRenderGeometry(part).getAttribute('position').count).toBe(0);
    expect(getPartLocalConvexVertices(part)).toEqual([]);
    expect
      .soft(getPartFeatureConflicts(part.features, part))
      .toContainEqual(expect.objectContaining({ code: 'no_material', severity: 'error' }));
    expect(validatePartsForCutList([part], [])).toContainEqual(
      expect.objectContaining({ type: 'feature_validation', severity: 'error' })
    );
  });
  it('C accepts nearby retained material and ignores malformed dimensions in solid evaluation', () => {
    const { part, cut } = roundedRemovalFixture(3.9);
    expect(getPartMaterialVolume(part)).toBeGreaterThan(0.001);
    expect(getPartFeatureConflicts(part.features, part).filter((issue) => issue.severity === 'error')).toEqual([]);
    const malformed = { ...cut, parameters: { ...cut.parameters, width: NaN } };
    expect(validateRoundedCut(malformed, part)).toMatch(/greater than zero/);
    expect(() => getPartFeatureConflicts([...part.features.slice(0, -1), malformed], part)).not.toThrow();
  });
  it.each(
    [end(), pocket(), rounded(), bore()].flatMap((feature) =>
      (['label', 'id'] as const).map((property) => ({ feature, property }))
    )
  )('D reuses $feature.kind geometry when only $property changes', ({ feature, property }) => {
    const geometry = getPartRenderGeometry(blank([feature]));
    expect(getPartRenderGeometry(blank([{ ...feature, [property]: 'another value' }]))).toBe(geometry);
  });
  it('D reuses the hole mesh across relationship-only metadata changes', () => {
    const feature = bore();
    const geometry = getPartRenderGeometry(blank([feature]));
    expect(
      getPartRenderGeometry(
        blank([
          {
            ...feature,
            metadata: {
              dowelJoint: {
                jointId: 'new-joint',
                matePartId: 'copied-mate',
                memberIndex: 0,
                dowelDiameter: 0.25,
                dowelLength: 0.5,
                embedmentDepth: 0.25
              }
            }
          }
        ])
      )
    ).toBe(geometry);
    expect(
      getPartRenderGeometry(blank([{ ...feature, parameters: { ...feature.parameters, diameter: 0.375 } }]))
    ).not.toBe(geometry);
  });
  it('D invalidates geometry when authored dimensions or cut angle change', () => {
    const feature = end();
    const part = blank([feature]);
    const geometry = getPartRenderGeometry(part);
    expect(getPartRenderGeometry({ ...part, length: 11 })).not.toBe(geometry);
    expect(
      getPartRenderGeometry(blank([{ ...feature, parameters: { ...feature.parameters, horizontalAngle: 30 } }]))
    ).not.toBe(geometry);
    const opening = rounded();
    const openingGeometry = getPartRenderGeometry(blank([opening]));
    expect(
      getPartRenderGeometry(blank([{ ...opening, reference: { ...opening.reference, primaryFrom: 'min' } }]))
    ).not.toBe(openingGeometry);
  });
});
