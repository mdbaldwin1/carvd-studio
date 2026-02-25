import { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '@renderer/components/ui/button';
import { Card, CardContent } from '@renderer/components/ui/card';
import { AppHorizontalLogo } from '../common/AppHorizontalLogo';
import { EXTERNAL_LINKS } from '@renderer/utils/externalLinks';

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
      className="w-[560px] max-w-[92vw] max-h-[86vh]"
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="p-6 text-center overflow-y-auto space-y-4">
        <Card className="border-border bg-bg">
          <CardContent className="pt-5">
            <AppHorizontalLogo className="h-20 w-auto mx-auto mb-1" />
            <p className="text-[13px] text-text-muted m-0">Version {appVersion || '...'}</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-bg">
          <CardContent className="pt-5">
            <p className="text-[13px] text-text-secondary leading-relaxed m-0">
              Professional woodworking design software for furniture makers, cabinet builders, and craftspeople. Design
              projects in 3D, generate cut lists, and optimize material usage.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-bg">
          <CardContent className="pt-5">
            <div className="flex flex-wrap gap-2 justify-center">
              <Button variant="ghost" size="sm" onClick={() => handleOpenLink(EXTERNAL_LINKS.website)}>
                Website
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleOpenLink(EXTERNAL_LINKS.docs)}>
                Documentation
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleOpenLink(EXTERNAL_LINKS.support)}>
                Support
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleOpenLink(EXTERNAL_LINKS.privacy)}>
                Privacy Policy
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleOpenLink(EXTERNAL_LINKS.terms)}>
                Terms of Service
              </Button>
              <Button variant="ghost" size="sm" onClick={() => window.electronAPI.openLicensesFile()}>
                Open Source Licenses
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-bg">
          <CardContent className="pt-5">
            <p className="text-[11px] text-text-muted leading-normal m-0">
              This software is provided "as is" without warranty of any kind, express or implied. Use at your own risk.
              Always verify measurements before cutting materials.
            </p>
          </CardContent>
        </Card>

        <div className="text-[11px] text-text-muted">
          <p className="m-0 mb-1">&copy; {new Date().getFullYear()} Carvd Studio. All rights reserved.</p>
          <p className="m-0 mb-1">
            Support:{' '}
            <Button
              type="button"
              variant="link"
              size="xs"
              className="h-auto p-0 text-[inherit]"
              onClick={() => handleOpenLink(EXTERNAL_LINKS.support)}
            >
              carvd-studio.com/support
            </Button>
          </p>
        </div>
      </div>
    </Modal>
  );
}
