import { deserializeToProject, serializeProject } from './fileFormat';
import { normalizeSavedCutList } from './cutListVersion';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { createTestPart, createTestStock } from '../../../../tests/helpers/factories';
import type { CircularCutFeature, PartValidationIssue } from '../types';
import { generateOptimizedCutList } from './cutListOptimizer';
import { exportCutListToCsv } from './pdfExport';
import { getCutSetups } from './cutSetups';
import { getInstructionFabricationSummary, groupCutInstructions } from './cutListInstructions';
import { CutListPartsTab } from '../components/stock/CutListPartsTab';
import { CutListModal } from '../components/stock/CutListModal';
import { useProjectStore } from '../store/projectStore';
vi.unmock('three');
afterEach(cleanup);
const hole: CircularCutFeature = {
  id: 'hole',
  version: 1,
  enabled: true,
  kind: 'circular_cut',
  cutType: 'round_hole',
  label: 'Cross drill',
  target: { type: 'face', face: 'top_face' },
  reference: { primaryFrom: 'center', secondaryFrom: 'center' },
  placement: { primary: 0, secondary: 0, rotation: 0 },
  parameters: { diameter: 0.125, depthMode: 'through', tilt: 0, direction: 0 }
};
const stock = createTestStock({ id: 'wood', form: 'board', length: 48, width: 6, thickness: 0.75 });
const part = createTestPart({ id: 'part', stockId: stock.id, length: 12, width: 4, features: [hole] });
const report = () => generateOptimizedCutList([part], [stock], 0.125, 0, 'now', []);
describe('complete staged fabrication handoff', () => {
  it('buys inserts once without nesting, but retains enabled post-purchase work in UI and CSV', () => {
    const insert = createTestStock({ id: 'insert', form: 'insert', length: 2, width: 0.5, thickness: 0.25 });
    const component = createTestPart({
      id: 'bought',
      name: 'Bought tenon',
      stockId: insert.id,
      length: 2,
      width: 0.5,
      thickness: 0.25,
      features: [hole, { ...hole, id: 'off', enabled: false, label: 'Disabled operation' }]
    });
    const r = generateOptimizedCutList([component], [insert], 0.125, 0.1, 'now', []);
    expect(r.instructions).toEqual([]);
    expect(r.stockBoards).toEqual([]);
    expect(r.statistics.byStock[0].insertsNeeded).toBe(1);
    expect(r.postPurchaseInstructions?.[0].features).toEqual([hole]);
    const csv = exportCutListToCsv(r, 'imperial');
    expect(csv).toContain('Cross drill');
    expect(csv).toContain('After purchase');
    expect(csv).not.toContain('Disabled operation');
    render(<CutListPartsTab cutList={r} units="imperial" projectName="Test" canExportPDF />);
    expect(
      within(screen.getByRole('region', { name: 'After purchase — component machining' })).getByText('Bought tenon')
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Operations by setup' })).getByText(/After purchase · Drill/)
    ).toBeInTheDocument();
  });
  it('keeps identical machine settings separate at each manufacturing stage', () => {
    const r = report();
    const blank = r.instructions[0];
    r.postGlueUpInstructions = [{ ...blank, stage: 'post_glue_up', partId: 'panel', partName: 'Panel' }];
    r.postPurchaseInstructions = [{ ...blank, stage: 'post_purchase', partId: 'bought', partName: 'Bought' }];
    expect(
      getCutSetups([...r.instructions, ...r.postGlueUpInstructions, ...r.postPurchaseInstructions], 'imperial').map(
        (s) => s.stage
      )
    ).toEqual(['Stock blanks', 'After glue-up', 'After purchase']);
    render(<CutListPartsTab cutList={r} units="imperial" projectName="Test" canExportPDF />);
    expect(
      within(screen.getByRole('region', { name: 'Operations by setup' })).getByText(/After glue-up · Drill/)
    ).toBeInTheDocument();
  });
  it('exports the finished envelope and never invents which edges receive the extra stock', () => {
    const r = generateOptimizedCutList([{ ...part, extraLength: 2, extraWidth: 0.5 }], [stock], 0.125, 0, 'now', []);
    const row = r.instructions[0];
    expect(row).toMatchObject({ cutLength: 14, cutWidth: 4.5, finishedLength: 12, finishedWidth: 4 });
    const summary = getInstructionFabricationSummary(row, 'imperial');
    expect(summary).toContain('Finished modeled envelope: 12" × 4"');
    expect(summary).toContain('Allowance is unassigned to edges');
    expect(exportCutListToCsv(r, 'metric')).toContain('304.8mm');
    expect(groupCutInstructions([row, { ...row, finishedLength: 11 }])).toHaveLength(2);
    expect(getInstructionFabricationSummary({ ...row, cutLength: 12 }, 'imperial')).toContain(
      'Allowance is unassigned to edges'
    );
  });
  it('retains warnings in saved reports, reopened UI and exported CSV', () => {
    const warning: PartValidationIssue = {
      partId: part.id,
      partName: part.name,
      type: 'joint_fit',
      severity: 'warning',
      message: 'Joint interference requires review',
      canBypass: false
    };
    const r = generateOptimizedCutList([part], [stock], 0.125, 0, 'now', [warning]);
    expect(r.validationIssues).toEqual([warning]);
    expect(exportCutListToCsv(r, 'imperial')).toContain(warning.message);
    useProjectStore.setState({ parts: [part], stocks: [stock], cutList: r });
    render(<CutListModal isOpen onClose={() => {}} />);
    expect(
      within(screen.getByRole('region', { name: 'Fabrication warnings' })).getByText(warning.message)
    ).toBeInTheDocument();
  });
});

it('roundtrips current fabrication output, invalidating legacy or unknown derived reports only', () => {
  const current = report();
  useProjectStore.setState({ parts: [part], stocks: [stock], cutList: current });
  const file = JSON.parse(JSON.stringify(serializeProject(useProjectStore.getState())));
  expect(deserializeToProject(file).cutList?.isStale).toBe(false);
  delete file.cutList.formatVersion;
  const loaded = deserializeToProject(file);
  expect(loaded.cutList?.isStale).toBe(true);
  expect(loaded.parts[0].length).toBe(part.length);
  expect(normalizeSavedCutList({ ...current, formatVersion: 999 })?.isStale).toBe(true);
  expect(normalizeSavedCutList({ ...current, isStale: true })?.isStale).toBe(true);
});
