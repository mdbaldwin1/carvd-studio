import React from 'react';
import { FormField } from './FormField';

/** Props for the {@link TextArea} component. Extends native textarea attributes. */
export interface TextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  helpText?: string;
  required?: boolean;
}

/**
 * Labeled multi-line text input with error and help text support.
 *
 * Auto-generates an `id` from the label for `<label htmlFor>` linking.
 * Passes through all native `<textarea>` attributes via spread.
 *
 * @example
 * ```tsx
 * <TextArea label="Notes" value={notes} onChange={setNotes} rows={4} />
 * ```
 */
export function TextArea({ label, value, onChange, error, helpText, required, id, className, ...rest }: TextAreaProps) {
  const textareaId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <FormField
      label={label}
      htmlFor={textareaId}
      required={required}
      error={error}
      helpText={helpText}
      className={className}
    >
      <textarea
        id={textareaId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
    </FormField>
  );
}
