import { CheckCircle, Key } from 'lucide-react';

interface LicenseSectionProps {
  licenseMode?: 'trial' | 'licensed' | 'free';
  licenseData: {
    licenseEmail: string | null;
    licenseOrderId: string | null;
    licenseActivatedAt: string | null;
  };
  onDeactivateLicense?: () => void;
  onShowLicenseModal?: () => void;
  onClose: () => void;
}

export function LicenseSection({
  licenseMode,
  licenseData,
  onDeactivateLicense,
  onShowLicenseModal,
  onClose
}: LicenseSectionProps) {
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="text-sm font-semibold m-0 mb-3 text-text flex items-center gap-1.5">License</h3>
      {licenseData.licenseEmail ? (
        <>
          <div className="alert alert-success" style={{ marginBottom: '16px' }}>
            <CheckCircle size={20} className="alert-icon" />
            <div className="alert-content">
              <div className="alert-title">License Active</div>
              <div className="alert-message">
                <div>
                  <strong>Email:</strong> {licenseData.licenseEmail}
                </div>
                <div>
                  <strong>Order ID:</strong> {licenseData.licenseOrderId}
                </div>
                {licenseData.licenseActivatedAt && (
                  <div>
                    <strong>Activated:</strong> {new Date(licenseData.licenseActivatedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
          {onDeactivateLicense && (
            <button
              className="btn btn-sm btn-outlined btn-danger"
              onClick={() => {
                if (
                  confirm(
                    'Are you sure you want to deactivate this license? You will need to enter it again to use the app.'
                  )
                ) {
                  onDeactivateLicense();
                }
              }}
            >
              Deactivate License
            </button>
          )}
        </>
      ) : licenseMode === 'free' ? (
        <div className="bg-bg-secondary border border-border rounded-lg p-4">
          <p className="text-[13px] text-text-secondary leading-relaxed m-0 mb-4">
            You're using the free version of Carvd Studio. Upgrade to unlock all features including assemblies, custom
            templates, and the cut list optimizer.
          </p>
          <div className="flex gap-2">
            <a
              href="https://carvd-studio.com/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-filled btn-primary"
            >
              Purchase License
            </a>
            {onShowLicenseModal && (
              <button
                className="btn btn-sm btn-outlined btn-secondary"
                onClick={() => {
                  onClose();
                  onShowLicenseModal();
                }}
              >
                Enter License Key
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="alert alert-info">
          <Key size={20} className="alert-icon" />
          <span className="alert-message">Trial mode active</span>
        </div>
      )}
    </div>
  );
}
