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
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create Dowel Joint' }));

    expect(screen.getByText(/parallel and opposing/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByLabelText('Face on Lower rail')).toHaveValue('top_face');
    expect(screen.getByLabelText('Face on Upper rail')).toHaveValue('top_face');
  });
});
