/**
 * Banner shown during trial period (days 7-14)
 *
 * Displays remaining trial days and provides quick access to
 * license activation and purchase.
 */

interface TrialBannerProps {
  daysRemaining: number;
  onActivateLicense: () => void;
  onPurchase: () => void;
}

export function TrialBanner({ daysRemaining, onActivateLicense, onPurchase }: TrialBannerProps) {
  const urgency = daysRemaining <= 3 ? 'urgent' : 'normal';

  const handlePurchase = () => {
    // Open Lemon Squeezy checkout in default browser
    window.electronAPI.openExternal('https://carvd-studio.lemonsqueezy.com/buy');
    onPurchase();
  };

  return (
    <div className={`trial-banner trial-banner--${urgency}`}>
      <span className="trial-banner__text">
        {daysRemaining === 1 ? '1 day left in your trial' : `${daysRemaining} days left in your trial`}
      </span>
      <div className="trial-banner__actions">
        <button className="btn btn-small btn-ghost" onClick={onActivateLicense}>
          Enter License
        </button>
        <button className="btn btn-small btn-primary" onClick={handlePurchase}>
          Buy Now
        </button>
      </div>
    </div>
  );
}
