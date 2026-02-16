import React from 'react';
import { FormField } from './FormField';

export interface TextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  helpText?: string;
  required?: boolean;
}

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
