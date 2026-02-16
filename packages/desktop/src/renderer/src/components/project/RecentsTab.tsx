import { FileText, Star, Trash2, AlertTriangle } from 'lucide-react';
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
      <div className="projects-list">
        <div className="empty-tab">
          <p>No recent projects yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="projects-list">
      {projects.map((project) => (
        <div
          key={project.path}
          className={`project-item ${!project.exists ? 'missing' : ''}`}
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
            <AlertTriangle size={20} className="project-icon missing-icon" />
          ) : project.thumbnail ? (
            <img src={`data:image/png;base64,${project.thumbnail.data}`} alt="" className="project-thumbnail" />
          ) : (
            <FileText size={20} className="project-icon" />
          )}
          <span className="project-name">{project.name}</span>
          {!project.exists ? (
            <span className="project-date missing-label">Click to locate</span>
          ) : project.modifiedAt ? (
            <span className="project-date">{formatRelativeDate(project.modifiedAt)}</span>
          ) : null}
          <div className={`project-actions ${!project.exists ? 'always-visible' : ''}`}>
            {project.exists && (
              <button
                className={`project-action favorite ${project.isFavorite ? 'active' : ''}`}
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
              className="project-action danger"
              onClick={(e) => onRemoveRecent(project, e)}
              title="Remove from recent"
              aria-label={`Remove ${project.name} from recent`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
