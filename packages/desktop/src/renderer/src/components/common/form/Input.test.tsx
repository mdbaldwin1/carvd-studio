import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('renders with label and value', () => {
    render(<Input label="Project Name" value="My Project" onChange={() => {}} />);
    expect(screen.getByText('Project Name')).toBeInTheDocument();
    expect(screen.getByDisplayValue('My Project')).toBeInTheDocument();
  });

  it('fires onChange with string value', () => {
    const handleChange = vi.fn();
    render(<Input label="Name" value="" onChange={handleChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } });
    expect(handleChange).toHaveBeenCalledWith('hello');
  });

  it('auto-generates id from label', () => {
    render(<Input label="Project Name" value="" onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id', 'project-name');
    expect(screen.getByText('Project Name')).toHaveAttribute('for', 'project-name');
  });

  it('uses provided id over auto-generated', () => {
    render(<Input label="Name" value="" onChange={() => {}} id="custom-id" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'custom-id');
  });

  it('shows error message', () => {
    render(<Input label="Name" value="" onChange={() => {}} error="Required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('sets aria-invalid when error present', () => {
    render(<Input label="Name" value="" onChange={() => {}} error="Required" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not set aria-invalid without error', () => {
    render(<Input label="Name" value="" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
  });

  it('sets aria-required when required', () => {
    render(<Input label="Name" value="" onChange={() => {}} required />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-required', 'true');
  });

  it('passes through native input props', () => {
    render(<Input label="Name" value="" onChange={() => {}} placeholder="Enter name" type="text" disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', 'Enter name');
    expect(input).toBeDisabled();
  });

  it('shows help text', () => {
    render(<Input label="Name" value="" onChange={() => {}} helpText="Your full name" />);
    expect(screen.getByText('Your full name')).toBeInTheDocument();
  });

  it('shows required indicator in label', () => {
    render(<Input label="Name" value="" onChange={() => {}} required />);
    expect(screen.getByText(/Name \*/)).toBeInTheDocument();
  });
});
