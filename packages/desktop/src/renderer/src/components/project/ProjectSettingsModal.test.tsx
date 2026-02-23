import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ProjectSettingsModal } from './ProjectSettingsModal';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';

// Mock window.electronAPI
beforeAll(() => {
  window.electronAPI = {
    isFavoriteProject: vi.fn().mockResolvedValue(false),
    addFavoriteProject: vi.fn().mockResolvedValue(undefined),
    removeFavoriteProject: vi.fn().mockResolvedValue(undefined)
  } as unknown as typeof window.electronAPI;
});

describe('ProjectSettingsModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Don't set filePath to avoid triggering async isFavoriteProject useEffect
    useProjectStore.setState({
      projectName: 'Test Project',
      units: 'imperial',
      gridSize: 0.25,
      kerfWidth: 0.125,
      overageFactor: 0.1,
      projectNotes: 'Some notes',
      filePath: null, // null to avoid async favorite check
      stockConstraints: {
        constrainDimensions: true,
        constrainGrain: true,
        constrainColor: true,
        preventOverlap: false
      },
      setProjectUnits: vi.fn(),
      setProjectGridSize: vi.fn(),
      setKerfWidth: vi.fn(),
      setOverageFactor: vi.fn(),
      setProjectName: vi.fn(),
      setProjectNotes: vi.fn(),
      setStockConstraints: vi.fn()
    });
    useUIStore.setState({
      showToast: vi.fn()
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(<ProjectSettingsModal {...defaultProps} />);

      expect(screen.getByText('Project Settings')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<ProjectSettingsModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Project Settings')).not.toBeInTheDocument();
    });

    it('shows Project Name section', () => {
      render(<ProjectSettingsModal {...defaultProps} />);

      expect(screen.getByText('Project Name')).toBeInTheDocument();
    });

    it('shows Project Notes section', () => {
      render(<ProjectSettingsModal {...defaultProps} />);

      expect(screen.getByText('Project Notes')).toBeInTheDocument();
    });

    it('shows Units & Grid section', () => {
      render(<ProjectSettingsModal {...defaultProps} />);

      expect(screen.getByText('Units & Grid')).toBeInTheDocument();
    });

    it('shows Cut List Settings section', () => {
      render(<ProjectSettingsModal {...defaultProps} />);

      expect(screen.getByText('Cut List Settings')).toBeInTheDocument();
    });

    it('shows Stock Constraints section', () => {
      render(<ProjectSettingsModal {...defaultProps} />);

      expect(screen.getByText('Stock Constraints')).toBeInTheDocument();
    });

    it('shows Done button', () => {
      render(<ProjectSettingsModal {...defaultProps} />);

      expect(screen.getByText('Done')).toBeInTheDocument();
    });
  });

  describe('template mode', () => {
    it('shows Template Settings title in template mode', () => {
      render(<ProjectSettingsModal {...defaultProps} isEditingTemplate={true} />);

      expect(screen.getByText('Template Settings')).toBeInTheDocument();
    });

    it('shows Template Name label in template mode', () => {
      render(<ProjectSettingsModal {...defaultProps} isEditingTemplate={true} />);

      expect(screen.getByText('Template Name')).toBeInTheDocument();
    });

    it('shows Template Description label in template mode', () => {
      render(<ProjectSettingsModal {...defaultProps} isEditingTemplate={true} />);

      expect(screen.getByText('Template Description')).toBeInTheDocument();
    });

    it('does not show favorite button in template mode', () => {
      render(<ProjectSettingsModal {...defaultProps} isEditingTemplate={true} />);

      expect(screen.queryByText('Favorite')).not.toBeInTheDocument();
    });
  });

  describe('project name', () => {
    it('displays current project name', () => {
      render(<ProjectSettingsModal {...defaultProps} />);

      expect(screen.getByDisplayValue('Test Project')).toBeInTheDocument();
    });

    it('calls setProjectName when name changes', () => {
      const setProjectName = vi.fn();
      useProjectStore.setState({ setProjectName });

      render(<ProjectSettingsModal {...defaultProps} />);

      fireEvent.change(screen.getByDisplayValue('Test Project'), {
        target: { value: 'New Name' }
      });

      expect(setProjectName).toHaveBeenCalledWith('New Name');
    });
  });

  describe('project notes', () => {
    it('displays current project notes', () => {
      render(<ProjectSettingsModal {...defaultProps} />);

      expect(screen.getByDisplayValue('Some notes')).toBeInTheDocument();
    });

    it('calls setProjectNotes when notes change', () => {
      const setProjectNotes = vi.fn();
      useProjectStore.setState({ setProjectNotes });

      render(<ProjectSettingsModal {...defaultProps} />);

      fireEvent.change(screen.getByDisplayValue('Some notes'), {
        target: { value: 'Updated notes' }
      });

      expect(setProjectNotes).toHaveBeenCalledWith('Updated notes');
    });
  });

  describe('units selection', () => {
    it('displays current units', () => {
      render(<ProjectSettingsModal {...defaultProps} />);

      expect(screen.getByDisplayValue('Imperial (inches)')).toBeInTheDocument();
    });

    it('calls setProjectUnits when units change', () => {
      const setProjectUnits = vi.fn();
      useProjectStore.setState({ setProjectUnits });

      render(<ProjectSettingsModal {...defaultProps} />);

      fireEvent.change(screen.getByDisplayValue('Imperial (inches)'), {
        target: { value: 'metric' }
      });

      expect(setProjectUnits).toHaveBeenCalledWith('metric');
    });

    it('shows imperial grid options when imperial selected', () => {
      render(<ProjectSettingsModal {...defaultProps} />);

      expect(screen.getByRole('option', { name: '1/4"' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '1/2"' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '1"' })).toBeInTheDocument();
    });

    it('shows metric grid options when metric selected', () => {
      useProjectStore.setState({ units: 'metric' });

      render(<ProjectSettingsModal {...defaultProps} />);

      expect(screen.getByRole('option', { name: '1mm' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '5mm' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '10mm' })).toBeInTheDocument();
    });
  });

  describe('grid size', () => {
    it('calls setProjectGridSize when grid size changes', () => {
      const setProjectGridSize = vi.fn();
      useProjectStore.setState({ setProjectGridSize });

      render(<ProjectSettingsModal {...defaultProps} />);

      // Find the Grid Snap Size select
      const gridSelects = screen.getAllByRole('combobox');
      const gridSelect = gridSelects[1]; // Second select is grid size

      fireEvent.change(gridSelect, { target: { value: '0.5' } });

      expect(setProjectGridSize).toHaveBeenCalledWith(0.5);
    });
  });

  describe('cut list settings', () => {
    it('shows Blade Kerf label', () => {
      render(<ProjectSettingsModal {...defaultProps} />);

      expect(screen.getByText('Blade Kerf')).toBeInTheDocument();
    });

    it('shows Material Overage label', () => {
      render(<ProjectSettingsModal {...defaultProps} />);

      expect(screen.getByText('Material Overage')).toBeInTheDocument();
    });

    it('displays current overage factor as percentage', () => {
      render(<ProjectSettingsModal {...defaultProps} />);

      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    });

    it('calls setOverageFactor when overage changes', () => {
      const setOverageFactor = vi.fn();
      useProjectStore.setState({ setOverageFactor });

      render(<ProjectSettingsModal {...defaultProps} />);

      fireEvent.change(screen.getByDisplayValue('10'), {
        target: { value: '15' }
      });

      expect(setOverageFactor).toHaveBeenCalledWith(0.15);
    });

    it('clamps overage to max 50%', () => {
      const setOverageFactor = vi.fn();
      useProjectStore.setState({ setOverageFactor });

      render(<ProjectSettingsModal {...defaultProps} />);

      fireEvent.change(screen.getByDisplayValue('10'), {
        target: { value: '75' }
      });

      expect(setOverageFactor).toHaveBeenCalledWith(0.5);
    });
  });

  describe('stock constraints', () => {
    it('shows Constrain Dimensions checkbox', () => {
      render(<ProjectSettingsModal {...defaultProps} />);

      expect(screen.getByText('Constrain Dimensions')).toBeInTheDocument();
    });

    it('shows Constrain Grain checkbox', () => {
      render(<ProjectSettingsModal {...defaultProps} />);

      expect(screen.getByText('Constrain Grain')).toBeInTheDocument();
    });

    it('shows Sync Part Color checkbox', () => {
      render(<ProjectSettingsModal {...defaultProps} />);

      expect(screen.getByText('Sync Part Color')).toBeInTheDocument();
    });

    it('shows Prevent Overlap checkbox', () => {
      render(<ProjectSettingsModal {...defaultProps} />);

      expect(screen.getByText('Prevent Overlap')).toBeInTheDocument();
    });

    it('calls setStockConstraints when constraint changes', () => {
      const setStockConstraints = vi.fn();
      useProjectStore.setState({ setStockConstraints });

      render(<ProjectSettingsModal {...defaultProps} />);

      // Find the Prevent Overlap checkbox (it's unchecked)
      const checkboxes = screen.getAllByRole('checkbox');
      const preventOverlapCheckbox = checkboxes[3]; // Fourth checkbox

      fireEvent.click(preventOverlapCheckbox);

      expect(setStockConstraints).toHaveBeenCalled();
    });
  });

  describe('favorites (no filePath)', () => {
    // These tests run with filePath: null to avoid async issues
    it('shows header favorite star button', () => {
      render(<ProjectSettingsModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Save project first' })).toBeInTheDocument();
    });

    it('disables favorite button when project not saved', () => {
      render(<ProjectSettingsModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Save project first' })).toBeDisabled();
    });
  });

  describe('close interactions', () => {
    it('calls onClose when Done is clicked', () => {
      const onClose = vi.fn();
      render(<ProjectSettingsModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Done'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when X button is clicked', () => {
      const onClose = vi.fn();
      render(<ProjectSettingsModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('×'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose on Escape key', () => {
      const onClose = vi.fn();
      render(<ProjectSettingsModal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      render(<ProjectSettingsModal {...defaultProps} onClose={onClose} />);

      const backdrop = document.querySelector('[data-state="open"][class*="bg-overlay"]') as HTMLElement;
      fireEvent.mouseDown(backdrop);
      fireEvent.click(backdrop);

      expect(onClose).toHaveBeenCalled();
    });
  });
});
