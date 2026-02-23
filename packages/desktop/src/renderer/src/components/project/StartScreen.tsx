import { FolderOpen, Star, Clock, Library, Settings } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@renderer/components/ui/tabs';
import { useEffect, useState } from 'react';
import { UserTemplate } from '../../templates';
import { Project } from '../../types';
import { AppHorizontalLogo } from '../common/AppHorizontalLogo';
import { TemplatesSection } from './TemplatesSection';
import { RecentsTab } from './RecentsTab';
import { FavoritesTab } from './FavoritesTab';

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
  onOpenSettings: () => void;
  onOpenLibrary: () => void;
}

export function StartScreen({
  onNewProject,
  onOpenFile,
  onOpenProject,
  onRelocateFile,
  onSelectTemplate,
  onStartTutorial,
  onViewAllTemplates,
  onOpenSettings,
  onOpenLibrary
}: StartScreenProps) {
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [favoriteProjects, setFavoriteProjects] = useState<RecentProject[]>([]);
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [, setIsLoading] = useState(true);
  const [appVersion, setAppVersion] = useState<string>('');

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
    <div className="start-screen fixed inset-0 z-1000 flex flex-col overflow-hidden bg-bg">
      {/* Draggable title bar area for window movement */}
      <div className="w-full h-[38px] shrink-0" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
      <div className="mx-auto flex h-[calc(100vh-38px)] w-full max-w-[700px] flex-col gap-6 overflow-hidden px-12 pb-8 pt-2">
        {/* Header */}
        <div className="mb-2 flex shrink-0 items-center justify-between">
          <div className="flex items-center">
            <AppHorizontalLogo className="h-28 w-auto max-w-[78vw]" />
          </div>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={onOpenLibrary} title="Stock & Assembly Library">
              <Library size={18} />
            </Button>
            <Button size="icon" variant="ghost" onClick={onOpenSettings} title="App Settings">
              <Settings size={18} />
            </Button>
            {appVersion && (
              <span className="text-xs text-text-muted bg-bg-secondary py-1 px-2 rounded ml-1">v{appVersion}</span>
            )}
          </div>
        </div>

        <TemplatesSection
          userTemplates={userTemplates}
          onNewProject={onNewProject}
          onViewAllTemplates={onViewAllTemplates}
          onSelectTemplate={onSelectTemplate}
          onStartTutorial={onStartTutorial}
        />

        {/* Projects Section with Tabs */}
        <Tabs defaultValue="recents" className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex items-stretch justify-between">
            <TabsList className="px-0 bg-transparent">
              <TabsTrigger value="recents" className="flex items-center gap-1.5">
                <Clock size={16} />
                Recents
              </TabsTrigger>
              <TabsTrigger value="favorites" className="flex items-center gap-1.5">
                <Star size={16} />
                Favorites
              </TabsTrigger>
            </TabsList>
            <Button variant="ghost" size="xs" className="my-auto" onClick={onOpenFile}>
              <FolderOpen size={14} />
              Open file...
            </Button>
          </div>

          <TabsContent value="recents" className="min-h-0 flex-1 overflow-y-auto">
            <RecentsTab
              projects={recentProjects}
              onOpenProject={onOpenProject}
              onRelocateFile={onRelocateFile}
              onToggleFavorite={handleToggleFavorite}
              onRemoveRecent={handleRemoveRecent}
            />
          </TabsContent>

          <TabsContent value="favorites" className="min-h-0 flex-1 overflow-y-auto">
            <FavoritesTab
              projects={favoriteProjects}
              onOpenProject={onOpenProject}
              onRelocateFile={onRelocateFile}
              onToggleFavorite={handleToggleFavorite}
              onReorder={handleReorderFavorites}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
