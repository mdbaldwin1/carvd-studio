import React from 'react';

/** Props for the {@link Checkbox} component. */
export interface CheckboxProps {
  label: string | React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Checkbox with an inline label.
 *
 * Unlike other form components, this does **not** use {@link FormField}
 * because checkboxes have a different layout pattern (label beside input).
 * Uses the `.checkbox-label` CSS class from `primitives.css`.
 *
 * @example
 * ```tsx
 * <Checkbox label="Remember me" checked={remember} onChange={setRemember} />
 * ```
 */
export function Checkbox({ label, checked, onChange, disabled, className }: CheckboxProps) {
  return (
    <label className={`checkbox-label${className ? ` ${className}` : ''}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      {label}
    </label>
  );
}
