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

interface LoadingOverlayProps {
  message?: string;
}

/**
 * Full-screen loading overlay
 * Blocks interaction while showing loading spinner
 */
export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
      <div className="bg-surface rounded-lg p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
        <LoadingSpinner size="large" message={message} />
      </div>
    </div>
  );
}
