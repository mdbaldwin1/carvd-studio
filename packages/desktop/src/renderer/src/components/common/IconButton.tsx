import { forwardRef } from 'react';
import { Button, type ButtonProps } from '@renderer/components/ui/button';
import { cn } from '@renderer/lib/utils';

type IconButtonSize = 'xs' | 'sm' | 'md';
type IconButtonVariant = 'ghost' | 'outlined' | 'filled';
type IconButtonColor = 'secondary' | 'primary' | 'danger';

interface IconButtonProps extends Omit<ButtonProps, 'size' | 'variant'> {
  /** Required accessible label — sets both aria-label and title */
  label: string;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  color?: IconButtonColor;
}

/** Map IconButton's (variant, color) → Button variant */
function resolveVariant(variant: IconButtonVariant, color: IconButtonColor): ButtonProps['variant'] {
  if (color === 'danger') {
    if (variant === 'filled') return 'destructive';
    if (variant === 'outlined') return 'destructiveOutline';
    return 'destructiveGhost';
  }
  if (color === 'primary') {
    if (variant === 'filled') return 'default';
    if (variant === 'outlined') return 'outline';
    return 'ghost';
  }
  // secondary
  if (variant === 'filled') return 'secondary';
  if (variant === 'outlined') return 'outline';
  return 'ghost';
}

/** Map IconButton size → Button size */
function resolveSize(size: IconButtonSize): ButtonProps['size'] {
  if (size === 'xs') return 'icon-xs';
  if (size === 'md') return 'icon';
  return 'icon'; // sm → icon (w-7 h-7)
}

/**
 * Square icon-only button with composable size, variant, and color classes.
 *
 * Always requires a `label` prop for accessibility (sets both `aria-label` and `title`).
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = 'sm', variant = 'ghost', color = 'secondary', active, className, title, children, ...props },
  ref
) {
  return (
    <Button
      ref={ref}
      variant={resolveVariant(variant, color)}
      size={resolveSize(size)}
      active={active}
      className={cn(color === 'primary' && variant === 'ghost' && 'text-accent hover:enabled:bg-accent-bg', className)}
      aria-label={label}
      title={title ?? label}
      {...props}
    >
      {children}
    </Button>
  );
});
