import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@renderer/lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Size variant: 'default' for form fields, 'sm' for settings rows */
  variant?: 'default' | 'sm';
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, variant = 'default', ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        'bg-bg border border-border text-text font-[inherit] cursor-pointer',
        'focus:outline-none focus:border-accent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'default' && 'w-full px-3.5 py-2.5 text-sm pr-8 rounded-[var(--radius-md)]',
        variant === 'sm' && 'w-40 py-1.5 px-2 text-[13px] rounded',
        className
      )}
      {...props}
    />
  );
});

export { Select };
export type { SelectProps };
