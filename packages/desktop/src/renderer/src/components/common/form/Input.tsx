import React from 'react';
import { FormField } from './FormField';

/** Props for the {@link Input} component. Extends native input attributes. */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  error?: string | null;
  helpText?: string;
  required?: boolean;
}

/**
 * Labeled text/number input with error and help text support.
 *
 * Auto-generates an `id` from the label for `<label htmlFor>` linking.
 * Passes through all native `<input>` attributes via spread.
 *
 * @example
 * ```tsx
 * <Input label="Width" type="number" value={width} onChange={setWidth} required />
 * ```
 */
export function Input({ label, value, onChange, error, helpText, required, id, className, ...rest }: InputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <FormField
      label={label}
      htmlFor={inputId}
      required={required}
      error={error}
      helpText={helpText}
      className={className}
    >
      <input
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
    </FormField>
  );
}
