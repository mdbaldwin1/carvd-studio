import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  className?: string;
}

/**
 * Loading spinner component for indicating ongoing operations
 *
 * Usage:
 * - Small: Inline loading (e.g., button loading state)
 * - Medium: Modal/section loading
 * - Large: Full-screen/overlay loading
 */
export function LoadingSpinner({ size = 'medium', message, className = '' }: LoadingSpinnerProps) {
  const sizeClass = `loading-spinner-${size}`;

  return (
    <div className={`loading-spinner-container ${className}`}>
      <div className={`loading-spinner ${sizeClass}`} role="status" aria-label="Loading" />
      {message && <p className="loading-spinner-message">{message}</p>}
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
    <div className="loading-overlay">
      <div className="loading-overlay-content">
        <LoadingSpinner size="large" message={message} />
      </div>
    </div>
  );
}
