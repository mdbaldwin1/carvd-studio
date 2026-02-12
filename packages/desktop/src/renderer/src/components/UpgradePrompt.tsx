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
    <div className="upgrade-prompt">
      <p className="upgrade-prompt__message">{message}</p>
      <div className="upgrade-prompt__actions">
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
