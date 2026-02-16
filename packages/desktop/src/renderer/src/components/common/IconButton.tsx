import { forwardRef } from 'react';

type IconButtonSize = 'xs' | 'sm' | 'md';
type IconButtonVariant = 'ghost' | 'outlined' | 'filled';
type IconButtonColor = 'secondary' | 'primary' | 'danger';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required accessible label — sets both aria-label and title */
  label: string;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  color?: IconButtonColor;
  /** Whether the button is in an active/pressed state */
  active?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = 'sm', variant = 'ghost', color = 'secondary', active, className, title, children, ...props },
  ref
) {
  const classes = ['btn', `btn-icon-${size}`, `btn-${variant}`, `btn-${color}`, active ? 'active' : '', className || '']
    .filter(Boolean)
    .join(' ');

  return (
    <button ref={ref} className={classes} aria-label={label} title={title ?? label} {...props}>
      {children}
    </button>
  );
});
