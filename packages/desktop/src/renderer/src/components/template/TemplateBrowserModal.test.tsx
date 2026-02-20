import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { TemplateBrowserModal } from './TemplateBrowserModal';
import { useProjectStore } from '../../store/projectStore';

// Mock the templates module
vi.mock('../../templates', () => ({
  builtInTemplates: [
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

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    error: vi.fn()
  }
}));

// Mock window.electronAPI
beforeAll(() => {
  window.electronAPI = {
    getUserTemplates: vi.fn().mockResolvedValue([]),
    removeUserTemplate: vi.fn().mockResolvedValue(undefined),
    addUserTemplate: vi.fn().mockResolvedValue(undefined)
  } as unknown as typeof window.electronAPI;
});

describe('TemplateBrowserModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onCreateProject: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useProjectStore.setState({
      name: 'Test Project',
      parts: [],
      stocks: [],
      groups: [],
      groupMembers: [],
      assemblies: [],
      units: 'imperial',
      gridSize: 0.25,
      kerfWidth: 0.125,
      overageFactor: 1.1
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('renders when isOpen is true', async () => {
      render(<TemplateBrowserModal {...defaultProps} />);

      expect(screen.getByText('New from Template')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<TemplateBrowserModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('New from Template')).not.toBeInTheDocument();
    });

    it('shows Built-in Templates section', async () => {
      render(<TemplateBrowserModal {...defaultProps} />);

      expect(screen.getByText('Built-in Templates')).toBeInTheDocument();
    });

    it('shows My Templates section', async () => {
      render(<TemplateBrowserModal {...defaultProps} />);

      expect(screen.getByText('My Templates')).toBeInTheDocument();
    });

    it('shows Cancel button', async () => {
      render(<TemplateBrowserModal {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('shows Create Project button', async () => {
      render(<TemplateBrowserModal {...defaultProps} />);

      expect(screen.getByText('Create Project')).toBeInTheDocument();
    });
  });

  describe('built-in templates', () => {
    it('displays built-in template names', async () => {
      render(<TemplateBrowserModal {...defaultProps} />);

      expect(screen.getByText('Simple Desk')).toBeInTheDocument();
      expect(screen.getByText('Bookshelf')).toBeInTheDocument();
    });

    it('displays template thumbnails', async () => {
      render(<TemplateBrowserModal {...defaultProps} />);

      expect(screen.getByText('🪵')).toBeInTheDocument();
      expect(screen.getByText('📚')).toBeInTheDocument();
    });
  });

  describe('template selection', () => {
    it('shows placeholder when no template selected', async () => {
      render(<TemplateBrowserModal {...defaultProps} />);

      expect(screen.getByText('Select a template to view details')).toBeInTheDocument();
    });

    it('disables Create Project button when no template selected', async () => {
      render(<TemplateBrowserModal {...defaultProps} />);

      expect(screen.getByText('Create Project')).toBeDisabled();
    });

    it('selects template when clicked', async () => {
      render(<TemplateBrowserModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Simple Desk'));

      // Should show template details
      expect(screen.getByText('A basic desk template')).toBeInTheDocument();
    });

    it('shows template details when selected', async () => {
      render(<TemplateBrowserModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Simple Desk'));

      expect(screen.getByText('Dimensions')).toBeInTheDocument();
      expect(screen.getByText('Parts')).toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();
    });

    it('enables Create Project button when template selected', async () => {
      render(<TemplateBrowserModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Simple Desk'));

      expect(screen.getByText('Create Project')).not.toBeDisabled();
    });
  });

  describe('project creation', () => {
    it('calls onCreateProject when Create Project clicked', async () => {
      const onCreateProject = vi.fn();
      render(<TemplateBrowserModal {...defaultProps} onCreateProject={onCreateProject} />);

      fireEvent.click(screen.getByText('Simple Desk'));
      fireEvent.click(screen.getByText('Create Project'));

      await waitFor(() => {
        expect(onCreateProject).toHaveBeenCalled();
      });
    });

    it('calls onClose after creating project', async () => {
      const onClose = vi.fn();
      render(<TemplateBrowserModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Simple Desk'));
      fireEvent.click(screen.getByText('Create Project'));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('user templates', () => {
    it('loads user templates when modal opens', async () => {
      render(<TemplateBrowserModal {...defaultProps} />);

      expect(window.electronAPI.getUserTemplates).toHaveBeenCalled();
    });

    it('shows empty message when no user templates', async () => {
      render(<TemplateBrowserModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/No custom templates yet/)).toBeInTheDocument();
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
          project: JSON.stringify({
            version: '1.0',
            name: 'Custom',
            parts: [],
            stocks: []
          })
        }
      ]);

      render(<TemplateBrowserModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('My Custom Template')).toBeInTheDocument();
      });
    });

    it('shows delete button on user templates', async () => {
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
          project: '{}'
        }
      ]);

      render(<TemplateBrowserModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTitle('Delete template')).toBeInTheDocument();
      });
    });

    it('shows Custom badge for user templates', async () => {
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
          project: '{}'
        }
      ]);

      render(<TemplateBrowserModal {...defaultProps} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('My Custom Template'));
      });

      expect(screen.getByText('Custom')).toBeInTheDocument();
    });
  });

  describe('delete confirmation', () => {
    beforeEach(async () => {
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
          project: '{}'
        }
      ]);
    });

    it('shows delete confirmation when delete clicked', async () => {
      render(<TemplateBrowserModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTitle('Delete template')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle('Delete template'));

      expect(screen.getByText('Delete this template?')).toBeInTheDocument();
    });

    it('shows warning in delete confirmation', async () => {
      render(<TemplateBrowserModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTitle('Delete template')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle('Delete template'));

      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    });

    it('hides confirmation when Cancel clicked', async () => {
      render(<TemplateBrowserModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTitle('Delete template')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle('Delete template'));

      // Click Cancel in the confirmation
      const cancelButtons = screen.getAllByText('Cancel');
      fireEvent.click(cancelButtons[cancelButtons.length - 1]);

      expect(screen.queryByText('Delete this template?')).not.toBeInTheDocument();
    });

    it('deletes template when Delete confirmed', async () => {
      render(<TemplateBrowserModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTitle('Delete template')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle('Delete template'));

      // Click Delete in the confirmation
      const deleteButton = screen.getByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButton);

      expect(window.electronAPI.removeUserTemplate).toHaveBeenCalledWith('user-1');
    });
  });

  describe('save current as template', () => {
    it('shows Save Current button when project has parts', async () => {
      useProjectStore.setState({
        parts: [
          {
            id: 'part-1',
            name: 'Part',
            length: 24,
            width: 12,
            thickness: 0.75,
            position: { x: 0, y: 0, z: 0 },
            color: '#c4a574'
          }
        ]
      });

      render(<TemplateBrowserModal {...defaultProps} />);

      expect(screen.getByText('+ Save Current')).toBeInTheDocument();
    });

    it('does not show Save Current button when project has no parts', async () => {
      useProjectStore.setState({ parts: [] });
      render(<TemplateBrowserModal {...defaultProps} />);

      expect(screen.queryByText('+ Save Current')).not.toBeInTheDocument();
    });

    it('saves current project as template when clicked', async () => {
      useProjectStore.setState({
        name: 'My Project',
        parts: [
          {
            id: 'part-1',
            name: 'Part',
            length: 24,
            width: 12,
            thickness: 0.75,
            position: { x: 0, y: 0, z: 0 },
            color: '#c4a574'
          }
        ]
      });

      render(<TemplateBrowserModal {...defaultProps} />);

      fireEvent.click(screen.getByText('+ Save Current'));

      await waitFor(() => {
        expect(window.electronAPI.addUserTemplate).toHaveBeenCalled();
      });
    });
  });

  describe('close interactions', () => {
    it('calls onClose when Cancel clicked', async () => {
      const onClose = vi.fn();
      render(<TemplateBrowserModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when X button clicked', async () => {
      const onClose = vi.fn();
      render(<TemplateBrowserModal {...defaultProps} onClose={onClose} />);

      const closeBtn = screen.getByText('×');
      fireEvent.click(closeBtn);

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose on Escape key when not in delete mode', async () => {
      const onClose = vi.fn();
      render(<TemplateBrowserModal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });

    it('cancels delete confirmation on Escape key', async () => {
      (window.electronAPI.getUserTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'user-1',
          name: 'My Template',
          dimensions: { width: 24, depth: 12, height: 18 },
          partCount: 1,
          thumbnail: '📐',
          category: 'other',
          createdAt: '2024-01-01',
          project: '{}'
        }
      ]);

      const onClose = vi.fn();
      render(<TemplateBrowserModal {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByTitle('Delete template')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle('Delete template'));

      // Escape should close delete confirm, not modal
      fireEvent.keyDown(window, { key: 'Escape' });

      expect(screen.queryByText('Delete this template?')).not.toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('calls onClose when backdrop clicked', async () => {
      const onClose = vi.fn();
      const { container } = render(<TemplateBrowserModal {...defaultProps} onClose={onClose} />);

      const backdrop = container.firstChild as HTMLElement;
      fireEvent.mouseDown(backdrop!);
      fireEvent.click(backdrop!);

      expect(onClose).toHaveBeenCalled();
    });
  });
});
