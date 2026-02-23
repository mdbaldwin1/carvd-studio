import { Button } from '@renderer/components/ui/button';
import { Card } from '@renderer/components/ui/card';
import { BookOpen, ChevronRight, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BuiltInTemplate, builtInTemplates, formatDimensions, ProjectTemplate, UserTemplate } from '../../templates';
import { Project } from '../../types';

// Maximum number of templates to show in the preview (excluding Blank and Tutorial)
const MAX_PREVIEW_TEMPLATES = 4;

const templateCardBase =
  'flex flex-col items-center gap-2 py-4 px-3 bg-bg-secondary border border-border rounded-lg cursor-pointer transition-all duration-150 text-center relative hover:bg-bg-tertiary hover:border-accent hover:-translate-y-0.5';
const SINGLE_ROW_HEIGHT_BREAKPOINT = 800;

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
  const [useSingleRowLayout, setUseSingleRowLayout] = useState(false);

  useEffect(() => {
    const updateLayout = () => {
      setUseSingleRowLayout(window.innerHeight < SINGLE_ROW_HEIGHT_BREAKPOINT);
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

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
    <div className="mt-2 flex flex-col gap-3">
      <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
        <h2 className="text-sm font-semibold text-text-secondary m-0 p-0">Templates</h2>
        <Button variant="ghost" size="xs" onClick={onViewAllTemplates}>
          View All
          <ChevronRight size={14} />
        </Button>
      </div>
      <div
        className={
          useSingleRowLayout
            ? 'grid grid-flow-col auto-cols-[180px] gap-3 overflow-x-auto overflow-y-hidden pb-1'
            : 'grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3'
        }
      >
        {/* Blank Project - always first */}
        <Card
          className={`blank-template ${templateCardBase} border-dashed`}
          onClick={onNewProject}
          title="Start with a blank project"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onNewProject();
            }
          }}
        >
          <span className="text-[32px] leading-none w-full max-w-30 h-[90px] flex items-center justify-center bg-bg-tertiary rounded-md text-primary">
            <Plus size={32} />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-text">Blank</span>
            <span className="text-[11px] text-text-muted">Start from scratch</span>
          </div>
        </Card>
        {/* Tutorial - always second */}
        {tutorialTemplate && (
          <Card
            className={`${templateCardBase} !border-primary bg-[linear-gradient(135deg,var(--color-bg-secondary)_0%,rgba(7,113,135,0.1)_100%)] hover:!border-primary-hover hover:bg-[linear-gradient(135deg,var(--color-bg-tertiary)_0%,rgba(7,113,135,0.15)_100%)]`}
            onClick={() => handleSelectTemplate(tutorialTemplate)}
            title={tutorialTemplate.description}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void handleSelectTemplate(tutorialTemplate);
              }
            }}
          >
            <span className="w-full max-w-30 h-[90px] flex items-center justify-center bg-bg-tertiary rounded-md text-text-muted">
              <BookOpen size={34} strokeWidth={1.75} />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-text">{tutorialTemplate.name}</span>
              <span className="text-[11px] text-text-muted">Guided walkthrough</span>
            </div>
          </Card>
        )}
        {/* Top 4 most recently used templates */}
        {previewTemplates.map((template) => (
          <Card
            key={template.id}
            className={templateCardBase}
            onClick={() => handleSelectTemplate(template)}
            title={template.description}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void handleSelectTemplate(template);
              }
            }}
          >
            {template.thumbnailData ? (
              <img
                src={`data:image/png;base64,${template.thumbnailData.data}`}
                alt={template.name}
                className="w-full max-w-30 h-[90px] object-cover rounded-md bg-bg-tertiary"
              />
            ) : (
              <span className="text-[32px] leading-none w-full max-w-30 h-[90px] flex items-center justify-center bg-bg-tertiary rounded-md text-text-muted">
                {template.thumbnail}
              </span>
            )}
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-text">{template.name}</span>
              <span className="text-[11px] text-text-muted">
                {formatDimensions(template.dimensions)} • {template.partCount} parts
              </span>
            </div>
            {template.type === 'user' && (
              <span className="absolute top-2 right-2 rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
                Custom
              </span>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
