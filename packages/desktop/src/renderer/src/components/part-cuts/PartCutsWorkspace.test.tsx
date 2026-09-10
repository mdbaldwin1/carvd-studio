import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createTestPart } from '../../../../../tests/helpers/factories';
import type { CircularCutFeature, EndCutFeature, RectCutFeature } from '@renderer/types';
import { usePartCutsEditingStore } from '@renderer/store/partCutsEditingStore';
import { useProjectStore } from '@renderer/store/projectStore';
import { useSelectionStore } from '@renderer/store/selectionStore';
import { validateCircularCut } from '@renderer/utils/roundCutUtils';
import { expandCircularCut } from '@renderer/utils/roundCutUtils';
import { buildDraftFromFeature } from '@renderer/components/part-features/partFeatureEditorState';
import { getEditableHandleOverlay } from './PartCutsPreviewCanvas';
import { getPartCutsDraftStatus } from '@renderer/utils/partCutsDraftStatus';
import { PartCutsWorkspace } from './PartCutsWorkspace';
vi.unmock('three');

type WorkspaceProps = ComponentProps<typeof PartCutsWorkspace>;

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
    onSave: vi.fn(),
    hasUnsavedChanges: false,
    ...overrides
  };
  const view = render(<PartCutsWorkspace {...props} />);
  return { ...view, props };
}

function createMortiseFeature(overrides: Partial<RectCutFeature> = {}): RectCutFeature {
  return {
    id: 'rect-1',
    kind: 'rect_cut',
    version: 1,
    enabled: true,
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'min' },
    cutType: 'mortise',
    parameters: { size: { length: 2, width: 0.75 }, depthMode: 'blind', depth: 0.25 },
    placement: { x: 4, z: 3 },
    ...overrides
  };
}

function createEndCutFeature(overrides: Partial<EndCutFeature> = {}): EndCutFeature {
  return {
    id: 'end-1',
    kind: 'end_cut',
    version: 1,
    enabled: true,
    target: { type: 'face', face: 'left_end' },
    reference: { primaryFrom: 'min' },
    cutType: 'mitre',
    lengthMode: 'long_point',
    parameters: { horizontalAngle: 45 },
    ...overrides
  };
}

