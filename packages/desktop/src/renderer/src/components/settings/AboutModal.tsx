import { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '@renderer/components/ui/button';

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
      className="w-[420px]"
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="p-6 text-center">
        <div className="mb-5">
          <span className="text-5xl block mb-2">🪑</span>
          <h3 className="text-xl font-semibold text-text m-0 mb-1">Carvd Studio</h3>
          <p className="text-[13px] text-text-muted m-0">Version {appVersion || '...'}</p>
        </div>

        <p className="text-[13px] text-text-secondary leading-relaxed m-0 mb-5">
          Professional woodworking design software for furniture makers, cabinet builders, and craftspeople. Design
          projects in 3D, generate cut lists, and optimize material usage.
        </p>

        <div className="flex flex-wrap gap-2 justify-center mb-5">
          <Button variant="ghost" size="sm" onClick={() => handleOpenLink('https://carvd-studio.com')}>
            Website
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleOpenLink('https://carvd-studio.com/docs')}>
            Documentation
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleOpenLink('https://carvd-studio.com/privacy')}>
            Privacy Policy
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleOpenLink('https://carvd-studio.com/terms')}>
            Terms of Service
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.electronAPI.openLicensesFile()}>
            Open Source Licenses
          </Button>
        </div>

        <div className="p-3 bg-bg rounded-md mb-4">
          <p className="text-[11px] text-text-muted leading-normal m-0">
            This software is provided "as is" without warranty of any kind, express or implied. Use at your own risk.
            Always verify measurements before cutting materials.
          </p>
        </div>

        <div className="text-[11px] text-text-muted">
          <p className="m-0 mb-1">&copy; {new Date().getFullYear()} Carvd Studio. All rights reserved.</p>
          <p className="m-0 mb-1">
            Contact:{' '}
            <button
              className="bg-none border-none text-primary cursor-pointer p-0 text-[inherit] underline hover:text-primary-hover"
              onClick={() => handleOpenLink('mailto:support@carvd-studio.com')}
            >
              support@carvd-studio.com
            </button>
          </p>
        </div>
      </div>
    </Modal>
  );
}
