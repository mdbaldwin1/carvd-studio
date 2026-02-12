/**
 * Banner shown when editing a template in the 3D workspace.
 * Displays the template name and provides save/discard actions.
 */

import { Save, X } from 'lucide-react';
import './TemplateEditingBanner.css';

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
    <div className="template-editing-banner">
      <div className="banner-content">
        <span className="banner-icon">📐</span>
        <span className="banner-text">
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
      <div className="banner-actions">
        <button className="btn btn-sm btn-ghost btn-secondary" onClick={onDiscard} title="Discard changes">
          <X size={16} />
          Discard
        </button>
        <button className="btn btn-sm btn-filled btn-primary" onClick={onSave} title="Save template">
          <Save size={16} />
          Save Template
        </button>
      </div>
    </div>
  );
}
