import React from 'react';
import { FormField } from './FormField';

/** A single option in a {@link Select} dropdown. */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/** Props for the {@link Select} component. */
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

/**
 * Labeled dropdown select with error and help text support.
 *
 * Auto-generates an `id` from the label for `<label htmlFor>` linking.
 * Individual options can be disabled via {@link SelectOption.disabled}.
 *
 * @example
 * ```tsx
 * <Select
 *   label="Units"
 *   value={units}
 *   onChange={setUnits}
 *   options={[
 *     { value: 'imperial', label: 'Imperial (inches)' },
 *     { value: 'metric', label: 'Metric (mm)' },
 *   ]}
 * />
 * ```
 */
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
