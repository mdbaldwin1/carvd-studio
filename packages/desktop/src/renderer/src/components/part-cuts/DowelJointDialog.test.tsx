import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../../tests/helpers/factories';
import { DowelJointDialog } from './DowelJointDialog';

vi.unmock('three');

describe('DowelJointDialog', () => {
  const firstPart = createTestPart({
    id: 'first',
    name: 'Lower rail',
    length: 10,
    width: 4,
    thickness: 1,
    position: { x: 0, y: 0, z: 0 }
  });
  const secondPart = createTestPart({
    id: 'second',
    name: 'Upper rail',
    length: 10,
    width: 4,
    thickness: 1,
    position: { x: 0, y: 1, z: 0 }
  });

  it('walks through mate, faces, dimensions, and review before creating', () => {
    const onCreate = vi.fn(() => 'joint-1');
    render(
      <DowelJointDialog
        open
        firstPart={firstPart}
        candidateParts={[secondPart]}
        onClose={vi.fn()}
        onCreate={onCreate}
      />
    );

    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Mating Part'), { target: { value: 'second' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Face on Lower rail'), { target: { value: 'top_face' } });
    fireEvent.change(screen.getByLabelText('Face on Upper rail'), { target: { value: 'bottom_face' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Dowel Count'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Step 4 of 4')).toBeInTheDocument();
    expect(screen.getByText(/2 matching dowel holes/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create Dowel Joint' }));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        firstPartId: 'first',
        secondPartId: 'second',
        firstFace: 'top_face',
        secondFace: 'bottom_face',
        count: 2
      })
    );
  });

  it('retains face choices when validation rejects the joint', () => {
    render(
      <DowelJointDialog
        open
        firstPart={firstPart}
        candidateParts={[secondPart]}
        onClose={vi.fn()}
        onCreate={vi.fn(() => null)}
      />
    );
    fireEvent.change(screen.getByLabelText('Mating Part'), { target: { value: 'second' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(screen.getByLabelText('Face on Lower rail'), { target: { value: 'top_face' } });
    fireEvent.change(screen.getByLabelText('Face on Upper rail'), { target: { value: 'top_face' } });

    expect(screen.getByText(/parallel and opposing/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByLabelText('Face on Lower rail')).toHaveValue('top_face');
    expect(screen.getByLabelText('Face on Upper rail')).toHaveValue('top_face');
  });

  it('blocks the face step and offers project alignment when the selected faces do not touch', () => {
    const separatedPart = createTestPart({
      id: 'separated',
      name: 'Shelf',
      length: 10,
      width: 4,
      thickness: 1,
      position: { x: 24, y: 8, z: 0 }
    });
    const onAlignRequested = vi.fn();

    render(
      <DowelJointDialog
        open
        firstPart={firstPart}
        candidateParts={[separatedPart]}
        onClose={vi.fn()}
        onCreate={vi.fn(() => null)}
        onAlignRequested={onAlignRequested}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText(/selected faces must be touching/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Project & Align Parts' }));
    expect(onAlignRequested).toHaveBeenCalledWith({
      firstPartId: 'first',
      firstFace: 'top_face',
      secondPartId: 'separated',
      secondFace: 'bottom_face'
    });
  });

  it('explains placement from board edges and previews the hole layout', () => {
    render(
      <DowelJointDialog
        open
        firstPart={firstPart}
        candidateParts={[secondPart]}
        onClose={vi.fn()}
        onCreate={vi.fn(() => 'joint-1')}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByLabelText('Distance from left edge')).toBeInTheDocument();
    expect(screen.getByLabelText('Distance from near edge')).toBeInTheDocument();
    expect(screen.getByLabelText('Distance between dowels')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /dowel placement on lower rail top face/i })).toBeInTheDocument();
  });

  it('allows valid touching faces to reach measurements when the default holes do not fit', () => {
    const narrowRail = createTestPart({
      id: 'narrow',
      name: 'Narrow rail',
      length: 1,
      width: 0.5,
      thickness: 0.5,
      position: { x: 0, y: 0, z: 0 }
    });
    const narrowMate = createTestPart({
      id: 'narrow-mate',
      name: 'Narrow mate',
      length: 1,
      width: 0.5,
      thickness: 0.5,
      position: { x: 0, y: 0.5, z: 0 }
    });

    render(
      <DowelJointDialog
        open
        firstPart={narrowRail}
        candidateParts={[narrowMate]}
        onClose={vi.fn()}
        onCreate={vi.fn(() => null)}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('shows both drilling setups in the final fabrication review', () => {
    render(
      <DowelJointDialog
        open
        firstPart={firstPart}
        candidateParts={[secondPart]}
        onClose={vi.fn()}
        onCreate={vi.fn(() => 'joint-1')}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('Lower rail — Top Face')).toBeInTheDocument();
    expect(screen.getByText('Upper rail — Bottom Face')).toBeInTheDocument();
    expect(screen.getAllByText(/3\/8" diameter × 3\/8" deep/i)).toHaveLength(2);
    expect(screen.getByText(/2 holes, 2" apart/i)).toBeInTheDocument();
  });
});
