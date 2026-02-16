import React from 'react';

/** Props for the {@link FormField} wrapper component. */
export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string | null;
  helpText?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Foundation wrapper for labeled form fields.
 *
 * Renders a `.form-group` container with a `<label>`, the wrapped input,
 * an optional error message (`role="alert"`), and optional help text.
 * Use the higher-level {@link Input}, {@link Select}, etc. for standard
 * inputs — use `FormField` directly only for custom or composite inputs.
 */
export function FormField({ label, htmlFor, required, error, helpText, className, children }: FormFieldProps) {
  return (
    <div className={`form-group${className ? ` ${className}` : ''}`}>
      <label htmlFor={htmlFor}>
        {label}
        {required && ' *'}
      </label>
      {children}
      {error && (
        <div className="field-error" role="alert">
          {error}
        </div>
      )}
      {helpText && <div className="field-help">{helpText}</div>}
    </div>
  );
}
