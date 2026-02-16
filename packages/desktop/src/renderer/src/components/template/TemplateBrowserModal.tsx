import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Trash2 } from 'lucide-react';
import { useBackdropClose } from '../../hooks/useBackdropClose';
import { builtInTemplates, formatDimensions, BuiltInTemplate, UserTemplate, ProjectTemplate } from '../../templates';
import { Project } from '../../types';
import { useProjectStore } from '../../store/projectStore';
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
  const licenseMode = useProjectStore((s) => s.licenseMode);
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
    const limits = getFeatureLimits(projectState.licenseMode);
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
    <div className="modal-backdrop" onMouseDown={handleMouseDown} onClick={handleClick}>
      <div
        className="modal template-browser-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-browser-modal-title"
      >
        <div className="modal-header">
          <h2 id="template-browser-modal-title">New from Template</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="template-browser-content">
          {/* Templates list */}
          <div className="template-list-panel">
            {/* Built-in templates */}
            <div className="template-section">
              <h4 className="template-section-header">Built-in Templates</h4>
              <div className="template-grid">
                {builtInTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <div className="template-thumbnail">{template.thumbnail}</div>
                    <div className="template-card-info">
                      <span className="template-card-name">{template.name}</span>
                      <span className="template-card-dims">{formatDimensions(template.dimensions)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* User templates */}
            <div className="template-section">
              <div className="template-section-header-row">
                <h4 className="template-section-header">My Templates</h4>
                {parts.length > 0 && canUseCustomTemplates && (
                  <button className="btn btn-xs btn-ghost btn-secondary" onClick={handleSaveCurrentAsTemplate}>
                    + Save Current
                  </button>
                )}
              </div>
              {userTemplates.length === 0 ? (
                <p className="placeholder-text">
                  No custom templates yet. Save your current project as a template to reuse it later.
                </p>
              ) : (
                <div className="template-grid">
                  {userTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`template-card user-template ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <div className="template-thumbnail">{template.thumbnail}</div>
                      <div className="template-card-info">
                        <span className="template-card-name">{template.name}</span>
                        <span className="template-card-dims">{formatDimensions(template.dimensions)}</span>
                      </div>
                      <button
                        className="template-delete-btn"
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
          <div className="template-details-panel">
            {selectedTemplate ? (
              <>
                <div className="template-details-header">
                  <span className="template-thumbnail-large">{selectedTemplate.thumbnail}</span>
                  <div>
                    <h3>{selectedTemplate.name}</h3>
                    {selectedTemplate.type === 'user' && <span className="template-badge">Custom</span>}
                  </div>
                </div>

                <div className="template-details-body">
                  <p className="template-description">{selectedTemplate.description}</p>

                  <div className="template-stats">
                    <div className="template-stat">
                      <label>Dimensions</label>
                      <span>{formatDimensions(selectedTemplate.dimensions)}</span>
                    </div>
                    <div className="template-stat">
                      <label>Parts</label>
                      <span>{selectedTemplate.partCount}</span>
                    </div>
                    <div className="template-stat">
                      <label>Category</label>
                      <span style={{ textTransform: 'capitalize' }}>{selectedTemplate.category}</span>
                    </div>
                    {selectedTemplate.type === 'user' && (
                      <div className="template-stat">
                        <label>Created</label>
                        <span>{new Date((selectedTemplate as UserTemplate).createdAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="template-details-placeholder">
                <p>Select a template to view details</p>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-sm btn-outlined btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-sm btn-filled btn-primary"
            onClick={handleCreateProject}
            disabled={!selectedTemplate || isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Project'}
          </button>
        </div>

        {/* Delete confirmation overlay */}
        {deleteConfirmId && (
          <div className="template-delete-confirm-overlay">
            <div className="template-delete-confirm">
              <p>Delete this template?</p>
              <p className="template-delete-warning">This action cannot be undone.</p>
              <div className="template-delete-actions">
                <button className="btn btn-sm btn-outlined btn-secondary" onClick={() => setDeleteConfirmId(null)}>
                  Cancel
                </button>
                <button
                  className="btn btn-sm btn-filled btn-danger"
                  onClick={() => handleDeleteTemplate(deleteConfirmId)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
