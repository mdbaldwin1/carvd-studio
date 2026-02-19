import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Trash2 } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { useBackdropClose } from '../../hooks/useBackdropClose';
import { builtInTemplates, formatDimensions, BuiltInTemplate, UserTemplate, ProjectTemplate } from '../../templates';
import { Project } from '../../types';
import { useProjectStore } from '../../store/projectStore';
import { useLicenseStore } from '../../store/licenseStore';
import { useUIStore } from '../../store/uiStore';
import { getFeatureLimits, getBlockedMessage } from '../../utils/featureLimits';
import { logger } from '../../utils/logger';

interface TemplateBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: Project) => void;
  onSaveAsTemplate?: () => void; // Optional: if we want to save current project as template
}

export function TemplateBrowserModal({ isOpen, onClose, onCreateProject }: TemplateBrowserModalProps) {
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Use individual selectors to avoid creating new object references
  const projectName = useProjectStore((s) => s.name);
  const parts = useProjectStore((s) => s.parts);
  const licenseMode = useLicenseStore((s) => s.licenseMode);
  const canUseCustomTemplates = getFeatureLimits(licenseMode).canUseCustomTemplates;

  // Load user templates when modal opens
  useEffect(() => {
    if (isOpen) {
      loadUserTemplates();
      setSelectedTemplate(null);
      setDeleteConfirmId(null);
    }
  }, [isOpen]);

  const loadUserTemplates = async () => {
    try {
      const templates = await window.electronAPI.getUserTemplates();
      setUserTemplates(
        templates.map((t) => ({
          ...t,
          type: 'user' as const
        }))
      );
    } catch (error) {
      logger.error('Failed to load user templates:', error);
    }
  };

  const handleSelectTemplate = useCallback((template: ProjectTemplate) => {
    setSelectedTemplate(template);
    setDeleteConfirmId(null);
  }, []);

  const handleCreateProject = useCallback(() => {
    if (!selectedTemplate) return;

    setIsLoading(true);

    try {
      let project: Project;

      if (selectedTemplate.type === 'built-in') {
        project = (selectedTemplate as BuiltInTemplate).generate();
      } else {
        // Parse the stored project JSON
        project = JSON.parse((selectedTemplate as UserTemplate).project);
        // Update timestamps
        const now = new Date().toISOString();
        project.createdAt = now;
        project.modifiedAt = now;
      }

      onCreateProject(project);
      onClose();
    } catch (error) {
      logger.error('Failed to create project from template:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTemplate, onCreateProject, onClose]);

  const handleDeleteTemplate = useCallback(
    async (templateId: string) => {
      try {
        await window.electronAPI.removeUserTemplate(templateId);
        setUserTemplates((prev) => prev.filter((t) => t.id !== templateId));
        if (selectedTemplate?.id === templateId) {
          setSelectedTemplate(null);
        }
        setDeleteConfirmId(null);
      } catch (error) {
        logger.error('Failed to delete template:', error);
      }
    },
    [selectedTemplate]
  );

  const handleSaveCurrentAsTemplate = useCallback(async () => {
    // Check license limits for custom templates
    const projectState = useProjectStore.getState();
    const limits = getFeatureLimits(useLicenseStore.getState().licenseMode);
    if (!limits.canUseCustomTemplates) {
      useUIStore.getState().showToast(getBlockedMessage('useTemplates'));
      return;
    }

    // Calculate bounding box for dimensions
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;

    for (const part of parts) {
      const halfL = part.length / 2;
      const halfW = part.width / 2;
      const halfT = part.thickness / 2;

      minX = Math.min(minX, part.position.x - halfL);
      maxX = Math.max(maxX, part.position.x + halfL);
      minY = Math.min(minY, part.position.y - halfT);
      maxY = Math.max(maxY, part.position.y + halfT);
      minZ = Math.min(minZ, part.position.z - halfW);
      maxZ = Math.max(maxZ, part.position.z + halfW);
    }

    const width = parts.length > 0 ? Math.round(maxX - minX) : 0;
    const depth = parts.length > 0 ? Math.round(maxZ - minZ) : 0;
    const height = parts.length > 0 ? Math.round(maxY - minY) : 0;

    // Get the full project state (reuse projectStore from license check above)
    const fullProject: Project = {
      version: '1.0',
      name: projectState.name,
      stocks: projectState.stocks,
      parts: projectState.parts,
      groups: projectState.groups,
      groupMembers: projectState.groupMembers,
      assemblies: projectState.assemblies,
      units: projectState.units,
      gridSize: projectState.gridSize,
      kerfWidth: projectState.kerfWidth,
      overageFactor: projectState.overageFactor,
      projectNotes: projectState.projectNotes,
      stockConstraints: projectState.stockConstraints,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    };

    const template = {
      id: uuidv4(),
      name: projectName || 'My Template',
      description: `Custom template with ${parts.length} parts`,
      dimensions: { width, depth, height },
      partCount: parts.length,
      thumbnail: '📐',
      category: 'other' as const,
      createdAt: new Date().toISOString(),
      project: JSON.stringify(fullProject)
    };

    try {
      await window.electronAPI.addUserTemplate(template);
      await loadUserTemplates();
    } catch (error) {
      logger.error('Failed to save template:', error);
    }
  }, [parts, projectName]);

  const { handleMouseDown, handleClick } = useBackdropClose(onClose);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (deleteConfirmId) {
          setDeleteConfirmId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, deleteConfirmId]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop fixed inset-0 bg-overlay flex items-center justify-center z-[1100]"
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div
        className="bg-surface border border-border rounded-lg shadow-[0_8px_32px_var(--color-overlay)] max-w-[90vw] flex flex-col animate-modal-fade-in w-[800px] max-h-[80vh] relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-browser-modal-title"
      >
        <div className="flex justify-between items-center py-4 px-5 border-b border-border">
          <h2 id="template-browser-modal-title" className="text-base font-semibold text-text m-0">
            New from Template
          </h2>
          <button
            className="bg-transparent border-none text-text-muted text-2xl cursor-pointer p-0 leading-none transition-colors duration-150 hover:text-text"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="flex min-h-[400px] max-h-[60vh]">
          {/* Templates list */}
          <div className="flex-1 p-4 overflow-y-auto border-r border-border">
            {/* Built-in templates */}
            <div className="mb-6 last:mb-0">
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider m-0 mb-3">
                Built-in Templates
              </h4>
              <div className="grid grid-cols-2 gap-2.5">
                {builtInTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`relative flex items-center gap-3 p-3 bg-bg border rounded-lg cursor-pointer transition-all duration-150 hover:border-border-hover hover:bg-bg-secondary ${selectedTemplate?.id === template.id ? 'border-accent bg-accent-bg' : 'border-border'}`}
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <div className="text-[28px] w-11 h-11 flex items-center justify-center bg-bg-tertiary rounded-md shrink-0">
                      {template.thumbnail}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="text-[13px] font-medium text-text truncate">{template.name}</span>
                      <span className="text-[11px] text-text-muted">{formatDimensions(template.dimensions)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* User templates */}
            <div className="mb-6 last:mb-0">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider m-0">My Templates</h4>
                {parts.length > 0 && canUseCustomTemplates && (
                  <Button variant="ghost" size="xs" onClick={handleSaveCurrentAsTemplate}>
                    + Save Current
                  </Button>
                )}
              </div>
              {userTemplates.length === 0 ? (
                <p className="text-text-muted text-xs italic">
                  No custom templates yet. Save your current project as a template to reuse it later.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {userTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`group relative flex items-center gap-3 p-3 bg-bg border border-dashed rounded-lg cursor-pointer transition-all duration-150 hover:border-border-hover hover:bg-bg-secondary ${selectedTemplate?.id === template.id ? '!border-solid border-accent bg-accent-bg' : 'border-border'}`}
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <div className="text-[28px] w-11 h-11 flex items-center justify-center bg-bg-tertiary rounded-md shrink-0">
                        {template.thumbnail}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <span className="text-[13px] font-medium text-text truncate">{template.name}</span>
                        <span className="text-[11px] text-text-muted">{formatDimensions(template.dimensions)}</span>
                      </div>
                      <button
                        className="absolute top-1.5 right-1.5 w-[22px] h-[22px] p-0 flex items-center justify-center bg-transparent border-none rounded cursor-pointer text-text-muted opacity-0 group-hover:opacity-100 transition-all duration-150 hover:bg-danger-bg hover:text-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(template.id);
                        }}
                        title="Delete template"
                        aria-label={`Delete template ${template.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Template details */}
          <div className="w-[280px] p-5 flex flex-col">
            {selectedTemplate ? (
              <>
                <div className="flex items-center gap-4 mb-5">
                  <span className="text-5xl w-[72px] h-[72px] flex items-center justify-center bg-bg-tertiary rounded-xl">
                    {selectedTemplate.thumbnail}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-text m-0 mb-1">{selectedTemplate.name}</h3>
                    {selectedTemplate.type === 'user' && (
                      <span className="inline-block text-[10px] font-semibold text-accent bg-accent-bg py-0.5 px-2 rounded-full uppercase tracking-wider">
                        Custom
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-1">
                  <p className="text-[13px] text-text-secondary leading-relaxed m-0 mb-5">
                    {selectedTemplate.description}
                  </p>

                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs text-text-muted">Dimensions</label>
                      <span className="text-[13px] text-text font-medium">
                        {formatDimensions(selectedTemplate.dimensions)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-xs text-text-muted">Parts</label>
                      <span className="text-[13px] text-text font-medium">{selectedTemplate.partCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-xs text-text-muted">Category</label>
                      <span className="text-[13px] text-text font-medium capitalize">{selectedTemplate.category}</span>
                    </div>
                    {selectedTemplate.type === 'user' && (
                      <div className="flex justify-between items-center">
                        <label className="text-xs text-text-muted">Created</label>
                        <span className="text-[13px] text-text font-medium">
                          {new Date((selectedTemplate as UserTemplate).createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-text-muted text-[13px]">Select a template to view details</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 py-4 px-5 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCreateProject} disabled={!selectedTemplate || isLoading}>
            {isLoading ? 'Creating...' : 'Create Project'}
          </Button>
        </div>

        {/* Delete confirmation overlay */}
        {deleteConfirmId && (
          <div className="absolute inset-0 bg-[rgba(0,0,0,0.6)] flex items-center justify-center rounded-lg">
            <div className="bg-surface p-5 rounded-lg text-center max-w-[280px]">
              <p className="m-0 mb-2 text-sm text-text">Delete this template?</p>
              <p className="text-xs text-text-muted mb-4">This action cannot be undone.</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDeleteTemplate(deleteConfirmId)}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
