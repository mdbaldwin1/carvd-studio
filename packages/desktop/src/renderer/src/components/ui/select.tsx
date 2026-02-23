import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@renderer/lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Size variant: 'default' for form fields, 'sm' for settings rows */
  variant?: 'default' | 'sm';
}

const selectChevronDataUri =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23AEA4BF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")";

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, variant = 'default', style, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        'bg-bg border border-border text-text font-[inherit] cursor-pointer',
        'appearance-none bg-no-repeat',
        'focus:outline-none focus:border-accent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'default' && 'w-full px-3.5 py-2.5 text-sm pr-9 rounded-[var(--radius-md)]',
        variant === 'sm' && 'w-40 py-1.5 pl-2 pr-9 text-[13px] rounded',
        className
      )}
      style={{
        backgroundImage: selectChevronDataUri,
        backgroundPosition: 'right 0.625rem center',
        backgroundSize: '14px 14px',
        ...style
      }}
      {...props}
    />
  );
});

export { Select };
export type { SelectProps };
