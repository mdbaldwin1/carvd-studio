import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestPart, createTestStock } from '../../../../../tests/helpers/factories';
import type { RectCutFeature } from '../../types';
import { useProjectStore } from '../../store/projectStore';
import { usePartCutsEditingStore } from '../../store/partCutsEditingStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useUIStore } from '../../store/uiStore';
import { ProjectIssuesModal } from './ProjectIssuesModal';

const stock = createTestStock({ id: 'stock-1', grainDirection: 'length' });

/** A groove targeting an end, which the validator rejects. */
function invalidCut(id: string): RectCutFeature {
  return {
    id,
    kind: 'rect_cut',
    version: 1,
    enabled: true,
    cutType: 'groove',
    target: { type: 'face', face: 'left_end' },
    reference: { primaryFrom: 'min', secondaryFrom: 'min' },
    parameters: { size: { length: 2, width: 0.25 }, depthMode: 'blind', depth: 0.25 },
    placement: { x: 0, z: 0 }
  };
}

beforeEach(() => {
  useProjectStore.setState({ parts: [], stocks: [stock] });
  useUIStore.setState({ issuesModalOpen: true, issuesModalFocusPartId: null });
  useSelectionStore.setState({ selectedPartIds: [], selectedGroupIds: [] });
  usePartCutsEditingStore.setState({ isEditingPartCuts: false, sourcePartId: null, selectedFeatureId: null });
});

describe('ProjectIssuesModal', () => {
  it('renders nothing while closed', () => {
    useUIStore.setState({ issuesModalOpen: false });
    const { container } = render(<ProjectIssuesModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it('says so when the project is clean', () => {
    useProjectStore.setState({ parts: [createTestPart({ stockId: stock.id })] });
    render(<ProjectIssuesModal />);
    expect(screen.getByText(/No errors or warnings/)).toBeInTheDocument();
  });

  it('lists each issue under its part with a severity count', () => {
    useProjectStore.setState({ parts: [createTestPart({ name: 'Side L', stockId: null })] });
    render(<ProjectIssuesModal />);

    expect(screen.getByText('Side L')).toBeInTheDocument();
    expect(screen.getByText('No stock assigned')).toBeInTheDocument();
    // The header total and the part's own badge agree.
    expect(screen.getAllByText('1 error')).toHaveLength(2);
  });

  it('selects the part and closes when an issue is clicked', () => {
    const part = createTestPart({ name: 'Side L', stockId: null });
    useProjectStore.setState({ parts: [part] });
    render(<ProjectIssuesModal />);

    fireEvent.click(screen.getByText('No stock assigned'));

    expect(useSelectionStore.getState().selectedPartIds).toEqual([part.id]);
    expect(useUIStore.getState().issuesModalOpen).toBe(false);
  });

  it('opens a cut issue straight in the cuts editor, on the offending operation', () => {
    const part = createTestPart({ name: 'Door Rail T', stockId: stock.id, features: [invalidCut('bad-groove')] });
    useProjectStore.setState({ parts: [part] });
    render(<ProjectIssuesModal />);

    fireEvent.click(screen.getByText(/is invalid/));

    const cuts = usePartCutsEditingStore.getState();
    expect(cuts.isEditingPartCuts).toBe(true);
    expect(cuts.sourcePartId).toBe(part.id);
    expect(cuts.selectedFeatureId).toBe('bad-groove');
  });

  it('does not hijack a cuts session already open on another part', () => {
    const part = createTestPart({ name: 'Door Rail T', stockId: stock.id, features: [invalidCut('bad-groove')] });
    useProjectStore.setState({ parts: [part] });
    usePartCutsEditingStore.setState({ isEditingPartCuts: true, sourcePartId: 'someone-else' });
    render(<ProjectIssuesModal />);

    fireEvent.click(screen.getByText(/is invalid/));

    // The part is still selected, but the open draft is left untouched.
    expect(useSelectionStore.getState().selectedPartIds).toEqual([part.id]);
    expect(usePartCutsEditingStore.getState().sourcePartId).toBe('someone-else');
  });
});
