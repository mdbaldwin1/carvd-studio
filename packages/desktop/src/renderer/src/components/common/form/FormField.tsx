import React from 'react';

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string | null;
  helpText?: string;
  className?: string;
  children: React.ReactNode;
}

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
