import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select } from './Select';

const options = [
  { value: 'imperial', label: 'Imperial (inches)' },
  { value: 'metric', label: 'Metric (mm)' }
];

describe('Select', () => {
  it('renders with label and options', () => {
    render(<Select label="Units" value="imperial" onChange={() => {}} options={options} />);
    expect(screen.getByText('Units')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Imperial (inches)')).toBeInTheDocument();
    expect(screen.getByText('Metric (mm)')).toBeInTheDocument();
  });

  it('fires onChange with selected value', () => {
    const handleChange = vi.fn();
    render(<Select label="Units" value="imperial" onChange={handleChange} options={options} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'metric' } });
    expect(handleChange).toHaveBeenCalledWith('metric');
  });

  it('auto-generates id from label', () => {
    render(<Select label="Grid Size" value="" onChange={() => {}} options={options} />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('id', 'grid-size');
    expect(screen.getByText('Grid Size')).toHaveAttribute('for', 'grid-size');
  });

  it('shows error message', () => {
    render(<Select label="Units" value="" onChange={() => {}} options={options} error="Please select" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Please select');
  });

  it('sets aria-invalid when error present', () => {
    render(<Select label="Units" value="" onChange={() => {}} options={options} error="Required" />);
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('supports disabled state', () => {
    render(<Select label="Units" value="imperial" onChange={() => {}} options={options} disabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('supports disabled options', () => {
    const opts = [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B', disabled: true }
    ];
    render(<Select label="Choice" value="a" onChange={() => {}} options={opts} />);
    const disabledOption = screen.getByText('Option B');
    expect(disabledOption).toHaveAttribute('disabled');
  });

  it('sets aria-required when required', () => {
    render(<Select label="Units" value="" onChange={() => {}} options={options} required />);
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-required', 'true');
  });

  it('shows help text', () => {
    render(<Select label="Units" value="" onChange={() => {}} options={options} helpText="Choose units" />);
    expect(screen.getByText('Choose units')).toBeInTheDocument();
  });
});
