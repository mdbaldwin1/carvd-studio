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
      <div className="modal trial-expired-modal">
        <div className="modal-header">
          <h2>Your 14-Day Trial Has Ended</h2>
        </div>

        <div className="modal-body trial-expired-modal__body">
          <p className="trial-expired-modal__intro">
            Thank you for trying Carvd Studio! To continue with full features, please purchase a license.
          </p>

          <div className="trial-expired-modal__purchase-box">
            <ul className="trial-expired-modal__features">
              <li>Unlimited parts &amp; projects</li>
              <li>PDF export &amp; cut list optimizer</li>
              <li>Groups, assemblies &amp; templates</li>
              <li>Lifetime updates</li>
            </ul>
            <button className="btn btn-primary btn-lg btn-block" onClick={handlePurchase}>
              Buy Now
            </button>
          </div>

          <div className="trial-expired-modal__divider">
            <span>or</span>
          </div>

          <button className="btn btn-secondary btn-block" onClick={onActivateLicense}>
            I Already Have a License Key
          </button>

          <div className="trial-expired-modal__free-option">
            <button className="btn btn-ghost" onClick={onContinueFree}>
              Continue with Limited Features
            </button>
            <p className="trial-expired-modal__limits-note">
              Limited: 10 parts, no PDF export, no optimizer, no assemblies
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
