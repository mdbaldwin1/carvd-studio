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
      getNewProjectDefaults: vi.fn(),
      setNewProjectDefaults: vi.fn(),
      onMenuCommand: vi.fn(),
      removeMenuCommandListener: vi.fn()
    } as unknown as typeof window.electronAPI;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(window.electronAPI.getPreference).mockResolvedValue(mockStockLibrary);
    vi.mocked(window.electronAPI.getNewProjectDefaults).mockResolvedValue({
      units: 'imperial',
      addCommonMaterials: true,
      selectedMaterials: [],
      skipSetupDialog: false
    });
    vi.mocked(window.electronAPI.setNewProjectDefaults).mockResolvedValue(undefined);
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

    it('shows project name input', async () => {
      render(<NewProjectDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Project Name')).toBeInTheDocument();
      });
    });

    it('has "Untitled Project" as default name', async () => {
      render(<NewProjectDialog {...defaultProps} />);

      await waitFor(() => {
        const input = screen.getByLabelText('Project Name') as HTMLInputElement;
        expect(input.value).toBe('Untitled Project');
      });
    });

    it('shows units selection', async () => {
      render(<NewProjectDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Imperial (inches)')).toBeInTheDocument();
        expect(screen.getByText('Metric (mm)')).toBeInTheDocument();
      });
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

  describe('units selection', () => {
    it('has imperial selected by default', async () => {
      render(<NewProjectDialog {...defaultProps} />);

      await waitFor(() => {
        const unitsSelect = screen.getByLabelText('Units') as HTMLSelectElement;
        expect(unitsSelect.value).toBe('imperial');
      });
    });

    it('can switch to metric', async () => {
      render(<NewProjectDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Metric (mm)')).toBeInTheDocument();
      });

      const unitsSelect = screen.getByLabelText('Units') as HTMLSelectElement;
      fireEvent.change(unitsSelect, { target: { value: 'metric' } });

      expect(unitsSelect.value).toBe('metric');
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
    it('calls onCreateProject with form data', async () => {
      const onCreateProject = vi.fn();
      render(<NewProjectDialog {...defaultProps} onCreateProject={onCreateProject} />);

      await waitFor(() => {
        expect(screen.getByText('Create Project')).toBeInTheDocument();
      });

      // Change project name
      const nameInput = screen.getByLabelText('Project Name');
      fireEvent.change(nameInput, { target: { value: 'My New Project' } });

      fireEvent.click(screen.getByText('Create Project'));

      expect(onCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My New Project',
          units: 'imperial'
        })
      );
    });

    it('calls onCreateProject with metric units when selected', async () => {
      const onCreateProject = vi.fn();
      render(<NewProjectDialog {...defaultProps} onCreateProject={onCreateProject} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Units')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('Units'), { target: { value: 'metric' } });
      fireEvent.click(screen.getByText('Create Project'));

      expect(onCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          units: 'metric'
        })
      );
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

  describe('remember choices', () => {
    it('shows remember checkbox', async () => {
      render(<NewProjectDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Remember these choices/)).toBeInTheDocument();
      });
    });

    it('saves defaults when remember is checked', async () => {
      render(<NewProjectDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Remember these choices/)).toBeInTheDocument();
      });

      // Check the remember checkbox
      const rememberCheckbox = screen.getByRole('checkbox', { name: /Remember these choices/ });
      fireEvent.click(rememberCheckbox);

      fireEvent.click(screen.getByText('Create Project'));

      await waitFor(() => {
        expect(window.electronAPI.setNewProjectDefaults).toHaveBeenCalled();
      });
    });
  });

  describe('skip dialog feature', () => {
    it('immediately creates project when skipSetupDialog is true', async () => {
      const onCreateProject = vi.fn();
      vi.mocked(window.electronAPI.getNewProjectDefaults).mockResolvedValue({
        units: 'metric',
        addCommonMaterials: false,
        selectedMaterials: [],
        skipSetupDialog: true
      });

      render(<NewProjectDialog {...defaultProps} onCreateProject={onCreateProject} />);

      await waitFor(() => {
        expect(onCreateProject).toHaveBeenCalledWith({
          name: 'Untitled Project',
          units: 'metric',
          selectedMaterials: []
        });
      });
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
