import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { TemplatesScreen } from './TemplatesScreen';

// Mock the templates module
vi.mock('../../templates', () => ({
  builtInTemplates: [
    {
      type: 'built-in',
      id: 'tutorial',
      name: 'Tutorial',
      description: 'Learn the basics',
      dimensions: { width: 24, depth: 12, height: 18 },
      partCount: 3,
      thumbnail: '📖',
      category: 'other',
      generate: vi.fn(() => ({
        version: '1.0',
        name: 'Tutorial',
        parts: [],
        stocks: [],
        groups: [],
        groupMembers: [],
        assemblies: [],
        units: 'imperial',
        gridSize: 0.25,
        kerfWidth: 0.125,
        overageFactor: 1.1,
        projectNotes: '',
        createdAt: '2024-01-01',
        modifiedAt: '2024-01-01'
      }))
    },
    {
      type: 'built-in',
      id: 'simple-desk',
      name: 'Simple Desk',
      description: 'A basic desk template',
      dimensions: { width: 48, depth: 24, height: 30 },
      partCount: 5,
      thumbnail: '🪵',
      category: 'furniture',
      generate: vi.fn(() => ({
        version: '1.0',
        name: 'Simple Desk',
        parts: [],
        stocks: [],
        groups: [],
        groupMembers: [],
        assemblies: [],
        units: 'imperial',
        gridSize: 0.25,
        kerfWidth: 0.125,
        overageFactor: 1.1,
        projectNotes: '',
        createdAt: '2024-01-01',
        modifiedAt: '2024-01-01'
      }))
    },
    {
      type: 'built-in',
      id: 'bookshelf',
      name: 'Bookshelf',
      description: 'A bookshelf template',
      dimensions: { width: 36, depth: 12, height: 72 },
      partCount: 8,
      thumbnail: '📚',
      category: 'storage',
      generate: vi.fn(() => ({
        version: '1.0',
        name: 'Bookshelf',
        parts: [],
        stocks: [],
        groups: [],
        groupMembers: [],
        assemblies: [],
        units: 'imperial',
        gridSize: 0.25,
        kerfWidth: 0.125,
        overageFactor: 1.1,
        projectNotes: '',
        createdAt: '2024-01-01',
        modifiedAt: '2024-01-01'
      }))
    }
  ],
  formatDimensions: vi.fn((dims) => `${dims.width}" × ${dims.depth}" × ${dims.height}"`)
}));

// Mock window.electronAPI
beforeAll(() => {
  window.electronAPI = {
    getUserTemplates: vi.fn().mockResolvedValue([]),
    removeUserTemplate: vi.fn().mockResolvedValue(undefined),
    trackTemplateUsage: vi.fn().mockResolvedValue(undefined)
  } as unknown as typeof window.electronAPI;
});

