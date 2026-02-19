/**
 * Banner shown during trial period (days 7-14)
 *
 * Displays remaining trial days and provides quick access to
 * license activation and purchase.
 */

import { Button } from '@renderer/components/ui/button';

interface TrialBannerProps {
  daysRemaining: number;
  onActivateLicense: () => void;
  onPurchase: () => void;
}

export function TrialBanner({ daysRemaining, onActivateLicense, onPurchase }: TrialBannerProps) {
  const isUrgent = daysRemaining <= 3;

  const handlePurchase = () => {
    // Open Lemon Squeezy checkout in default browser
    window.electronAPI.openExternal('https://carvd-studio.lemonsqueezy.com/buy');
    onPurchase();
  };

  return (
    <div
      className={`flex items-center justify-between px-4 py-2 text-[13px] flex-shrink-0 border-b ${
        isUrgent ? 'bg-error-bg border-error-border' : 'bg-warning-bg border-warning-border'
      }`}
    >
      <span className={`font-medium ${isUrgent ? 'text-error' : 'text-warning'}`}>
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
    </div>
  );
}
