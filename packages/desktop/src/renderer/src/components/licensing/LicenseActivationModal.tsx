import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Key, X } from 'lucide-react';
import { HelpTooltip } from '../common/HelpTooltip';
import { Button } from '@renderer/components/ui/button';
import { Card, CardContent } from '@renderer/components/ui/card';
import { Input } from '@renderer/components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '@renderer/components/ui/dialog';
import { getDocsUrl } from '@renderer/utils/docsLinks';
import { EXTERNAL_LINKS } from '@renderer/utils/externalLinks';

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="w-[620px] max-w-[92vw] max-h-[86vh] bg-surface" onClose={() => onClose?.()}>
        {/* Close button */}
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute top-3 right-3 text-text-secondary hover:text-text"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </Button>
        )}

        <div className="p-5 overflow-y-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary mb-4 text-text">
              <Key size={28} />
            </div>
            <DialogTitle id="license-modal-title" className="m-0 text-2xl text-text">
              Activate Carvd Studio
            </DialogTitle>
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
              <Card className="border-border bg-bg mb-6">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-1">
                    <label htmlFor="license-key-input" className="block mb-2 text-sm font-medium text-text">
                      License Key
                    </label>
                    <HelpTooltip
                      text="You should have received your license key via email after purchase from Lemon Squeezy."
                      docsSection="faq"
                    />
                  </div>
                  <Input
                    id="license-key-input"
                    type="text"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    placeholder="Paste your license key here"
                    disabled={isValidating}
                    autoFocus
                    className={`p-3 font-mono ${error ? 'has-error border-danger' : 'border-border'}`}
                  />
                </CardContent>
              </Card>

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
                  window.electronAPI?.openExternal?.(getDocsUrl('troubleshooting'));
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
                  window.electronAPI?.openExternal?.(EXTERNAL_LINKS.support);
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
      </DialogContent>
    </Dialog>
  );
}
