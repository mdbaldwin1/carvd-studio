interface ProgressBarProps {
  progress: number; // 0-100
  message?: string;
  showPercentage?: boolean;
  size?: 'small' | 'medium' | 'large';
  color?: 'blue' | 'green' | 'yellow' | 'red';
  className?: string;
}

const sizeStyles = {
  small: 'h-1',
  medium: 'h-2',
  large: 'h-3'
} as const;

const colorStyles = {
  blue: 'bg-primary',
  green: 'bg-success',
  yellow: 'bg-accent',
  red: 'bg-danger'
} as const;

/**
 * Progress bar component for showing determinate progress
 *
 * @param progress - Progress value from 0 to 100
 * @param message - Optional message to display below the bar
 * @param showPercentage - Whether to show percentage text
 * @param size - Bar height (small: 4px, medium: 8px, large: 12px)
 * @param color - Progress bar color theme
 */
export function ProgressBar({
  progress,
  message,
  showPercentage = true,
  size = 'medium',
  color = 'blue',
  className = ''
}: ProgressBarProps) {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-1">
        {message && <span className="text-sm text-text-muted">{message}</span>}
        {showPercentage && <span className="text-sm font-medium text-text">{Math.round(clampedProgress)}%</span>}
      </div>
      <div className="w-full bg-bg rounded-full overflow-hidden">
        <div
          className={`rounded-full transition-[width] duration-300 ease-out ${sizeStyles[size]} ${colorStyles[color]}`}
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

interface ProgressOverlayProps {
  progress: number;
  message?: string;
}

/**
 * Full-screen progress overlay
 * Blocks interaction while showing progress
 */
export function ProgressOverlay({ progress, message = 'Processing...' }: ProgressOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
      <div className="bg-surface rounded-lg p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] min-w-[320px]">
        <ProgressBar progress={progress} message={message} size="large" showPercentage={true} />
      </div>
    </div>
  );
}
