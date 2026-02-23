import { Progress } from '@renderer/components/ui/progress';

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
      <Progress
        className={sizeStyles[size]}
        indicatorClassName={colorStyles[color]}
        value={clampedProgress}
        aria-label={message || 'Progress'}
      />
    </div>
  );
}
export { ProgressOverlay } from './ProgressOverlay';
