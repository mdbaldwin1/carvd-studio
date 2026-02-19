import React from 'react';
import { Label } from '@renderer/components/ui/label';
import { cn } from '@renderer/lib/utils';

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
 * Renders a flex-column container with a Label, the wrapped input,
 * an optional error message (`role="alert"`), and optional help text.
 * Use the higher-level {@link Input}, {@link Select}, etc. for standard
 * inputs — use `FormField` directly only for custom or composite inputs.
 */
export function FormField({ label, htmlFor, required, error, helpText, className, children }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col mb-4 gap-2.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && ' *'}
      </Label>
      {children}
      {error && (
        <div className="mt-1 text-[12px] text-danger" role="alert">
          {error}
        </div>
      )}
      {helpText && <div className="text-text-muted mt-1 text-[12px]">{helpText}</div>}
    </div>
  );
}
