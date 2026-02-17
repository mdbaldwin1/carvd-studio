import React from 'react';
import { FormField } from './FormField';

/** A single option in a {@link RadioGroup}. */
export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/** Props for the {@link RadioGroup} component. */
export interface RadioGroupProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  error?: string | null;
  helpText?: string;
  required?: boolean;
  className?: string;
}

/**
 * Group of mutually exclusive radio buttons with label and error support.
 *
 * Renders a `role="radiogroup"` container with proper `aria-label`.
 * Individual options can be disabled via {@link RadioOption.disabled}.
 *
 * @example
 * ```tsx
 * <RadioGroup
 *   label="Units"
 *   name="units"
 *   value={units}
 *   onChange={setUnits}
 *   options={[
 *     { value: 'imperial', label: 'Imperial (inches)' },
 *     { value: 'metric', label: 'Metric (mm)' },
 *   ]}
 * />
 * ```
 */
export function RadioGroup({
  label,
  name,
  value,
  onChange,
  options,
  error,
  helpText,
  required,
  className
}: RadioGroupProps) {
  return (
    <FormField label={label} required={required} error={error} helpText={helpText} className={className}>
      <div className="radio-group" role="radiogroup" aria-label={label}>
        {options.map((opt) => (
          <label key={opt.value} className={opt.disabled ? 'disabled' : undefined}>
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              disabled={opt.disabled}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </FormField>
  );
}
