/**
 * Full-screen Templates Screen
 *
 * Displays all templates in a grid layout with two sections:
 * - Built-in Templates
 * - My Templates (user-created)
 */

import { ArrowLeft, Copy, Plus, Pencil, Trash2, Download, Upload } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useEffect, useState, useCallback } from 'react';
import { builtInTemplates, formatDimensions, BuiltInTemplate, UserTemplate, ProjectTemplate } from '../templates';
import { useProjectStore } from '../store/projectStore';
import { getFeatureLimits } from '../utils/featureLimits';
import { Project } from '../types';
import './TemplatesScreen.css';

interface TemplatesScreenProps {
  onBack: () => void;
  onSelectTemplate: (project: Project) => void;
  onStartTutorial: (project: Project) => void;
  onEditTemplate: (template: UserTemplate) => void;
  onNewTemplate: () => void;
}

export function TemplatesScreen({
  onBack,
  onSelectTemplate,
  onStartTutorial,
  onEditTemplate,
  onNewTemplate
}: TemplatesScreenProps) {
  const licenseMode = useProjectStore((s) => s.licenseMode);
  const limits = getFeatureLimits(licenseMode);
  const canUseCustomTemplates = limits.canUseCustomTemplates;

  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const templates = await window.electronAPI.getUserTemplates();
        setUserTemplates(
          templates.map((t) => ({
            ...t,
            type: 'user' as const
          }))
        );
      } catch (error) {
        console.error('Failed to load user templates:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadTemplates();
  }, []);

  const handleSelectTemplate = useCallback(
    async (template: ProjectTemplate) => {
      // Track usage for user templates
      if (template.type === 'user') {
        await window.electronAPI.trackTemplateUsage(template.id);
      }

      let project: Project;
      if (template.type === 'built-in') {
        project = (template as BuiltInTemplate).generate();
      } else {
        // Parse stored project JSON for user templates
        project = JSON.parse((template as UserTemplate).project as unknown as string);
        const now = new Date().toISOString();
        project.createdAt = now;
        project.modifiedAt = now;
      }

      // Special handling for tutorial template
      if (template.id === 'tutorial') {
        onStartTutorial(project);
      } else {
        onSelectTemplate(project);
      }
    },
    [onSelectTemplate, onStartTutorial]
  );

  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    try {
      await window.electronAPI.removeUserTemplate(templateId);
      setUserTemplates((prev) => prev.filter((t) => t.id !== templateId));
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  }, []);

  const handleExportTemplate = useCallback(async (templateId: string) => {
    try {
      const result = await window.electronAPI.exportTemplate(templateId);
      if (result.success && result.filePath) {
        useProjectStore.getState().showToast(`Template exported to ${result.filePath.split('/').pop()}`, 'success');
      } else if (!result.canceled && result.error) {
        useProjectStore.getState().showToast(result.error, 'error');
      }
    } catch (error) {
      console.error('Failed to export template:', error);
      useProjectStore.getState().showToast('Failed to export template', 'error');
    }
  }, []);

  const handleImportTemplate = useCallback(async () => {
    try {
      const result = await window.electronAPI.importTemplate();
      if (result.success && result.templateId) {
        // Reload templates
        const templates = await window.electronAPI.getUserTemplates();
        setUserTemplates(
          templates.map((t) => ({
            ...t,
            type: 'user' as const
          }))
        );
        useProjectStore.getState().showToast('Template imported successfully', 'success');
      } else if (!result.canceled && result.error) {
        useProjectStore.getState().showToast(result.error, 'error');
      }
    } catch (error) {
      console.error('Failed to import template:', error);
      useProjectStore.getState().showToast('Failed to import template', 'error');
    }
  }, []);

  const handleDuplicateTemplate = useCallback(
    async (template: ProjectTemplate) => {
      try {
        let project: Project;
        if (template.type === 'built-in') {
          // Generate project from built-in template
          project = (template as BuiltInTemplate).generate();
        } else {
          // Parse stored project from user template
          project = JSON.parse((template as UserTemplate).project as unknown as string);
        }

        // Calculate bounding box for dimensions
        let minX = Infinity,
          maxX = -Infinity;
        let minY = Infinity,
          maxY = -Infinity;
        let minZ = Infinity,
          maxZ = -Infinity;

        for (const part of project.parts) {
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

        const width = project.parts.length > 0 ? Math.round(maxX - minX) : 0;
        const depth = project.parts.length > 0 ? Math.round(maxZ - minZ) : 0;
        const height = project.parts.length > 0 ? Math.round(maxY - minY) : 0;

        // Create new user template
        const now = new Date().toISOString();
        const newTemplateId = uuidv4();
        const newTemplate = {
          id: newTemplateId,
          name: `${template.name} (Copy)`,
          description: template.description,
          dimensions: { width, depth, height },
          partCount: project.parts.length,
          thumbnail: template.thumbnail,
          category: template.category,
          createdAt: now,
          project: JSON.stringify({
            ...project,
            name: `${template.name} (Copy)`,
            createdAt: now,
            modifiedAt: now
          })
        };

        await window.electronAPI.addUserTemplate(newTemplate);

        // Refresh user templates list
        const templates = await window.electronAPI.getUserTemplates();
        const updatedTemplates = templates.map((t) => ({
          ...t,
          type: 'user' as const
        }));
        setUserTemplates(updatedTemplates);

        // Find the new template and open it in edit mode
        const duplicatedTemplate = updatedTemplates.find((t) => t.id === newTemplateId);
        if (duplicatedTemplate) {
          // Small delay to allow state to update and DOM to render
          setTimeout(() => {
            // Scroll to the My Templates section
            const myTemplatesSection = document.querySelector('.templates-screen-section:last-child');
            myTemplatesSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Open in edit mode
            onEditTemplate(duplicatedTemplate);
          }, 100);
        }
      } catch (error) {
        console.error('Failed to duplicate template:', error);
      }
    },
    [onEditTemplate]
  );

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteConfirmId) {
          setDeleteConfirmId(null);
        } else {
          onBack();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack, deleteConfirmId]);

  // Filter out tutorial from built-in templates (shown in start screen only per design)
  const displayBuiltInTemplates = builtInTemplates.filter((t) => t.id !== 'tutorial');

  return (
    <div className="templates-screen">
      {/* Draggable title bar area for window movement */}
      <div className="templates-screen-titlebar" />

      <div className="templates-screen-content">
        {/* Header */}
        <div className="templates-screen-header">
          <button className="back-button" onClick={onBack} title="Back to Start">
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <h1>Templates</h1>
        </div>

        {/* Built-in Templates Section */}
        <section className="templates-screen-section">
          <div className="templates-screen-section-header">
            <h2 className="templates-screen-section-title">Built-in Templates</h2>
          </div>
          <div className="templates-screen-grid">
            {displayBuiltInTemplates.map((template) => (
              <div
                key={template.id}
                className="template-tile"
                onClick={() => handleSelectTemplate(template)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSelectTemplate(template)}
              >
                {template.thumbnailData ? (
                  <img
                    src={`data:image/png;base64,${template.thumbnailData.data}`}
                    alt={template.name}
                    className="template-tile-thumbnail-img"
                  />
                ) : (
                  <div className="template-tile-thumbnail">{template.thumbnail}</div>
                )}
                <div className="template-tile-info">
                  <span className="template-tile-name">{template.name}</span>
                  <span className="template-tile-meta">
                    {formatDimensions(template.dimensions)} • {template.partCount} parts
                  </span>
                </div>
                <span className="template-tile-badge built-in">Built-in</span>
                {canUseCustomTemplates && (
                  <div className="template-tile-actions">
                    <button
                      className="template-tile-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateTemplate(template);
                      }}
                      title="Duplicate to My Templates"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* My Templates Section */}
        <section className="templates-screen-section">
          <div className="templates-screen-section-header">
            <h2 className="templates-screen-section-title">My Templates</h2>
            {canUseCustomTemplates && (
              <div className="templates-screen-section-actions">
                <button
                  className="btn btn-sm btn-outlined btn-secondary"
                  onClick={handleImportTemplate}
                  title="Import template from file"
                >
                  <Upload size={14} />
                  Import
                </button>
                <button className="new-template-button" onClick={onNewTemplate}>
                  <Plus size={16} />
                  New Template
                </button>
              </div>
            )}
          </div>
          {isLoading ? (
            <div className="templates-screen-loading">Loading templates...</div>
          ) : userTemplates.length === 0 ? (
            <div className="templates-screen-empty">
              <p>No custom templates yet.</p>
              <p className="templates-screen-empty-hint">Create a template to save your project layout for reuse.</p>
              <a
                href="#"
                className="learn-more-link"
                onClick={(e) => {
                  e.preventDefault();
                  window.electronAPI?.openExternal?.('https://carvd-studio.com/docs#templates');
                }}
              >
                Learn more about templates
              </a>
            </div>
          ) : (
            <div className="templates-screen-grid">
              {userTemplates.map((template) => (
                <div
                  key={template.id}
                  className="template-tile user-template"
                  onClick={() => handleSelectTemplate(template)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectTemplate(template)}
                >
                  {template.thumbnailData ? (
                    <img
                      src={`data:image/png;base64,${template.thumbnailData.data}`}
                      alt={template.name}
                      className="template-tile-thumbnail-img"
                    />
                  ) : (
                    <div className="template-tile-thumbnail">{template.thumbnail}</div>
                  )}
                  <div className="template-tile-info">
                    <span className="template-tile-name">{template.name}</span>
                    <span className="template-tile-meta">
                      {formatDimensions(template.dimensions)} • {template.partCount} parts
                    </span>
                  </div>
                  <div className="template-tile-actions">
                    {canUseCustomTemplates && (
                      <>
                        <button
                          className="template-tile-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTemplate(template);
                          }}
                          title="Edit template"
                          aria-label={`Edit ${template.name}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="template-tile-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateTemplate(template);
                          }}
                          title="Duplicate template"
                          aria-label={`Duplicate ${template.name}`}
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          className="template-tile-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportTemplate(template.id);
                          }}
                          title="Export template"
                          aria-label={`Export ${template.name}`}
                        >
                          <Download size={14} />
                        </button>
                      </>
                    )}
                    <button
                      className="template-tile-action danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(template.id);
                      }}
                      title="Delete template"
                      aria-label={`Delete ${template.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Delete confirmation overlay */}
      {deleteConfirmId && (
        <div className="template-delete-overlay">
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
  );
}
