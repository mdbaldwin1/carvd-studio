/**
 * Modal shown when trial expires
 *
 * Gives user options to purchase, enter an existing license key,
 * or continue with limited features.
 */

import { Button } from '@renderer/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog';

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
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="w-[560px] max-w-[92vw] max-h-[86vh]" onClose={() => {}}>
        <DialogHeader>
          <DialogTitle>Your 14-Day Trial Has Ended</DialogTitle>
        </DialogHeader>

        <div className="p-5 overflow-y-auto text-center space-y-4">
          <p className="text-text-secondary text-sm leading-relaxed m-0 mb-5">
            Thank you for trying Carvd Studio! To continue with full features, please purchase a license.
          </p>

          <Card className="border-border bg-bg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Full License Includes</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-none p-0 m-0 mb-4 text-[13px] text-text text-left">
                <li className="py-1 flex items-center gap-2">
                  <span className="text-success font-semibold">&#x2713;</span>
                  Unlimited parts &amp; projects
                </li>
                <li className="py-1 flex items-center gap-2">
                  <span className="text-success font-semibold">&#x2713;</span>
                  PDF export &amp; cut list optimizer
                </li>
                <li className="py-1 flex items-center gap-2">
                  <span className="text-success font-semibold">&#x2713;</span>
                  Groups, assemblies &amp; templates
                </li>
                <li className="py-1 flex items-center gap-2">
                  <span className="text-success font-semibold">&#x2713;</span>
                  Lifetime updates
                </li>
              </ul>
              <Button size="lg" className="w-full" onClick={handlePurchase}>
                Buy Now
              </Button>
            </CardContent>
          </Card>

          <div className="flex items-center my-4 text-text-muted text-xs uppercase tracking-wider">
            <div className="flex-1 h-px bg-border" />
            <span className="px-3">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Card className="border-border bg-bg">
            <CardContent className="pt-5">
              <Button size="default" variant="secondary" className="w-full" onClick={onActivateLicense}>
                I Already Have a License Key
              </Button>
            </CardContent>
          </Card>

          <div className="pt-4 border-t border-border">
            <Button variant="ghost" onClick={onContinueFree}>
              Continue with Limited Features
            </Button>
            <p className="text-[11px] text-text-muted mt-2 m-0">
              Limited: 10 parts, no PDF export, no optimizer, no assemblies
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
