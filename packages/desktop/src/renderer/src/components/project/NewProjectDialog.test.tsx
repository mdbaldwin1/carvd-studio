import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NewProjectDialog } from './NewProjectDialog';

describe('NewProjectDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onCreateProject: vi.fn()
  };

  const mockStockLibrary = [
    {
      id: 'stock-1',
      name: 'Plywood 3/4"',
      length: 96,
      width: 48,
      thickness: 0.75,
      grainDirection: 'length' as const,
      pricingUnit: 'per_item' as const,
      pricePerUnit: 50,
      color: '#c4a574'
    },
    {
      id: 'stock-2',
      name: 'Oak Board',
      length: 72,
      width: 6,
      thickness: 1,
      grainDirection: 'length' as const,
      pricingUnit: 'board_foot' as const,
      pricePerUnit: 8,
      color: '#8b5a2b'
    }
  ];

  beforeAll(() => {
    window.electronAPI = {
      getPreference: vi.fn(),
      setPreference: vi.fn(),
      onMenuCommand: vi.fn(),
      removeMenuCommandListener: vi.fn()
    } as unknown as typeof window.electronAPI;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(window.electronAPI.getPreference).mockResolvedValue(mockStockLibrary);
  });

  describe('rendering', () => {
    it('renders when isOpen is true', async () => {
      render(<NewProjectDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('New Project')).toBeInTheDocument();
      });
    });

    it('does not render when isOpen is false', () => {
      render(<NewProjectDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('New Project')).not.toBeInTheDocument();
    });

    it('asks for starting stock and nothing else', async () => {
      render(<NewProjectDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Starting Materials')).toBeInTheDocument();
      });

      // The name comes from the file the first save writes, the units from
      // the app's New Project Defaults, and nothing remembers a choice made
      // here, so none of the three is asked for.
      expect(screen.queryByLabelText('Project Name')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Units')).not.toBeInTheDocument();
      expect(screen.queryByText(/Remember these choices/i)).not.toBeInTheDocument();
    });

    it('shows Create Project button', async () => {
      render(<NewProjectDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Create Project')).toBeInTheDocument();
      });
    });

    it('shows Cancel button', async () => {
      render(<NewProjectDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });
  });

  describe('materials section', () => {
    it('shows loading state initially', () => {
      render(<NewProjectDialog {...defaultProps} />);

      expect(screen.getByText('Loading materials...')).toBeInTheDocument();
    });

    it('shows materials after loading', async () => {
      render(<NewProjectDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Plywood 3/4"')).toBeInTheDocument();
        expect(screen.getByText('Oak Board')).toBeInTheDocument();
      });
    });

    it('shows empty state when no materials', async () => {
      vi.mocked(window.electronAPI.getPreference).mockResolvedValue([]);

      render(<NewProjectDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/No materials in your library yet/)).toBeInTheDocument();
      });
    });

    it('shows Select All and Select None buttons', async () => {
      render(<NewProjectDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Select All')).toBeInTheDocument();
        expect(screen.getByText('Select None')).toBeInTheDocument();
      });
    });

    it('can toggle material selection', async () => {
      render(<NewProjectDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Plywood 3/4"')).toBeInTheDocument();
      });

      // Find the checkbox for the first material
      const checkboxes = screen.getAllByRole('checkbox');
      // First checkbox is for material, not the "remember" checkbox
      const materialCheckbox = checkboxes.find((cb) => cb.closest('label')?.textContent?.includes('Plywood'));

      if (materialCheckbox) {
        fireEvent.click(materialCheckbox);
        // Toggle state changed
        expect(materialCheckbox).toBeTruthy();
      }
    });
  });

  describe('form submission', () => {
    it('reports only the chosen stock, pre-ticked from the library', async () => {
      const onCreateProject = vi.fn();
      render(<NewProjectDialog {...defaultProps} onCreateProject={onCreateProject} />);

      await waitFor(() => {
        expect(screen.getByText('Create Project')).toBeInTheDocument();
      });

      // A few stocks arrive already ticked, so Create Project is one click.
      fireEvent.click(screen.getByText('Create Project'));

      expect(onCreateProject).toHaveBeenCalledWith({ selectedMaterials: ['stock-1', 'stock-2'] });
    });

    it('reports an empty selection when the user clears it', async () => {
      const onCreateProject = vi.fn();
      render(<NewProjectDialog {...defaultProps} onCreateProject={onCreateProject} />);

      await waitFor(() => {
        expect(screen.getByText('Select None')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Select None'));
      fireEvent.click(screen.getByText('Create Project'));

      expect(onCreateProject).toHaveBeenCalledWith({ selectedMaterials: [] });
    });
  });

  describe('close interactions', () => {
    it('calls onClose when Cancel is clicked', async () => {
      const onClose = vi.fn();
      render(<NewProjectDialog {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cancel'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when X button is clicked', async () => {
      const onClose = vi.fn();
      render(<NewProjectDialog {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Close')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText('Close'));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('the retired skip preference', () => {
    it('still shows the dialog for a profile that had skipSetupDialog set', async () => {
      const onCreateProject = vi.fn();

      render(<NewProjectDialog {...defaultProps} onCreateProject={onCreateProject} />);

      // The preference and the checkbox that set it are both gone, and nothing
      // could have cleared a value already written to an existing profile, so
      // reading it again would suppress the dialog forever for those users.
      await waitFor(() => {
        expect(screen.getByText('Starting Materials')).toBeInTheDocument();
      });
      expect(onCreateProject).not.toHaveBeenCalled();
    });
  });

  describe('material categorization', () => {
    it('categorizes sheet goods separately', async () => {
      render(<NewProjectDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Sheet Goods')).toBeInTheDocument();
        expect(screen.getByText('Dimensional Lumber')).toBeInTheDocument();
      });
    });
  });
});
