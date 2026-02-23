import React from 'react';
import { Checkbox as CheckboxPrimitive } from '@renderer/components/ui/checkbox';
import { cn } from '@renderer/lib/utils';

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
 *
 * @example
 * ```tsx
 * <Checkbox label="Remember me" checked={remember} onChange={setRemember} />
 * ```
 */
export function Checkbox({ label, checked, onChange, disabled, className }: CheckboxProps) {
  return (
    <label className={cn('flex items-center gap-2.5 cursor-pointer text-sm', className)}>
      <CheckboxPrimitive
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4"
      />
      {label}
    </label>
  );
}
