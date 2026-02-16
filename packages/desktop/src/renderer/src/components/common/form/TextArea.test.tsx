import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextArea } from './TextArea';

describe('TextArea', () => {
  it('renders with label and value', () => {
    render(<TextArea label="Description" value="Some text" onChange={() => {}} />);
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Some text')).toBeInTheDocument();
  });

  it('fires onChange with string value', () => {
    const handleChange = vi.fn();
    render(<TextArea label="Notes" value="" onChange={handleChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new note' } });
    expect(handleChange).toHaveBeenCalledWith('new note');
  });

  it('auto-generates id from label', () => {
    render(<TextArea label="Project Notes" value="" onChange={() => {}} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('id', 'project-notes');
    expect(screen.getByText('Project Notes')).toHaveAttribute('for', 'project-notes');
  });

  it('shows error message', () => {
    render(<TextArea label="Notes" value="" onChange={() => {}} error="Too short" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Too short');
  });

  it('sets aria-invalid when error present', () => {
    render(<TextArea label="Notes" value="" onChange={() => {}} error="Required" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('sets aria-required when required', () => {
    render(<TextArea label="Notes" value="" onChange={() => {}} required />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-required', 'true');
  });

  it('passes through native textarea props', () => {
    render(<TextArea label="Notes" value="" onChange={() => {}} placeholder="Enter notes" rows={5} disabled />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('placeholder', 'Enter notes');
    expect(textarea).toHaveAttribute('rows', '5');
    expect(textarea).toBeDisabled();
  });

  it('shows help text', () => {
    render(<TextArea label="Notes" value="" onChange={() => {}} helpText="Optional notes" />);
    expect(screen.getByText('Optional notes')).toBeInTheDocument();
  });
});
