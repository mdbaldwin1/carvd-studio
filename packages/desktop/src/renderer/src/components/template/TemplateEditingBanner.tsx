/**
 * Banner shown when editing a template in the 3D workspace.
 * Displays the template name and provides save/discard actions.
 */

import { Save, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert';
import { Button } from '@renderer/components/ui/button';

interface TemplateEditingBannerProps {
  templateName: string;
  isCreatingNew?: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function TemplateEditingBanner({
  templateName,
  isCreatingNew = false,
  onSave,
  onDiscard
}: TemplateEditingBannerProps) {
  return (
    <Alert className="rounded-none border-x-0 border-t-0 border-b-primary/30 bg-primary py-2 text-white">
      <div className="flex items-center justify-between gap-4">
        <div>
          <AlertTitle className="flex items-center gap-2 text-white">
            <span className="text-base">📐</span>
            <span>{isCreatingNew ? 'Creating new template:' : 'Editing template:'}</span>
          </AlertTitle>
          <AlertDescription className="mt-1 text-white/95">
            <strong>{isCreatingNew ? templateName || 'Untitled' : templateName}</strong>
          </AlertDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/15"
            onClick={onDiscard}
            title="Discard changes"
          >
            <X size={16} />
            Discard
          </Button>
          <Button
            size="sm"
            className="!bg-white !text-primary hover:!bg-white/90"
            onClick={onSave}
            title="Save template"
          >
            <Save size={16} />
            Save Template
          </Button>
        </div>
      </div>
    </Alert>
  );
}
