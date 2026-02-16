import { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const [appVersion, setAppVersion] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      window.electronAPI.getAppVersion().then(setAppVersion);
    }
  }, [isOpen]);

  const handleOpenLink = async (url: string) => {
    await window.electronAPI.openExternal(url);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="About Carvd Studio"
      className="about-modal"
      footer={
        <button className="btn btn-sm btn-filled btn-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="about-content">
        <div className="about-logo">
          <span className="about-icon">🪑</span>
          <h3>Carvd Studio</h3>
          <p className="about-version">Version {appVersion || '...'}</p>
        </div>

        <p className="about-description">
          Professional woodworking design software for furniture makers, cabinet builders, and craftspeople. Design
          projects in 3D, generate cut lists, and optimize material usage.
        </p>

        <div className="about-links">
          <button
            className="btn btn-sm btn-ghost btn-secondary"
            onClick={() => handleOpenLink('https://carvd-studio.com')}
          >
            Website
          </button>
          <button
            className="btn btn-sm btn-ghost btn-secondary"
            onClick={() => handleOpenLink('https://carvd-studio.com/docs')}
          >
            Documentation
          </button>
          <button
            className="btn btn-sm btn-ghost btn-secondary"
            onClick={() => handleOpenLink('https://carvd-studio.com/privacy')}
          >
            Privacy Policy
          </button>
          <button
            className="btn btn-sm btn-ghost btn-secondary"
            onClick={() => handleOpenLink('https://carvd-studio.com/terms')}
          >
            Terms of Service
          </button>
          <button className="btn btn-sm btn-ghost btn-secondary" onClick={() => window.electronAPI.openLicensesFile()}>
            Open Source Licenses
          </button>
        </div>

        <div className="about-disclaimer">
          <p>
            This software is provided "as is" without warranty of any kind, express or implied. Use at your own risk.
            Always verify measurements before cutting materials.
          </p>
        </div>

        <div className="about-copyright">
          <p>&copy; {new Date().getFullYear()} Carvd Studio. All rights reserved.</p>
          <p className="about-contact">
            Contact:{' '}
            <button className="btn-link" onClick={() => handleOpenLink('mailto:support@carvd-studio.com')}>
              support@carvd-studio.com
            </button>
          </p>
        </div>
      </div>
    </Modal>
  );
}
