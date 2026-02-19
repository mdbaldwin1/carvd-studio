import { forwardRef, type LabelHTMLAttributes } from 'react';
import { cn } from '@renderer/lib/utils';

const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(function Label(
  { className, ...props },
  ref
) {
  return <label ref={ref} className={cn('block font-semibold text-text text-[13px]', className)} {...props} />;
});

export { Label };
