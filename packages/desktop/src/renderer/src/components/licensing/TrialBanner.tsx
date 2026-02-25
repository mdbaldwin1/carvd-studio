/**
 * Banner shown during trial period (days 7-14)
 *
 * Displays remaining trial days and provides quick access to
 * license activation and purchase.
 */

import { Alert, AlertDescription } from '@renderer/components/ui/alert';
import { Button } from '@renderer/components/ui/button';
import { EXTERNAL_LINKS } from '@renderer/utils/externalLinks';

interface TrialBannerProps {
  daysRemaining: number;
  onActivateLicense: () => void;
  onPurchase: () => void;
}

export function TrialBanner({ daysRemaining, onActivateLicense, onPurchase }: TrialBannerProps) {
  const isUrgent = daysRemaining <= 3;

  const handlePurchase = () => {
    // Open Lemon Squeezy checkout in default browser
    window.electronAPI.openExternal(EXTERNAL_LINKS.checkout);
    onPurchase();
  };

  return (
    <Alert
      variant={isUrgent ? 'destructive' : 'default'}
      className="rounded-none border-x-0 border-t-0 py-2 text-[13px] data-[variant=default]:bg-warning-bg data-[variant=default]:text-warning"
    >
      <AlertDescription className="mt-0 flex items-center justify-between gap-4 text-inherit">
        <span className="font-medium">
          {daysRemaining === 1 ? '1 day left in your trial' : `${daysRemaining} days left in your trial`}
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onActivateLicense}>
            Enter License
          </Button>
          <Button size="sm" onClick={handlePurchase}>
            Buy Now
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
