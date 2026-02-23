import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddAssemblyModal } from './AddAssemblyModal';
import { useProjectStore } from '../../store/projectStore';
import { Assembly } from '../../types';

describe('AddAssemblyModal', () => {
  const mockAssemblyLibrary: Assembly[] = [
    {
      id: 'assembly-1',
      name: 'Drawer Assembly',
      description: 'Standard drawer with dovetail joints',
      parts: [
        { id: 'p1', name: 'Front', length: 18, width: 6, thickness: 0.75 },
        { id: 'p2', name: 'Back', length: 18, width: 6, thickness: 0.75 },
        { id: 'p3', name: 'Side', length: 20, width: 6, thickness: 0.75 }
      ],
      groups: [],
      groupMembers: [],
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    },
    {
      id: 'assembly-2',
      name: 'Cabinet Face Frame',
      parts: [
        { id: 'p4', name: 'Rail', length: 24, width: 2, thickness: 0.75 },
        { id: 'p5', name: 'Stile', length: 30, width: 2, thickness: 0.75 }
      ],
      groups: [],
      groupMembers: [],
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    }
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    assemblyLibrary: mockAssemblyLibrary,
    onAddToProject: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useProjectStore.setState({
      units: 'imperial',
      assemblies: []
    });
  });

  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(<AddAssemblyModal {...defaultProps} />);

      expect(screen.getByText('Add Assembly to Project')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<AddAssemblyModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Add Assembly to Project')).not.toBeInTheDocument();
    });

    it('shows assembly list', () => {
      render(<AddAssemblyModal {...defaultProps} />);

      expect(screen.getByText('Drawer Assembly')).toBeInTheDocument();
      expect(screen.getByText('Cabinet Face Frame')).toBeInTheDocument();
    });

    it('shows available count', () => {
      render(<AddAssemblyModal {...defaultProps} />);

      expect(screen.getByText('2 available')).toBeInTheDocument();
    });

    it('shows placeholder when no assembly selected', () => {
      render(<AddAssemblyModal {...defaultProps} />);

      expect(screen.getByText('Select an assembly from the library to view details')).toBeInTheDocument();
    });

    it('shows parts count for each assembly', () => {
      render(<AddAssemblyModal {...defaultProps} />);

      expect(screen.getByText('3 parts')).toBeInTheDocument();
      expect(screen.getByText('2 parts')).toBeInTheDocument();
    });
  });

  describe('empty library', () => {
    it('shows empty state when no assemblies available', () => {
      render(<AddAssemblyModal {...defaultProps} assemblyLibrary={[]} />);

      expect(screen.getByText('No assemblies available')).toBeInTheDocument();
    });

    it('shows hint when library is empty', () => {
      render(<AddAssemblyModal {...defaultProps} assemblyLibrary={[]} />);

      expect(screen.getByText(/Save a selection as an assembly/)).toBeInTheDocument();
    });

    it('shows create hint when onCreateNew provided', () => {
      render(<AddAssemblyModal {...defaultProps} assemblyLibrary={[]} onCreateNew={vi.fn()} />);

      expect(screen.getByText(/Click "\+" above/)).toBeInTheDocument();
    });
  });

  describe('assemblies already in project', () => {
    it('filters out assemblies already in project', () => {
      useProjectStore.setState({
        assemblies: [mockAssemblyLibrary[0]]
      });

      render(<AddAssemblyModal {...defaultProps} />);

      expect(screen.queryByText('Drawer Assembly')).not.toBeInTheDocument();
      expect(screen.getByText('Cabinet Face Frame')).toBeInTheDocument();
      expect(screen.getByText('1 available')).toBeInTheDocument();
    });

    it('shows message when all assemblies are in project', () => {
      useProjectStore.setState({
        assemblies: mockAssemblyLibrary
      });

      render(<AddAssemblyModal {...defaultProps} />);

      expect(screen.getByText('All library assemblies are already in this project')).toBeInTheDocument();
    });
  });

  describe('assembly selection', () => {
    it('selects assembly when clicked', () => {
      render(<AddAssemblyModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Drawer Assembly'));

      // Should show assembly details
      expect(screen.getByRole('heading', { name: 'Drawer Assembly' })).toBeInTheDocument();
    });

    it('shows assembly description when selected', () => {
      render(<AddAssemblyModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Drawer Assembly'));

      expect(screen.getByText('Standard drawer with dovetail joints')).toBeInTheDocument();
    });

    it('shows parts preview when selected', () => {
      render(<AddAssemblyModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Drawer Assembly'));

      expect(screen.getByText('Parts (3)')).toBeInTheDocument();
      expect(screen.getByText('Front')).toBeInTheDocument();
      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('allows multiple selection', () => {
      render(<AddAssemblyModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Drawer Assembly'));
      fireEvent.click(screen.getByText('Cabinet Face Frame'));

      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('deselects when clicked again', () => {
      render(<AddAssemblyModal {...defaultProps} />);

      // Get the list items
      const drawerItems = screen.getAllByText('Drawer Assembly');
      const listItem = drawerItems[0];

      fireEvent.click(listItem);
      expect(screen.getByText('1 selected')).toBeInTheDocument();

      fireEvent.click(listItem);
      expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
    });
  });

  describe('select all', () => {
    it('shows Select All button', () => {
      render(<AddAssemblyModal {...defaultProps} />);

      expect(screen.getByText('Select All')).toBeInTheDocument();
    });

    it('selects all assemblies when clicked', () => {
      render(<AddAssemblyModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Select All'));

      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('changes to Deselect All after selection', () => {
      render(<AddAssemblyModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Select All'));

      expect(screen.getByText('Deselect All')).toBeInTheDocument();
    });

    it('deselects all when Deselect All clicked', () => {
      render(<AddAssemblyModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Select All'));
      fireEvent.click(screen.getByText('Deselect All'));

      expect(screen.queryByText('2 selected')).not.toBeInTheDocument();
    });
  });

  describe('search', () => {
    it('shows search input', () => {
      render(<AddAssemblyModal {...defaultProps} />);

      expect(screen.getByPlaceholderText('Search assemblies...')).toBeInTheDocument();
    });

    it('filters assemblies by search term', () => {
      render(<AddAssemblyModal {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('Search assemblies...'), {
        target: { value: 'Drawer' }
      });

      expect(screen.getByText('Drawer Assembly')).toBeInTheDocument();
      expect(screen.queryByText('Cabinet Face Frame')).not.toBeInTheDocument();
    });

    it('shows no results message', () => {
      render(<AddAssemblyModal {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('Search assemblies...'), {
        target: { value: 'xyz' }
      });

      expect(screen.getByText(/No assemblies match "xyz"/)).toBeInTheDocument();
    });

    it('shows clear button when search has value', () => {
      render(<AddAssemblyModal {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('Search assemblies...'), {
        target: { value: 'test' }
      });

      const clearBtn = screen.getByLabelText('Clear search');
      expect(clearBtn).toBeInTheDocument();
    });
  });

  describe('create new button', () => {
    it('shows create button when onCreateNew provided', () => {
      render(<AddAssemblyModal {...defaultProps} onCreateNew={vi.fn()} />);

      expect(screen.getByTitle('Create new assembly')).toBeInTheDocument();
    });

    it('does not show create button when onCreateNew not provided', () => {
      render(<AddAssemblyModal {...defaultProps} />);

      expect(screen.queryByTitle('Create new assembly')).not.toBeInTheDocument();
    });

    it('calls onCreateNew and onClose when clicked', () => {
      const onCreateNew = vi.fn();
      const onClose = vi.fn();
      render(<AddAssemblyModal {...defaultProps} onCreateNew={onCreateNew} onClose={onClose} />);

      fireEvent.click(screen.getByTitle('Create new assembly'));

      expect(onClose).toHaveBeenCalled();
      expect(onCreateNew).toHaveBeenCalled();
    });
  });

  describe('add to project', () => {
    it('disables Add button when nothing selected', () => {
      render(<AddAssemblyModal {...defaultProps} />);

      expect(screen.getByText('Add to Project')).toBeDisabled();
    });

    it('enables Add button when assembly selected', () => {
      render(<AddAssemblyModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Drawer Assembly'));

      expect(screen.getByText('Add to Project (1)')).not.toBeDisabled();
    });

    it('shows count in button when multiple selected', () => {
      render(<AddAssemblyModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Drawer Assembly'));
      fireEvent.click(screen.getByText('Cabinet Face Frame'));

      expect(screen.getByText('Add to Project (2)')).toBeInTheDocument();
    });

    it('calls onAddToProject for each selected assembly', () => {
      const onAddToProject = vi.fn();
      render(<AddAssemblyModal {...defaultProps} onAddToProject={onAddToProject} />);

      fireEvent.click(screen.getByText('Drawer Assembly'));
      fireEvent.click(screen.getByText('Cabinet Face Frame'));
      fireEvent.click(screen.getByText('Add to Project (2)'));

      expect(onAddToProject).toHaveBeenCalledTimes(2);
    });

    it('calls onClose after adding', () => {
      const onClose = vi.fn();
      render(<AddAssemblyModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Drawer Assembly'));
      fireEvent.click(screen.getByText('Add to Project (1)'));

      expect(onClose).toHaveBeenCalled();
    });

    it('updates modifiedAt when adding assembly', () => {
      const onAddToProject = vi.fn();
      render(<AddAssemblyModal {...defaultProps} onAddToProject={onAddToProject} />);

      fireEvent.click(screen.getByText('Drawer Assembly'));
      fireEvent.click(screen.getByText('Add to Project (1)'));

      const addedAssembly = onAddToProject.mock.calls[0][0];
      expect(addedAssembly.modifiedAt).toBeDefined();
    });
  });

  describe('close interactions', () => {
    it('calls onClose when Cancel is clicked', () => {
      const onClose = vi.fn();
      render(<AddAssemblyModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when X button is clicked', () => {
      const onClose = vi.fn();
      render(<AddAssemblyModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('×'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose on Escape key', () => {
      const onClose = vi.fn();
      render(<AddAssemblyModal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      render(<AddAssemblyModal {...defaultProps} onClose={onClose} />);

      const backdrop = document.querySelector('[data-state="open"][class*="bg-overlay"]') as HTMLElement;
      fireEvent.mouseDown(backdrop);
      fireEvent.click(backdrop);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('state reset', () => {
    it('resets selection when modal reopens', () => {
      const { rerender } = render(<AddAssemblyModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Drawer Assembly'));
      expect(screen.getByText('1 selected')).toBeInTheDocument();

      rerender(<AddAssemblyModal {...defaultProps} isOpen={false} />);
      rerender(<AddAssemblyModal {...defaultProps} isOpen={true} />);

      expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
    });

    it('clears search when modal reopens', () => {
      const { rerender } = render(<AddAssemblyModal {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('Search assemblies...'), {
        target: { value: 'Drawer' }
      });

      rerender(<AddAssemblyModal {...defaultProps} isOpen={false} />);
      rerender(<AddAssemblyModal {...defaultProps} isOpen={true} />);

      const input = screen.getByPlaceholderText('Search assemblies...') as HTMLInputElement;
      expect(input.value).toBe('');
    });
  });

  describe('parts preview truncation', () => {
    it('shows truncation message for assemblies with many parts', () => {
      const manyPartsAssembly: Assembly = {
        id: 'assembly-many',
        name: 'Large Assembly',
        parts: Array.from({ length: 8 }, (_, i) => ({
          id: `p${i}`,
          name: `Part ${i + 1}`,
          length: 10,
          width: 5,
          thickness: 0.75
        })),
        groups: [],
        groupMembers: [],
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      };

      render(<AddAssemblyModal {...defaultProps} assemblyLibrary={[manyPartsAssembly]} />);

      fireEvent.click(screen.getByText('Large Assembly'));

      expect(screen.getByText('+3 more parts')).toBeInTheDocument();
    });
  });
});
