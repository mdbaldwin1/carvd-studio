/**
 * Full-screen Templates Screen
 *
 * Displays all templates in a grid layout with two sections:
 * - Built-in Templates
 * - My Templates (user-created)
 */

import { ArrowLeft, Copy, Plus, Pencil, Trash2, Download, Upload } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useEffect, useState, useCallback, useRef } from 'react';
import { builtInTemplates, formatDimensions, BuiltInTemplate, UserTemplate, ProjectTemplate } from '../../templates';
import { useLicenseStore } from '../../store/licenseStore';
import { useUIStore } from '../../store/uiStore';
import { getFeatureLimits } from '../../utils/featureLimits';
import { Project } from '../../types';

const tileClass =
  'group relative flex flex-col items-center gap-3 py-5 px-4 bg-bg-secondary border border-border rounded-[10px] cursor-pointer transition-all duration-150 text-center hover:bg-bg-tertiary hover:border-accent hover:-translate-y-0.5 focus:outline-2 focus:outline-primary focus:outline-offset-2';

const tileActionClass =
  'w-7 h-7 flex items-center justify-center bg-bg border border-border rounded text-text-muted cursor-pointer transition-all duration-100 hover:bg-bg-tertiary hover:text-text hover:border-accent';

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
  const licenseMode = useLicenseStore((s) => s.licenseMode);
  const limits = getFeatureLimits(licenseMode);
  const canUseCustomTemplates = limits.canUseCustomTemplates;

  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const myTemplatesSectionRef = useRef<HTMLElement>(null);

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
        useUIStore.getState().showToast(`Template exported to ${result.filePath.split('/').pop()}`, 'success');
      } else if (!result.canceled && result.error) {
        useUIStore.getState().showToast(result.error, 'error');
      }
    } catch (error) {
      console.error('Failed to export template:', error);
      useUIStore.getState().showToast('Failed to export template', 'error');
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
        useUIStore.getState().showToast('Template imported successfully', 'success');
      } else if (!result.canceled && result.error) {
        useUIStore.getState().showToast(result.error, 'error');
      }
    } catch (error) {
      console.error('Failed to import template:', error);
      useUIStore.getState().showToast('Failed to import template', 'error');
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
            myTemplatesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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
    <div className="fixed inset-0 flex flex-col bg-bg z-1000">
      {/* Draggable title bar area for window movement */}
      <div className="w-full h-[38px] shrink-0" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />

      <div className="flex-1 max-w-[1200px] w-full mx-auto px-12 pb-12 flex flex-col gap-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            className="flex items-center gap-1.5 py-2 px-3 bg-transparent border border-border rounded-md text-sm font-medium text-text cursor-pointer transition-all duration-150 hover:bg-bg-secondary hover:border-accent"
            onClick={onBack}
            title="Back to Start"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <h1 className="text-[28px] font-bold text-text m-0">Templates</h1>
        </div>

        {/* Built-in Templates Section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-lg font-semibold text-text-secondary m-0">Built-in Templates</h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
            {displayBuiltInTemplates.map((template) => (
              <div
                key={template.id}
                className={tileClass}
                onClick={() => handleSelectTemplate(template)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSelectTemplate(template)}
              >
                {template.thumbnailData ? (
                  <img
                    src={`data:image/png;base64,${template.thumbnailData.data}`}
                    alt={template.name}
                    className="w-full max-w-40 h-30 object-cover rounded-lg bg-bg-tertiary"
                  />
                ) : (
                  <div className="text-5xl leading-none">{template.thumbnail}</div>
                )}
                <div className="flex flex-col gap-1">
                  <span className="text-[15px] font-medium text-text">{template.name}</span>
                  <span className="text-xs text-text-muted">
                    {formatDimensions(template.dimensions)} • {template.partCount} parts
                  </span>
                </div>
                <span className="absolute top-2.5 left-2.5 text-[10px] py-[3px] px-2 rounded font-medium bg-bg-tertiary text-text-muted border border-border">
                  Built-in
                </span>
                {canUseCustomTemplates && (
                  <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <button
                      className={tileActionClass}
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
        <section className="flex flex-col gap-4" ref={myTemplatesSectionRef}>
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-lg font-semibold text-text-secondary m-0">My Templates</h2>
            {canUseCustomTemplates && (
              <div className="flex items-center gap-2">
                <button
                  className="btn btn-sm btn-outlined btn-secondary"
                  onClick={handleImportTemplate}
                  title="Import template from file"
                >
                  <Upload size={14} />
                  Import
                </button>
                <button
                  className="flex items-center gap-1.5 py-2 px-3.5 bg-primary border-none rounded-md text-[13px] font-medium text-white cursor-pointer transition-all duration-150 hover:bg-primary-hover"
                  onClick={onNewTemplate}
                >
                  <Plus size={16} />
                  New Template
                </button>
              </div>
            )}
          </div>
          {isLoading ? (
            <div className="text-center p-12 text-text-muted">Loading templates...</div>
          ) : userTemplates.length === 0 ? (
            <div className="text-center p-12 text-text-muted">
              <p className="m-0">No custom templates yet.</p>
              <p className="text-[13px] mt-2 m-0">Create a template to save your project layout for reuse.</p>
              <a
                href="#"
                className="text-accent text-[13px] hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  window.electronAPI?.openExternal?.('https://carvd-studio.com/docs#templates');
                }}
              >
                Learn more about templates
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
              {userTemplates.map((template) => (
                <div
                  key={template.id}
                  className={tileClass}
                  onClick={() => handleSelectTemplate(template)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectTemplate(template)}
                >
                  {template.thumbnailData ? (
                    <img
                      src={`data:image/png;base64,${template.thumbnailData.data}`}
                      alt={template.name}
                      className="w-full max-w-40 h-30 object-cover rounded-lg bg-bg-tertiary"
                    />
                  ) : (
                    <div className="text-5xl leading-none">{template.thumbnail}</div>
                  )}
                  <div className="flex flex-col gap-1">
                    <span className="text-[15px] font-medium text-text">{template.name}</span>
                    <span className="text-xs text-text-muted">
                      {formatDimensions(template.dimensions)} • {template.partCount} parts
                    </span>
                  </div>
                  <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    {canUseCustomTemplates && (
                      <>
                        <button
                          className={tileActionClass}
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
                          className={tileActionClass}
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
                          className={tileActionClass}
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
                      className={`${tileActionClass} hover:!text-error hover:!border-error`}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-1010">
          <div className="bg-bg-secondary border border-border rounded-lg p-6 text-center max-w-80">
            <p className="m-0 mb-2 text-text font-medium">Delete this template?</p>
            <p className="text-text-muted text-[13px] mb-5">This action cannot be undone.</p>
            <div className="flex gap-3 justify-center">
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
