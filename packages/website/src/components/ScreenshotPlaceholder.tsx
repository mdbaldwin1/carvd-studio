import React from 'react';

interface ScreenshotPlaceholderProps {
  tooltip: string;
  aspectRatio?: '16:9' | '4:3' | '1:1';
  className?: string;
}

/**
 * A placeholder component for screenshots that will be added later.
 * Displays a styled box with a camera icon and tooltip describing what screenshot is needed.
 */
export default function ScreenshotPlaceholder({
  tooltip,
  aspectRatio = '16:9',
  className = ''
}: ScreenshotPlaceholderProps) {
  const aspectRatioStyles: Record<string, string> = {
    '16:9': '56.25%', // 9/16 = 0.5625
    '4:3': '75%',     // 3/4 = 0.75
    '1:1': '100%',
  };

  return (
    <div
      className={`screenshot-placeholder ${className}`}
      title={tooltip}
      style={{
        position: 'relative',
        width: '100%',
        paddingTop: aspectRatioStyles[aspectRatio],
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '2px dashed var(--color-border)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-lg)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: 'var(--space-md)', opacity: 0.5 }}>
          📷
        </div>
        <p style={{
          color: 'var(--color-text-muted)',
          fontSize: 'var(--font-size-sm)',
          maxWidth: '300px',
        }}>
          {tooltip}
        </p>
      </div>
    </div>
  );
}
