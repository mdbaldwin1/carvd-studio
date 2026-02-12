import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Key, X } from 'lucide-react';
import { HelpTooltip } from './HelpTooltip';

interface LicenseActivationModalProps {
  isOpen: boolean;
  onActivate: (licenseKey: string) => Promise<{ success: boolean; error?: string }>;
  onClose?: () => void;
}

export function LicenseActivationModal({ isOpen, onActivate, onClose }: LicenseActivationModalProps) {
  const [licenseKey, setLicenseKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLicenseKey('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  // Handle Enter key to submit, Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isOpen && !isValidating && licenseKey.trim()) {
        handleActivate();
      } else if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isValidating, licenseKey, onClose]);

  const handleActivate = async () => {
    const trimmedKey = licenseKey.trim();
    if (!trimmedKey) {
      setError('Please enter a license key');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const result = await onActivate(trimmedKey);
      if (result.success) {
        setSuccess(true);
        // Success feedback shown briefly before modal closes
        setTimeout(() => {
          // Modal will close automatically from parent component
        }, 1000);
      } else {
        setError(result.error || 'Invalid license key');
      }
    } catch (err) {
      setError('Failed to validate license key');
    } finally {
      setIsValidating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="license-modal-backdrop" onClick={onClose}>
      <div
        className="license-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="license-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        {onClose && (
          <button className="license-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        )}

        {/* Header */}
        <div className="license-modal-header">
          <div className="license-modal-icon">
            <Key size={32} />
          </div>
          <h2 id="license-modal-title">Activate Carvd Studio</h2>
          <p>Enter your license key to unlock all features</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="license-success-message">
            <CheckCircle size={20} />
            <span>License activated successfully!</span>
          </div>
        )}

        {/* Error Message */}
        {error && !success && (
          <div className="license-error-message">
            <AlertCircle size={20} className="error-icon" />
            <div>
              <div className="license-error-title">Activation Failed</div>
              <div className="license-error-detail">{error}</div>
            </div>
          </div>
        )}

        {/* License Key Input */}
        {!success && (
          <>
            <div className="license-input-group">
              <div className="label-with-help">
                <label htmlFor="license-key-input">License Key</label>
                <HelpTooltip
                  text="You should have received your license key via email after purchase from Lemon Squeezy."
                  docsSection="faq"
                />
              </div>
              <input
                id="license-key-input"
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="Paste your license key here"
                disabled={isValidating}
                autoFocus
                className={error ? 'has-error' : ''}
              />
            </div>

            {/* Activate Button */}
            <button
              onClick={handleActivate}
              disabled={isValidating || !licenseKey.trim()}
              className="btn btn-md btn-filled btn-primary btn-block"
            >
              {isValidating ? 'Validating...' : 'Activate License'}
            </button>
          </>
        )}

        {/* Help Text */}
        <div className="license-modal-footer">
          <p>
            Need help?{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.electronAPI?.openExternal?.('https://carvd-studio.com/docs#troubleshooting');
              }}
            >
              Troubleshooting guide
            </a>
            {' · '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.electronAPI?.openExternal?.(
                  'mailto:support@carvd-studio.com?subject=Carvd%20Studio%20License%20Activation%20Help'
                );
              }}
            >
              Contact Support
            </a>
          </p>
          {onClose && (
            <p className="license-modal-skip">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onClose();
                }}
              >
                Continue with limited features
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
