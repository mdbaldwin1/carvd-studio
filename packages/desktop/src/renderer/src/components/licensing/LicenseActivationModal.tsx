import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Key, X } from 'lucide-react';
import { HelpTooltip } from '../common/HelpTooltip';
import { Button } from '@renderer/components/ui/button';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleActivate reads current state via closure; stable identity not needed since deps already cover the changing values
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
    } catch {
      setError('Failed to validate license key');
    } finally {
      setIsValidating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-overlay-heavy flex items-center justify-center z-[9999]" onClick={onClose}>
      <div
        className="relative bg-surface rounded-xl p-8 max-w-[500px] w-[90%] shadow-[0_20px_60px_var(--color-overlay)] border border-border"
        role="dialog"
        aria-modal="true"
        aria-labelledby="license-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        {onClose && (
          <button
            className="absolute top-3 right-3 bg-transparent border-none text-text-secondary cursor-pointer p-2 rounded-sm flex items-center justify-center transition-colors duration-150 hover:bg-bg-hover hover:text-text"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4 text-text">
            <Key size={32} />
          </div>
          <h2 id="license-modal-title" className="m-0 text-2xl font-semibold text-text">
            Activate Carvd Studio
          </h2>
          <p className="mt-2 mb-0 text-text-secondary text-sm">Enter your license key to unlock all features</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="flex items-center gap-3 p-4 bg-success-bg border border-success-border rounded-lg mb-6">
            <CheckCircle size={20} />
            <span className="text-success text-sm font-medium">License activated successfully!</span>
          </div>
        )}

        {/* Error Message */}
        {error && !success && (
          <div className="flex items-start gap-3 p-4 bg-danger-bg border border-danger-border rounded-lg mb-6">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div>
              <div className="text-danger text-sm font-medium mb-1">Activation Failed</div>
              <div className="text-text-secondary text-[13px]">{error}</div>
            </div>
          </div>
        )}

        {/* License Key Input */}
        {!success && (
          <>
            <div className="mb-6">
              <div className="flex items-center gap-1">
                <label htmlFor="license-key-input" className="block mb-2 text-sm font-medium text-text">
                  License Key
                </label>
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
                className={`w-full p-3 text-sm font-mono border rounded-md bg-bg text-text outline-none transition-colors duration-200 focus:border-primary ${error ? 'has-error border-danger' : 'border-border'}`}
              />
            </div>

            {/* Activate Button */}
            <Button
              size="default"
              className="w-full"
              onClick={handleActivate}
              disabled={isValidating || !licenseKey.trim()}
            >
              {isValidating ? 'Validating...' : 'Activate License'}
            </Button>
          </>
        )}

        {/* Help Text */}
        <div className="mt-6 pt-6 border-t border-border text-center">
          <p className="m-0 text-[13px] text-text-secondary">
            Need help?{' '}
            <a
              href="#"
              className="text-primary no-underline font-medium hover:underline"
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
              className="text-primary no-underline font-medium hover:underline"
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
            <p className="mt-3 mb-0 text-[13px] text-text-secondary">
              <a
                href="#"
                className="text-text-muted no-underline hover:text-text-secondary hover:underline"
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
