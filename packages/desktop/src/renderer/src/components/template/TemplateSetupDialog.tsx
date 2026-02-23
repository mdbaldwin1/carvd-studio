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

interface TemplateSetupDialogProps {
  isOpen: boolean;
  onConfirm: (name: string, description: string) => void;
  onCancel: () => void;
}

export function TemplateSetupDialog({ isOpen, onConfirm, onCancel }: TemplateSetupDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

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
      <AlertDialogContent className="max-w-[30rem] w-[90vw]" onKeyDown={handleKeyDown}>
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
              <Input
                id="template-setup-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Basic Bookshelf, Simple Desk"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="template-setup-description" className="text-[13px] font-medium text-text-secondary">
                Description (optional)
              </label>
              <Textarea
                id="template-setup-description"
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
          <Button size="sm" onClick={handleConfirm} disabled={!name.trim()}>
            Start Editing
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
