import React from 'react';

/** Props for the {@link FormSection} component. */
export interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Groups related form fields under a heading.
 *
 * Uses the `.settings-section` CSS class. Renders a `<h3>` title
 * and optional description paragraph above the children.
 *
 * @example
 * ```tsx
 * <FormSection title="Appearance" description="Customize the look and feel">
 *   <Select label="Theme" ... />
 *   <Checkbox label="Show grid" ... />
 * </FormSection>
 * ```
 */
export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div className={`settings-section${className ? ` ${className}` : ''}`}>
      <h3>{title}</h3>
      {description && <p className="section-description">{description}</p>}
      {children}
    </div>
  );
}