/** Focus, type into, and blur a FractionInput identified by its label text. */
function setMeasurementField(labelText: string, value: string) {
  const label = screen.getByText(labelText);
  const input = within(label.parentElement as HTMLElement).getByRole('textbox');
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

/** Open the add-cut flow and choose an operation preset. */
function startCut(presetLabel: string) {
  fireEvent.click(screen.getByRole('button', { name: '+ Add Cut' }));
  fireEvent.click(screen.getByText(presetLabel));
}

/** Click a target button in the inspector (not the preview fallback's target list). */
function clickInspectorTarget(name: string) {
  const previewSection = screen.queryByText('Preview Targets')?.parentElement ?? null;
  const button = screen
    .getAllByRole('button', { name })
    .find((candidate) => !previewSection || !previewSection.contains(candidate));
  expect(button).toBeDefined();
  fireEvent.click(button as HTMLElement);
}

function lastFeatures(onDraftFeaturesChange: WorkspaceProps['onDraftFeaturesChange']) {
  const mock = onDraftFeaturesChange as Mock;
  expect(mock).toHaveBeenCalled();
  return mock.mock.calls[mock.mock.calls.length - 1][0] as RectCutFeature[];
}

describe('PartCutsWorkspace', () => {
  beforeEach(() => useProjectStore.setState({ units: 'imperial' }));
  it('UX exposes selected and unselected target states without relying on color', () => {
    renderWorkspace();
    startCut('Round Hole');
    const buttons = screen.getAllByRole('button', { name: 'Bottom Face' });
    expect(buttons.every((button) => button.getAttribute('aria-pressed') === 'false')).toBe(true);
    clickInspectorTarget('Bottom Face');
    expect(
      screen
        .getAllByRole('button', { name: 'Bottom Face' })
        .every((button) => button.getAttribute('aria-pressed') === 'true')
    ).toBe(true);
  });
  it('UX identifies an invalid operation and opens it directly from the save explanation', () => {
    const cut = createMortiseFeature({ label: 'Oversize pocket', placement: { x: 23, z: 1 } });
    const { props } = renderWorkspace({ draftFeatures: [cut], hasUnsavedChanges: true });
    // Save lives in the app header now; assert the shared rule it obeys.
    expect.soft(getPartCutsDraftStatus(props.part, [cut], true).canSave).toBe(false);
    const issue = screen.getByRole('alert');
    expect(issue).toHaveTextContent(/Oversize pocket.*runs past the blank/i);
    fireEvent.click(within(issue).getByRole('button', { name: 'Fix cut 1' }));
    expect(screen.getByLabelText('Label (optional)')).toHaveValue('Oversize pocket');
  });
  it('UX clarifies the limited-run full-width dado and points to enclosed pockets', () => {
    renderWorkspace();
    startCut('Stopped Dado');
    expect(screen.getByText(/For a channel stopped before a side edge, use Mortise/i)).toBeInTheDocument();
  });
  it('Q10 blocks Save Cut when the candidate completes cumulative blank removal', () => {
    const a = createMortiseFeature({
      id: 'a',
      cutType: 'cutout',
      placement: { x: 0, z: 0 },
      parameters: { size: { length: 12, width: 12 }, depthMode: 'through' }
    });
    const b = { ...a, id: 'b', label: 'Other half', placement: { x: 12, z: 0 } };
    renderWorkspace({ draftFeatures: [a, b] });
    fireEvent.click(screen.getByRole('button', { name: /^2\. Other half/ }));
    expect(screen.getByRole('button', { name: 'Save Cut' })).toBeDisabled();
  });
  it.each((['imperial', 'metric'] as const).flatMap((units) => [0.755, 0.74].map((value) => ({ units, value }))))(
    'Q4 saves and reopens exact $value after untouched focus/blur in $units',
    ({ units, value }) => {
      useProjectStore.setState({ units });
      const cut = createMortiseFeature({
        label: 'Precision cut',
        cutType: 'cutout',
        parameters: { size: { length: value, width: 1 }, depthMode: 'through' }
      });
      const view = renderWorkspace({ units, draftFeatures: [cut], selectedFeatureId: cut.id });
      fireEvent.click(screen.getByRole('button', { name: /^1\. Precision cut/ }));
      const input = screen.getByRole('textbox', { name: 'Run Along Blank' });
      fireEvent.focus(input);
      fireEvent.blur(input);
      fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));
      const saved = lastFeatures(view.props.onDraftFeaturesChange);
      expect(saved[0].parameters.size.length).toBe(value);
      view.unmount();
      renderWorkspace({ units, draftFeatures: saved, selectedFeatureId: cut.id });
      fireEvent.click(screen.getByRole('button', { name: /^1\. Precision cut/ }));
      expect(screen.getByRole('textbox', { name: 'Run Along Blank' })).toHaveValue(
        units === 'imperial' ? String(value) : value === 0.755 ? '19.177' : '18.796'
      );
    }
  );
  it('R9 mirrors an edge bevel to the opposite long edge through its menu', async () => {
    const user = userEvent.setup();
    const cut = createEndCutFeature({
      target: { type: 'face', face: 'front_face' },
      cutType: 'bevel',
      parameters: { horizontalAngle: 0, verticalAngle: 20 }
    });
    const { props } = renderWorkspace({ draftFeatures: [cut] });
    await user.click(screen.getByRole('button', { name: 'Actions for cut 1' }));
    await user.click(screen.getByRole('menuitem', { name: /Mirror/ }));
    expect(lastFeatures(props.onDraftFeaturesChange)[1].target).toEqual({ type: 'face', face: 'back_face' });
  });
  it('R9 mirrors a right-end tenon to the left end through its menu', async () => {
    const user = userEvent.setup();
    const cut = createMortiseFeature({ cutType: 'tenon', target: { type: 'face', face: 'right_end' } });
    const { props } = renderWorkspace({ draftFeatures: [cut] });
    await user.click(screen.getByRole('button', { name: 'Actions for cut 1' }));
    await user.click(screen.getByRole('menuitem', { name: 'Mirror Across Length' }));
    expect(lastFeatures(props.onDraftFeaturesChange)[1].target).toEqual({ type: 'face', face: 'left_end' });
  });
  it('R9 mirrors both grid axes geometrically and detaches individual paired-hole metadata', async () => {
    const user = userEvent.setup();
    const cut: CircularCutFeature = {
      id: 'grid',
      kind: 'circular_cut',
      version: 1,
      enabled: true,
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'center', secondaryFrom: 'center' },
      cutType: 'round_hole',
      placement: { primary: 1, secondary: 0.5, rotation: 0 },
      parameters: { diameter: 0.25, depthMode: 'through', tilt: 0, direction: 0 },
      pattern: { type: 'grid', columns: 2, rows: 2, columnSpacing: 1, rowSpacing: 1, rotation: 0 },
      metadata: {
        dowelJoint: {
          jointId: 'j',
          matePartId: 'mate',
          memberIndex: 0,
          dowelDiameter: 0.25,
          dowelLength: 0.5,
          embedmentDepth: 0.25
        }
      }
    };
    const { props } = renderWorkspace({ draftFeatures: [cut] });
    await user.click(screen.getByRole('button', { name: 'Actions for cut 1' }));
    await user.click(screen.getByRole('menuitem', { name: 'Mirror Across Length' }));
    const clone = (props.onDraftFeaturesChange as Mock).mock.calls.at(-1)![0][1] as CircularCutFeature;
    expect
      .soft(
        expandCircularCut(clone, props.part)
          .map((member) => [member.entryPoint.x, member.entryPoint.z])
          .sort()
      )
      .toEqual(
        [
          [-2, 0.5],
          [-2, 1.5],
          [-1, 0.5],
          [-1, 1.5]
        ].sort()
      );
    expect(clone.metadata?.dowelJoint).toBeUndefined();
  });
  it('R5 disables saving an end-cut angle that cannot fit the blank', async () => {
    renderWorkspace({ part: createTestPart({ length: 10, width: 4, thickness: 1 }) });
    startCut('End Cut');
    fireEvent.change(screen.getByLabelText('Mitre Angle'), { target: { value: '80' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Cut' })).toBeDisabled());
  });
  it('gives each feature enabled control an accessible name', () => {
    renderWorkspace({ draftFeatures: [createMortiseFeature()] });

    expect(screen.getByRole('checkbox', { name: 'Enable cut 1' })).toBeChecked();
  });

  it('opens paired dowel joinery from the Joinery group', () => {
    const part = createTestPart({ id: 'first', name: 'Lower rail' });
    const mate = createTestPart({ id: 'second', name: 'Upper rail', position: { x: 0, y: 1, z: 0 } });
    useProjectStore.setState({ parts: [part, mate] });
    renderWorkspace({ part });

    fireEvent.click(screen.getByRole('button', { name: '+ Add Cut' }));
    expect(screen.getByText('Joinery')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Create Dowel Joint/ }));

    expect(screen.getByRole('dialog', { name: 'Create Dowel Joint' })).toBeInTheDocument();
    expect(screen.getByLabelText('Mating Part')).toHaveValue('second');
  });

  it('requires a dirty cuts draft to be saved or discarded before creating a dowel joint', () => {
    const part = createTestPart({ id: 'first', name: 'Lower rail' });
    const mate = createTestPart({ id: 'second', name: 'Upper rail', position: { x: 0, y: 1, z: 0 } });
    useProjectStore.setState({ parts: [part, mate] });
    renderWorkspace({ part, draftFeatures: [createMortiseFeature()], hasUnsavedChanges: true });

    fireEvent.click(screen.getByRole('button', { name: '+ Add Cut' }));

    expect(screen.getByText('Save or discard part changes first')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Create Dowel Joint/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /^Create Dowel Joint/ }));
    expect(screen.queryByRole('dialog', { name: 'Create Dowel Joint' })).not.toBeInTheDocument();
  });

  it('returns to the project with both dowel parts selected for alignment', () => {
    const part = createTestPart({ id: 'first', name: 'Lower rail' });
    const mate = createTestPart({ id: 'second', name: 'Upper rail', position: { x: 20, y: 10, z: 0 } });
    const onExit = vi.fn();
    useProjectStore.setState({ parts: [part, mate] });
    useSelectionStore.getState().clearSelection();
    renderWorkspace({ part, onExit });

    fireEvent.click(screen.getByRole('button', { name: '+ Add Cut' }));
    fireEvent.click(screen.getByRole('button', { name: /^Create Dowel Joint/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to Project & Align Parts' }));

    expect(useSelectionStore.getState().selectedPartIds).toEqual(['first', 'second']);
    expect(onExit).toHaveBeenCalled();
  });

  it('creates an angled patterned round hole from the Round Cuts group', () => {
    const onDraftFeaturesChange = vi.fn();
    renderWorkspace({ onDraftFeaturesChange });

    fireEvent.click(screen.getByRole('button', { name: '+ Add Cut' }));
    expect(screen.getByText('Round Cuts')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Round Hole'));
    expect(screen.getByText('Step 2: Pick a face and place the hole')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Depth'), { target: { value: 'blind' } });
    fireEvent.change(screen.getByLabelText('Tilt From Square (degrees)'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Tilt Toward (degrees)'), { target: { value: '90' } });
    fireEvent.change(screen.getByLabelText('Repeating Pattern'), { target: { value: 'linear' } });
    fireEvent.change(screen.getByLabelText('Hole Count'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));

    expect(onDraftFeaturesChange).toHaveBeenCalledWith([
      expect.objectContaining({
        kind: 'circular_cut',
        cutType: 'round_hole',
        parameters: expect.objectContaining({ depthMode: 'blind', tilt: 15, direction: 90 }),
        pattern: expect.objectContaining({ type: 'linear', count: 3 })
      })
    ]);
  });

  // This fails if round-cut validation permits unsafe drilling geometry to
  // reach the Save Cut action (for example by removing pattern/tilt checks).
  it.each([
    {
      title: 'a zero-member linear pattern',
      configure: () => {
        fireEvent.change(screen.getByLabelText('Repeating Pattern'), { target: { value: 'linear' } });
        fireEvent.change(screen.getByLabelText('Hole Count'), { target: { value: '0' } });
      },
      message: /between 1 and 128/i
    },
    {
      title: 'a 129-member linear pattern',
      configure: () => {
        fireEvent.change(screen.getByLabelText('Repeating Pattern'), { target: { value: 'linear' } });
        fireEvent.change(screen.getByLabelText('Hole Count'), { target: { value: '129' } });
      },
      message: /between 1 and 128/i
    },
    {
      title: 'a 90 degree drill tilt',
      configure: () => {
        fireEvent.change(screen.getByLabelText('Tilt From Square (degrees)'), { target: { value: '90' } });
      },
      message: /tilt must be at least 0° and less than 90°/i
    },
    {
      title: 'a countersink whose major profile exits the blank',
      configure: () => {
        fireEvent.click(screen.getByRole('button', { name: '+ Add Cut' }));
        fireEvent.click(screen.getByText('Countersink'));
        setMeasurementField('Offset Along Face', '11 1/2');
        setMeasurementField('Countersink Major Diameter', '1 1/4');
      },
      message: /profile extends beyond/i,
      preset: 'countersink'
    }
  ])('disables Save Cut for $title', async ({ configure, message, preset }) => {
    renderWorkspace();
    if (!preset) startCut('Round Hole');

    configure();

    await waitFor(() => {
      expect(screen.getByText(message)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save Cut' })).toBeDisabled();
    });
  });

  it('accepts a 128-member in-bounds linear pattern and an 89 degree tilt', () => {
    renderWorkspace();
    startCut('Round Hole');
    fireEvent.change(screen.getByLabelText('Repeating Pattern'), { target: { value: 'linear' } });
    fireEvent.change(screen.getByLabelText('Hole Count'), { target: { value: '128' } });
    setMeasurementField('Spacing', '0.01');
    fireEvent.change(screen.getByLabelText('Tilt From Square (degrees)'), { target: { value: '89' } });

    expect(screen.getByRole('button', { name: 'Save Cut' })).toBeEnabled();
  });

  it('preserves dowel relationship metadata while editing a paired hole', () => {
    const onDraftFeaturesChange = vi.fn();
    const pairedHole = {
      id: 'paired-hole',
      kind: 'circular_cut' as const,
      version: 1,
      enabled: true,
      label: 'Dowel hole 1',
      metadata: {
        dowelJoint: {
          jointId: 'joint-1',
          matePartId: 'mate',
          memberIndex: 0,
          dowelDiameter: 0.375,
          dowelLength: 0.75,
          embedmentDepth: 0.375
        }
      },
      target: { type: 'face' as const, face: 'top_face' as const },
      reference: { primaryFrom: 'center' as const, secondaryFrom: 'center' as const },
      cutType: 'round_hole' as const,
      placement: { primary: 0, secondary: 0, rotation: 0 },
      parameters: { diameter: 0.375, depthMode: 'blind' as const, depth: 0.375, tilt: 0, direction: 0 }
    };
    renderWorkspace({ draftFeatures: [pairedHole], onDraftFeaturesChange });

    fireEvent.click(screen.getByRole('button', { name: /^1\./ }));
    setMeasurementField('Hole Diameter', '1/2');
    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));

    expect(lastFeatures(onDraftFeaturesChange)[0]).toMatchObject({
      parameters: { diameter: 0.5 },
      metadata: pairedHole.metadata
    });
  });

  it.each([
    ['Round Hole', 'Enlarge Hole', 'Hole Diameter', 'diameter'],
    ['Rounded Slot', 'Extend Length', 'Opening Length', 'length'],
    ['Rounded Rectangle', 'Extend Length', 'Opening Length', 'length']
  ])(
    'keeps %s preview-handle edits aligned with inspector values and saved placement',
    (preset, resize, field, parameter) => {
      const onDraftFeaturesChange = vi.fn();
      renderWorkspace({ onDraftFeaturesChange });
      startCut(preset);

      const preview = screen.getByRole('img', { name: 'Part cuts geometry preview' });
      expect(within(preview).getByText('Preview Handles')).toBeInTheDocument();
      fireEvent.click(within(preview).getByRole('button', { name: 'Move Right' }));
      fireEvent.click(within(preview).getByRole('button', { name: resize }));

      // Move Right travels along the face only; the across-face offset is
      // reached through its own field, not by nudging diagonally.
      expect(screen.getByLabelText('Offset Along Face')).toHaveValue('1/4');
      expect(screen.getByLabelText('Offset Across Face')).toHaveValue('0');
      expect(screen.getByLabelText(field)).toHaveValue(parameter === 'diameter' ? '1/2' : '3 1/4');
      fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));

      expect(lastFeatures(onDraftFeaturesChange)[0]).toEqual(
        expect.objectContaining({
          placement: expect.objectContaining({ primary: 0.25, secondary: 0 }),
          parameters: expect.objectContaining({ [parameter]: parameter === 'diameter' ? 0.5 : 3.25 })
        })
      );
    }
  );

  it.each([
    {
      rotation: 90,
      lengthHandle: [0, 0.455, -1.625],
      widthHandle: [-0.625, 0.455, 0]
    },
    {
      rotation: 37,
      lengthHandle: [1.297783, 0.455, -0.977949],
      widthHandle: [-0.376134, 0.455, -0.499147]
    }
  ])(
    'keeps the production rounded preview controls on authored local axes at $rotation°',
    ({ rotation, lengthHandle, widthHandle }) => {
      const part = createTestPart({ name: 'Panel', length: 24, width: 12, thickness: 0.75 });
      const onDraftFeaturesChange = vi.fn();
      renderWorkspace({ part, onDraftFeaturesChange });
      startCut('Rounded Rectangle');
      fireEvent.change(screen.getByLabelText('Rotation (degrees)'), { target: { value: String(rotation) } });

      const preview = screen.getByRole('img', { name: 'Part cuts geometry preview' });
      fireEvent.click(within(preview).getByRole('button', { name: 'Extend Length' }));
      expect(screen.getByLabelText('Opening Length')).toHaveValue('3 1/4');
      expect(screen.getByLabelText('Opening Width')).toHaveValue('1');
      expect(screen.getByLabelText('Offset Along Face')).toHaveValue('0');
      expect(screen.getByLabelText('Offset Across Face')).toHaveValue('0');

      fireEvent.click(within(preview).getByRole('button', { name: 'Widen' }));
      expect(screen.getByLabelText('Opening Length')).toHaveValue('3 1/4');
      expect(screen.getByLabelText('Opening Width')).toHaveValue('1 1/4');
      expect(screen.getByLabelText('Offset Along Face')).toHaveValue('0');
      expect(screen.getByLabelText('Offset Across Face')).toHaveValue('0');

      fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));
      const savedFeature = lastFeatures(onDraftFeaturesChange)[0];
      expect(savedFeature).toMatchObject({
        kind: 'rounded_cut',
        placement: { primary: 0, secondary: 0, rotation },
        parameters: { length: 3.25, width: 1.25 }
      });

      const overlay = getEditableHandleOverlay(part, buildDraftFromFeature(savedFeature), [savedFeature]);
      expect(overlay?.center).toEqual([0, 0.455, -0]);
      expect(overlay?.lengthHandle?.[0]).toBeCloseTo(lengthHandle[0], 5);
      expect(overlay?.lengthHandle?.[1]).toBeCloseTo(lengthHandle[1], 5);
      expect(overlay?.lengthHandle?.[2]).toBeCloseTo(lengthHandle[2], 5);
      expect(overlay?.widthHandle?.[0]).toBeCloseTo(widthHandle[0], 5);
      expect(overlay?.widthHandle?.[1]).toBeCloseTo(widthHandle[1], 5);
      expect(overlay?.widthHandle?.[2]).toBeCloseTo(widthHandle[2], 5);
    }
  );

  it('rejects an externally supplied zero-spacing linear pattern', () => {
    const invalid = {
      id: 'invalid-round-pattern',
      kind: 'circular_cut' as const,
      version: 1,
      enabled: true,
      target: { type: 'face' as const, face: 'top_face' as const },
      reference: { primaryFrom: 'center' as const, secondaryFrom: 'center' as const },
      cutType: 'round_hole' as const,
      placement: { primary: 0, secondary: 0, rotation: 0 },
      parameters: { diameter: 0.25, depthMode: 'through' as const, tilt: 0, direction: 0 },
      pattern: { type: 'linear' as const, count: 2, spacing: 0, direction: 0 }
    };

    expect(validateCircularCut(invalid, createTestPart({ length: 24, width: 12, thickness: 0.75 }))).toMatch(
      /spacing must be greater than zero/i
    );
  });

  it('shows a Save-disabled error for zero spacing entered through the inspector', async () => {
    renderWorkspace();
    startCut('Round Hole');
    fireEvent.change(screen.getByLabelText('Repeating Pattern'), { target: { value: 'linear' } });
    setMeasurementField('Spacing', '0');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save Cut' })).toBeDisabled();
      expect(screen.getByText(/spacing must be greater than zero/i)).toBeInTheDocument();
    });
  });

  it.each([
    [
      'zero-member grid',
      () => {
        fireEvent.change(screen.getByLabelText('Repeating Pattern'), { target: { value: 'grid' } });
        fireEvent.change(screen.getByLabelText('Rows'), { target: { value: '0' } });
      }
    ],
    [
      '129-member grid',
      () => {
        fireEvent.change(screen.getByLabelText('Repeating Pattern'), { target: { value: 'grid' } });
        fireEvent.change(screen.getByLabelText('Rows'), { target: { value: '129' } });
        fireEvent.change(screen.getByLabelText('Columns'), { target: { value: '1' } });
      }
    ],
    [
      'zero-member circular pattern',
      () => {
        fireEvent.change(screen.getByLabelText('Repeating Pattern'), { target: { value: 'circular' } });
        fireEvent.change(screen.getByLabelText('Hole Count'), { target: { value: '0' } });
      }
    ],
    [
      '129-member circular pattern',
      () => {
        fireEvent.change(screen.getByLabelText('Repeating Pattern'), { target: { value: 'circular' } });
        fireEvent.change(screen.getByLabelText('Hole Count'), { target: { value: '129' } });
      }
    ],
    [
      'linear members extending beyond the blank',
      () => {
        fireEvent.change(screen.getByLabelText('Repeating Pattern'), { target: { value: 'linear' } });
        setMeasurementField('Spacing', '24');
      }
    ],
    [
      'circular members extending beyond the blank',
      () => {
        fireEvent.change(screen.getByLabelText('Repeating Pattern'), { target: { value: 'circular' } });
        setMeasurementField('Pattern Radius', '12');
      }
    ]
  ])('disables Save Cut for %s in the real inspector', async (_title, configure) => {
    renderWorkspace();
    startCut('Round Hole');
    configure();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Cut' })).toBeDisabled());
  });

  it.each([
    [
      'linear',
      () => {
        fireEvent.change(screen.getByLabelText('Repeating Pattern'), { target: { value: 'linear' } });
        fireEvent.change(screen.getByLabelText('Hole Count'), { target: { value: '1' } });
      }
    ],
    [
      'linear maximum',
      () => {
        fireEvent.change(screen.getByLabelText('Repeating Pattern'), { target: { value: 'linear' } });
        fireEvent.change(screen.getByLabelText('Hole Count'), { target: { value: '128' } });
        setMeasurementField('Spacing', '0.01');
      }
    ],
    [
      'grid',
      () => {
        fireEvent.change(screen.getByLabelText('Repeating Pattern'), { target: { value: 'grid' } });
        fireEvent.change(screen.getByLabelText('Rows'), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText('Columns'), { target: { value: '1' } });
      }
    ],
    [
      'grid maximum',
      () => {
        fireEvent.change(screen.getByLabelText('Repeating Pattern'), { target: { value: 'grid' } });
        fireEvent.change(screen.getByLabelText('Rows'), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText('Columns'), { target: { value: '128' } });
        setMeasurementField('Column Spacing', '0.01');
      }
    ],
    [
      'circular',
      () => {
        fireEvent.change(screen.getByLabelText('Repeating Pattern'), { target: { value: 'circular' } });
        fireEvent.change(screen.getByLabelText('Hole Count'), { target: { value: '1' } });
      }
    ],
    [
      'circular maximum',
      () => {
        fireEvent.change(screen.getByLabelText('Repeating Pattern'), { target: { value: 'circular' } });
        fireEvent.change(screen.getByLabelText('Hole Count'), { target: { value: '128' } });
      }
    ]
  ])('accepts the %s pattern boundary in the real inspector', (_title, configure) => {
    renderWorkspace();
    startCut('Round Hole');
    configure();

    expect(screen.getByRole('button', { name: 'Save Cut' })).toBeEnabled();
  });

  it.each([
    [
      'a countersink whose derived recess exceeds stock depth',
      'Countersink',
      () => {
        setMeasurementField('Countersink Major Diameter', '1');
        fireEvent.change(screen.getByLabelText('Included Angle'), { target: { value: '30' } });
      }
    ],
    [
      'a counterbore as deep as the material',
      'Counterbore',
      () => {
        setMeasurementField('Counterbore Depth', '3/4');
      }
    ],
    [
      'a counterbore deeper than its blind pilot',
      'Counterbore',
      () => {
        fireEvent.change(screen.getByLabelText('Depth'), { target: { value: 'blind' } });
        setMeasurementField('Hole Depth', '1/4');
        setMeasurementField('Counterbore Depth', '1/2');
      }
    ]
  ])('disables Save Cut for %s', async (_title, preset, configure) => {
    renderWorkspace();
    startCut(preset);
    configure();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Cut' })).toBeDisabled());
  });

  it('shows dedicated rounded opening controls', () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole('button', { name: '+ Add Cut' }));
    expect(screen.getByText('Rounded Openings')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Rounded Rectangle'));
    expect(screen.getByText('Opening Length')).toBeInTheDocument();
    expect(screen.getByText('Opening Width')).toBeInTheDocument();
    expect(screen.getByText('Corner Radius')).toBeInTheDocument();
    expect(screen.getByLabelText('Rotation (degrees)')).toBeInTheDocument();
  });

  it('shows the cuts list with an add button by default', () => {
    render(
      <PartCutsWorkspace
        part={createTestPart({ name: 'Side' })}
        draftFeatures={[]}
        units="imperial"
        selectedFeatureId={null}
        hoveredTarget={null}
        pendingTarget={null}
        onSelectFeature={vi.fn()}
        onDraftFeaturesChange={vi.fn()}
        onHoveredTargetChange={vi.fn()}
        onPendingTargetChange={vi.fn()}
        onExit={vi.fn()}
        onSave={vi.fn()}
        hasUnsavedChanges={false}
      />
    );

    expect(screen.getByText('Cuts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add Cut' })).toBeInTheDocument();
    expect(screen.getByText(/No cuts yet/i)).toBeInTheDocument();
  });

  it('walks through choosing a cut type before adding a cut', () => {
    const onDraftFeaturesChange = vi.fn();
    const onSelectFeature = vi.fn();

    render(
      <PartCutsWorkspace
        part={createTestPart({ name: 'Side' })}
        draftFeatures={[]}
        units="imperial"
        selectedFeatureId={null}
        hoveredTarget={null}
        pendingTarget={null}
        onSelectFeature={onSelectFeature}
        onDraftFeaturesChange={onDraftFeaturesChange}
        onHoveredTargetChange={vi.fn()}
        onPendingTargetChange={vi.fn()}
        onExit={vi.fn()}
        onSave={vi.fn()}
        hasUnsavedChanges={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '+ Add Cut' }));

    expect(screen.getByText(/What kind of cut/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('End Cut'));
    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));

    expect(onDraftFeaturesChange).toHaveBeenCalledWith([
      expect.objectContaining({
        kind: 'end_cut',
        target: { type: 'face', face: 'left_end' },
        parameters: expect.objectContaining({
          horizontalAngle: 45,
          horizontalFlip: false
        })
      })
    ]);
    expect(onSelectFeature).toHaveBeenCalled();
  });

  it('opens a cut card into focused edit mode', () => {
    const part = createTestPart({
      name: 'Rail',
      features: [
        {
          id: 'feature-1',
          kind: 'end_cut',
          version: 1,
          enabled: true,
          target: { type: 'face', face: 'left_end' },
          reference: { primaryFrom: 'min' },
          cutType: 'mitre',
          lengthMode: 'long_point',
          parameters: { horizontalAngle: 45 }
        }
      ]
    });

    render(
      <PartCutsWorkspace
        part={part}
        draftFeatures={part.features ?? []}
        units="imperial"
        selectedFeatureId={null}
        hoveredTarget={null}
        pendingTarget={null}
        onSelectFeature={vi.fn()}
        onDraftFeaturesChange={vi.fn()}
        onHoveredTargetChange={vi.fn()}
        onPendingTargetChange={vi.fn()}
        onExit={vi.fn()}
        onSave={vi.fn()}
        hasUnsavedChanges={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Mitre 45° on Left End/i }));

    expect(screen.getByText('Edit Cut')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Cuts' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Cut' })).toBeInTheDocument();
    expect(screen.getByLabelText('Long Point On')).toBeInTheDocument();
  });

  it('retargets the active draft through the preview fallback controls', () => {
    render(
      <PartCutsWorkspace
        part={createTestPart({ name: 'Stretcher' })}
        draftFeatures={[]}
        units="imperial"
        selectedFeatureId={null}
        hoveredTarget={null}
        pendingTarget={{ type: 'face', face: 'left_end' }}
        onSelectFeature={vi.fn()}
        onDraftFeaturesChange={vi.fn()}
        onHoveredTargetChange={vi.fn()}
        onPendingTargetChange={vi.fn()}
        onExit={vi.fn()}
        onSave={vi.fn()}
        hasUnsavedChanges={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '+ Add Cut' }));
    fireEvent.click(screen.getByText('End Cut'));
    fireEvent.click(
      within(screen.getByText('Preview Targets').parentElement as HTMLElement).getByRole('button', {
        name: 'Right End'
      })
    );

    expect(screen.getAllByText(/Target:/i)[0]).toHaveTextContent('Right End');
  });

  it('supports dado and rabbet operation types in the editor workflow', () => {
    render(
      <PartCutsWorkspace
        part={createTestPart({ name: 'Panel', width: 8 })}
        draftFeatures={[]}
        units="imperial"
        selectedFeatureId={null}
        hoveredTarget={null}
        pendingTarget={null}
        onSelectFeature={vi.fn()}
        onDraftFeaturesChange={vi.fn()}
        onHoveredTargetChange={vi.fn()}
        onPendingTargetChange={vi.fn()}
        onExit={vi.fn()}
        onSave={vi.fn()}
        hasUnsavedChanges={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '+ Add Cut' }));
    fireEvent.click(screen.getByText('Dado'));
    expect(screen.getByText(/Dado spans the full board width/i)).toBeInTheDocument();
  });

  it('normalizes blind-only operations when switching from a through cut', () => {
    const onDraftFeaturesChange = vi.fn();

    render(
      <PartCutsWorkspace
        part={createTestPart({ name: 'Panel', length: 24, width: 8, thickness: 0.75 })}
        draftFeatures={[]}
        units="imperial"
        selectedFeatureId={null}
        hoveredTarget={null}
        pendingTarget={null}
        onSelectFeature={vi.fn()}
        onDraftFeaturesChange={onDraftFeaturesChange}
        onHoveredTargetChange={vi.fn()}
        onPendingTargetChange={vi.fn()}
        onExit={vi.fn()}
        onSave={vi.fn()}
        hasUnsavedChanges={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '+ Add Cut' }));
    fireEvent.click(screen.getByText('Rabbet'));

    expect(screen.getByText('Blind only')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));

    expect(onDraftFeaturesChange).toHaveBeenCalledWith([
      expect.objectContaining({
        cutType: 'rabbet',
        target: { type: 'edge', edge: 'top_front_edge' },
        parameters: expect.objectContaining({ depthMode: 'blind' })
      })
    ]);
  });

  it('lets users flip end-cut direction in edit mode', () => {
    render(
      <PartCutsWorkspace
        part={createTestPart({ name: 'Panel', length: 24, width: 8 })}
        draftFeatures={[]}
        units="imperial"
        selectedFeatureId={null}
        hoveredTarget={null}
        pendingTarget={null}
        onSelectFeature={vi.fn()}
        onDraftFeaturesChange={vi.fn()}
        onHoveredTargetChange={vi.fn()}
        onPendingTargetChange={vi.fn()}
        onExit={vi.fn()}
        onSave={vi.fn()}
        hasUnsavedChanges={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '+ Add Cut' }));
    fireEvent.click(screen.getByText('End Cut'));

    expect(screen.getByLabelText('Long Point On')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Long Point On'), { target: { value: 'back' } });
    expect(screen.getAllByText(/Long point on Back/i).length).toBeGreaterThan(0);
  });

  it('lets users flip bevel direction in edit mode', () => {
    render(
      <PartCutsWorkspace
        part={createTestPart({ name: 'Panel', length: 24, width: 8, thickness: 1 })}
        draftFeatures={[]}
        units="imperial"
        selectedFeatureId={null}
        hoveredTarget={null}
        pendingTarget={null}
        onSelectFeature={vi.fn()}
        onDraftFeaturesChange={vi.fn()}
        onHoveredTargetChange={vi.fn()}
        onPendingTargetChange={vi.fn()}
        onExit={vi.fn()}
        onSave={vi.fn()}
        hasUnsavedChanges={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '+ Add Cut' }));
    fireEvent.click(screen.getByText('End Cut'));
    fireEvent.change(screen.getByLabelText('Cut Style'), { target: { value: 'compound' } });
    fireEvent.change(screen.getByLabelText('Bevel Angle'), { target: { value: '10' } });

    expect(screen.getByLabelText('High Point On')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('High Point On'), { target: { value: 'top' } });
    expect(screen.getAllByText(/High point on Top/i).length).toBeGreaterThan(0);
  });

  it('shows conflict feedback in the list state', () => {
    const part = createTestPart({
      name: 'Leg',
      features: [
        {
          id: 'feature-1',
          kind: 'end_cut',
          version: 1,
          enabled: true,
          target: { type: 'face', face: 'left_end' },
          reference: { primaryFrom: 'min' },
          cutType: 'mitre',
          lengthMode: 'long_point',
          parameters: { horizontalAngle: 45 }
        },
        {
          id: 'feature-2',
          kind: 'end_cut',
          version: 1,
          enabled: true,
          target: { type: 'face', face: 'left_end' },
          reference: { primaryFrom: 'min' },
          cutType: 'bevel',
          lengthMode: 'centerline',
          parameters: { horizontalAngle: 0, verticalAngle: 15 }
        }
      ]
    });

    render(
      <PartCutsWorkspace
        part={part}
        draftFeatures={part.features ?? []}
        units="imperial"
        selectedFeatureId={null}
        hoveredTarget={null}
        pendingTarget={null}
        onSelectFeature={vi.fn()}
        onDraftFeaturesChange={vi.fn()}
        onHoveredTargetChange={vi.fn()}
        onPendingTargetChange={vi.fn()}
        onExit={vi.fn()}
        onSave={vi.fn()}
        hasUnsavedChanges={true}
      />
    );

    expect(screen.getByText('Cut Conflicts')).toBeInTheDocument();
    expect(screen.getAllByText('Conflict').length).toBeGreaterThan(0);
  });

  it('keeps the part-level footer actions in list state', () => {
    render(
      <PartCutsWorkspace
        part={createTestPart({ name: 'Side' })}
        draftFeatures={[]}
        units="imperial"
        selectedFeatureId={null}
        hoveredTarget={null}
        pendingTarget={null}
        onSelectFeature={vi.fn()}
        onDraftFeaturesChange={vi.fn()}
        onHoveredTargetChange={vi.fn()}
        onPendingTargetChange={vi.fn()}
        onExit={vi.fn()}
        onSave={vi.fn()}
        hasUnsavedChanges
      />
    );

    // Exit and Save are the app header's, not this panel's. The panel owns
    // the cut list and its Add Cut action.
    expect(screen.queryByRole('button', { name: 'Back to Project' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Part' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add Cut' })).toBeInTheDocument();
  });

  it('walks every operation preset into its step-2 editor', () => {
    const cases: Array<[string, RegExp]> = [
      ['End Cut', /Pick the end and set the angle/],
      ['Corner Notch', /Pick the corner and size the notch/],
      ['Edge Notch', /Pick the edge and size the notch/],
      ['Cutout', /Pick the face and place the cutout/],
      ['Dado', /Pick the face and lay out the dado/],
      ['Stopped Dado', /Pick the face and lay out the dado/],
      ['Rabbet', /Pick the edge and size the rabbet/],
      ['Groove', /Pick the face and lay out the groove/],
      ['Stopped Groove', /Pick the face and lay out the groove/],
      ['Mortise', /Pick the face and place the mortise/]
    ];

    for (const [label, stepTitle] of cases) {
      const { unmount } = renderWorkspace();
      startCut(label);
      expect(screen.getByText(stepTitle)).toBeInTheDocument();
      unmount();
    }
  });

  it('edits an existing cut, updates its fields, and saves it back', () => {
    const feature = createMortiseFeature();
    const { props } = renderWorkspace({ draftFeatures: [feature] });

    fireEvent.click(screen.getByRole('button', { name: /Target: Top Face/ }));

    expect(screen.getByText('Edit Cut')).toBeInTheDocument();
    expect(screen.getByText('Editing')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Label (optional)'), { target: { value: 'Tenon pocket' } });
    setMeasurementField('Offset Along Length', '3');
    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features).toHaveLength(1);
    expect(features[0]).toMatchObject({
      id: 'rect-1',
      label: 'Tenon pocket',
      placement: { x: 3, z: 3 }
    });
    expect(props.onSelectFeature).toHaveBeenCalledWith('rect-1');
    expect(screen.getByText('Cuts')).toBeInTheDocument();
  });

  it('cancels the editor back to the cut list', () => {
    const { props } = renderWorkspace();

    startCut('Mortise');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByText('Cuts')).toBeInTheDocument();
    expect(props.onSelectFeature).toHaveBeenLastCalledWith(null);
    expect(props.onPendingTargetChange).toHaveBeenLastCalledWith(null);
    expect(props.onDraftFeaturesChange).not.toHaveBeenCalled();
  });

  it('toggles a cut enabled state from the list', () => {
    const feature = createMortiseFeature();
    const { props } = renderWorkspace({ draftFeatures: [feature] });

    fireEvent.click(screen.getByRole('checkbox'));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features[0]).toMatchObject({ id: 'rect-1', enabled: false });
  });

  it('reorders cuts through the actions menu', async () => {
    const user = userEvent.setup();
    const first = createMortiseFeature();
    const second = createEndCutFeature();
    const { props } = renderWorkspace({ draftFeatures: [first, second], hasUnsavedChanges: true });

    await user.click(screen.getByRole('button', { name: 'Actions for cut 1' }));
    expect(screen.getByRole('menuitem', { name: 'Move Up' })).toHaveAttribute('aria-disabled', 'true');
    await user.click(screen.getByRole('menuitem', { name: 'Move Down' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features.map((feature) => feature.id)).toEqual(['end-1', 'rect-1']);
  });

  it('moves a later cut up through the actions menu', async () => {
    const user = userEvent.setup();
    const first = createMortiseFeature();
    const second = createEndCutFeature();
    const { props } = renderWorkspace({ draftFeatures: [first, second] });

    await user.click(screen.getByRole('button', { name: 'Actions for cut 2' }));
    expect(screen.getByRole('menuitem', { name: 'Move Down' })).toHaveAttribute('aria-disabled', 'true');
    await user.click(screen.getByRole('menuitem', { name: 'Move Up' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features.map((feature) => feature.id)).toEqual(['end-1', 'rect-1']);
  });

  it('duplicates a cut and opens the duplicate for editing', async () => {
    const user = userEvent.setup();
    const feature = createMortiseFeature();
    const { props } = renderWorkspace({ draftFeatures: [feature] });

    await user.click(screen.getByRole('button', { name: 'Actions for cut 1' }));
    await user.click(screen.getByRole('menuitem', { name: 'Duplicate' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features).toHaveLength(2);
    expect(features[1].id).not.toBe('rect-1');
    expect(features[1]).toMatchObject({ cutType: 'mortise' });
    expect(props.onSelectFeature).toHaveBeenCalledWith(features[1].id);
    expect(screen.getByText('Edit Cut')).toBeInTheDocument();
  });

  it('mirrors an end cut to the opposite end', async () => {
    const user = userEvent.setup();
    const feature = createEndCutFeature({ label: 'Left mitre' });
    const { props } = renderWorkspace({ draftFeatures: [feature] });

    await user.click(screen.getByRole('button', { name: 'Actions for cut 1' }));
    await user.click(screen.getByRole('menuitem', { name: 'Mirror to Opposite End' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features).toHaveLength(2);
    expect(features[1]).toMatchObject({
      kind: 'end_cut',
      target: { type: 'face', face: 'right_end' },
      label: 'Left mitre (Opposite End)'
    });
    expect(screen.getByText('Edit Cut')).toBeInTheDocument();
  });

  it('mirrors a rect cut across the length', async () => {
    const user = userEvent.setup();
    const feature = createMortiseFeature();
    const { props } = renderWorkspace({ draftFeatures: [feature] });

    await user.click(screen.getByRole('button', { name: 'Actions for cut 1' }));
    await user.click(screen.getByRole('menuitem', { name: 'Mirror Across Length' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features).toHaveLength(2);
    expect(features[1].id).not.toBe('rect-1');
  });

  it('deletes a cut and clears its selection', async () => {
    const user = userEvent.setup();
    const feature = createMortiseFeature();
    const { props } = renderWorkspace({ draftFeatures: [feature], selectedFeatureId: 'rect-1' });

    await user.click(screen.getByRole('button', { name: 'Actions for cut 1' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));

    expect(lastFeatures(props.onDraftFeaturesChange)).toEqual([]);
    expect(props.onSelectFeature).toHaveBeenCalledWith(null);
  });

  it('builds a corner notch on a chosen corner', () => {
    const { props } = renderWorkspace();

    startCut('Corner Notch');
    clickInspectorTarget('Back-Right Corner');
    setMeasurementField('Cross-Cut Width', '1 1/2');
    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features[0]).toMatchObject({
      cutType: 'corner_notch',
      target: { type: 'corner', corner: 'back_right_corner' },
      parameters: expect.objectContaining({ size: { length: 0.75, width: 1.5 } }),
      placement: { x: 0, z: 0 }
    });
  });

  it('builds an edge notch with per-side offsets', () => {
    const { props } = renderWorkspace();

    startCut('Edge Notch');
    expect(screen.getByText('Offset Along Length')).toBeInTheDocument();
    setMeasurementField('Offset Along Length', '1');

    clickInspectorTarget('Left');
    expect(screen.getByText('Offset Across Width')).toBeInTheDocument();
    setMeasurementField('Offset Across Width', '2');
    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features[0]).toMatchObject({
      cutType: 'edge_notch',
      target: { type: 'edge', edge: 'top_left_edge' },
      placement: { x: 0, z: 2 }
    });
  });

  it('builds a rabbet and derives the cross width from the edge direction', () => {
    const { props } = renderWorkspace();

    startCut('Rabbet');
    expect(screen.getByText('Blind only')).toBeInTheDocument();

    // Default edge runs along the length: shoulder maps to width
    setMeasurementField('Shoulder Width', '1');

    // Switch to an edge running across the width: shoulder maps to length
    clickInspectorTarget('Top-Left Edge');
    setMeasurementField('Shoulder Width', '2');
    setMeasurementField('Blind Depth', '3/8');
    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features[0]).toMatchObject({
      cutType: 'rabbet',
      target: { type: 'edge', edge: 'top_left_edge' },
      parameters: expect.objectContaining({
        size: { length: 2, width: 12 },
        depthMode: 'blind',
        depth: 0.375
      })
    });
  });

  it('switches a cutout between through and blind depth', () => {
    const { props } = renderWorkspace();

    startCut('Cutout');
    expect((screen.getByLabelText('Depth') as HTMLSelectElement).value).toBe('through');

    fireEvent.change(screen.getByLabelText('Depth'), { target: { value: 'blind' } });
    expect(screen.getByText('Blind Depth')).toBeInTheDocument();
    setMeasurementField('Blind Depth', '1/2');
    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features[0]).toMatchObject({
      cutType: 'cutout',
      parameters: expect.objectContaining({ depthMode: 'blind', depth: 0.5 })
    });
  });

  it('keeps grooves pinned to the full board length', () => {
    const { props } = renderWorkspace();

    startCut('Groove');
    expect(screen.getByText(/Grooves always run the full board length/i)).toBeInTheDocument();

    // Editing the run keeps the derived full-length value
    setMeasurementField('Full Board Run', '5');
    setMeasurementField('Groove Width', '1');
    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features[0]).toMatchObject({
      cutType: 'groove',
      parameters: expect.objectContaining({ size: { length: 24, width: 1 } }),
      placement: { x: 0, z: 0 }
    });
  });

  it('builds a stopped dado with a limited run and fixed cross width', () => {
    const { props } = renderWorkspace();

    startCut('Stopped Dado');
    expect(screen.getByText(/Stopped dados span the full board width/i)).toBeInTheDocument();
    setMeasurementField('Run Along Blank', '5');
    setMeasurementField('Offset Along Length', '2');
    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features[0]).toMatchObject({
      cutType: 'stopped_dado',
      parameters: expect.objectContaining({ size: { length: 5, width: 12 } }),
      placement: { x: 2, z: 0 }
    });
  });

  it('surfaces validation errors and blocks saving until fixed', () => {
    const { props } = renderWorkspace();

    startCut('Mortise');
    setMeasurementField('Run Along Blank', '30');

    expect(screen.getByText(/runs past the blank/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Cut' })).toBeDisabled();

    setMeasurementField('Run Along Blank', '2');
    expect(screen.queryByText(/runs past the blank/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));
    expect(props.onDraftFeaturesChange).toHaveBeenCalled();
  });

  it('flips end-cut directions when angles go negative', () => {
    renderWorkspace();

    startCut('End Cut');
    fireEvent.change(screen.getByLabelText('Mitre Angle'), { target: { value: '-30' } });
    expect(screen.getAllByText(/Long point on Back/i).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText('Cut Style'), { target: { value: 'compound' } });
    fireEvent.change(screen.getByLabelText('Bevel Angle'), { target: { value: '-15' } });

    expect((screen.getByLabelText('High Point On') as HTMLSelectElement).value).toBe('top');
  });

  it('retargets an end cut to the right end before saving', () => {
    const { props } = renderWorkspace();

    startCut('End Cut');
    clickInspectorTarget('Right End');
    expect(screen.getByText('Resulting Lengths')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features[0]).toMatchObject({
      kind: 'end_cut',
      target: { type: 'face', face: 'right_end' },
      reference: { primaryFrom: 'max' }
    });
  });

  it('notes when a saved end cut keeps a non-default reference', () => {
    const feature = createEndCutFeature({
      lengthMode: 'short_point',
      parameters: { horizontalAngle: 45, reference: { mode: 'short_point', value: 22 } }
    });
    renderWorkspace({ draftFeatures: [feature] });

    fireEvent.click(screen.getByRole('button', { name: /Target: Left End/ }));

    expect(screen.getByText(/keeps its saved short_point reference/i)).toBeInTheDocument();
  });

  it('drives rect drafts through the preview fallback handles', () => {
    const { props } = renderWorkspace();

    startCut('Mortise');
    const handlesSection = screen.getByText('Preview Handles').parentElement as HTMLElement;
    expect(within(handlesSection).getByText('mortise')).toBeInTheDocument();

    fireEvent.click(within(handlesSection).getByRole('button', { name: 'Extend Run' }));
    fireEvent.click(within(handlesSection).getByRole('button', { name: 'Widen' }));
    fireEvent.click(within(handlesSection).getByRole('button', { name: 'Move Right' }));
    fireEvent.click(within(handlesSection).getByRole('button', { name: 'Move Right' }));
    fireEvent.click(within(handlesSection).getByRole('button', { name: 'Move Left' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features[0]).toMatchObject({
      cutType: 'mortise',
      parameters: expect.objectContaining({ size: { length: 2.25, width: 1 } }),
      // Two rights and one left net a single step along the length; the move
      // handle does not travel across the width.
      placement: { x: 0.25, z: 0 }
    });
  });

  it('omits the widen handle for stopped dados in the preview fallback', () => {
    renderWorkspace();

    startCut('Stopped Dado');
    const handlesSection = screen.getByText('Preview Handles').parentElement as HTMLElement;

    expect(within(handlesSection).getByRole('button', { name: 'Extend Run' })).toBeInTheDocument();
    expect(within(handlesSection).queryByRole('button', { name: 'Widen' })).not.toBeInTheDocument();
  });

  it('tells end-cut editors to use the inspector instead of handles', () => {
    renderWorkspace();

    startCut('End Cut');

    expect(screen.getByText(/Adjust this operation in the inspector/i)).toBeInTheDocument();
  });

  it('retargets rect drafts through preview target activation', () => {
    renderWorkspace();

    startCut('Mortise');
    fireEvent.click(
      within(screen.getByText('Preview Targets').parentElement as HTMLElement).getByRole('button', {
        name: 'Bottom Face'
      })
    );

    expect(screen.getAllByText(/Target:/i)[0]).toHaveTextContent('Bottom Face');
  });

  it('retargets rect drafts through the inspector face buttons', () => {
    renderWorkspace();

    startCut('Cutout');
    clickInspectorTarget('Bottom Face');

    expect(screen.getAllByText(/Target:/i)[0]).toHaveTextContent('Bottom Face');
  });

  it('forwards the hovered target to the preview', () => {
    // The workspace no longer restates the hovered pick itself — the preview
    // overlay owns that feedback, so assert the target reaches the preview.
    renderWorkspace({ hoveredTarget: { type: 'face', face: 'top_face' } });

    expect(screen.getByText(/Active target:/i)).toHaveTextContent('Top Face');
  });

  it('leaves exit and save to the app header', () => {
    renderWorkspace({ hasUnsavedChanges: true });

    // Both actions used to be duplicated here and in the header. The header is
    // the single home for them, as it is for the project, template, and
    // assembly editors.
    expect(screen.queryByRole('button', { name: 'Back to Project' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Part' })).not.toBeInTheDocument();
  });

  it('disables saving the part while blocking conflicts exist', () => {
    const conflictingFeatures = [
      createEndCutFeature(),
      createEndCutFeature({ id: 'end-2', cutType: 'bevel', parameters: { horizontalAngle: 0, verticalAngle: 15 } })
    ];
    const { props } = renderWorkspace({ draftFeatures: conflictingFeatures, hasUnsavedChanges: true });

    // Save lives in the app header now; assert the shared rule it obeys.
    expect(getPartCutsDraftStatus(props.part, conflictingFeatures, true).canSave).toBe(false);
  });
  describe('draft keyboard shortcuts', () => {
    const seedDraftHistory = () => {
      const store = usePartCutsEditingStore.getState();
      store.startEditingPartCuts('p1', 'Panel', []);
      store.setDraftFeatures([createMortiseFeature({ id: 'first' })]);
      store.setDraftFeatures([createMortiseFeature({ id: 'first' }), createMortiseFeature({ id: 'second' })]);
    };

    it('steps the cut draft back and forward with the platform shortcuts', () => {
      seedDraftHistory();
      renderWorkspace();

      fireEvent.keyDown(window, { key: 'z', metaKey: true });
      expect(usePartCutsEditingStore.getState().draftFeatures.map((f) => f.id)).toEqual(['first']);

      fireEvent.keyDown(window, { key: 'z', metaKey: true, shiftKey: true });
      expect(usePartCutsEditingStore.getState().draftFeatures.map((f) => f.id)).toEqual(['first', 'second']);

      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      expect(usePartCutsEditingStore.getState().draftFeatures.map((f) => f.id)).toEqual(['first']);

      fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
      expect(usePartCutsEditingStore.getState().draftFeatures.map((f) => f.id)).toEqual(['first', 'second']);
    });

    it('ignores unmodified keys and keystrokes aimed at text fields', () => {
      seedDraftHistory();
      renderWorkspace();
      const before = usePartCutsEditingStore.getState().draftFeatures.length;

      // No modifier: plain "z" must not undo.
      fireEvent.keyDown(window, { key: 'z' });
      expect(usePartCutsEditingStore.getState().draftFeatures).toHaveLength(before);

      // Typing the same shortcut inside a text field must not undo either.
      startCut('Mortise');
      const label = screen.getByPlaceholderText('Face-frame left stile');
      fireEvent.keyDown(label, { key: 'z', metaKey: true });
      expect(usePartCutsEditingStore.getState().draftFeatures).toHaveLength(before);
    });

    // Undo/Redo are the app header's buttons for every mode; their wiring to
    // the draft history is covered in UndoRedoButtons.test.tsx.
  });

  describe('target-aware field labels', () => {
    it('labels tenon fields by tongue dimensions and hides the controls it forces', () => {
      renderWorkspace();
      startCut('Tenon');

      expect(screen.getByText('Tenon Length')).toBeInTheDocument();
      expect(screen.getByText('Tenon Width')).toBeInTheDocument();
      expect(screen.getByText('Tenon Thickness')).toBeInTheDocument();
      expect(screen.getByText('Shoulder Offset')).toBeInTheDocument();
      // A tenon has no through/blind choice and no along-length offset.
      expect(screen.queryByText('Depth')).not.toBeInTheDocument();
      expect(screen.queryByText('Offset Along Length')).not.toBeInTheDocument();
    });

    it('labels side-face pockets across the thickness', () => {
      renderWorkspace();
      startCut('Mortise');

      expect(screen.getByText('Cross-Cut Width')).toBeInTheDocument();
      expect(screen.getByText('Blind Depth')).toBeInTheDocument();

      clickInspectorTarget('Front Face');

      expect(screen.getByText('Height Across Thickness')).toBeInTheDocument();
      expect(screen.getByText('Depth Into Width')).toBeInTheDocument();
      expect(screen.getByText('Offset Up From Bottom')).toBeInTheDocument();
      expect(screen.getByText(/recess into the board width/i)).toBeInTheDocument();
    });
  });

  describe('cut picker layout', () => {
    it('lets an odd trailing tile fill its row so groups have no gap', () => {
      renderWorkspace();
      fireEvent.click(screen.getByRole('button', { name: '+ Add Cut' }));

      // Ends & Edges holds three tiles, so Tenon is the odd one out.
      const tenon = screen.getByRole('button', { name: /^Tenon/ });
      expect(tenon.className).toContain('col-span-2');
      // Pockets & Openings holds two, so neither spans.
      expect(screen.getByRole('button', { name: /^Mortise/ }).className).not.toContain('col-span-2');
    });
  });
});
