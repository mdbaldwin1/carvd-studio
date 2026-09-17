import { SidebarProvider } from '@renderer/components/ui/sidebar';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../../tests/helpers/factories';
import { CutsSection } from '@renderer/components/layout/sidebar/CutsSection';
import { CutProperties } from '@renderer/components/part-cuts/CutProperties';
import { PartCutsEditorProvider, type PartCutsEditorProviderProps } from './PartCutsEditorContext';
import { PartCutsWorkspace } from './PartCutsWorkspace';

vi.unmock('three');

type WorkspaceProps = Omit<PartCutsEditorProviderProps, 'children'>;

/**
 * The inspector reads everything from the editor context, so a field test has
 * to mount the same provider the app does and reach the field the way an
 * operator does: add a cut of the right kind, then edit it.
 */
function renderWorkspace(overrides: Partial<WorkspaceProps> = {}) {
  const props: WorkspaceProps = {
    part: createTestPart({ name: 'Panel', length: 24, width: 12, thickness: 0.75 }),
    draftFeatures: [],
    units: 'imperial',
    selectedFeatureId: null,
    hoveredTarget: null,
    pendingTarget: null,
    onSelectFeature: vi.fn(),
    onDraftFeaturesChange: vi.fn(),
    onHoveredTargetChange: vi.fn(),
    onPendingTargetChange: vi.fn(),
    onExit: vi.fn(),
    hasUnsavedChanges: false,
    ...overrides
  };
  render(
    <SidebarProvider>
      <PartCutsEditorProvider {...props}>
        <CutsSection isCollapsed={false} onOpenChange={() => {}} />
        <PartCutsWorkspace />
        <CutProperties />
      </PartCutsEditorProvider>
    </SidebarProvider>
  );
  return props;
}

/** Open the add-cut flow and choose an operation preset. */
function startCut(presetLabel: string) {
  fireEvent.click(screen.getByTitle('Add Cut'));
  fireEvent.click(screen.getByText(presetLabel));
}

/** Type into a measurement field the way the inspector's own tests do. */
function setMeasurement(ariaLabel: string, value: string) {
  const input = screen.getByRole('textbox', { name: ariaLabel });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
  return input as HTMLInputElement;
}

const inspector = () => screen.getByRole('complementary', { name: 'Cut properties' });
const inspectorAlert = () => within(inspector()).queryByRole('alert');

describe('CutProperties measurement and placement fields', () => {
  it('retargets a tenon to the other end of the board', () => {
    renderWorkspace();
    startCut('Tenon');
    fireEvent.click(within(inspector()).getByRole('button', { name: 'Right End' }));
    expect(within(inspector()).getByRole('button', { name: 'Right End' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('moves an edge profile onto a different edge', () => {
    renderWorkspace();
    startCut('Edge Profile');
    fireEvent.click(within(inspector()).getByRole('button', { name: 'Top-Back Edge' }));
    expect(within(inspector()).getByRole('button', { name: 'Top-Back Edge' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('sizes an edge profile from its size and depth', () => {
    renderWorkspace();
    startCut('Edge Profile');
    expect(setMeasurement('Profile Size', '3/8').value).toBe('3/8');
    expect(setMeasurement('Profile Depth', '1/4').value).toBe('1/4');
    expect(inspectorAlert()).toBeNull();
  });

  it('widens a counterbore past its pilot hole', () => {
    renderWorkspace();
    startCut('Counterbore');
    expect(setMeasurement('Counterbore Diameter', '1/2').value).toBe('1/2');
    expect(inspectorAlert()).toBeNull();
  });

  it('sizes a rounded rectangle and sinks it to a blind depth', () => {
    renderWorkspace();
    startCut('Rounded Rectangle');
    expect(setMeasurement('Opening Length', '2').value).toBe('2');
    expect(setMeasurement('Opening Width', '1').value).toBe('1');
    expect(setMeasurement('Corner Radius', '1/8').value).toBe('1/8');

    fireEvent.change(screen.getByLabelText('Depth'), { target: { value: 'blind' } });
    expect(setMeasurement('Opening Depth', '1/4').value).toBe('1/4');
    expect(inspectorAlert()).toBeNull();
  });

  it('takes a routed path through the board and closes it back on itself', () => {
    renderWorkspace();
    startCut('Routed Path');
    // A two-point path cannot be closed, which is what the control disables.
    expect((screen.getByLabelText('Close path back to first point') as HTMLInputElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Add Point' }));
    const closePath = screen.getByLabelText('Close path back to first point') as HTMLInputElement;
    expect(closePath.disabled).toBe(false);
    fireEvent.click(closePath);
    expect((screen.getByLabelText('Close path back to first point') as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByLabelText('Close path back to first point'));
    expect((screen.getByLabelText('Close path back to first point') as HTMLInputElement).checked).toBe(false);

    fireEvent.change(screen.getByLabelText('Depth'), { target: { value: 'through' } });
    expect((screen.getByLabelText('Depth') as HTMLSelectElement).value).toBe('through');
  });

  it('offsets a round hole across the face it sits on', () => {
    renderWorkspace();
    startCut('Round Hole');
    expect(setMeasurement('Offset Across Face', '1').value).toBe('1');
    expect(inspectorAlert()).toBeNull();
  });

  it('offsets a mortise across the board width', () => {
    renderWorkspace();
    startCut('Mortise');
    expect(setMeasurement('Offset Across Width', '2').value).toBe('2');
    expect(inspectorAlert()).toBeNull();
  });

  it('steers a linear repeat off the board axis', () => {
    renderWorkspace();
    startCut('Round Hole');
    fireEvent.change(screen.getByLabelText('Repeating Pattern'), { target: { value: 'linear' } });
    fireEvent.change(screen.getByLabelText('Direction'), { target: { value: '30' } });
    expect((screen.getByLabelText('Direction') as HTMLInputElement).value).toBe('30');
  });

  it('spaces and rotates a grid repeat', () => {
    renderWorkspace();
    startCut('Round Hole');
    fireEvent.change(screen.getByLabelText('Repeating Pattern'), { target: { value: 'grid' } });
    expect(setMeasurement('Row Spacing', '1').value).toBe('1');
    fireEvent.change(screen.getByLabelText('Grid Rotation'), { target: { value: '15' } });
    expect((screen.getByLabelText('Grid Rotation') as HTMLInputElement).value).toBe('15');
  });

  it('starts a circular repeat at a chosen angle', () => {
    renderWorkspace();
    startCut('Round Hole');
    fireEvent.change(screen.getByLabelText('Repeating Pattern'), { target: { value: 'circular' } });
    fireEvent.change(screen.getByLabelText('Start Angle'), { target: { value: '45' } });
    expect((screen.getByLabelText('Start Angle') as HTMLInputElement).value).toBe('45');
  });
});
