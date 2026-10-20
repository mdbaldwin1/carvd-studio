/** Release regressions and explicit capability boundaries for all twelve shop-workflow issue classes.
 * Historical audit evidence is immutable; these tests do not write observations or scratch projects.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CutListModal } from '../../src/renderer/src/components/stock/CutListModal';
import { CutListPartsTab } from '../../src/renderer/src/components/stock/CutListPartsTab';
import { createTestPart, createTestStock } from '../helpers/factories';
import type { CircularCutFeature, Part, RectCutFeature, RoutedPathFeature, Stock } from '../../src/renderer/src/types';
import { generateOptimizedCutList } from '../../src/renderer/src/utils/cutListOptimizer';
import { getInstructionFabricationLines } from '../../src/renderer/src/utils/cutListInstructions';
import { exportCutListToCsv, exportShoppingListToCsv } from '../../src/renderer/src/utils/pdfExport';
import { useProjectStore, validatePartsForCutList } from '../../src/renderer/src/store/projectStore';
import { useSelectionStore } from '../../src/renderer/src/store/selectionStore';
import { useLicenseStore } from '../../src/renderer/src/store/licenseStore';
import { getJointFitIssues } from '../../src/renderer/src/utils/jointFit';
import { needsMovementAllowance } from '../../src/renderer/src/utils/woodMovement';
import { getCutSetups } from '../../src/renderer/src/utils/cutSetups';
import { planInsertSocket } from '../../src/renderer/src/utils/insertSocket';
import { partsOverlap, wouldTransformedPartsOverlap } from '../../src/renderer/src/utils/overlapPolicy';
import { validateSerializedPartFeatures } from '../../src/renderer/src/utils/partFeatures';
vi.unmock('three');
const observations: Record<string, unknown> = {};
const stock = (changes: Partial<Stock> = {}) =>
  createTestStock({
    id: 'stock',
    name: 'Solid hardwood',
    form: 'board',
    length: 48,
    width: 12,
    thickness: 0.75,
    ...changes
  });
const part = (changes: Partial<Part> = {}) =>
  createTestPart({ id: 'part', name: 'Sample part', stockId: 'stock', length: 12, width: 4, ...changes });
const report = (parts: Part[], stocks: Stock[], overage = 0) =>
  generateOptimizedCutList(parts, stocks, 0.125, overage, '2026-09-29T00:00:00Z', []);
const hole: CircularCutFeature = {
  id: 'hole',
  version: 1,
  enabled: true,
  kind: 'circular_cut',
  cutType: 'round_hole',
  label: 'Cross drill bought tenon',
  target: { type: 'face', face: 'top_face' },
  reference: { primaryFrom: 'center', secondaryFrom: 'center' },
  placement: { primary: 0, secondary: 0, rotation: 0 },
  parameters: { diameter: 0.125, depthMode: 'through', tilt: 0, direction: 0 }
};
const dado = (width: number): RectCutFeature => ({
  id: 'dado',
  kind: 'rect_cut',
  version: 1,
  enabled: true,
  cutType: 'dado',
  target: { type: 'face', face: 'top_face' },
  reference: { primaryFrom: 'min' },
  parameters: { size: { length: width, width: 8 }, depthMode: 'blind', depth: 0.25 },
  placement: { x: 8, z: 0 }
});
beforeEach(() => {
  useLicenseStore.setState({ licenseMode: 'licensed' });
  useProjectStore.setState({
    parts: [],
    stocks: [],
    groups: [],
    groupMembers: [],
    customShoppingItems: [],
    cutList: null,
    stockConstraints: { constrainDimensions: true, constrainGrain: true, constrainColor: true, preventOverlap: false }
  });
  useSelectionStore.setState({ selectedPartIds: [], selectedGroupIds: [] });
});

describe('shop workflow release contracts', () => {
  it('records blank allowances separately from authored tenon geometry', () => {
    const tenon: RectCutFeature = {
      id: 'tenon',
      kind: 'rect_cut',
      version: 1,
      enabled: true,
      cutType: 'tenon',
      target: { type: 'face', face: 'right_end' },
      reference: { primaryFrom: 'min' },
      placement: { x: 0, z: 0.5 },
      parameters: { size: { length: 1, width: 3 }, depthMode: 'blind', depth: 0.25 }
    };
    const p = part({ length: 12, extraLength: 2, extraWidth: 0.5, features: [tenon] });
    const r = report([p], [stock()]);
    expect(r.instructions[0].cutLength).toBe(14);
    expect(r.instructions[0].cutWidth).toBe(4.5);
    expect(r.instructions[0]).toMatchObject({ finishedLength: 12, finishedWidth: 4 });
    expect(getInstructionFabricationLines(r.instructions[0], 'imperial').join(' ')).toContain(
      'Finished modeled envelope'
    );
    expect(exportCutListToCsv(r, 'imperial')).toContain('Finished');
    observations.blankSizing = {
      modeledLength: p.length,
      extraLength: p.extraLength,
      instruction: r.instructions[0],
      fabrication: getInstructionFabricationLines(r.instructions[0], 'imperial'),
      csv: exportCutListToCsv(r, 'imperial')
    };
  });

  it('reproduces manual hardware quantity remaining unchanged after group duplication', () => {
    const p = part();
    useProjectStore.setState({
      stocks: [stock()],
      parts: [p],
      groups: [{ id: 'g', name: 'Fastened assembly' }],
      groupMembers: [{ id: 'm', groupId: 'g', memberType: 'part', memberId: p.id }],
      customShoppingItems: [{ id: 'bolt', name: 'Bolt for assembly', quantity: 1, unitPrice: 2 }]
    });
    useSelectionStore.setState({ selectedGroupIds: ['g'] });
    useProjectStore.getState().duplicateSelectedParts();
    const state = useProjectStore.getState();
    expect(state.parts).toHaveLength(2);
    expect(state.customShoppingItems[0].quantity).toBe(1);
    observations.assemblyQuantities = {
      parts: state.parts.length,
      groups: state.groups.length,
      hardware: state.customShoppingItems
    };
  });

  it('inherits constrained grain on sheet-to-solid-stock assignment', () => {
    const p = part({ width: 10, grainSensitive: false });
    useProjectStore.setState({ parts: [p], stocks: [stock({ name: 'Plywood', form: 'sheet' }), stock({ id: 'oak' })] });
    useSelectionStore.setState({ selectedPartIds: [p.id] });
    useProjectStore.getState().assignStockToSelectedParts('oak');
    const after = useProjectStore.getState().parts[0];
    const r = report([after], useProjectStore.getState().stocks);
    expect(after.grainSensitive).toBe(true);
    expect(r.instructions[0].canRotate).toBe(false);
    expect(
      needsMovementAllowance(
        after,
        useProjectStore.getState().stocks.find((s) => s.id === 'oak')
      )
    ).toBe(true);
    observations.grain = {
      assigned: after,
      canRotate: r.instructions[0].canRotate,
      movementAllowance: r.instructions[0].movementAllowance ?? null,
      issues: validatePartsForCutList([after], useProjectStore.getState().stocks)
    };
  });

  it('preserves bought-insert machining without nesting it as raw material', () => {
    const s = stock({
      form: 'insert',
      insertKind: 'loose_tenon',
      length: 2,
      width: 0.5,
      thickness: 0.25,
      packSize: 10
    });
    const p = part({ length: 2, width: 0.5, thickness: 0.25, features: [hole] });
    const r = report([p], [s]);
    expect(validatePartsForCutList([p], [s])).toEqual([]);
    expect(r.instructions).toHaveLength(0);
    expect(r.postGlueUpInstructions ?? []).toHaveLength(0);
    expect(getCutSetups(r.postPurchaseInstructions ?? [], 'imperial')).toHaveLength(1);
    expect(r.postPurchaseInstructions?.[0].features).toEqual([hole]);
    expect(exportCutListToCsv(r, 'imperial')).toContain('Cross drill bought tenon');
    observations.purchasedMachining = {
      issues: [],
      instructionCount: r.postPurchaseInstructions?.length,
      purchase: r.statistics.byStock,
      cutCsv: exportCutListToCsv(r, 'imperial')
    };
  });

  it('blocks a catalog-size mismatch while preserving assembled geometry for deliberate repair', () => {
    const s = stock({ form: 'insert', insertKind: 'loose_tenon', length: 2, width: 0.5, thickness: 0.25 });
    useProjectStore.setState({ parts: [part({ length: 2, width: 0.5, thickness: 0.25 })], stocks: [s] });
    useProjectStore.getState().updateStock(s.id, { length: 3, width: 0.75, thickness: 0.375 });
    const state = useProjectStore.getState();
    const issues = validatePartsForCutList(state.parts, state.stocks);
    expect(state.parts[0].length).toBe(2);
    expect(issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'purchased_size_mismatch', severity: 'error' })])
    );
    observations.catalogIdentity = {
      part: state.parts[0],
      stock: state.stocks[0],
      issues,
      purchase: report(state.parts, state.stocks).statistics.byStock
    };
  });

  it('probes blind routed depth and enclosed undercut entry validation', () => {
    const base: RoutedPathFeature = {
      id: 'route',
      kind: 'routed_path',
      version: 1,
      enabled: true,
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'center', secondaryFrom: 'center' },
      path: {
        points: [
          { primary: -2, secondary: 0 },
          { primary: 2, secondary: 0 }
        ]
      },
      bit: { profile: 'straight', diameter: 0.25 },
      parameters: { depthMode: 'blind', depth: 2 }
    };
    const enclosed: RoutedPathFeature = {
      ...base,
      bit: { profile: 't_slot', diameter: 0.5, shankDiameter: 0.25, cutterHeight: 0.125 },
      parameters: { depthMode: 'blind', depth: 0.4 }
    };
    observations.toolAccess = [base, enclosed].map((feature) => ({
      feature,
      serializedErrors: validateSerializedPartFeatures([feature], 'features'),
      projectIssues: validatePartsForCutList([part({ features: [feature] })], [stock()])
    }));
    const findings = observations.toolAccess as Array<{ projectIssues: Array<{ severity: string; message: string }> }>;
    expect(findings[0].projectIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: 'error', message: expect.stringContaining('Route depth') })
      ])
    );
    // Entry sequencing remains explicitly outside static feature validation.
    expect(findings[1].projectIssues).toEqual([]);
  });

  it('retains machining on the assembled panel rather than its stock strips', () => {
    const p = part({ width: 10, glueUpPanel: true, features: [hole] });
    const r = report([p], [stock({ width: 6 })]);
    expect(r.postGlueUpInstructions).toHaveLength(1);
    expect(getCutSetups(r.instructions, 'imperial')).toHaveLength(0);
    expect(getCutSetups(r.postGlueUpInstructions ?? [], 'imperial')).toHaveLength(1);
    expect(exportCutListToCsv(r, 'imperial')).toContain('Cross drill bought tenon');
    observations.operationOrder = {
      strips: r.instructions.length,
      postGlueUp: r.postGlueUpInstructions,
      visibleSetupCount: getCutSetups(r.instructions, 'imperial').length,
      csvContainsOperation: true
    };
  });

  it('demonstrates final-state collision checks cannot establish an assembly path', () => {
    const cube = part({ id: 'cube', length: 1, width: 1, thickness: 1, position: { x: 0, y: 3, z: 0 } });
    const walls = [
      part({ id: 'left', length: 0.5, width: 4, thickness: 4, position: { x: -1.75, y: 3, z: 0 } }),
      part({ id: 'right', length: 0.5, width: 4, thickness: 4, position: { x: 1.75, y: 3, z: 0 } }),
      part({ id: 'front', length: 3, width: 0.5, thickness: 4, position: { x: 0, y: 3, z: -1.75 } }),
      part({ id: 'back', length: 3, width: 0.5, thickness: 4, position: { x: 0, y: 3, z: 1.75 } }),
      part({ id: 'bottom', length: 3, width: 3, thickness: 0.5, position: { x: 0, y: 1.25, z: 0 } }),
      part({ id: 'top', length: 3, width: 3, thickness: 0.5, position: { x: 0, y: 4.75, z: 0 } })
    ];
    expect(walls.some((wall) => partsOverlap(cube, wall))).toBe(false);
    const outside = { ...cube, position: { x: 10, y: 3, z: 0 } };
    expect(wouldTransformedPartsOverlap([outside, ...walls], new Map([[cube.id, cube]]))).toBe(false);
    const blocked = ['x', 'y', 'z'].flatMap((axis) =>
      [-1, 1].map((sign) =>
        walls.some((wall) =>
          partsOverlap(
            { ...cube, position: { ...cube.position, [axis]: cube.position[axis as 'x' | 'y' | 'z'] + sign * 1.5 } },
            wall
          )
        )
      )
    );
    expect(blocked.every(Boolean)).toBe(true);
    observations.assemblySequence = {
      finalPoseAccepted: true,
      sixStraightInsertionDirectionsBlocked: blocked,
      limitation: 'Final-pose checks do not simulate inserting a rigid cube into an already closed box.'
    };
  });

  it('measures fit warning threshold with slight and large interference', () => {
    observations.fitAllowances = [0, 0.005, 0.02, 0.04, -0.02, -0.04].map((delta) => {
      const side = part({ id: 'side', length: 18, width: 8, features: [dado(0.71875)] });
      const shelf = part({
        id: 'shelf',
        length: 8,
        width: 8,
        thickness: 0.71875 + delta,
        rotation: { x: 0, y: 0, z: 90 },
        position: { x: -9 + 8 + 0.71875 / 2, y: 0.75 - 0.25 + 4, z: 0 }
      });
      return {
        deltaInches: delta,
        issues: getJointFitIssues([side, shelf]),
        finalCollision: partsOverlap(side, shelf)
      };
    });
    const fits = observations.fitAllowances as Array<{ deltaInches: number; issues: unknown[] }>;
    expect(fits.find((r) => r.deltaInches === 0.02)!.issues).toHaveLength(1);
    expect(fits.find((r) => r.deltaInches === 0.005)!.issues).toHaveLength(1);
    expect(fits.find((r) => r.deltaInches === 0)!.issues).toHaveLength(0);
    expect(fits.find((r) => r.deltaInches === 0.04)!.issues.length).toBeGreaterThan(0);
    const s = stock({ form: 'rod', width: 0.375, thickness: 0.375 });
    const pin = part({ id: 'pin', length: 1, width: 0.375, thickness: 0.375, blankShape: 'round' });
    const socket = planInsertSocket(part(), pin, [s], {
      face: 'top_face',
      fromStart: 6,
      fromNearEdge: 2,
      insertion: 0.5,
      clearance: 0.01,
      bottomSpace: 0.04
    });
    expect(socket.error).toBeNull();
    observations.socketClearance = socket.features;
  });

  it('retains warning-only validation in the dialog, report and CSV', () => {
    const side = part({ id: 'side', length: 18, width: 8, features: [dado(0.71875)] });
    const shelf = part({
      id: 'shelf',
      length: 8,
      width: 8,
      thickness: 0.75875,
      rotation: { x: 0, y: 0, z: 90 },
      position: { x: -9 + 8 + 0.71875 / 2, y: 0.75 - 0.25 + 4, z: 0 }
    });
    const stocks = [stock({ thickness: 1 })];
    const issues = validatePartsForCutList([side, shelf], stocks);
    const warning = issues.find((i) => i.type === 'joint_fit')!;
    expect(warning).toBeDefined();
    expect(issues.some((i) => i.severity === 'error')).toBe(false);
    useProjectStore.setState({ parts: [side, shelf], stocks, cutList: null, units: 'imperial' });
    render(React.createElement(CutListModal, { isOpen: true, onClose: () => {} }));
    fireEvent.click(screen.getByText('Generate Cut List'));
    expect(useProjectStore.getState().cutList).not.toBeNull();
    expect(screen.getAllByText(warning.message, { exact: false }).length).toBeGreaterThan(0);
    expect(useProjectStore.getState().cutList?.validationIssues).toEqual(expect.arrayContaining([warning]));
    expect(exportCutListToCsv(useProjectStore.getState().cutList!, 'imperial')).toContain(
      warning.message.replaceAll('"', '""')
    );
    observations.warningVisibility = { warning, rendered: true, generated: true };
    cleanup();
  });

  it('includes post-glue-up machining in stage-aware setup grouping', () => {
    const p = part({ width: 10, glueUpPanel: true, features: [hole] });
    const r = report([p], [stock({ width: 6 })]);
    expect(r.postGlueUpInstructions).toHaveLength(1);
    render(
      React.createElement(CutListPartsTab, { cutList: r, units: 'imperial', projectName: 'Audit', canExportPDF: true })
    );
    expect(screen.getAllByText(/Cross drill bought tenon/).length).toBeGreaterThan(0);
    expect(screen.getByRole('region', { name: 'Operations by setup' })).toBeDefined();
    observations.renderedPostGlueUp = {
      operationVisible: true,
      setupGroupingVisible: true,
      csvContainsOperation: exportCutListToCsv(r, 'imperial').includes('Cross drill bought tenon')
    };
    cleanup();
  });

  it('records hardware compatibility as manually authored purchasing information', () => {
    const items = [
      { id: 'metric', name: 'M6 bolt', quantity: 1, unitPrice: 0 },
      { id: 'imperial', name: '1/4-20 nut', quantity: 1, unitPrice: 0 }
    ];
    useProjectStore.setState({ customShoppingItems: items });
    const r = report([part()], [stock()]);
    const csv = exportShoppingListToCsv(r, items, 'imperial');
    expect(csv).toContain('M6 bolt');
    expect(csv).toContain('1/4-20 nut');
    observations.hardwareCompatibility = {
      items,
      projectIssues: validatePartsForCutList([part()], [stock()]),
      limitation: 'Shopping items have no structured thread, head, engagement or assembly relationship.'
    };
  });

  it('demonstrates motion can collide despite a valid rest pose', () => {
    const leaf = part({ id: 'leaf', length: 4, width: 1, thickness: 0.25, position: { x: 0, y: 3, z: 0 } });
    const obstruction = part({ id: 'stop', length: 1, width: 1, thickness: 0.25, position: { x: 0, y: 3, z: 1.5 } });
    expect(partsOverlap(leaf, obstruction)).toBe(false);
    const rotated = { ...leaf, rotation: { x: 0, y: 90, z: 0 } };
    expect(partsOverlap(rotated, obstruction)).toBe(true);
    observations.motion = {
      restCollision: false,
      at90DegreesCollision: true,
      limitation: 'No hinge pivot, travel range or motion sweep is modeled. This probe rotates about the part center.'
    };
  });

  it('records material movement inference and corrected sheet thickness handling', () => {
    const sheet = stock({ form: 'sheet', name: 'Plywood' });
    const panel = part({ width: 10, grainSensitive: true });
    const r = report([panel], [sheet]);
    expect(r.instructions[0].movementAllowance).toBeUndefined();
    const thinIssues = validatePartsForCutList([part({ thickness: 0.125 })], [sheet]);
    expect(thinIssues.some((i) => i.type === 'stock_thickness_mismatch')).toBe(true);
    observations.materialProperties = {
      plywoodMovementAllowance: r.instructions[0].movementAllowance,
      reason: 'Sheet face-grain orientation does not imply solid wood seasonal movement.',
      thinSheetRejected: true
    };
  });

  it('invalidates reset reports and restores matching state through undo and redo', () => {
    const p = part({ length: 10, width: 3 });
    const s = stock({ length: 24, width: 6 });
    const r = report([p], [s]);
    useProjectStore.setState({ parts: [p], stocks: [s], cutList: r });
    useSelectionStore.setState({ selectedPartIds: [p.id] });
    useProjectStore.temporal.getState().clear();
    useProjectStore.getState().resetSelectedPartsToStock();
    const state = useProjectStore.getState();
    expect(state.parts[0].length).toBe(24);
    expect(state.cutList!.isStale).toBe(true);
    expect(state.cutList!.instructions[0].cutLength).toBe(10);
    observations.staleReports = {
      actualLength: state.parts[0].length,
      reportedLength: state.cutList!.instructions[0].cutLength,
      isStale: state.cutList!.isStale
    };
    useProjectStore.temporal.getState().undo();
    expect(useProjectStore.getState().parts[0].length).toBe(10);
    expect(useProjectStore.getState().cutList!.isStale).toBe(false);
    useProjectStore.temporal.getState().redo();
    expect(useProjectStore.getState().parts[0].length).toBe(24);
    expect(useProjectStore.getState().cutList!.isStale).toBe(true);
    useProjectStore.getState().updatePart(p.id, { length: 20 });
    expect(useProjectStore.getState().cutList!.isStale).toBe(true);
    observations.ordinaryEditInvalidates = true;
  });

  it('records incomplete prices and area-only waste estimates', () => {
    const p = part({ length: 12, width: 4, thickness: 0.125 });
    const s = stock({ length: 12, width: 4, thickness: 0.75 });
    const r = report([p], [s]);
    const items = [{ id: 'unknown', name: 'Unpriced hinge', quantity: 1, unitPrice: 0 }];
    const csv = exportShoppingListToCsv(r, items, 'imperial');
    expect(r.statistics.wastePercentage).toBe(0);
    observations.estimates = {
      nestingWastePercent: r.statistics.wastePercentage,
      thicknessRemovalPercent: 100 * (1 - p.thickness / s.thickness),
      preparationNote: r.instructions[0].notes,
      shoppingCsv: csv,
      limitation: 'Area utilization omits thicknessing removal; zero price cannot distinguish free from unpriced.'
    };
  });
});
