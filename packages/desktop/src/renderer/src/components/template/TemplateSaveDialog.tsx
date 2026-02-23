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
import { Input } from '@renderer/components/ui/input';
import { Textarea } from '@renderer/components/ui/textarea';

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
      <AlertDialogContent className="max-w-[30rem] w-[90vw]" onKeyDown={handleKeyDown} aria-describedby={undefined}>
        <AlertDialogHeader>
          <AlertDialogTitle>{isCreatingNew ? 'Save New Template' : 'Save Template'}</AlertDialogTitle>
          <AlertDialogDescription className="sr-only">
            Update template name and description before saving.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="px-5 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="template-name" className="text-[13px] font-medium text-text-secondary">
                Name
              </label>
              <Input
                id="template-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Template name"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="template-description" className="text-[13px] font-medium text-text-secondary">
                Description (optional)
              </label>
              <Textarea
                id="template-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this template"
                rows={3}
                className="resize-y min-h-15"
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
