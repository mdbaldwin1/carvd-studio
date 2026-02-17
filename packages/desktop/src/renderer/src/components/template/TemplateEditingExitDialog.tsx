/**
 * Dialogs for template editing workflow.
 * - TemplateSetupDialog: Shown BEFORE entering edit mode for new templates
 * - TemplateSaveDialog: Shown when saving (only used if name/description needed)
 * - TemplateDiscardDialog: Confirmation for discarding changes
 */

import { useState, useEffect } from 'react';

const inputClass =
  'w-full bg-bg border border-border rounded-md py-2 px-3 text-sm text-text font-[inherit] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-text-muted';

/**
 * Setup dialog shown BEFORE entering template edit mode.
 * Collects name and description upfront for new templates.
 */
interface TemplateSetupDialogProps {
  isOpen: boolean;
  onConfirm: (name: string, description: string) => void;
  onCancel: () => void;
}

export function TemplateSetupDialog({ isOpen, onConfirm, onCancel }: TemplateSetupDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (name.trim()) {
      onConfirm(name.trim(), description.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && name.trim()) {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-120 w-[90vw]" onKeyDown={handleKeyDown}>
        <div className="modal-header">
          <h2>Create New Template</h2>
        </div>

        <div className="modal-body">
          <p className="text-text-secondary text-sm mb-5">
            Templates let you save reusable project layouts. Give your template a name and optional description.
          </p>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="template-setup-name" className="text-[13px] font-medium text-text-secondary">
                Name
              </label>
              <input
                id="template-setup-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Basic Bookshelf, Simple Desk"
                autoFocus
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="template-setup-description" className="text-[13px] font-medium text-text-secondary">
                Description (optional)
              </label>
              <textarea
                id="template-setup-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this template"
                rows={3}
                className={`${inputClass} resize-y min-h-15`}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer flex gap-2 justify-end">
          <button className="btn btn-sm btn-ghost btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-sm btn-filled btn-primary" onClick={handleConfirm} disabled={!name.trim()}>
            Start Editing
          </button>
        </div>
      </div>
    </div>
  );
}

interface TemplateSaveDialogProps {
  isOpen: boolean;
  templateName: string;
  templateDescription?: string;
  isCreatingNew?: boolean;
  onSave: (name: string, description: string) => void;
  onCancel: () => void;
}

export function TemplateSaveDialog({
  isOpen,
  templateName,
  templateDescription = '',
  isCreatingNew = false,
  onSave,
  onCancel
}: TemplateSaveDialogProps) {
  const [name, setName] = useState(templateName);
  const [description, setDescription] = useState(templateDescription);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName(templateName);
      setDescription(templateDescription);
    }
  }, [isOpen, templateName, templateDescription]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), description.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && name.trim()) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-120 w-[90vw]" onKeyDown={handleKeyDown}>
        <div className="modal-header">
          <h2>{isCreatingNew ? 'Save New Template' : 'Save Template'}</h2>
        </div>

        <div className="modal-body">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="template-name" className="text-[13px] font-medium text-text-secondary">
                Name
              </label>
              <input
                id="template-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Template name"
                autoFocus
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="template-description" className="text-[13px] font-medium text-text-secondary">
                Description (optional)
              </label>
              <textarea
                id="template-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this template"
                rows={3}
                className={`${inputClass} resize-y min-h-15`}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer flex gap-2 justify-end">
          <button className="btn btn-sm btn-ghost btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-sm btn-filled btn-primary" onClick={handleSave} disabled={!name.trim()}>
            Save Template
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Confirmation dialog for discarding template changes.
 */
interface TemplateDiscardDialogProps {
  isOpen: boolean;
  templateName: string;
  isCreatingNew?: boolean;
  onDiscard: () => void;
  onCancel: () => void;
}

export function TemplateDiscardDialog({
  isOpen,
  templateName,
  isCreatingNew = false,
  onDiscard,
  onCancel
}: TemplateDiscardDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal max-w-120 w-[90vw]">
        <div className="modal-header">
          <h2>Discard Changes?</h2>
        </div>

        <div className="modal-body">
          <p>
            {isCreatingNew ? (
              <>Are you sure you want to discard this new template? Your changes will be lost.</>
            ) : (
              <>
                Are you sure you want to discard changes to <strong>{templateName}</strong>? Your changes will be lost.
              </>
            )}
          </p>
        </div>

        <div className="modal-footer flex gap-2 justify-end">
          <button className="btn btn-sm btn-ghost btn-secondary mr-auto" onClick={onCancel}>
            Keep Editing
          </button>
          <button className="btn btn-sm btn-filled btn-danger" onClick={onDiscard}>
            Discard Changes
          </button>
        </div>
      </div>
    </div>
  );
}
