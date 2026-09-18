import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { StockFormFields } from './StockFormFields';
import type { Stock } from '../../types';

type StockFormData = Omit<Stock, 'id'>;

const walnut: StockFormData = {
  name: 'Walnut 4/4',
  length: 96,
  width: 8,
  thickness: 0.75,
  grainDirection: 'length',
  pricingUnit: 'board_foot',
  pricePerUnit: 12.5,
  color: '#5b3a24'
};

function renderFields(overrides: Partial<StockFormData> = {}) {
  const onChange = vi.fn();
  render(<StockFormFields formData={{ ...walnut, ...overrides }} onChange={onChange} />);
  return onChange;
}

/** The control beneath a given label. */
function field(label: string): HTMLInputElement {
  const group = screen.getByText(label).closest('div')!;
  return group.querySelector('input, select') as HTMLInputElement;
}

describe('StockFormFields', () => {
  it('shows the board it was given', () => {
    renderFields();
    expect(field('Name').value).toBe('Walnut 4/4');
    expect(field('Grain Direction').value).toBe('length');
    expect(field('Pricing Unit').value).toBe('board_foot');
  });

  it('renames the stock without disturbing its dimensions', () => {
    const onChange = renderFields();
    fireEvent.change(field('Name'), { target: { value: 'Walnut 8/4' } });
    expect(onChange).toHaveBeenCalledWith({ ...walnut, name: 'Walnut 8/4' });
  });

  it.each([
    ['length', 0],
    ['width', 1],
    ['thickness', 2]
  ])('takes a new %s as a shop measurement', (key, index) => {
    const onChange = renderFields();
    const inputs = screen.getByText('Dimensions (L × W × T)').closest('div')!.querySelectorAll('input');
    fireEvent.change(inputs[index], { target: { value: '3 1/2' } });
    fireEvent.blur(inputs[index]);
    expect(onChange).toHaveBeenCalledWith({ ...walnut, [key]: 3.5 });
  });

  it.each(['length', 'width', 'none'] as const)('sets the grain running %s', (grainDirection) => {
    const onChange = renderFields({ grainDirection: grainDirection === 'length' ? 'width' : 'length' });
    fireEvent.change(field('Grain Direction'), { target: { value: grainDirection } });
    expect(onChange.mock.calls[0][0].grainDirection).toBe(grainDirection);
  });

  it.each(['per_item', 'board_foot'] as const)('prices the stock %s', (pricingUnit) => {
    const onChange = renderFields({ pricingUnit: pricingUnit === 'per_item' ? 'board_foot' : 'per_item' });
    fireEvent.change(field('Pricing Unit'), { target: { value: pricingUnit } });
    expect(onChange.mock.calls[0][0].pricingUnit).toBe(pricingUnit);
  });

  it('takes a new price', () => {
    const onChange = renderFields();
    fireEvent.change(field('Price ($)'), { target: { value: '14.25' } });
    expect(onChange).toHaveBeenCalledWith({ ...walnut, pricePerUnit: 14.25 });
  });

  it('reads a cleared price as nothing rather than as not-a-number', () => {
    // An empty box is someone about to type, not a board that costs NaN.
    const onChange = renderFields();
    fireEvent.change(field('Price ($)'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith({ ...walnut, pricePerUnit: 0 });
  });

  it('offers a colour to tell this board apart on the bench', () => {
    renderFields();
    expect(screen.getByText('Display Color')).toBeInTheDocument();
  });
});

describe('StockFormFields stock type', () => {
  const dowel: StockFormData = {
    name: '3/8" Birch Dowel',
    length: 36,
    width: 0.375,
    thickness: 0.375,
    grainDirection: 'length',
    pricingUnit: 'per_item',
    pricePerUnit: 3.5,
    color: '#d8bd8a',
    form: 'rod'
  };

  const renderStock = (formData: StockFormData) => {
    const onChange = vi.fn();
    render(<StockFormFields formData={formData} onChange={onChange} />);
    return onChange;
  };

  it('classifies stock that predates the field rather than showing it blank', () => {
    renderStock(walnut);
    expect((screen.getByLabelText('Stock Type') as HTMLSelectElement).value).toBe('board');
    renderStock({ ...walnut, name: 'Plywood', length: 96, width: 48 });
    expect((screen.getAllByLabelText('Stock Type')[1] as HTMLSelectElement).value).toBe('sheet');
  });

  it('asks a dowel for a diameter and a length, not three dimensions', () => {
    renderStock(dowel);
    expect(screen.getByRole('textbox', { name: 'Diameter' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Length' })).toBeInTheDocument();
    expect(screen.queryByText('Dimensions (L × W × T)')).not.toBeInTheDocument();
    // A dowel's grain always runs along its axis, so there is nothing to choose.
    expect(screen.getByText('Grain Direction').closest('div')).toHaveClass('hidden');
  });

  it('writes one diameter into both section dimensions', () => {
    const onChange = renderStock(dowel);
    const diameter = screen.getByRole('textbox', { name: 'Diameter' });
    fireEvent.focus(diameter);
    fireEvent.change(diameter, { target: { value: '1/2' } });
    fireEvent.blur(diameter);
    expect(onChange.mock.calls[0][0]).toMatchObject({ width: 0.5, thickness: 0.5 });
  });

  it('seeds a plausible dowel instead of carrying a board width across as a diameter', () => {
    const onChange = renderStock(walnut);
    fireEvent.change(screen.getByLabelText('Stock Type'), { target: { value: 'rod' } });
    const next = onChange.mock.calls[0][0];
    // 8" is a board width, not a dowel; a default beats a nonsense diameter.
    expect(next.width).toBe(0.375);
    expect(next.thickness).toBe(0.375);
    expect(next.form).toBe('rod');
    expect(next.grainDirection).toBe('length');
  });

  it('keeps a square section when one is already there', () => {
    const onChange = renderStock({ ...walnut, width: 1, thickness: 1 });
    fireEvent.change(screen.getByLabelText('Stock Type'), { target: { value: 'rod' } });
    expect(onChange.mock.calls[0][0]).toMatchObject({ width: 1, thickness: 1 });
  });

  it('prices a dowel by the rod', () => {
    renderStock(dowel);
    expect(screen.getByRole('option', { name: 'Per Rod' })).toBeInTheDocument();
  });
});
