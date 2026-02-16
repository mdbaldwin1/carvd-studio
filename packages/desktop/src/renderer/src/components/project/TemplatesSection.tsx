import { Plus, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { builtInTemplates, formatDimensions, BuiltInTemplate, UserTemplate, ProjectTemplate } from '../../templates';
import { Project } from '../../types';

// Maximum number of templates to show in the preview (excluding Blank and Tutorial)
const MAX_PREVIEW_TEMPLATES = 4;

interface TemplatesSectionProps {
  userTemplates: UserTemplate[];
  onNewProject: () => void;
  onViewAllTemplates: () => void;
  onSelectTemplate: (project: Project) => void;
  onStartTutorial: (project: Project) => void;
}

export function TemplatesSection({
  userTemplates,
  onNewProject,
  onViewAllTemplates,
  onSelectTemplate,
  onStartTutorial
}: TemplatesSectionProps) {
  const handleSelectTemplate = async (template: ProjectTemplate) => {
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

    // Special handling for tutorial template - triggers welcome tutorial
    if (template.id === 'tutorial') {
      onStartTutorial(project);
    } else {
      onSelectTemplate(project);
    }
  };

  // Get the tutorial template (always shown after Blank)
  const tutorialTemplate = builtInTemplates.find((t) => t.id === 'tutorial');

  // Get top 4 most recently used templates (excluding tutorial)
  // Priority: recently used user templates > other built-in templates > unused user templates
  const previewTemplates = useMemo(() => {
    // Get built-in templates (excluding tutorial - shown separately)
    const otherBuiltIn = builtInTemplates.filter((t) => t.id !== 'tutorial');

    // Sort user templates by lastUsedAt (most recent first), then by createdAt
    const sortedUserTemplates = [...userTemplates].sort((a, b) => {
      // Templates with lastUsedAt come first
      if (a.lastUsedAt && !b.lastUsedAt) return -1;
      if (!a.lastUsedAt && b.lastUsedAt) return 1;
      // If both have lastUsedAt, sort by most recent
      if (a.lastUsedAt && b.lastUsedAt) {
        return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
      }
      // Otherwise, sort by createdAt (most recent first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Combine: recently used user templates first, then built-in, then remaining user templates
    const recentlyUsedUserTemplates = sortedUserTemplates.filter((t) => t.lastUsedAt);
    const unusedUserTemplates = sortedUserTemplates.filter((t) => !t.lastUsedAt);

    const combined: ProjectTemplate[] = [...recentlyUsedUserTemplates, ...otherBuiltIn, ...unusedUserTemplates];

    return combined.slice(0, MAX_PREVIEW_TEMPLATES);
  }, [userTemplates]);

  return (
    <div className="projects-section templates-section">
      <div className="templates-header">
        <h2 className="section-title">Templates</h2>
        <button className="view-all-link" onClick={onViewAllTemplates}>
          View All
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="templates-grid">
        {/* Blank Project - always first */}
        <button className="template-card blank-template" onClick={onNewProject} title="Start with a blank project">
          <span className="template-thumbnail">
            <Plus size={32} />
          </span>
          <div className="template-info">
            <span className="template-name">Blank</span>
            <span className="template-meta">Start from scratch</span>
          </div>
        </button>
        {/* Tutorial - always second */}
        {tutorialTemplate && (
          <button
            className="template-card tutorial-template"
            onClick={() => handleSelectTemplate(tutorialTemplate)}
            title={tutorialTemplate.description}
          >
            <span className="template-thumbnail">{tutorialTemplate.thumbnail}</span>
            <div className="template-info">
              <span className="template-name">{tutorialTemplate.name}</span>
              <span className="template-meta">Guided walkthrough</span>
            </div>
          </button>
        )}
        {/* Top 4 most recently used templates */}
        {previewTemplates.map((template) => (
          <button
            key={template.id}
            className="template-card"
            onClick={() => handleSelectTemplate(template)}
            title={template.description}
          >
            {template.thumbnailData ? (
              <img
                src={`data:image/png;base64,${template.thumbnailData.data}`}
                alt={template.name}
                className="template-thumbnail-img"
              />
            ) : (
              <span className="template-thumbnail">{template.thumbnail}</span>
            )}
            <div className="template-info">
              <span className="template-name">{template.name}</span>
              <span className="template-meta">
                {formatDimensions(template.dimensions)} • {template.partCount} parts
              </span>
            </div>
            {template.type === 'user' && <span className="template-badge">Custom</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
