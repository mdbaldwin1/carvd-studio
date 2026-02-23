import { Skeleton } from '@renderer/components/ui/skeleton';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  className?: string;
}

const sizeStyles = {
  small: 'w-4 h-4',
  medium: 'w-8 h-8',
  large: 'w-12 h-12'
} as const;

/**
 * Loading spinner component for indicating ongoing operations
 *
 * Usage:
 * - Small: Inline loading (e.g., button loading state)
 * - Medium: Modal/section loading
 * - Large: Full-screen/overlay loading
 */
export function LoadingSpinner({ size = 'medium', message, className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`} role="status" aria-label="Loading">
      <Skeleton className={`${sizeStyles[size]} rounded-full`} />
      {message && <p className="text-sm text-text-muted animate-pulse">{message}</p>}
    </div>
  );
}
export { LoadingOverlay } from './LoadingOverlay';
