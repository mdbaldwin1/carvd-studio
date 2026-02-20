import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StartScreen } from './StartScreen';

describe('StartScreen', () => {
  const defaultProps = {
    onNewProject: vi.fn(),
    onOpenFile: vi.fn(),
    onOpenProject: vi.fn(),
    onRelocateFile: vi.fn(),
    onSelectTemplate: vi.fn(),
    onStartTutorial: vi.fn(),
    onViewAllTemplates: vi.fn()
  };

  beforeAll(() => {
    window.electronAPI = {
      getRecentProjects: vi.fn(),
      getFavoriteProjects: vi.fn(),
      getAppVersion: vi.fn(),
      getUserTemplates: vi.fn(),
      getFileStats: vi.fn(),
      getProjectThumbnails: vi.fn(),
      addFavoriteProject: vi.fn(),
      removeFavoriteProject: vi.fn(),
      removeRecentProject: vi.fn(),
      reorderFavoriteProjects: vi.fn(),
      trackTemplateUsage: vi.fn()
    } as unknown as typeof window.electronAPI;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(window.electronAPI.getRecentProjects).mockResolvedValue([
      '/path/to/project1.carvd',
      '/path/to/project2.carvd'
    ]);
    vi.mocked(window.electronAPI.getFavoriteProjects).mockResolvedValue(['/path/to/project2.carvd']);
    vi.mocked(window.electronAPI.getAppVersion).mockResolvedValue('1.0.0');
    vi.mocked(window.electronAPI.getUserTemplates).mockResolvedValue([]);
    vi.mocked(window.electronAPI.getFileStats).mockResolvedValue([
      { path: '/path/to/project1.carvd', modifiedAt: new Date().toISOString() },
      { path: '/path/to/project2.carvd', modifiedAt: new Date(Date.now() - 86400000).toISOString() }
    ]);
    vi.mocked(window.electronAPI.getProjectThumbnails).mockResolvedValue([]);
  });

  describe('rendering', () => {
    it('renders the start screen', async () => {
      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Carvd Studio')).toBeInTheDocument();
      });
    });

    it('shows version badge', async () => {
      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('v1.0.0')).toBeInTheDocument();
      });
    });

    it('shows Templates section', async () => {
      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Templates')).toBeInTheDocument();
      });
    });

    it('shows Blank template button', async () => {
      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Blank')).toBeInTheDocument();
        expect(screen.getByText('Start from scratch')).toBeInTheDocument();
      });
    });

    it('shows Learn Carvd template (tutorial)', async () => {
      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Learn Carvd')).toBeInTheDocument();
      });
    });

    it('shows View All button for templates', async () => {
      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('View All')).toBeInTheDocument();
      });
    });

    it('shows Recents tab', async () => {
      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Recents')).toBeInTheDocument();
      });
    });

    it('shows Favorites tab', async () => {
      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Favorites')).toBeInTheDocument();
      });
    });

    it('shows Open file button', async () => {
      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Open file...')).toBeInTheDocument();
      });
    });
  });

  describe('actions', () => {
    it('calls onNewProject when Blank template is clicked', async () => {
      const onNewProject = vi.fn();
      render(<StartScreen {...defaultProps} onNewProject={onNewProject} />);

      await waitFor(() => {
        expect(screen.getByText('Blank')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Blank').closest('[role="button"]')!);

      expect(onNewProject).toHaveBeenCalledTimes(1);
    });

    it('calls onOpenFile when Open file is clicked', async () => {
      const onOpenFile = vi.fn();
      render(<StartScreen {...defaultProps} onOpenFile={onOpenFile} />);

      await waitFor(() => {
        expect(screen.getByText('Open file...')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Open file...'));

      expect(onOpenFile).toHaveBeenCalledTimes(1);
    });

    it('calls onViewAllTemplates when View All is clicked', async () => {
      const onViewAllTemplates = vi.fn();
      render(<StartScreen {...defaultProps} onViewAllTemplates={onViewAllTemplates} />);

      await waitFor(() => {
        expect(screen.getByText('View All')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('View All'));

      expect(onViewAllTemplates).toHaveBeenCalledTimes(1);
    });
  });

  describe('tabs', () => {
    it('shows Recents tab as active by default', async () => {
      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Recents' })).toHaveAttribute('data-state', 'active');
      });
    });

    it('switches to Favorites tab when clicked', async () => {
      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Favorites')).toBeInTheDocument();
      });

      fireEvent.mouseDown(screen.getByRole('tab', { name: 'Favorites' }));

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Favorites' })).toHaveAttribute('data-state', 'active');
      });
    });
  });

  describe('recent projects', () => {
    it('displays recent projects after loading', async () => {
      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('project1')).toBeInTheDocument();
        expect(screen.getByText('project2')).toBeInTheDocument();
      });
    });

    it('calls onOpenProject when a recent project is clicked', async () => {
      const onOpenProject = vi.fn();
      render(<StartScreen {...defaultProps} onOpenProject={onOpenProject} />);

      await waitFor(() => {
        expect(screen.getByText('project1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('project1').closest('.project-item')!);

      expect(onOpenProject).toHaveBeenCalledWith('/path/to/project1.carvd');
    });

    it('shows empty state when no recent projects', async () => {
      vi.mocked(window.electronAPI.getRecentProjects).mockResolvedValue([]);
      vi.mocked(window.electronAPI.getFavoriteProjects).mockResolvedValue([]);
      vi.mocked(window.electronAPI.getFileStats).mockResolvedValue([]);

      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No recent projects yet.')).toBeInTheDocument();
      });
    });
  });

  describe('favorite projects', () => {
    it('shows empty state when no favorites', async () => {
      vi.mocked(window.electronAPI.getFavoriteProjects).mockResolvedValue([]);

      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Favorites')).toBeInTheDocument();
      });

      fireEvent.mouseDown(screen.getByRole('tab', { name: 'Favorites' }));

      await waitFor(() => {
        expect(screen.getByText(/No favorites yet/)).toBeInTheDocument();
      });
    });

    it('shows favorite projects in Favorites tab', async () => {
      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Favorites')).toBeInTheDocument();
      });

      fireEvent.mouseDown(screen.getByRole('tab', { name: 'Favorites' }));

      await waitFor(() => {
        expect(screen.getByText('project2')).toBeInTheDocument();
      });
    });
  });

  describe('relative date formatting', () => {
    it('shows "Just now" for recent timestamps', async () => {
      vi.mocked(window.electronAPI.getFileStats).mockResolvedValue([
        { path: '/path/to/project1.carvd', modifiedAt: new Date().toISOString() },
        { path: '/path/to/project2.carvd', modifiedAt: new Date(Date.now() - 86400000).toISOString() }
      ]);

      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Just now')).toBeInTheDocument();
      });
    });

    it('shows "Yesterday" for day-old timestamps', async () => {
      vi.mocked(window.electronAPI.getFileStats).mockResolvedValue([
        { path: '/path/to/project1.carvd', modifiedAt: new Date().toISOString() },
        { path: '/path/to/project2.carvd', modifiedAt: new Date(Date.now() - 86400000).toISOString() }
      ]);

      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Yesterday')).toBeInTheDocument();
      });
    });
  });

  describe('missing files', () => {
    it('shows relocate prompt for missing files', async () => {
      vi.mocked(window.electronAPI.getFileStats).mockResolvedValue([
        { path: '/path/to/project1.carvd', modifiedAt: null }, // Missing file
        { path: '/path/to/project2.carvd', modifiedAt: new Date().toISOString() }
      ]);

      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Click to locate')).toBeInTheDocument();
      });
    });

    it('calls onRelocateFile for missing files instead of onOpenProject', async () => {
      vi.mocked(window.electronAPI.getFileStats).mockResolvedValue([
        { path: '/path/to/project1.carvd', modifiedAt: null },
        { path: '/path/to/project2.carvd', modifiedAt: new Date().toISOString() }
      ]);

      const onOpenProject = vi.fn();
      const onRelocateFile = vi.fn();
      render(<StartScreen {...defaultProps} onOpenProject={onOpenProject} onRelocateFile={onRelocateFile} />);

      await waitFor(() => {
        expect(screen.getByText('project1')).toBeInTheDocument();
      });

      // Find the missing project item and click it
      const missingItem = screen.getByText('project1').closest('.project-item');
      fireEvent.click(missingItem!);

      expect(onOpenProject).not.toHaveBeenCalled();
      expect(onRelocateFile).toHaveBeenCalledWith('/path/to/project1.carvd', 'project1');
    });
  });

  describe('template selection', () => {
    it('calls onStartTutorial for tutorial template', async () => {
      const onStartTutorial = vi.fn();
      render(<StartScreen {...defaultProps} onStartTutorial={onStartTutorial} />);

      await waitFor(() => {
        expect(screen.getByText('Learn Carvd')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Learn Carvd').closest('[role="button"]')!);

      expect(onStartTutorial).toHaveBeenCalled();
    });

    it('calls onSelectTemplate for non-tutorial templates', async () => {
      const onSelectTemplate = vi.fn();
      render(<StartScreen {...defaultProps} onSelectTemplate={onSelectTemplate} />);

      await waitFor(() => {
        // Find a non-tutorial built-in template
        expect(screen.getByText('Simple Writing Desk')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Simple Writing Desk').closest('[role="button"]')!);

      expect(onSelectTemplate).toHaveBeenCalled();
    });
  });

  describe('favorites management', () => {
    it('adds project to favorites', async () => {
      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('project1')).toBeInTheDocument();
      });

      // Find the favorite button for project1 (which is not a favorite)
      const projectItem = screen.getByText('project1').closest('.project-item')!;
      const favoriteButton = projectItem.querySelector('.project-action.favorite')!;
      fireEvent.click(favoriteButton);

      expect(window.electronAPI.addFavoriteProject).toHaveBeenCalledWith('/path/to/project1.carvd');
    });

    it('removes project from favorites', async () => {
      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('project2')).toBeInTheDocument();
      });

      // project2 is already a favorite
      const projectItem = screen.getByText('project2').closest('.project-item')!;
      const favoriteButton = projectItem.querySelector('.project-action.favorite')!;
      fireEvent.click(favoriteButton);

      expect(window.electronAPI.removeFavoriteProject).toHaveBeenCalledWith('/path/to/project2.carvd');
    });

    it('removes project from recents', async () => {
      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('project1')).toBeInTheDocument();
      });

      const projectItem = screen.getByText('project1').closest('.project-item')!;
      const removeButton = projectItem.querySelector('.project-action.danger')!;
      fireEvent.click(removeButton);

      expect(window.electronAPI.removeRecentProject).toHaveBeenCalledWith('/path/to/project1.carvd');
    });

    it('removes missing file favorite in Favorites tab', async () => {
      vi.mocked(window.electronAPI.getFavoriteProjects).mockResolvedValue(['/path/to/missing.carvd']);
      vi.mocked(window.electronAPI.getFileStats).mockResolvedValue([
        { path: '/path/to/missing.carvd', modifiedAt: null }
      ]);

      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Favorites')).toBeInTheDocument();
      });

      fireEvent.mouseDown(screen.getByRole('tab', { name: 'Favorites' }));

      await waitFor(() => {
        expect(screen.getByText('missing')).toBeInTheDocument();
      });

      // Click the favorite button to remove
      const projectItem = screen.getByText('missing').closest('.project-item')!;
      const favoriteButton = projectItem.querySelector('.project-action.favorite')!;
      fireEvent.click(favoriteButton);

      expect(window.electronAPI.removeFavoriteProject).toHaveBeenCalledWith('/path/to/missing.carvd');
    });
  });

  describe('relative date formatting extended', () => {
    it('shows minutes ago format', async () => {
      vi.mocked(window.electronAPI.getFileStats).mockResolvedValue([
        { path: '/path/to/project1.carvd', modifiedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString() }, // 5 min ago
        { path: '/path/to/project2.carvd', modifiedAt: new Date().toISOString() }
      ]);

      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('5m ago')).toBeInTheDocument();
      });
    });

    it('shows hours ago format', async () => {
      vi.mocked(window.electronAPI.getFileStats).mockResolvedValue([
        { path: '/path/to/project1.carvd', modifiedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() }, // 3 hours ago
        { path: '/path/to/project2.carvd', modifiedAt: new Date().toISOString() }
      ]);

      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('3h ago')).toBeInTheDocument();
      });
    });

    it('shows days ago format', async () => {
      vi.mocked(window.electronAPI.getFileStats).mockResolvedValue([
        { path: '/path/to/project1.carvd', modifiedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() }, // 4 days ago
        { path: '/path/to/project2.carvd', modifiedAt: new Date().toISOString() }
      ]);

      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('4d ago')).toBeInTheDocument();
      });
    });

    it('shows weeks ago format', async () => {
      vi.mocked(window.electronAPI.getFileStats).mockResolvedValue([
        { path: '/path/to/project1.carvd', modifiedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() }, // 2 weeks ago
        { path: '/path/to/project2.carvd', modifiedAt: new Date().toISOString() }
      ]);

      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('2w ago')).toBeInTheDocument();
      });
    });

    it('shows months ago format', async () => {
      vi.mocked(window.electronAPI.getFileStats).mockResolvedValue([
        { path: '/path/to/project1.carvd', modifiedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() }, // 2 months ago
        { path: '/path/to/project2.carvd', modifiedAt: new Date().toISOString() }
      ]);

      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('2mo ago')).toBeInTheDocument();
      });
    });
  });

  describe('user templates', () => {
    it('displays user templates in the grid', async () => {
      vi.mocked(window.electronAPI.getUserTemplates).mockResolvedValue([
        {
          id: 'user-1',
          name: 'My Custom Template',
          description: 'A custom template',
          dimensions: { width: 24, depth: 12, height: 18 },
          partCount: 3,
          thumbnail: '📐',
          category: 'other',
          createdAt: new Date().toISOString(),
          project: JSON.stringify({ version: '1.0', name: 'Custom', parts: [] })
        }
      ]);

      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('My Custom Template')).toBeInTheDocument();
      });
    });

    it('shows Custom badge on user templates', async () => {
      vi.mocked(window.electronAPI.getUserTemplates).mockResolvedValue([
        {
          id: 'user-1',
          name: 'My Custom Template',
          description: 'A custom template',
          dimensions: { width: 24, depth: 12, height: 18 },
          partCount: 3,
          thumbnail: '📐',
          category: 'other',
          createdAt: new Date().toISOString(),
          project: '{}'
        }
      ]);

      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Custom')).toBeInTheDocument();
      });
    });

    it('tracks usage when user template is selected', async () => {
      vi.mocked(window.electronAPI.getUserTemplates).mockResolvedValue([
        {
          id: 'user-1',
          type: 'user',
          name: 'My Custom Template',
          description: 'A custom template',
          dimensions: { width: 24, depth: 12, height: 18 },
          partCount: 3,
          thumbnail: '📐',
          category: 'other',
          createdAt: new Date().toISOString(),
          project: JSON.stringify({
            version: '1.0',
            name: 'Custom',
            parts: [],
            stocks: [],
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString()
          })
        }
      ]);

      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('My Custom Template')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('My Custom Template').closest('[role="button"]')!);

      expect(window.electronAPI.trackTemplateUsage).toHaveBeenCalledWith('user-1');
    });
  });

  describe('project thumbnails', () => {
    it('displays project thumbnails when available', async () => {
      vi.mocked(window.electronAPI.getProjectThumbnails).mockResolvedValue([
        { path: '/path/to/project1.carvd', thumbnail: { data: 'base64data', width: 100, height: 100 } }
      ]);

      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        const thumbnail = document.querySelector('.project-thumbnail');
        expect(thumbnail).toBeInTheDocument();
      });
    });
  });

  describe('keyboard navigation', () => {
    it('opens project on Enter key', async () => {
      const onOpenProject = vi.fn();
      render(<StartScreen {...defaultProps} onOpenProject={onOpenProject} />);

      await waitFor(() => {
        expect(screen.getByText('project1')).toBeInTheDocument();
      });

      const projectItem = screen.getByText('project1').closest('.project-item')!;
      fireEvent.keyDown(projectItem, { key: 'Enter' });

      expect(onOpenProject).toHaveBeenCalledWith('/path/to/project1.carvd');
    });

    it('does not open missing project on Enter key', async () => {
      vi.mocked(window.electronAPI.getFileStats).mockResolvedValue([
        { path: '/path/to/project1.carvd', modifiedAt: null },
        { path: '/path/to/project2.carvd', modifiedAt: new Date().toISOString() }
      ]);

      const onOpenProject = vi.fn();
      render(<StartScreen {...defaultProps} onOpenProject={onOpenProject} />);

      await waitFor(() => {
        expect(screen.getByText('project1')).toBeInTheDocument();
      });

      const projectItem = screen.getByText('project1').closest('.project-item')!;
      fireEvent.keyDown(projectItem, { key: 'Enter' });

      expect(onOpenProject).not.toHaveBeenCalled();
    });
  });

  describe('drag and drop favorites', () => {
    it('shows drag handle on favorites', async () => {
      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Favorites')).toBeInTheDocument();
      });

      fireEvent.mouseDown(screen.getByRole('tab', { name: 'Favorites' }));

      await waitFor(() => {
        expect(screen.getByText('project2')).toBeInTheDocument();
      });

      // Favorites should have drag handle
      const dragHandle = document.querySelector('.drag-handle');
      expect(dragHandle).toBeInTheDocument();
    });

    it('makes favorites draggable', async () => {
      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Favorites')).toBeInTheDocument();
      });

      fireEvent.mouseDown(screen.getByRole('tab', { name: 'Favorites' }));

      await waitFor(() => {
        expect(screen.getByText('project2')).toBeInTheDocument();
      });

      const projectItem = screen.getByText('project2').closest('.project-item')!;
      expect(projectItem).toHaveAttribute('draggable', 'true');
    });

    it('handles drop to reorder favorites', async () => {
      vi.mocked(window.electronAPI.getFavoriteProjects).mockResolvedValue([
        '/path/to/project1.carvd',
        '/path/to/project2.carvd'
      ]);
      vi.mocked(window.electronAPI.getFileStats).mockResolvedValue([
        { path: '/path/to/project1.carvd', modifiedAt: new Date().toISOString() },
        { path: '/path/to/project2.carvd', modifiedAt: new Date().toISOString() }
      ]);

      render(<StartScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Favorites')).toBeInTheDocument();
      });

      fireEvent.mouseDown(screen.getByRole('tab', { name: 'Favorites' }));

      await waitFor(() => {
        expect(screen.getByText('project1')).toBeInTheDocument();
      });

      const projectItems = document.querySelectorAll('.project-item');

      // Start drag on first item
      fireEvent.dragStart(projectItems[0], { dataTransfer: { effectAllowed: '' } });

      // Drop on second item
      fireEvent.drop(projectItems[1], { preventDefault: vi.fn() });

      await waitFor(() => {
        expect(window.electronAPI.reorderFavoriteProjects).toHaveBeenCalled();
      });
    });
  });
});
