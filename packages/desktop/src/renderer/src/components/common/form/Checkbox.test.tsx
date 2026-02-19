import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('renders with label', () => {
    render(<Checkbox label="Remember me" checked={false} onChange={() => {}} />);
    expect(screen.getByText('Remember me')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('renders checked state', () => {
    render(<Checkbox label="Agree" checked={true} onChange={() => {}} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('renders unchecked state', () => {
    render(<Checkbox label="Agree" checked={false} onChange={() => {}} />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('fires onChange with boolean value', () => {
    const handleChange = vi.fn();
    render(<Checkbox label="Agree" checked={false} onChange={handleChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('fires onChange with false when unchecking', () => {
    const handleChange = vi.fn();
    render(<Checkbox label="Agree" checked={true} onChange={handleChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('supports disabled state', () => {
    render(<Checkbox label="Agree" checked={false} onChange={() => {}} disabled />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('applies flex layout classes', () => {
    const { container } = render(<Checkbox label="Agree" checked={false} onChange={() => {}} />);
    expect(container.firstChild).toHaveClass('flex', 'items-center');
  });

  it('applies custom className', () => {
    const { container } = render(<Checkbox label="Agree" checked={false} onChange={() => {}} className="extra" />);
    expect(container.firstChild).toHaveClass('flex', 'items-center', 'extra');
  });

  it('supports ReactNode label', () => {
    render(
      <Checkbox
        label={
          <span>
            I agree to the <a href="#">terms</a>
          </span>
        }
        checked={false}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('terms')).toBeInTheDocument();
  });
});
