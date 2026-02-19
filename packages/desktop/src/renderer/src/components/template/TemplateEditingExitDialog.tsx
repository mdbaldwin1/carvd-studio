/**
 * Dialogs for template editing workflow.
 * - TemplateSetupDialog: Shown BEFORE entering edit mode for new templates
 * - TemplateSaveDialog: Shown when saving (only used if name/description needed)
 * - TemplateDiscardDialog: Confirmation for discarding changes
 */

import { useState, useEffect } from 'react';
import { Button } from '@renderer/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription
} from '@renderer/components/ui/alert-dialog';

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
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="max-w-120 w-[90vw]" onKeyDown={handleKeyDown}>
        <AlertDialogHeader>
          <AlertDialogTitle>Create New Template</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="px-5 py-4">
          <AlertDialogDescription className="mb-5">
            Templates let you save reusable project layouts. Give your template a name and optional description.
          </AlertDialogDescription>
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

        <AlertDialogFooter>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={!name.trim()}>
            Start Editing
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="max-w-120 w-[90vw]" onKeyDown={handleKeyDown} aria-describedby={undefined}>
        <AlertDialogHeader>
          <AlertDialogTitle>{isCreatingNew ? 'Save New Template' : 'Save Template'}</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="px-5 py-4">
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

        <AlertDialogFooter>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
            Save Template
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="max-w-120 w-[90vw]">
        <AlertDialogHeader>
          <AlertDialogTitle>Discard Changes?</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="px-5 py-4">
          <AlertDialogDescription asChild>
            <p>
              {isCreatingNew ? (
                <>Are you sure you want to discard this new template? Your changes will be lost.</>
              ) : (
                <>
                  Are you sure you want to discard changes to <strong>{templateName}</strong>? Your changes will be
                  lost.
                </>
              )}
            </p>
          </AlertDialogDescription>
        </div>

        <AlertDialogFooter>
          <Button variant="ghost" size="sm" className="mr-auto" onClick={onCancel}>
            Keep Editing
          </Button>
          <Button variant="destructive" size="sm" onClick={onDiscard}>
            Discard Changes
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
