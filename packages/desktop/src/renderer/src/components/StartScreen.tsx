import { FileText, FolderOpen, Plus, Star, Clock, Trash2, AlertTriangle, ChevronRight } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { builtInTemplates, formatDimensions, BuiltInTemplate, UserTemplate, ProjectTemplate } from '../templates';
import { Project } from '../types';
import './StartScreen.css';

// Maximum number of templates to show in the preview (excluding Blank and Tutorial)
const MAX_PREVIEW_TEMPLATES = 4;

// Format a date as relative time (e.g., "2 days ago", "Just now")
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return date.toLocaleDateString();
}

interface ProjectThumbnailData {
  data: string;
  width: number;
  height: number;
}

interface RecentProject {
  path: string;
  name: string;
  lastOpened?: string;
  modifiedAt?: string;
  isFavorite: boolean;
  thumbnail?: ProjectThumbnailData | null;
  exists: boolean; // Whether the file exists on disk
}

interface StartScreenProps {
  onNewProject: () => void;
  onOpenFile: () => void;
  onOpenProject: (filePath: string) => void;
  onRelocateFile: (originalPath: string, fileName: string) => void;
  onSelectTemplate: (project: Project) => void;
  onStartTutorial: (project: Project) => void;
  onViewAllTemplates: () => void;
}

