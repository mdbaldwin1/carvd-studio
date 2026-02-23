import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormSection } from './FormSection';

describe('FormSection', () => {
  it('renders title', () => {
    render(
      <FormSection title="General Settings">
        <div>content</div>
      </FormSection>
    );
    expect(screen.getByText('General Settings')).toBeInTheDocument();
    expect(screen.getByText('General Settings').tagName).toBe('H3');
  });

  it('renders children', () => {
    render(
      <FormSection title="Settings">
        <p>Child content</p>
      </FormSection>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <FormSection title="Settings" description="Configure your preferences">
        <div>content</div>
      </FormSection>
    );
    expect(screen.getByText('Configure your preferences')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const { container } = render(
      <FormSection title="Settings">
        <div>content</div>
      </FormSection>
    );
    expect(container.querySelector('.section-description')).not.toBeInTheDocument();
  });

  it('applies settings-section base class', () => {
    const { container } = render(
      <FormSection title="Settings">
        <div>content</div>
      </FormSection>
    );
    expect(container.firstChild).toHaveClass('settings-section');
  });

  it('applies custom className', () => {
    const { container } = render(
      <FormSection title="Settings" className="custom-section">
        <div>content</div>
      </FormSection>
    );
    expect(container.firstChild).toHaveClass('settings-section', 'custom-section');
  });
});
