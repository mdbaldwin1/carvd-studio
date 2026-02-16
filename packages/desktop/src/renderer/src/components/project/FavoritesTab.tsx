import { FileText, Star, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { RecentProject, formatRelativeDate } from './StartScreen';

interface FavoritesTabProps {
  projects: RecentProject[];
  onOpenProject: (filePath: string) => void;
  onRelocateFile: (originalPath: string, fileName: string) => void;
  onToggleFavorite: (project: RecentProject, e: React.MouseEvent) => void;
  onReorder: (reorderedProjects: RecentProject[]) => void;
}

export function FavoritesTab({
  projects,
  onOpenProject,
  onRelocateFile,
  onToggleFavorite,
  onReorder
}: FavoritesTabProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number, e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      (e.target as HTMLElement).classList.add('dragging');
    }, 0);
  };

  const handleDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (index: number, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newFavorites = [...projects];
    const [draggedItem] = newFavorites.splice(draggedIndex, 1);
    newFavorites.splice(index, 0, draggedItem);

    setDraggedIndex(null);
    setDragOverIndex(null);

    onReorder(newFavorites);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).classList.remove('dragging');
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  if (projects.length === 0) {
    return (
      <div className="projects-list">
        <div className="empty-tab">
          <p>No favorites yet. Star a project to add it here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="projects-list">
      {projects.map((project, index) => (
        <div
          key={project.path}
          className={`project-item ${!project.exists ? 'missing' : ''} ${dragOverIndex === index ? 'drag-over' : ''} ${draggedIndex === index ? 'dragging' : ''}`}
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
          draggable={project.exists}
          onDragStart={(e) => handleDragStart(index, e)}
          onDragOver={(e) => handleDragOver(index, e)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(index, e)}
          onDragEnd={handleDragEnd}
        >
          <span className="drag-handle" title="Drag to reorder">
            ⋮⋮
          </span>
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
          <button
            className={`project-action favorite ${project.exists ? 'active' : ''}`}
            onClick={(e) => onToggleFavorite(project, e)}
            title="Remove from favorites"
            aria-label={`Remove ${project.name} from favorites`}
          >
            <Star size={16} fill="currentColor" />
          </button>
        </div>
      ))}
    </div>
  );
}
