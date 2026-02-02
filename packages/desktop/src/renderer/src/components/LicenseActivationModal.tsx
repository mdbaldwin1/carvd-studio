import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Key } from 'lucide-react';

interface LicenseActivationModalProps {
  isOpen: boolean;
  onActivate: (licenseKey: string) => Promise<{ success: boolean; error?: string }>;
}

export function LicenseActivationModal({ isOpen, onActivate }: LicenseActivationModalProps) {
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

  // Handle Enter key to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isOpen && !isValidating && licenseKey.trim()) {
        handleActivate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isValidating, licenseKey]);

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
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <div
        className="modal-content"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--color-border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary)',
              marginBottom: '16px'
            }}
          >
            <Key size={32} color="white" />
          </div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: 'var(--color-text)' }}>
            Activate Carvd Studio
          </h2>
          <p style={{ margin: '8px 0 0', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            Enter your license key to get started
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div
            style={{
              padding: '16px',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid var(--color-success)',
              borderRadius: '8px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <CheckCircle size={20} color="var(--color-success)" />
            <span style={{ color: 'var(--color-success)', fontSize: '14px', fontWeight: 500 }}>
              License activated successfully!
            </span>
          </div>
        )}

        {/* Error Message */}
        {error && !success && (
          <div
            style={{
              padding: '16px',
              backgroundColor: 'rgba(196, 84, 84, 0.1)',
              border: '1px solid var(--color-danger)',
              borderRadius: '8px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}
          >
            <AlertCircle size={20} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ color: 'var(--color-danger)', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                Activation Failed
              </div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{error}</div>
            </div>
          </div>
        )}

        {/* License Key Input */}
        {!success && (
          <>
            <div style={{ marginBottom: '24px' }}>
              <label
                htmlFor="license-key-input"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--color-text)'
                }}
              >
                License Key
              </label>
              <input
                id="license-key-input"
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="Paste your license key here"
                disabled={isValidating}
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-primary)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = error ? 'var(--color-danger)' : 'var(--color-border)';
                }}
              />
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                You should have received your license key via email after purchase
              </p>
            </div>

            {/* Activate Button */}
            <button
              onClick={handleActivate}
              disabled={isValidating || !licenseKey.trim()}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                fontWeight: 600,
                opacity: isValidating || !licenseKey.trim() ? 0.5 : 1,
                cursor: isValidating || !licenseKey.trim() ? 'not-allowed' : 'pointer'
              }}
            >
              {isValidating ? 'Validating...' : 'Activate License'}
            </button>
          </>
        )}

        {/* Help Text */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '1px solid var(--color-border)',
            textAlign: 'center'
          }}
        >
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Need help?{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.electronAPI?.openExternal?.('https://support.carvd.studio/license-activation');
              }}
              style={{
                color: 'var(--color-primary)',
                textDecoration: 'none',
                fontWeight: 500
              }}
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
