import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from './FormField';

describe('FormField', () => {
  it('renders label and children', () => {
    render(
      <FormField label="Username">
        <input type="text" />
      </FormField>
    );
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('links label to input via htmlFor', () => {
    render(
      <FormField label="Email" htmlFor="email-input">
        <input id="email-input" type="text" />
      </FormField>
    );
    const label = screen.getByText('Email');
    expect(label).toHaveAttribute('for', 'email-input');
  });

  it('shows required indicator', () => {
    render(
      <FormField label="Name" required>
        <input type="text" />
      </FormField>
    );
    expect(screen.getByText(/Name \*/)).toBeInTheDocument();
  });

  it('shows error message with alert role', () => {
    render(
      <FormField label="Name" error="Name is required">
        <input type="text" />
      </FormField>
    );
    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent('Name is required');
    expect(error).toHaveClass('text-danger');
  });

  it('does not show error when null', () => {
    render(
      <FormField label="Name" error={null}>
        <input type="text" />
      </FormField>
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows help text', () => {
    render(
      <FormField label="Name" helpText="Enter your full name">
        <input type="text" />
      </FormField>
    );
    expect(screen.getByText('Enter your full name')).toBeInTheDocument();
    expect(screen.getByText('Enter your full name')).toHaveClass('text-text-muted');
  });

  it('applies custom className', () => {
    const { container } = render(
      <FormField label="Name" className="custom-field">
        <input type="text" />
      </FormField>
    );
    expect(container.firstChild).toHaveClass('flex', 'flex-col', 'custom-field');
  });

  it('renders with flex-col base layout', () => {
    const { container } = render(
      <FormField label="Name">
        <input type="text" />
      </FormField>
    );
    expect(container.firstChild).toHaveClass('flex', 'flex-col');
  });
});