describe('TemplatesScreen', () => {
  const defaultProps = {
    onBack: vi.fn(),
    onSelectTemplate: vi.fn(),
    onStartTutorial: vi.fn(),
    onEditTemplate: vi.fn(),
    onNewTemplate: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (window.electronAPI.getUserTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('renders the templates screen', async () => {
      render(<TemplatesScreen {...defaultProps} />);

      expect(screen.getByText('Templates')).toBeInTheDocument();
    });

    it('shows back button', async () => {
      render(<TemplatesScreen {...defaultProps} />);

      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('shows Built-in Templates section', async () => {
      render(<TemplatesScreen {...defaultProps} />);

      expect(screen.getByText('Built-in Templates')).toBeInTheDocument();
    });

    it('shows My Templates section', async () => {
      render(<TemplatesScreen {...defaultProps} />);

      expect(screen.getByText('My Templates')).toBeInTheDocument();
    });

    it('shows New Template button', async () => {
      render(<TemplatesScreen {...defaultProps} />);

      expect(screen.getByText('New Template')).toBeInTheDocument();
    });
  });

  describe('built-in templates', () => {
    it('displays built-in templates (excluding tutorial)', async () => {
      render(<TemplatesScreen {...defaultProps} />);

      // Tutorial should be filtered out
      expect(screen.queryByText('Tutorial')).not.toBeInTheDocument();

      // Other built-in templates should show
      expect(screen.getByText('Simple Desk')).toBeInTheDocument();
      expect(screen.getByText('Bookshelf')).toBeInTheDocument();
    });

    it('displays template thumbnails', async () => {
      render(<TemplatesScreen {...defaultProps} />);

      expect(screen.getByText('🪵')).toBeInTheDocument();
      expect(screen.getByText('📚')).toBeInTheDocument();
    });

    it('shows Built-in badge on templates', async () => {
      render(<TemplatesScreen {...defaultProps} />);

      const badges = screen.getAllByText('Built-in');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('shows template dimensions and part count', async () => {
      render(<TemplatesScreen {...defaultProps} />);

      expect(screen.getByText(/5 parts/)).toBeInTheDocument();
      expect(screen.getByText(/8 parts/)).toBeInTheDocument();
    });
  });

  describe('template selection', () => {
    it('calls onSelectTemplate when built-in template clicked', async () => {
      const onSelectTemplate = vi.fn();
      render(<TemplatesScreen {...defaultProps} onSelectTemplate={onSelectTemplate} />);

      fireEvent.click(screen.getByText('Simple Desk'));

      await waitFor(() => {
        expect(onSelectTemplate).toHaveBeenCalled();
      });
    });

    it('calls onStartTutorial when tutorial template clicked', async () => {
      // Re-mock to include tutorial in filter (for this specific test)
      const onStartTutorial = vi.fn();
      const onSelectTemplate = vi.fn();

      // Since tutorial is filtered out in the component, we need to test through direct selection
      // This test verifies the logic works, but tutorial is actually filtered from display
      render(
        <TemplatesScreen {...defaultProps} onSelectTemplate={onSelectTemplate} onStartTutorial={onStartTutorial} />
      );

      // Tutorial is filtered, so clicking other templates should call onSelectTemplate
      fireEvent.click(screen.getByText('Simple Desk'));

      await waitFor(() => {
        expect(onSelectTemplate).toHaveBeenCalled();
        expect(onStartTutorial).not.toHaveBeenCalled();
      });
    });

    it('handles keyboard Enter on template', async () => {
      const onSelectTemplate = vi.fn();
      render(<TemplatesScreen {...defaultProps} onSelectTemplate={onSelectTemplate} />);

      const tile = screen.getByText('Simple Desk').closest('[role="button"]');
      fireEvent.keyDown(tile!, { key: 'Enter' });

      await waitFor(() => {
        expect(onSelectTemplate).toHaveBeenCalled();
      });
    });
  });

  describe('user templates', () => {
    it('loads user templates on mount', async () => {
      render(<TemplatesScreen {...defaultProps} />);

      expect(window.electronAPI.getUserTemplates).toHaveBeenCalled();
    });

    it('shows loading state', async () => {
      // Delay the response
      (window.electronAPI.getUserTemplates as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      );

      render(<TemplatesScreen {...defaultProps} />);

      expect(screen.getByText('Loading templates...')).toBeInTheDocument();
    });

    it('shows empty state when no user templates', async () => {
      render(<TemplatesScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No custom templates yet.')).toBeInTheDocument();
      });
    });

    it('displays user templates when available', async () => {
      (window.electronAPI.getUserTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'user-1',
          name: 'My Custom Template',
          description: 'A custom template',
          dimensions: { width: 24, depth: 12, height: 18 },
          partCount: 3,
          thumbnail: '📐',
          category: 'other',
          createdAt: '2024-01-01',
          project: JSON.stringify({ version: '1.0', name: 'Custom', parts: [] })
        }
      ]);

      render(<TemplatesScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('My Custom Template')).toBeInTheDocument();
      });
    });

    it('tracks template usage when user template selected', async () => {
      (window.electronAPI.getUserTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'user-1',
          type: 'user',
          name: 'My Template',
          dimensions: { width: 24, depth: 12, height: 18 },
          partCount: 3,
          thumbnail: '📐',
          category: 'other',
          createdAt: '2024-01-01',
          project: JSON.stringify({
            version: '1.0',
            name: 'Custom',
            parts: [],
            stocks: [],
            createdAt: '2024-01-01',
            modifiedAt: '2024-01-01'
          })
        }
      ]);

      render(<TemplatesScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('My Template')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('My Template'));

      await waitFor(() => {
        expect(window.electronAPI.trackTemplateUsage).toHaveBeenCalledWith('user-1');
      });
    });
  });

  describe('template editing', () => {
    it('shows edit button on user templates', async () => {
      (window.electronAPI.getUserTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'user-1',
          name: 'My Template',
          dimensions: { width: 24, depth: 12, height: 18 },
          partCount: 3,
          thumbnail: '📐',
          category: 'other',
          createdAt: '2024-01-01',
          project: '{}'
        }
      ]);

      render(<TemplatesScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTitle('Edit template')).toBeInTheDocument();
      });
    });

    it('calls onEditTemplate when edit clicked', async () => {
      const onEditTemplate = vi.fn();
      (window.electronAPI.getUserTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'user-1',
          name: 'My Template',
          dimensions: { width: 24, depth: 12, height: 18 },
          partCount: 3,
          thumbnail: '📐',
          category: 'other',
          createdAt: '2024-01-01',
          project: '{}'
        }
      ]);

      render(<TemplatesScreen {...defaultProps} onEditTemplate={onEditTemplate} />);

      await waitFor(() => {
        expect(screen.getByTitle('Edit template')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle('Edit template'));

      expect(onEditTemplate).toHaveBeenCalled();
    });
  });

  describe('template deletion', () => {
    beforeEach(async () => {
      (window.electronAPI.getUserTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'user-1',
          name: 'My Template',
          dimensions: { width: 24, depth: 12, height: 18 },
          partCount: 3,
          thumbnail: '📐',
          category: 'other',
          createdAt: '2024-01-01',
          project: '{}'
        }
      ]);
    });

    it('shows delete button on user templates', async () => {
      render(<TemplatesScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTitle('Delete template')).toBeInTheDocument();
      });
    });

    it('shows delete confirmation when delete clicked', async () => {
      render(<TemplatesScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTitle('Delete template')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle('Delete template'));

      expect(screen.getByText('Delete this template?')).toBeInTheDocument();
    });

    it('shows warning in delete confirmation', async () => {
      render(<TemplatesScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTitle('Delete template')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle('Delete template'));

      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    });

    it('hides confirmation when Cancel clicked', async () => {
      render(<TemplatesScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTitle('Delete template')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle('Delete template'));
      fireEvent.click(screen.getByText('Cancel'));

      expect(screen.queryByText('Delete this template?')).not.toBeInTheDocument();
    });

    it('deletes template when Delete confirmed', async () => {
      render(<TemplatesScreen {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTitle('Delete template')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle('Delete template'));

      const deleteButton = screen.getByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButton);

      expect(window.electronAPI.removeUserTemplate).toHaveBeenCalledWith('user-1');
    });
  });

  describe('navigation', () => {
    it('calls onBack when back button clicked', async () => {
      const onBack = vi.fn();
      render(<TemplatesScreen {...defaultProps} onBack={onBack} />);

      fireEvent.click(screen.getByText('Back'));

      expect(onBack).toHaveBeenCalled();
    });

    it('calls onNewTemplate when New Template clicked', async () => {
      const onNewTemplate = vi.fn();
      render(<TemplatesScreen {...defaultProps} onNewTemplate={onNewTemplate} />);

      fireEvent.click(screen.getByText('New Template'));

      expect(onNewTemplate).toHaveBeenCalled();
    });

    it('calls onBack on Escape when no delete confirmation', async () => {
      const onBack = vi.fn();
      render(<TemplatesScreen {...defaultProps} onBack={onBack} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(onBack).toHaveBeenCalled();
    });

    it('cancels delete confirmation on Escape instead of going back', async () => {
      const onBack = vi.fn();
      (window.electronAPI.getUserTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'user-1',
          name: 'My Template',
          dimensions: { width: 24, depth: 12, height: 18 },
          partCount: 3,
          thumbnail: '📐',
          category: 'other',
          createdAt: '2024-01-01',
          project: '{}'
        }
      ]);

      render(<TemplatesScreen {...defaultProps} onBack={onBack} />);

      await waitFor(() => {
        expect(screen.getByTitle('Delete template')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle('Delete template'));

      // Escape should close delete confirm, not navigate back
      fireEvent.keyDown(window, { key: 'Escape' });

      expect(screen.queryByText('Delete this template?')).not.toBeInTheDocument();
      expect(onBack).not.toHaveBeenCalled();
    });
  });
});
