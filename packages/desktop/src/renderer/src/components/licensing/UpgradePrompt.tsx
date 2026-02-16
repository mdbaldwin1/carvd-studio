/**
 * Inline prompt shown when user hits a feature limit
 *
 * Can be used in various places where a user tries to use
 * a feature that requires a license.
 */

interface UpgradePromptProps {
  message: string;
  onUpgrade?: () => void;
  onDismiss?: () => void;
}

export function UpgradePrompt({ message, onUpgrade, onDismiss }: UpgradePromptProps) {
  const handleUpgrade = () => {
    // Open Lemon Squeezy checkout in default browser
    window.electronAPI.openExternal('https://carvd-studio.lemonsqueezy.com/buy');
    onUpgrade?.();
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-surface border border-primary rounded-md my-2">
      <p className="m-0 text-[13px] text-text">{message}</p>
      <div className="flex gap-2 flex-shrink-0">
        <button className="btn btn-primary btn-small" onClick={handleUpgrade}>
          Upgrade
        </button>
        {onDismiss && (
          <button className="btn btn-ghost btn-small" onClick={onDismiss}>
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
