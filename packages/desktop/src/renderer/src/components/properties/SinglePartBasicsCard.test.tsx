import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestPart, createTestStock } from '../../../../../tests/helpers/factories';
import { SinglePartBasicsCard } from './SinglePartBasicsCard';

function setup(form?: 'rod' | 'insert') {
  const handlers = { onLengthChange: vi.fn(), onWidthChange: vi.fn(), onThicknessChange: vi.fn() };
  render(
    <SinglePartBasicsCard
      selectedPart={createTestPart()}
      units="imperial"
      isDimensionConstrained={false}
      assignedStock={form ? createTestStock({ form }) : null}
      {...handlers}
      onNameChange={vi.fn()}
      onPositionXChange={vi.fn()}
      onPositionYChange={vi.fn()}
      onPositionZChange={vi.fn()}
      onRotationXChange={vi.fn()}
      onRotationYChange={vi.fn()}
      onRotationZChange={vi.fn()}
      onResetRotation={vi.fn()}
      snapEnabled={false}
      onSnapEnabledChange={vi.fn()}
      snapIncrement={15}
      onSnapIncrementChange={vi.fn()}
    />
  );
  return handlers;
}

describe('small woodworking components', () => {
  it('accepts the T-slot runner finished dimensions', () => {
    const handlers = setup();
    for (const [label, value, handler] of [
      ['Part length', 4, handlers.onLengthChange],
      ['Part width', 0.47, handlers.onWidthChange],
      ['Part thickness', 0.1675, handlers.onThicknessChange]
    ] as const) {
      const input = screen.getByRole('textbox', { name: label });
      fireEvent.change(input, { target: { value: String(value) } });
      fireEvent.blur(input);
      expect(handler).toHaveBeenCalledWith(value);
    }
  });
  it.each(['0', '-1', 'Infinity', 'NaN'])('rejects invalid thickness %s', (value) => {
    const handlers = setup();
    const input = screen.getByRole('textbox', { name: 'Part thickness' });
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
    expect(handlers.onThicknessChange).not.toHaveBeenCalled();
  });
  it.each(['rod', 'insert'] as const)('keeps fixed %s dimensions disabled even without stock constraints', (form) => {
    setup(form);
    expect(screen.getByRole('textbox', { name: 'Part width' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Part thickness' })).toBeDisabled();
    if (form === 'insert') expect(screen.getByRole('textbox', { name: 'Part length' })).toBeDisabled();
  });
});
