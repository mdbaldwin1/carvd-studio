import { SidebarProvider } from '@renderer/components/ui/sidebar';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createTestPart } from '../../../../../tests/helpers/factories';
import { CutsSection } from '@renderer/components/layout/sidebar/CutsSection';
import { PartCutsEditorProvider } from './PartCutsEditorContext';
import { PartCutsWorkspace } from './PartCutsWorkspace';
import { usePartCutsEditing } from '../../hooks/usePartCutsEditing';
import { usePartCutsEditingStore } from '../../store/partCutsEditingStore';
import { useProjectStore } from '../../store/projectStore';
import type { CircularCutFeature } from '../../types';

vi.unmock('three');
const feature: CircularCutFeature = {
  id: 'hole',
  label: 'Original hole',
  kind: 'circular_cut',
  version: 1,
  enabled: true,
  cutType: 'round_hole',
  target: { type: 'face', face: 'top_face' },
  reference: { primaryFrom: 'center', secondaryFrom: 'center' },
  placement: { primary: 0, secondary: 0, rotation: 0 },
  parameters: { diameter: 0.25, depthMode: 'through', tilt: 0, direction: 0 }
};
function Harness() {
  const session = usePartCutsEditing();
  return (
    <>
      <button onClick={session.saveAndExit}>Global Save</button>
      <button onClick={session.requestExit}>Global Exit</button>
      <output aria-label="Unsaved">{String(session.hasUnsavedChanges)}</output>
      <output aria-label="Exit prompt">{String(session.showExitDialog)}</output>
      {session.isEditingPartCuts && session.sourcePart && (
        <SidebarProvider>
          <PartCutsEditorProvider
            part={session.sourcePart}
            draftFeatures={session.draftFeatures}
            units="imperial"
            selectedFeatureId={session.selectedFeatureId}
            hoveredTarget={session.hoveredTarget}
            pendingTarget={session.pendingTarget}
            hasUnsavedChanges={session.hasUnsavedChanges}
            onSelectFeature={session.selectFeature}
            onDraftFeaturesChange={session.setDraftFeatures}
            onHoveredTargetChange={session.setHoveredTarget}
            onPendingTargetChange={session.setPendingTarget}
            onExit={session.requestExit}
            onSave={session.saveAndExit}
          >
            <CutsSection isCollapsed={false} onOpenChange={() => {}} />
            <PartCutsWorkspace />
          </PartCutsEditorProvider>
        </SidebarProvider>
      )}
    </>
  );
}
function edit(kind: 'label' | 'diameter' | 'invalid') {
  fireEvent.click(screen.getByRole('button', { name: /^1\. Original hole/ }));
  const input =
    kind === 'label'
      ? screen.getByLabelText('Label (optional)')
      : screen.getByRole('textbox', { name: /Hole Diameter/ });
  fireEvent.focus(input);
  fireEvent.change(input, {
    target: { value: kind === 'label' ? 'Renamed hole' : kind === 'diameter' ? '0.375' : '20' }
  });
  fireEvent.blur(input);
}
describe('K7 shared inspector save and dirty lifecycle', () => {
  beforeEach(() => {
    usePartCutsEditingStore.getState().finishEditing();
    const part = createTestPart({
      id: 'board',
      length: 10,
      width: 4,
      thickness: 1,
      features: [globalThis.structuredClone(feature)]
    });
    useProjectStore.setState({ parts: [part], units: 'imperial' });
    useProjectStore.temporal.getState().clear();
    usePartCutsEditingStore.getState().startEditingPartCuts(part.id, part.name, part.features);
  });
  afterEach(() => {
    cleanup();
    usePartCutsEditingStore.getState().finishEditing();
  });
  it.each(['label', 'diameter'] as const)('commits an active %s edit on global Save', (kind) => {
    render(<Harness />);
    edit(kind);
    expect.soft(screen.getByLabelText('Unsaved')).toHaveTextContent('true');
    fireEvent.click(screen.getByRole('button', { name: 'Global Save' }));
    const saved = useProjectStore.getState().parts[0].features![0] as CircularCutFeature;
    if (kind === 'label') expect(saved.label).toBe('Renamed hole');
    else expect(saved.parameters.diameter).toBe(0.375);
    expect(usePartCutsEditingStore.getState().isEditingPartCuts).toBe(false);
    act(() => useProjectStore.temporal.getState().undo());
    expect(useProjectStore.getState().parts[0].features![0]).toEqual(feature);
  });
  it.each(['label', 'diameter'] as const)('prompts before exiting with an uncommitted %s edit', (kind) => {
    render(<Harness />);
    edit(kind);
    fireEvent.click(screen.getByRole('button', { name: 'Global Exit' }));
    expect(usePartCutsEditingStore.getState().isEditingPartCuts).toBe(true);
    expect(screen.getByLabelText('Exit prompt')).toHaveTextContent('true');
  });
  it('keeps invalid active input open on global Save with an actionable error', () => {
    render(<Harness />);
    edit('invalid');
    expect(screen.getByRole('button', { name: 'Save Cut' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Global Save' }));
    expect(usePartCutsEditingStore.getState().isEditingPartCuts).toBe(true);
    expect(screen.getByRole('alert')).toHaveTextContent(/diameter|edge|face/i);
    expect(useProjectStore.getState().parts[0].features![0]).toEqual(feature);
  });
  it.each(['Global Save', 'Global Exit'])('flushes a still-focused fraction input before %s', (action) => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /^1\. Original hole/ }));
    const input = screen.getByRole('textbox', { name: /Hole Diameter/ });
    act(() => input.focus());
    fireEvent.change(input, { target: { value: '.755' } });
    fireEvent.click(screen.getByRole('button', { name: action }));
    if (action === 'Global Save')
      expect((useProjectStore.getState().parts[0].features![0] as CircularCutFeature).parameters.diameter).toBe(0.755);
    else expect(screen.getByLabelText('Exit prompt')).toHaveTextContent('true');
  });
  it('keeps Save Cut local undo separate from the single project save undo', () => {
    render(<Harness />);
    edit('diameter');
    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));
    expect(usePartCutsEditingStore.getState().draftHistory).toHaveLength(1);
    act(() => usePartCutsEditingStore.getState().undoDraft());
    expect(usePartCutsEditingStore.getState().draftFeatures[0]).toEqual(feature);
    act(() => usePartCutsEditingStore.getState().redoDraft());
    fireEvent.click(screen.getByRole('button', { name: 'Global Save' }));
    expect(useProjectStore.temporal.getState().pastStates).toHaveLength(1);
  });
  it.each(['min', 'center', 'max'] as const)('K6 keeps %s reference coordinates on actual Save Cut', (from) => {
    const part = useProjectStore.getState().parts[0];
    const cut = {
      ...globalThis.structuredClone(feature),
      reference: { primaryFrom: from, secondaryFrom: from },
      placement: { primary: 1, secondary: 1, rotation: 0 }
    };
    useProjectStore.setState({ parts: [{ ...part, features: [cut] }] });
    usePartCutsEditingStore.getState().startEditingPartCuts(part.id, part.name, [cut]);
    render(<Harness />);
    edit('label');
    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));
    expect(usePartCutsEditingStore.getState().draftFeatures[0].reference).toEqual(cut.reference);
    fireEvent.click(screen.getByRole('button', { name: 'Global Save' }));
    expect(useProjectStore.getState().parts[0].features![0]).toMatchObject({
      reference: cut.reference,
      placement: cut.placement
    });
  });
});
