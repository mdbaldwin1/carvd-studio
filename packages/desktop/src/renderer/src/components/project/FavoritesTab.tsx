import { FileText, Star, AlertTriangle } from 'lucide-react';
import { Card } from '@renderer/components/ui/card';
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

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  if (projects.length === 0) {
    return (
      <div className="flex flex-col gap-1 flex-auto min-h-0 max-h-full overflow-y-auto">
        <div className="text-center py-6 text-text-muted text-sm">
          <p className="m-0">No favorites yet. Star a project to add it here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 flex-auto min-h-0 max-h-full overflow-y-auto">
      {projects.map((project, index) => (
        <Card
          key={project.path}
          className={`project-item group relative flex items-center gap-3 py-3 px-4 bg-transparent border border-transparent rounded-lg cursor-pointer transition-all duration-100 text-left w-full hover:bg-bg-secondary hover:border-border ${!project.exists ? 'missing opacity-60 !cursor-default hover:!bg-transparent hover:!border-transparent' : ''} ${dragOverIndex === index ? 'drag-over !border-primary !bg-bg-secondary before:content-[""] before:absolute before:top-[-2px] before:left-0 before:right-0 before:h-0.5 before:bg-primary before:rounded-sm' : ''} ${draggedIndex === index ? 'dragging opacity-50' : ''}`}
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
          <span
            className="drag-handle text-text-muted text-xs tracking-[-2px] cursor-grab opacity-0 transition-opacity duration-100 select-none shrink-0 px-1 group-hover:opacity-50 hover:!opacity-100 hover:text-text active:cursor-grabbing"
            title="Drag to reorder"
          >
            ⋮⋮
          </span>
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
          <button
            className={`project-action favorite w-7 h-7 flex items-center justify-center bg-transparent border-none rounded text-text-muted cursor-pointer transition-all duration-100 hover:bg-bg-tertiary hover:text-text ${project.exists ? 'active !opacity-100 text-warning' : ''}`}
            onClick={(e) => onToggleFavorite(project, e)}
            title="Remove from favorites"
            aria-label={`Remove ${project.name} from favorites`}
          >
            <Star size={16} fill="currentColor" />
          </button>
        </Card>
      ))}
    </div>
  );
}
