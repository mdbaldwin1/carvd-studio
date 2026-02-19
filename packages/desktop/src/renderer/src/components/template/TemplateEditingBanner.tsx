/**
 * Banner shown when editing a template in the 3D workspace.
 * Displays the template name and provides save/discard actions.
 */

import { Save, X } from 'lucide-react';
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
    <div className="flex items-center justify-between px-4 py-2 bg-primary text-white text-sm gap-4">
      <div className="flex items-center gap-2">
        <span className="text-base">📐</span>
        <span>
          {isCreatingNew ? (
            <>
              Creating new template: <strong>{templateName || 'Untitled'}</strong>
            </>
          ) : (
            <>
              Editing template: <strong>{templateName}</strong>
            </>
          )}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-white border-white/30 hover:bg-white/15 hover:border-white/50"
          onClick={onDiscard}
          title="Discard changes"
        >
          <X size={16} />
          Discard
        </Button>
        <Button size="sm" className="!bg-white !text-primary hover:!bg-white/90" onClick={onSave} title="Save template">
          <Save size={16} />
          Save Template
        </Button>
      </div>
    </div>
  );
}
