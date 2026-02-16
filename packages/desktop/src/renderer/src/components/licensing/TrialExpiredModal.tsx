/**
 * Modal shown when trial expires
 *
 * Gives user options to purchase, enter an existing license key,
 * or continue with limited features.
 */

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
    <div className="modal-backdrop">
      <div className="modal max-w-[400px]">
        <div className="modal-header">
          <h2>Your 14-Day Trial Has Ended</h2>
        </div>

        <div className="modal-body text-center">
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
            <button className="btn btn-primary btn-lg btn-block" onClick={handlePurchase}>
              Buy Now
            </button>
          </div>

          <div className="flex items-center my-4 text-text-muted text-xs uppercase tracking-wider">
            <div className="flex-1 h-px bg-border" />
            <span className="px-3">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button className="btn btn-secondary btn-block" onClick={onActivateLicense}>
            I Already Have a License Key
          </button>

          <div className="mt-6 pt-4 border-t border-border">
            <button className="btn btn-ghost" onClick={onContinueFree}>
              Continue with Limited Features
            </button>
            <p className="text-[11px] text-text-muted mt-2 m-0">
              Limited: 10 parts, no PDF export, no optimizer, no assemblies
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
