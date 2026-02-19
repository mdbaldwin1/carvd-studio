/**
 * Inline prompt shown when user hits a feature limit
 *
 * Can be used in various places where a user tries to use
 * a feature that requires a license.
 */

import { Button } from '@renderer/components/ui/button';

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
        <Button size="sm" onClick={handleUpgrade}>
          Upgrade
        </Button>
        {onDismiss && (
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );
}