export function StartScreen({
  onNewProject,
  onOpenFile,
  onOpenProject,
  onRelocateFile,
  onSelectTemplate,
  onStartTutorial,
  onViewAllTemplates
}: StartScreenProps) {
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [favoriteProjects, setFavoriteProjects] = useState<RecentProject[]>([]);
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [appVersion, setAppVersion] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'recents' | 'favorites'>('recents');

  // Drag-and-drop state for favorites reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Load recent and favorite projects on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [recentPaths, favoritePaths, version, templates] = await Promise.all([
          window.electronAPI.getRecentProjects(),
          window.electronAPI.getFavoriteProjects(),
          window.electronAPI.getAppVersion(),
          window.electronAPI.getUserTemplates()
        ]);

        setAppVersion(version);
        setUserTemplates(templates.map((t) => ({ ...t, type: 'user' as const })));

        // Get file stats and thumbnails for all projects
        const allPaths = [...recentPaths, ...favoritePaths];
        const [fileStats, thumbnails] =
          allPaths.length > 0
            ? await Promise.all([
                window.electronAPI.getFileStats(allPaths),
                window.electronAPI.getProjectThumbnails(allPaths)
              ])
            : [[], []];
        const statsMap = new Map(fileStats.map((s) => [s.path, s.modifiedAt]));
        const thumbnailMap = new Map(thumbnails.map((t) => [t.path, t.thumbnail]));

        // Convert paths to project objects
        const favoriteSet = new Set(favoritePaths);

        // Show all recent projects (including favorites - they appear in both tabs)
        const recentItems: RecentProject[] = recentPaths.map((path) => {
          const modifiedAt = statsMap.get(path);
          return {
            path,
            name: path.split('/').pop()?.replace('.carvd', '') || 'Untitled',
            modifiedAt: modifiedAt || undefined,
            isFavorite: favoriteSet.has(path), // Mark if it's also a favorite
            thumbnail: thumbnailMap.get(path) || null,
            exists: modifiedAt !== null // File exists if we got a modifiedAt date
          };
        });

        const favoriteItems: RecentProject[] = favoritePaths.map((path) => {
          const modifiedAt = statsMap.get(path);
          return {
            path,
            name: path.split('/').pop()?.replace('.carvd', '') || 'Untitled',
            modifiedAt: modifiedAt || undefined,
            isFavorite: true,
            thumbnail: thumbnailMap.get(path) || null,
            exists: modifiedAt !== null // File exists if we got a modifiedAt date
          };
        });

        setRecentProjects(recentItems);
        setFavoriteProjects(favoriteItems);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
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

  // Always show "View All" button since Templates Screen provides edit/delete/create functionality
  // that isn't available in the Start Screen preview
  const showViewAllButton = true;

  const handleToggleFavorite = async (project: RecentProject, e: React.MouseEvent) => {
    e.stopPropagation();

    // Don't allow favoriting missing files
    if (!project.exists && !project.isFavorite) {
      return;
    }

    if (project.isFavorite) {
      // Unfavorite: remove from favorites list, update recents list
      await window.electronAPI.removeFavoriteProject(project.path);
      setFavoriteProjects((prev) => prev.filter((p) => p.path !== project.path));
      setRecentProjects((prev) => prev.map((p) => (p.path === project.path ? { ...p, isFavorite: false } : p)));
    } else {
      // Favorite: add to favorites list, update recents list
      await window.electronAPI.addFavoriteProject(project.path);
      setFavoriteProjects((prev) => [...prev, { ...project, isFavorite: true }]);
      setRecentProjects((prev) => prev.map((p) => (p.path === project.path ? { ...p, isFavorite: true } : p)));
    }
  };

  const handleRemoveRecent = async (project: RecentProject, e: React.MouseEvent) => {
    e.stopPropagation();
    await window.electronAPI.removeRecentProject(project.path);
    setRecentProjects((prev) => prev.filter((p) => p.path !== project.path));
  };

  // Drag-and-drop handlers for favorites reordering
  const handleDragStart = (index: number, e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Add a slight delay to allow the drag image to be set
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

    // Reorder the favorites array
    const newFavorites = [...favoriteProjects];
    const [draggedItem] = newFavorites.splice(draggedIndex, 1);
    newFavorites.splice(index, 0, draggedItem);

    setFavoriteProjects(newFavorites);
    setDraggedIndex(null);
    setDragOverIndex(null);

    // Persist the new order
    await window.electronAPI.reorderFavoriteProjects(newFavorites.map((p) => p.path));
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).classList.remove('dragging');
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="start-screen">
      {/* Draggable title bar area for window movement */}
      <div className="start-screen-titlebar" />
      <div className="start-screen-content">
        {/* Header */}
        <div className="start-screen-header">
          <div className="start-screen-logo">
            <span className="logo-icon">🪵</span>
            <h1>Carvd Studio</h1>
          </div>
          {appVersion && <span className="version-badge">v{appVersion}</span>}
        </div>

        {/* Templates Section */}
        <div className="projects-section templates-section">
          <div className="templates-header">
            <h2 className="section-title">Templates</h2>
            {showViewAllButton && (
              <button className="view-all-link" onClick={onViewAllTemplates}>
                View All
                <ChevronRight size={14} />
              </button>
            )}
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

        {/* Projects Section with Tabs */}
        <div className="projects-section">
          <div className="section-header">
            <div className="section-tabs">
              <button
                className={`section-tab ${activeTab === 'recents' ? 'active' : ''}`}
                onClick={() => setActiveTab('recents')}
              >
                <Clock size={16} />
                Recents
              </button>
              <button
                className={`section-tab ${activeTab === 'favorites' ? 'active' : ''}`}
                onClick={() => setActiveTab('favorites')}
              >
                <Star size={16} />
                Favorites
              </button>
            </div>
            <button className="open-file-link" onClick={onOpenFile}>
              <FolderOpen size={14} />
              Open file...
            </button>
          </div>

          {/* Recents Tab */}
          {activeTab === 'recents' && (
            <div className="projects-list">
              {recentProjects.length > 0 ? (
                recentProjects.map((project) => (
                  <div
                    key={project.path}
                    className={`project-item ${!project.exists ? 'missing' : ''}`}
                    onClick={() => {
                      if (project.exists) {
                        onOpenProject(project.path);
                      } else {
                        // File not found - prompt user to relocate
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
                      <img
                        src={`data:image/png;base64,${project.thumbnail.data}`}
                        alt=""
                        className="project-thumbnail"
                      />
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
                          onClick={(e) => handleToggleFavorite(project, e)}
                          title={project.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                          aria-label={
                            project.isFavorite
                              ? `Remove ${project.name} from favorites`
                              : `Add ${project.name} to favorites`
                          }
                        >
                          <Star size={16} fill={project.isFavorite ? 'currentColor' : 'none'} />
                        </button>
                      )}
                      <button
                        className="project-action danger"
                        onClick={(e) => handleRemoveRecent(project, e)}
                        title="Remove from recent"
                        aria-label={`Remove ${project.name} from recent`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-tab">
                  <p>No recent projects yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Favorites Tab */}
          {activeTab === 'favorites' && (
            <div className="projects-list">
              {favoriteProjects.length > 0 ? (
                favoriteProjects.map((project, index) => (
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
                      <img
                        src={`data:image/png;base64,${project.thumbnail.data}`}
                        alt=""
                        className="project-thumbnail"
                      />
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
                      onClick={(e) => handleToggleFavorite(project, e)}
                      title="Remove from favorites"
                      aria-label={`Remove ${project.name} from favorites`}
                    >
                      <Star size={16} fill="currentColor" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-tab">
                  <p>No favorites yet. Star a project to add it here.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
