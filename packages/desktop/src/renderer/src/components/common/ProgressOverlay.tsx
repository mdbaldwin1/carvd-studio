import { ProgressBar } from './ProgressBar';

interface ProgressOverlayProps {
  progress: number;
  message?: string;
}

export function ProgressOverlay({ progress, message = 'Processing...' }: ProgressOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
      <div className="bg-surface rounded-lg p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] min-w-[320px]">
        <ProgressBar progress={progress} message={message} size="large" showPercentage={true} />
      </div>
    </div>
  );
}
