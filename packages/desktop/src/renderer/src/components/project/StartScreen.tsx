import { FolderOpen, Star, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { UserTemplate } from '../../templates';
import { Project } from '../../types';
import { TemplatesSection } from './TemplatesSection';
import { RecentsTab } from './RecentsTab';
import { FavoritesTab } from './FavoritesTab';
import './StartScreen.css';

// Format a date as relative time (e.g., "2 days ago", "Just now")
export function formatRelativeDate(dateString: string): string {
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

export interface RecentProject {
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

  const handleReorderFavorites = async (reorderedProjects: RecentProject[]) => {
    setFavoriteProjects(reorderedProjects);
    await window.electronAPI.reorderFavoriteProjects(reorderedProjects.map((p) => p.path));
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

        <TemplatesSection
          userTemplates={userTemplates}
          onNewProject={onNewProject}
          onViewAllTemplates={onViewAllTemplates}
          onSelectTemplate={onSelectTemplate}
          onStartTutorial={onStartTutorial}
        />

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

          {activeTab === 'recents' && (
            <RecentsTab
              projects={recentProjects}
              onOpenProject={onOpenProject}
              onRelocateFile={onRelocateFile}
              onToggleFavorite={handleToggleFavorite}
              onRemoveRecent={handleRemoveRecent}
            />
          )}

          {activeTab === 'favorites' && (
            <FavoritesTab
              projects={favoriteProjects}
              onOpenProject={onOpenProject}
              onRelocateFile={onRelocateFile}
              onToggleFavorite={handleToggleFavorite}
              onReorder={handleReorderFavorites}
            />
          )}
        </div>
      </div>
    </div>
  );
}
