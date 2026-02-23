import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RadioGroup } from './RadioGroup';

const options = [
  { value: 'imperial', label: 'Imperial (inches)' },
  { value: 'metric', label: 'Metric (mm)' }
];

describe('RadioGroup', () => {
  it('renders label and all options', () => {
    render(<RadioGroup label="Units" name="units" value="imperial" onChange={() => {}} options={options} />);
    expect(screen.getByText('Units')).toBeInTheDocument();
    expect(screen.getByText('Imperial (inches)')).toBeInTheDocument();
    expect(screen.getByText('Metric (mm)')).toBeInTheDocument();
  });

  it('renders radio buttons', () => {
    render(<RadioGroup label="Units" name="units" value="imperial" onChange={() => {}} options={options} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
  });

  it('checks the correct option', () => {
    render(<RadioGroup label="Units" name="units" value="metric" onChange={() => {}} options={options} />);
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).not.toBeChecked();
    expect(radios[1]).toBeChecked();
  });

  it('fires onChange with selected value', () => {
    const handleChange = vi.fn();
    render(<RadioGroup label="Units" name="units" value="imperial" onChange={handleChange} options={options} />);
    fireEvent.click(screen.getAllByRole('radio')[1]);
    expect(handleChange).toHaveBeenCalledWith('metric');
  });

  it('supports disabled options', () => {
    const opts = [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B', disabled: true }
    ];
    render(<RadioGroup label="Choice" name="choice" value="a" onChange={() => {}} options={opts} />);
    expect(screen.getAllByRole('radio')[1]).toBeDisabled();
  });

  it('applies disabled styling to label of disabled option', () => {
    const opts = [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B', disabled: true }
    ];
    render(<RadioGroup label="Choice" name="choice" value="a" onChange={() => {}} options={opts} />);
    const disabledLabel = screen.getByText('Option B').closest('label');
    expect(disabledLabel).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('shows error message', () => {
    render(
      <RadioGroup label="Units" name="units" value="" onChange={() => {}} options={options} error="Please select" />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Please select');
  });

  it('has radiogroup role', () => {
    render(<RadioGroup label="Units" name="units" value="imperial" onChange={() => {}} options={options} />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('sets aria-label on radiogroup', () => {
    render(<RadioGroup label="Units" name="units" value="imperial" onChange={() => {}} options={options} />);
    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-label', 'Units');
  });

  it('shows help text', () => {
    render(
      <RadioGroup
        label="Units"
        name="units"
        value=""
        onChange={() => {}}
        options={options}
        helpText="Choose measurement system"
      />
    );
    expect(screen.getByText('Choose measurement system')).toBeInTheDocument();
  });
});
