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
  it('recesses a thin hinge leaf to its actual thickness', () => {
    const props = renderWorkspace();
    startCut('Mortise');
    setMeasurement('Blind Depth', '0.09');
    expect(props.onDraftFeaturesChange).toHaveBeenLastCalledWith(
      [expect.objectContaining({ parameters: expect.objectContaining({ depth: 0.09 }) })],
      expect.any(Object)
    );
    expect(inspectorAlert()).toBeNull();
  });
  it.each(['Round Hole', 'Rounded Slot'])('places a %s on either side of the face center', (preset) => {
    const props = renderWorkspace();
    startCut(preset);
    setMeasurement('Offset Along Face', '-3');
    setMeasurement('Offset Across Face', '-1');
    expect(props.onDraftFeaturesChange).toHaveBeenLastCalledWith(
      [expect.objectContaining({ placement: expect.objectContaining({ primary: -3, secondary: -1 }) })],
      expect.any(Object)
    );
    expect(inspectorAlert()).toBeNull();
  });
  it('routes from negative face coordinates with a short lead-in beyond the board edge', () => {
    const props = renderWorkspace();
    startCut('Routed Path');
    setMeasurement('Point 1 along face', '-3');
    setMeasurement('Point 1 across face', '-6.1');
    expect(props.onDraftFeaturesChange).toHaveBeenLastCalledWith(
      [
        expect.objectContaining({
          path: expect.objectContaining({
            points: expect.arrayContaining([expect.objectContaining({ primary: -3, secondary: -6.1 })])
          })
        })
      ],
      expect.any(Object)
    );
    expect(inspectorAlert()).toBeNull();
  });

  it('lays out a circle jig across a narrow end face and rejects a route wholly off stock', () => {
    const props = renderWorkspace();
    startCut('Routed Path');
    fireEvent.click(within(inspector()).getByRole('button', { name: 'Left End' }));
    fireEvent.click(screen.getByText('Circle jig'));
    setMeasurement('Circle route radius', '5/8');
    setMeasurement('Circle pivot along face', '-1.5');
    fireEvent.click(screen.getByRole('button', { name: 'Apply circle' }));
    expect(inspectorAlert()).toBeNull();
    const feature = vi.mocked(props.onDraftFeaturesChange).mock.calls.at(-1)?.[0][0];
    expect(feature?.kind).toBe('routed_path');
    if (feature?.kind !== 'routed_path') throw new Error('Expected routed path');
    expect(feature.path.closed).toBe(true);
    expect(feature.path.points).toHaveLength(32);
    expect(feature.path.points[0]).toMatchObject({ primary: -0.875, secondary: 0 });
    setMeasurement('Circle pivot along face', '100');
    fireEvent.click(screen.getByRole('button', { name: 'Apply circle' }));
    expect(
      screen.getByText('This route does not reach the stock. Move the path or its pivot onto the face.')
    ).toBeInTheDocument();
  });

  it('accepts a negative dovetail socket angle and preserves it through other edits', () => {
    const props = renderWorkspace();
    startCut('Cutout');
    fireEvent.click(screen.getByText('Dovetail shaping'));
    const angle = screen.getByRole('spinbutton', { name: 'Socket Side Angle' });
    fireEvent.change(angle, { target: { value: '-10' } });
    fireEvent.blur(angle);
    setMeasurement('Offset Along Length', '2');
    expect(props.onDraftFeaturesChange).toHaveBeenLastCalledWith(
      [expect.objectContaining({ parameters: expect.objectContaining({ sideWallAngle: -10 }) })],
      expect.any(Object)
    );
  });

  it('cuts a matching half lap from the underside without losing its position', () => {
    const props = renderWorkspace();
    startCut('Half Lap');
    setMeasurement('Offset Along Length', '6');
    fireEvent.click(within(inspector()).getByRole('button', { name: 'Bottom Face' }));
    expect(props.onDraftFeaturesChange).toHaveBeenLastCalledWith(
      [
        expect.objectContaining({
          cutType: 'half_lap',
          target: { type: 'face', face: 'bottom_face' },
          placement: expect.objectContaining({ x: 6 })
        })
      ],
      expect.any(Object)
    );
    expect(inspectorAlert()).toBeNull();
  });

  it('marks a dado from the end and a groove from the edge with exact measurements', () => {
    const props = renderWorkspace();
    startCut('Dado');
    setMeasurement('Dado Width', '23/32');
    setMeasurement('Offset Along Length', '6');
    expect(props.onDraftFeaturesChange).toHaveBeenLastCalledWith(
      [
        expect.objectContaining({
          placement: expect.objectContaining({ x: 6, z: 0 }),
          parameters: expect.objectContaining({ size: { length: 23 / 32, width: 12 } })
        })
      ],
      expect.any(Object)
    );
    startCut('Groove');
    setMeasurement('Groove Width', '1/4');
    setMeasurement('Offset Across Width', '3/8');
    expect(props.onDraftFeaturesChange).toHaveBeenLastCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ cutType: 'groove', placement: expect.objectContaining({ x: 0, z: 3 / 8 }) })
      ]),
      expect.any(Object)
    );
    expect(inspectorAlert()).toBeNull();
  });

  it('retargets a tenon to the other end of the board', () => {
    renderWorkspace();
    startCut('Tenon');
    fireEvent.click(within(inspector()).getByRole('button', { name: 'Right End' }));
    expect(within(inspector()).getByRole('button', { name: 'Right End' })).toHaveAttribute('aria-pressed', 'true');
  });

  it.each(['Groove', 'Stopped Groove'])('ploughs a %s into a long edge', (preset) => {
    const props = renderWorkspace();
    startCut(preset);
    fireEvent.click(within(inspector()).getByRole('button', { name: 'Back Face' }));
    setMeasurement('Height Across Thickness', '1/4');
    setMeasurement('Offset Up From Bottom', '1/4');
    expect(props.onDraftFeaturesChange).toHaveBeenLastCalledWith(
      [
        expect.objectContaining({
          target: { type: 'face', face: 'back_face' },
          placement: expect.objectContaining({ z: 1 / 4 }),
          parameters: expect.objectContaining({ size: expect.objectContaining({ width: 1 / 4 }) })
        })
      ],
      expect.any(Object)
    );
    expect(inspectorAlert()).toBeNull();
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

describe('CutProperties drill bit', () => {
  it('bores with a bit from the case, and the diameter follows', () => {
    renderWorkspace();
    startCut('Round Hole');
    const bit = screen.getByLabelText('Bit') as HTMLSelectElement;
    fireEvent.change(bit, { target: { value: 'bit-brad-8-16' } });
    // 8/16 is marked 1/2 on the shank, and that is what the hole becomes.
    expect(setMeasurement('Hole Diameter', '1/2').value).toBe('1/2');
    expect((screen.getByLabelText('Bit') as HTMLSelectElement).value).toBe('bit-brad-8-16');
  });

  it('follows the bit when the diameter is typed instead', () => {
    renderWorkspace();
    startCut('Round Hole');
    setMeasurement('Hole Diameter', '3/8');
    expect((screen.getByLabelText('Bit') as HTMLSelectElement).value).toBe('bit-brad-6-16');
  });

  it('says so when no bit in the case bores that size', () => {
    renderWorkspace();
    startCut('Round Hole');
    setMeasurement('Hole Diameter', '0.3');
    expect(screen.getByRole('option', { name: 'No bit this size' })).toBeInTheDocument();
  });

  it('warns when a blind hole is deeper than the bit reaches', () => {
    renderWorkspace();
    startCut('Counterbore');
    setMeasurement('Hole Diameter', '3/8');
    fireEvent.change(screen.getByLabelText('Depth'), { target: { value: 'blind' } });
    // A brad point reaches 4"; nothing in this part is that deep, so no warning.
    expect(screen.queryByText(/reaches/)).not.toBeInTheDocument();
  });
});
