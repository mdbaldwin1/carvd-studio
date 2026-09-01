import { useRef, useState } from 'react';
import { Button } from '@renderer/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog';

interface AnalyticsConsentDialogProps {
  onResolved: () => void;
}

export function AnalyticsConsentDialog({ onResolved }: AnalyticsConsentDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const isSubmittingRef = useRef(false);

  const resolveConsent = async (consent: 'granted' | 'denied') => {
    if (isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSaving(true);
    try {
      await window.electronAPI.setAnalyticsConsent(consent, 'onboarding');
      onResolved();
    } catch {
      // Leave the choice available if consent persistence cannot be reached.
    } finally {
      isSubmittingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent
        className="w-[480px] max-w-[92vw]"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Help improve Carvd Studio</DialogTitle>
        </DialogHeader>
        <DialogDescription className="px-5 pt-4 leading-relaxed">
          Share anonymous feature-usage and reliability data. Project names, dimensions, files, notes, and designs are
          never collected. Analytics is optional and Carvd always works offline.
        </DialogDescription>
        <DialogFooter>
          <Button variant="outline" onClick={() => void resolveConsent('denied')} disabled={isSaving}>
            Don&apos;t share
          </Button>
          <Button onClick={() => void resolveConsent('granted')} disabled={isSaving}>
            Share anonymous usage data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
