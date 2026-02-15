import React, { useState, useEffect } from 'react';
import { useBackdropClose } from '../../hooks/useBackdropClose';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const [appVersion, setAppVersion] = useState<string>('');
  const { handleMouseDown, handleClick } = useBackdropClose(onClose);

  useEffect(() => {
    if (isOpen) {
      window.electronAPI.getAppVersion().then(setAppVersion);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleOpenLink = async (url: string) => {
    await window.electronAPI.openExternal(url);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onMouseDown={handleMouseDown} onClick={handleClick}>
      <div className="modal about-modal" role="dialog" aria-modal="true" aria-labelledby="about-modal-title">
        <div className="modal-header">
          <h2 id="about-modal-title">About Carvd Studio</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

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
            <button
              className="btn btn-sm btn-ghost btn-secondary"
              onClick={() => window.electronAPI.openLicensesFile()}
            >
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

        <div className="modal-footer">
          <button className="btn btn-sm btn-filled btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
