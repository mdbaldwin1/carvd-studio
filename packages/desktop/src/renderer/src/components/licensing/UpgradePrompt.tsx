/**
 * Inline prompt shown when user hits a feature limit
 *
 * Can be used in various places where a user tries to use
 * a feature that requires a license.
 */

import { Alert, AlertDescription } from '@renderer/components/ui/alert';
import { Button } from '@renderer/components/ui/button';
import { EXTERNAL_LINKS } from '@renderer/utils/externalLinks';

interface UpgradePromptProps {
  message: string;
  onUpgrade?: () => void;
  onDismiss?: () => void;
}

export function UpgradePrompt({ message, onUpgrade, onDismiss }: UpgradePromptProps) {
  const handleUpgrade = () => {
    // Open Lemon Squeezy checkout in default browser
    window.electronAPI.openExternal(EXTERNAL_LINKS.checkout);
    onUpgrade?.();
  };

  return (
    <Alert className="my-2 border-primary">
      <AlertDescription className="mt-0 flex items-center justify-between gap-4">
        <p className="m-0 text-[13px] text-text">{message}</p>
        <div className="flex flex-shrink-0 gap-2">
          <Button size="sm" onClick={handleUpgrade}>
            Upgrade
          </Button>
          {onDismiss && (
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
