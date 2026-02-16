import React from 'react';
import { FormField } from './FormField';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  error?: string | null;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Select({
  label,
  value,
  onChange,
  options,
  error,
  helpText,
  required,
  disabled,
  className,
  id
}: SelectProps) {
  const selectId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <FormField
      label={label}
      htmlFor={selectId}
      required={required}
      error={error}
      helpText={helpText}
      className={className}
    >
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}
