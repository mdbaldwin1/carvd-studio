import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  message?: string;
  showPercentage?: boolean;
  size?: 'small' | 'medium' | 'large';
  color?: 'blue' | 'green' | 'yellow' | 'red';
  className?: string;
}

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

  const sizeClass = `progress-bar-${size}`;
  const colorClass = `progress-bar-${color}`;

  return (
    <div className={`progress-bar-container ${className}`}>
      <div className="progress-bar-header">
        {message && <span className="progress-bar-message">{message}</span>}
        {showPercentage && (
          <span className="progress-bar-percentage">{Math.round(clampedProgress)}%</span>
        )}
      </div>
      <div className="progress-bar-track">
        <div
          className={`progress-bar-fill ${sizeClass} ${colorClass}`}
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
    <div className="progress-overlay">
      <div className="progress-overlay-content">
        <ProgressBar progress={progress} message={message} size="large" showPercentage={true} />
      </div>
    </div>
  );
}
