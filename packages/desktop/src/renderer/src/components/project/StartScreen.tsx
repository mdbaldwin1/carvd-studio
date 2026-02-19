import { FolderOpen, Star, Clock, Library, Settings } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@renderer/components/ui/tabs';
import { useEffect, useState } from 'react';
import { UserTemplate } from '../../templates';
import { Project } from '../../types';
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
    <div className="start-screen fixed inset-0 flex flex-col items-center bg-bg z-1000">
      {/* Draggable title bar area for window movement */}
      <div className="w-full h-[38px] shrink-0" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
      <div className="max-w-[700px] w-full px-12 pb-12 flex-1 min-h-0 flex flex-col gap-8 overflow-hidden [&>:first-child]:mt-auto [&>:last-child]:mb-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <span className="text-5xl">🪵</span>
            <h1 className="text-[32px] font-bold text-text m-0">Carvd Studio</h1>
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
        <Tabs defaultValue="recents" className="flex flex-col gap-3 min-h-0 max-h-[50vh]">
          <div className="flex items-stretch justify-between relative m-0 p-0 cursor-default rounded-none bg-transparent after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-px after:bg-border after:z-0">
            <TabsList className="flex gap-0 relative z-1 border-none bg-transparent px-0">
              <TabsTrigger
                value="recents"
                className="section-tab flex items-center gap-1.5 py-2.5 px-4 border border-transparent border-b-border rounded-t-md -mb-px text-sm font-medium text-text-muted cursor-pointer transition-[color,background-color] duration-100 hover:text-text hover:bg-bg-secondary data-[state=active]:text-text data-[state=active]:!bg-bg data-[state=active]:!border-border data-[state=active]:!border-b-bg"
              >
                <Clock size={16} />
                Recents
              </TabsTrigger>
              <TabsTrigger
                value="favorites"
                className="section-tab flex items-center gap-1.5 py-2.5 px-4 border border-transparent border-b-border rounded-t-md -mb-px text-sm font-medium text-text-muted cursor-pointer transition-[color,background-color] duration-100 hover:text-text hover:bg-bg-secondary data-[state=active]:text-text data-[state=active]:!bg-bg data-[state=active]:!border-border data-[state=active]:!border-b-bg"
              >
                <Star size={16} />
                Favorites
              </TabsTrigger>
            </TabsList>
            <button
              className="flex items-center gap-1.5 py-1.5 px-3 my-auto bg-transparent border-none rounded text-[13px] text-accent cursor-pointer transition-all duration-100 relative z-1 hover:text-primary hover:bg-bg-secondary"
              onClick={onOpenFile}
            >
              <FolderOpen size={14} />
              Open file...
            </button>
          </div>

          <TabsContent value="recents">
            <RecentsTab
              projects={recentProjects}
              onOpenProject={onOpenProject}
              onRelocateFile={onRelocateFile}
              onToggleFavorite={handleToggleFavorite}
              onRemoveRecent={handleRemoveRecent}
            />
          </TabsContent>

          <TabsContent value="favorites">
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
