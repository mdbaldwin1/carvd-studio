/**
 * Modal shown when trial expires
 *
 * Gives user options to purchase, enter an existing license key,
 * or continue with limited features.
 */

import { Button } from '@renderer/components/ui/button';

interface TrialExpiredModalProps {
  onActivateLicense: () => void;
  onPurchase: () => void;
  onContinueFree: () => void;
}

export function TrialExpiredModal({ onActivateLicense, onPurchase, onContinueFree }: TrialExpiredModalProps) {
  const handlePurchase = () => {
    // Open Lemon Squeezy checkout in default browser
    window.electronAPI.openExternal('https://carvd-studio.lemonsqueezy.com/buy');
    onPurchase();
  };

  return (
    <div className="modal-backdrop fixed inset-0 bg-overlay flex items-center justify-center z-[1100]">
      <div className="modal bg-surface border border-border rounded-lg shadow-[0_8px_32px_var(--color-overlay)] max-w-[400px] max-h-[85vh] flex flex-col animate-modal-fade-in">
        <div className="flex justify-between items-center py-4 px-5 border-b border-border">
          <h2 className="m-0 text-base font-semibold text-text">Your 14-Day Trial Has Ended</h2>
        </div>

        <div className="p-5 overflow-y-auto text-center">
          <p className="text-text-secondary text-sm leading-relaxed m-0 mb-5">
            Thank you for trying Carvd Studio! To continue with full features, please purchase a license.
          </p>

          <div className="bg-bg border border-border rounded-md p-4 mb-4">
            <ul className="list-none p-0 m-0 mb-4 text-[13px] text-text text-left">
              <li className="py-1 flex items-center gap-2">
                <span className="text-success font-semibold">&#x2713;</span>
                Unlimited parts &amp; projects
              </li>
              <li className="py-1 flex items-center gap-2">
                <span className="text-success font-semibold">&#x2713;</span>
                PDF export &amp; cut list optimizer
              </li>
              <li className="py-1 flex items-center gap-2">
                <span className="text-success font-semibold">&#x2713;</span>
                Groups, assemblies &amp; templates
              </li>
              <li className="py-1 flex items-center gap-2">
                <span className="text-success font-semibold">&#x2713;</span>
                Lifetime updates
              </li>
            </ul>
            <Button size="lg" className="w-full" onClick={handlePurchase}>
              Buy Now
            </Button>
          </div>

          <div className="flex items-center my-4 text-text-muted text-xs uppercase tracking-wider">
            <div className="flex-1 h-px bg-border" />
            <span className="px-3">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button size="default" variant="secondary" className="w-full" onClick={onActivateLicense}>
            I Already Have a License Key
          </Button>

          <div className="mt-6 pt-4 border-t border-border">
            <Button variant="ghost" onClick={onContinueFree}>
              Continue with Limited Features
            </Button>
            <p className="text-[11px] text-text-muted mt-2 m-0">
              Limited: 10 parts, no PDF export, no optimizer, no assemblies
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
