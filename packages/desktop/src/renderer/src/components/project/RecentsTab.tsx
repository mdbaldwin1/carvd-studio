import { FileText, Star, Trash2, AlertTriangle } from 'lucide-react';
import { Card } from '@renderer/components/ui/card';
import { RecentProject, formatRelativeDate } from './StartScreen';

interface RecentsTabProps {
  projects: RecentProject[];
  onOpenProject: (filePath: string) => void;
  onRelocateFile: (originalPath: string, fileName: string) => void;
  onToggleFavorite: (project: RecentProject, e: React.MouseEvent) => void;
  onRemoveRecent: (project: RecentProject, e: React.MouseEvent) => void;
}

export function RecentsTab({
  projects,
  onOpenProject,
  onRelocateFile,
  onToggleFavorite,
  onRemoveRecent
}: RecentsTabProps) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col gap-1 flex-auto min-h-0 max-h-full overflow-y-auto">
        <div className="text-center py-6 text-text-muted text-sm">
          <p className="m-0">No recent projects yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 flex-auto min-h-0 max-h-full overflow-y-auto">
      {projects.map((project) => (
        <Card
          key={project.path}
          className={`project-item group relative flex items-center gap-3 py-3 px-4 bg-transparent border border-transparent rounded-lg cursor-pointer transition-all duration-100 text-left w-full hover:bg-bg-secondary hover:border-border ${!project.exists ? 'missing opacity-60 !cursor-default hover:!bg-transparent hover:!border-transparent' : ''}`}
          onClick={() => {
            if (project.exists) {
              onOpenProject(project.path);
            } else {
              onRelocateFile(project.path, project.name);
            }
          }}
          title={project.exists ? project.path : `File not found: ${project.path}. Click to locate.`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (project.exists) {
                onOpenProject(project.path);
              } else {
                onRelocateFile(project.path, project.name);
              }
            }
          }}
        >
          {!project.exists ? (
            <AlertTriangle size={20} className="text-warning shrink-0" />
          ) : project.thumbnail ? (
            <img
              src={`data:image/png;base64,${project.thumbnail.data}`}
              alt=""
              className="project-thumbnail w-12 h-9 object-cover rounded bg-bg-tertiary shrink-0"
            />
          ) : (
            <FileText size={20} className="text-text-muted shrink-0" />
          )}
          <span className="flex-1 text-sm text-text whitespace-nowrap overflow-hidden text-ellipsis">
            {project.name}
          </span>
          {!project.exists ? (
            <span className="text-xs text-warning italic whitespace-nowrap shrink-0">Click to locate</span>
          ) : project.modifiedAt ? (
            <span className="text-xs text-text-muted whitespace-nowrap shrink-0">
              {formatRelativeDate(project.modifiedAt)}
            </span>
          ) : null}
          <div
            className={`flex gap-1 opacity-0 transition-opacity duration-100 group-hover:opacity-100 ${!project.exists ? '!opacity-100' : ''}`}
          >
            {project.exists && (
              <button
                className={`project-action favorite w-7 h-7 flex items-center justify-center bg-transparent border-none rounded text-text-muted cursor-pointer transition-all duration-100 hover:bg-bg-tertiary hover:text-text opacity-0 group-hover:opacity-100 ${project.isFavorite ? 'active !opacity-100 text-warning' : ''}`}
                onClick={(e) => onToggleFavorite(project, e)}
                title={project.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                aria-label={
                  project.isFavorite ? `Remove ${project.name} from favorites` : `Add ${project.name} to favorites`
                }
              >
                <Star size={16} fill={project.isFavorite ? 'currentColor' : 'none'} />
              </button>
            )}
            <button
              className="project-action danger w-7 h-7 flex items-center justify-center bg-transparent border-none rounded text-text-muted cursor-pointer transition-all duration-100 hover:bg-bg-tertiary hover:!text-error"
              onClick={(e) => onRemoveRecent(project, e)}
              title="Remove from recent"
              aria-label={`Remove ${project.name} from recent`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}
