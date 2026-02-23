import { LoadingSpinner } from './LoadingSpinner';

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
      <div className="bg-surface rounded-lg p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
        <LoadingSpinner size="large" message={message} />
      </div>
    </div>
  );
}
