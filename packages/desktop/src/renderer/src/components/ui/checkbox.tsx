import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@renderer/lib/utils';

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        'w-[18px] h-[18px] cursor-pointer accent-accent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  );
});

export { Checkbox };
export type { CheckboxProps };
