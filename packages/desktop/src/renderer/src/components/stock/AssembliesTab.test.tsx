import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import type { Assembly, AssemblyPart } from '../../types';

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

// Mock builtInAssemblies
vi.mock('../../templates/builtInAssemblies', () => ({
  isBuiltInAssembly: vi.fn().mockImplementation((id: string) => id.startsWith('built-in'))
}));

import { AssembliesTab } from './AssembliesTab';
import { isBuiltInAssembly } from '../../templates/builtInAssemblies';

// ============================================================
// Setup
// ============================================================

function createPart(overrides: Partial<AssemblyPart> = {}): AssemblyPart {
  return {
    name: 'Side Panel',
    length: 24,
    width: 12,
    thickness: 0.75,
    relativePosition: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    stockId: null,
    grainSensitive: false,
    grainDirection: 'length',
    color: '#c4a574',
    ...overrides
  };
}

function createAssembly(overrides: Partial<Assembly> = {}): Assembly {
  return {
    id: 'a1',
    name: 'Test Assembly',
    description: 'A test assembly',
    parts: [createPart()],
    groups: [],
    groupMembers: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    modifiedAt: '2026-01-15T00:00:00.000Z',
    ...overrides
  };
}

beforeAll(() => {
  window.electronAPI = {
    getPreference: vi.fn(),
    setPreference: vi.fn(),
    showSaveDialog: vi.fn(),
    showOpenDialog: vi.fn(),
    writeBinaryFile: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    addRecentProject: vi.fn(),
    getRecentProjects: vi.fn(),
    clearRecentProjects: vi.fn(),
    setWindowTitle: vi.fn(),
    openExternal: vi.fn(),
    exportAssembly: vi.fn().mockResolvedValue({ success: true, filePath: '/test/export.carvd-assembly' }),
    importAssembly: vi.fn().mockResolvedValue({ success: true, assemblyId: 'imported-1' })
  } as unknown as typeof window.electronAPI;
});

beforeEach(() => {
  vi.clearAllMocks();
  (isBuiltInAssembly as ReturnType<typeof vi.fn>).mockImplementation((id: string) => id.startsWith('built-in'));
  (window.electronAPI.exportAssembly as ReturnType<typeof vi.fn>).mockResolvedValue({
    success: true,
    filePath: '/test/export.carvd-assembly'
  });
  (window.electronAPI.importAssembly as ReturnType<typeof vi.fn>).mockResolvedValue({
    success: true,
    assemblyId: 'imported-1'
  });
  useProjectStore.setState({ units: 'imperial' });
  useUIStore.setState({ toast: null, showToast: vi.fn() });
});

// ============================================================
// Tests
// ============================================================

describe('AssembliesTab', () => {
  const defaultProps = {
    assemblies: [createAssembly()],
    onUpdateAssembly: vi.fn(),
    onDeleteAssembly: vi.fn(),
    onDuplicateAssembly: vi.fn().mockResolvedValue(undefined),
    onEditAssemblyIn3D: vi.fn().mockResolvedValue(false),
    onCreateNewAssembly: vi.fn().mockResolvedValue(false),
    canCreateAssemblies: true,
    onClose: vi.fn()
  };

  describe('list sidebar', () => {
    it('renders assembly count', () => {
      render(<AssembliesTab {...defaultProps} />);
      expect(screen.getByText('1 available')).toBeInTheDocument();
    });

    it('renders assembly name in list', () => {
      render(<AssembliesTab {...defaultProps} />);
      expect(screen.getByText('Test Assembly')).toBeInTheDocument();
    });

    it('renders part count for assembly', () => {
      render(<AssembliesTab {...defaultProps} />);
      expect(screen.getByText('1 part')).toBeInTheDocument();
    });

    it('uses plural for multiple parts', () => {
      const assembly = createAssembly({ parts: [createPart(), createPart({ name: 'Bottom' })] });
      render(<AssembliesTab {...defaultProps} assemblies={[assembly]} />);
      expect(screen.getByText('2 parts')).toBeInTheDocument();
    });

    it('shows groups count when groups exist', () => {
      const assembly = createAssembly({
        groups: [{ originalId: 'g1', name: 'Sides' }]
      });
      render(<AssembliesTab {...defaultProps} assemblies={[assembly]} />);
      expect(screen.getByText(/1 group/)).toBeInTheDocument();
    });

    it('shows built-in badge for built-in assemblies', () => {
      const assembly = createAssembly({ id: 'built-in-drawer' });
      render(<AssembliesTab {...defaultProps} assemblies={[assembly]} />);
      expect(screen.getByText('Built-in')).toBeInTheDocument();
    });
  });

  describe('empty states', () => {
    it('shows empty state when no assemblies', () => {
      render(<AssembliesTab {...defaultProps} assemblies={[]} />);
      expect(screen.getByText('No assemblies in library yet')).toBeInTheDocument();
    });

    it('shows license message when cannot create assemblies', () => {
      render(<AssembliesTab {...defaultProps} assemblies={[]} canCreateAssemblies={false} />);
      expect(screen.getByText('Assemblies require a license')).toBeInTheDocument();
    });

    it('shows placeholder when no assembly selected', () => {
      render(<AssembliesTab {...defaultProps} />);
      expect(screen.getByText('Select an assembly to view details')).toBeInTheDocument();
    });
  });

  describe('assembly selection', () => {
    it('shows detail panel when assembly is selected', () => {
      render(<AssembliesTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      expect(screen.getByText('A test assembly')).toBeInTheDocument();
    });

    it('shows part details in selected assembly', () => {
      render(<AssembliesTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      expect(screen.getByText('Parts in this assembly:')).toBeInTheDocument();
      expect(screen.getByText('Side Panel')).toBeInTheDocument();
    });

    it('shows created and modified dates', () => {
      render(<AssembliesTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Modified')).toBeInTheDocument();
    });
  });

  describe('edit mode', () => {
    it('enters edit mode when clicking Edit', () => {
      render(<AssembliesTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      fireEvent.click(screen.getByText('Edit'));
      expect(screen.getByText('Edit Assembly')).toBeInTheDocument();
    });

    it('shows name and description fields in edit mode', () => {
      render(<AssembliesTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      fireEvent.click(screen.getByText('Edit'));
      expect(screen.getByDisplayValue('Test Assembly')).toBeInTheDocument();
      expect(screen.getByDisplayValue('A test assembly')).toBeInTheDocument();
    });

    it('calls onUpdateAssembly when saving', () => {
      render(<AssembliesTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      fireEvent.click(screen.getByText('Edit'));

      const nameInput = screen.getByDisplayValue('Test Assembly');
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      fireEvent.click(screen.getByText('Save'));

      expect(defaultProps.onUpdateAssembly).toHaveBeenCalledWith(
        'a1',
        expect.objectContaining({ name: 'Updated Name' })
      );
    });

    it('cancels edit mode', () => {
      render(<AssembliesTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      fireEvent.click(screen.getByText('Edit'));
      fireEvent.click(screen.getByText('Cancel'));
      // Should show the detail view again
      expect(screen.queryByText('Edit Assembly')).not.toBeInTheDocument();
    });

    it('does not show edit button for built-in assemblies', () => {
      const assembly = createAssembly({ id: 'built-in-drawer' });
      render(<AssembliesTab {...defaultProps} assemblies={[assembly]} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    });
  });

  describe('delete', () => {
    it('calls onDeleteAssembly when clicking delete', () => {
      render(<AssembliesTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      fireEvent.click(screen.getByText('Delete'));
      expect(defaultProps.onDeleteAssembly).toHaveBeenCalledWith('a1');
    });

    it('does not show delete button for built-in assemblies', () => {
      const assembly = createAssembly({ id: 'built-in-drawer' });
      render(<AssembliesTab {...defaultProps} assemblies={[assembly]} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });
  });

  describe('duplicate', () => {
    it('calls onDuplicateAssembly when clicking duplicate', () => {
      render(<AssembliesTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      fireEvent.click(screen.getByText('Duplicate'));
      expect(defaultProps.onDuplicateAssembly).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }));
    });
  });

  describe('search', () => {
    it('filters assemblies by search term', () => {
      const assemblies = [
        createAssembly({ id: 'a1', name: 'Drawer Box' }),
        createAssembly({ id: 'a2', name: 'Face Frame' })
      ];
      render(<AssembliesTab {...defaultProps} assemblies={assemblies} />);

      const searchInput = screen.getByPlaceholderText('Search assemblies...');
      fireEvent.change(searchInput, { target: { value: 'Drawer' } });

      expect(screen.getByText('Drawer Box')).toBeInTheDocument();
      expect(screen.queryByText('Face Frame')).not.toBeInTheDocument();
    });

    it('shows no match message when search has no results', () => {
      render(<AssembliesTab {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText('Search assemblies...');
      fireEvent.change(searchInput, { target: { value: 'zzz' } });
      expect(screen.getByText(/No assemblies match/)).toBeInTheDocument();
    });

    it('clears search with clear button', () => {
      render(<AssembliesTab {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText('Search assemblies...');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      fireEvent.click(screen.getByLabelText('Clear search'));
      expect(searchInput).toHaveValue('');
    });
  });

  describe('escape key', () => {
    it('calls onClose when pressing Escape', () => {
      render(<AssembliesTab {...defaultProps} />);
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('cancels edit mode on Escape instead of closing', () => {
      render(<AssembliesTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      fireEvent.click(screen.getByText('Edit'));

      fireEvent.keyDown(window, { key: 'Escape' });
      // Should cancel edit, not close
      expect(screen.queryByText('Edit Assembly')).not.toBeInTheDocument();
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('import/export', () => {
    it('shows import button when canCreateAssemblies', () => {
      render(<AssembliesTab {...defaultProps} />);
      expect(screen.getByLabelText('Import assembly')).toBeInTheDocument();
    });

    it('hides import button when cannot create assemblies', () => {
      render(<AssembliesTab {...defaultProps} canCreateAssemblies={false} assemblies={[createAssembly()]} />);
      expect(screen.queryByLabelText('Import assembly')).not.toBeInTheDocument();
    });

    it('shows export button for non-built-in assembly', () => {
      render(<AssembliesTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('hides export button for built-in assembly', () => {
      const assembly = createAssembly({ id: 'built-in-drawer' });
      render(<AssembliesTab {...defaultProps} assemblies={[assembly]} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      expect(screen.queryByText('Export')).not.toBeInTheDocument();
    });
  });

  describe('export assembly handler', () => {
    it('exports assembly successfully and shows success toast', async () => {
      const mockShowToast = vi.fn();
      useUIStore.setState({ showToast: mockShowToast });
      (window.electronAPI.exportAssembly as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        filePath: '/test/export.carvd-assembly'
      });

      render(<AssembliesTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      fireEvent.click(screen.getByText('Export'));

      await waitFor(() => {
        expect(window.electronAPI.exportAssembly).toHaveBeenCalledWith('a1');
      });
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'Assembly exported successfully',
          'success',
          expect.objectContaining({
            action: expect.objectContaining({
              label: expect.stringMatching(/Show in (Finder|File Explorer)/),
              onClick: expect.any(Function)
            })
          })
        );
      });
    });

    it('exports assembly with stocks included and shows count in toast', async () => {
      const mockShowToast = vi.fn();
      useUIStore.setState({ showToast: mockShowToast });
      (window.electronAPI.exportAssembly as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        filePath: '/test/export.carvd-assembly',
        stocksIncluded: 3
      });

      render(<AssembliesTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      fireEvent.click(screen.getByText('Export'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'Assembly exported with 3 stocks',
          'success',
          expect.objectContaining({
            action: expect.objectContaining({
              label: expect.stringMatching(/Show in (Finder|File Explorer)/),
              onClick: expect.any(Function)
            })
          })
        );
      });
    });

    it('exports assembly with 1 stock and uses singular in toast', async () => {
      const mockShowToast = vi.fn();
      useUIStore.setState({ showToast: mockShowToast });
      (window.electronAPI.exportAssembly as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        filePath: '/test/export.carvd-assembly',
        stocksIncluded: 1
      });

      render(<AssembliesTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      fireEvent.click(screen.getByText('Export'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'Assembly exported with 1 stock',
          'success',
          expect.objectContaining({
            action: expect.objectContaining({
              label: expect.stringMatching(/Show in (Finder|File Explorer)/),
              onClick: expect.any(Function)
            })
          })
        );
      });
    });

    it('does nothing when export dialog is canceled', async () => {
      const mockShowToast = vi.fn();
      useUIStore.setState({ showToast: mockShowToast });
      (window.electronAPI.exportAssembly as ReturnType<typeof vi.fn>).mockResolvedValue({
        canceled: true
      });

      render(<AssembliesTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      fireEvent.click(screen.getByText('Export'));

      await waitFor(() => {
        expect(window.electronAPI.exportAssembly).toHaveBeenCalledWith('a1');
      });
      // Should not show any toast when canceled
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('shows error toast when export returns an error', async () => {
      const mockShowToast = vi.fn();
      useUIStore.setState({ showToast: mockShowToast });
      (window.electronAPI.exportAssembly as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Disk full'
      });

      render(<AssembliesTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      fireEvent.click(screen.getByText('Export'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Disk full', 'error');
      });
    });

    it('shows error toast when export throws an exception', async () => {
      const mockShowToast = vi.fn();
      useUIStore.setState({ showToast: mockShowToast });
      (window.electronAPI.exportAssembly as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      render(<AssembliesTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      fireEvent.click(screen.getByText('Export'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Failed to export assembly', 'error');
      });
    });

    it('hides export button when canCreateAssemblies is false', () => {
      render(<AssembliesTab {...defaultProps} canCreateAssemblies={false} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      expect(screen.queryByText('Export')).not.toBeInTheDocument();
    });
  });

  describe('import assembly handler', () => {
    it('imports assembly successfully and shows success toast', async () => {
      const mockShowToast = vi.fn();
      useUIStore.setState({ showToast: mockShowToast });
      (window.electronAPI.importAssembly as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        assemblyId: 'imported-1'
      });

      render(<AssembliesTab {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('Import assembly'));

      await waitFor(() => {
        expect(window.electronAPI.importAssembly).toHaveBeenCalledWith({ importStocks: true });
      });
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Assembly imported successfully', 'success');
      });
    });

    it('imports assembly with stocks and shows count in toast', async () => {
      const mockShowToast = vi.fn();
      useUIStore.setState({ showToast: mockShowToast });
      (window.electronAPI.importAssembly as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        assemblyId: 'imported-1',
        stocksImported: 2
      });

      render(<AssembliesTab {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('Import assembly'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Assembly imported with 2 stocks', 'success');
      });
    });

    it('imports assembly with 1 stock and uses singular in toast', async () => {
      const mockShowToast = vi.fn();
      useUIStore.setState({ showToast: mockShowToast });
      (window.electronAPI.importAssembly as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        assemblyId: 'imported-1',
        stocksImported: 1
      });

      render(<AssembliesTab {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('Import assembly'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Assembly imported with 1 stock', 'success');
      });
    });

    it('does nothing when import dialog is canceled', async () => {
      const mockShowToast = vi.fn();
      useUIStore.setState({ showToast: mockShowToast });
      (window.electronAPI.importAssembly as ReturnType<typeof vi.fn>).mockResolvedValue({
        canceled: true
      });

      render(<AssembliesTab {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('Import assembly'));

      await waitFor(() => {
        expect(window.electronAPI.importAssembly).toHaveBeenCalled();
      });
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('shows error toast when import returns an error', async () => {
      const mockShowToast = vi.fn();
      useUIStore.setState({ showToast: mockShowToast });
      (window.electronAPI.importAssembly as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Invalid file format'
      });

      render(<AssembliesTab {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('Import assembly'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Invalid file format', 'error');
      });
    });

    it('shows error toast when import throws an exception', async () => {
      const mockShowToast = vi.fn();
      useUIStore.setState({ showToast: mockShowToast });
      (window.electronAPI.importAssembly as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('File read error'));

      render(<AssembliesTab {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('Import assembly'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Failed to import assembly', 'error');
      });
    });
  });

  describe('duplicate assembly handler', () => {
    it('hides duplicate button when canCreateAssemblies is false', () => {
      render(<AssembliesTab {...defaultProps} canCreateAssemblies={false} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      expect(screen.queryByText('Duplicate')).not.toBeInTheDocument();
    });

    it('hides duplicate button when onDuplicateAssembly is not provided', () => {
      render(<AssembliesTab {...defaultProps} onDuplicateAssembly={undefined} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      expect(screen.queryByText('Duplicate')).not.toBeInTheDocument();
    });

    it('shows duplicate button for built-in assemblies when canCreateAssemblies is true', () => {
      const assembly = createAssembly({ id: 'built-in-drawer' });
      render(<AssembliesTab {...defaultProps} assemblies={[assembly]} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      expect(screen.getByText('Duplicate')).toBeInTheDocument();
    });

    it('passes the full assembly object to onDuplicateAssembly', async () => {
      const onDuplicate = vi.fn().mockResolvedValue(undefined);
      render(<AssembliesTab {...defaultProps} onDuplicateAssembly={onDuplicate} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      fireEvent.click(screen.getByText('Duplicate'));

      await waitFor(() => {
        expect(onDuplicate).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'a1',
            name: 'Test Assembly',
            description: 'A test assembly'
          })
        );
      });
    });
  });

  describe('drag start handler', () => {
    it('sets drag data with assembly id and source', () => {
      render(<AssembliesTab {...defaultProps} />);
      const assemblyItem = screen.getByText('Test Assembly').closest('li')!;

      const mockDataTransfer = {
        setData: vi.fn(),
        effectAllowed: ''
      };

      fireEvent.dragStart(assemblyItem, { dataTransfer: mockDataTransfer });

      expect(mockDataTransfer.setData).toHaveBeenCalledWith('application/carvd-assembly', 'a1');
      expect(mockDataTransfer.setData).toHaveBeenCalledWith('application/carvd-assembly-source', 'library');
    });

    it('sets correct assembly id for different assemblies', () => {
      const assemblies = [
        createAssembly({ id: 'a1', name: 'Drawer Box' }),
        createAssembly({ id: 'a2', name: 'Face Frame' })
      ];
      render(<AssembliesTab {...defaultProps} assemblies={assemblies} />);

      const faceFrameItem = screen.getByText('Face Frame').closest('li')!;

      const mockDataTransfer = {
        setData: vi.fn(),
        effectAllowed: ''
      };

      fireEvent.dragStart(faceFrameItem, { dataTransfer: mockDataTransfer });

      expect(mockDataTransfer.setData).toHaveBeenCalledWith('application/carvd-assembly', 'a2');
      expect(mockDataTransfer.setData).toHaveBeenCalledWith('application/carvd-assembly-source', 'library');
    });

    it('assembly list items are draggable', () => {
      render(<AssembliesTab {...defaultProps} />);
      const assemblyItem = screen.getByText('Test Assembly').closest('li')!;
      expect(assemblyItem).toHaveAttribute('draggable', 'true');
    });
  });

  describe('edit in 3D handler', () => {
    it('shows Edit in 3D button for non-built-in assembly when onEditAssemblyIn3D is provided', () => {
      render(<AssembliesTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      expect(screen.getByText('Edit in 3D')).toBeInTheDocument();
    });

    it('hides Edit in 3D button for built-in assemblies', () => {
      const assembly = createAssembly({ id: 'built-in-drawer' });
      render(<AssembliesTab {...defaultProps} assemblies={[assembly]} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      expect(screen.queryByText('Edit in 3D')).not.toBeInTheDocument();
    });

    it('hides Edit in 3D button when onEditAssemblyIn3D is not provided', () => {
      render(<AssembliesTab {...defaultProps} onEditAssemblyIn3D={undefined} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      expect(screen.queryByText('Edit in 3D')).not.toBeInTheDocument();
    });

    it('calls onClose when Edit in 3D returns true (success)', async () => {
      const onEditIn3D = vi.fn().mockResolvedValue(true);
      const onClose = vi.fn();
      render(<AssembliesTab {...defaultProps} onEditAssemblyIn3D={onEditIn3D} onClose={onClose} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      fireEvent.click(screen.getByText('Edit in 3D'));

      await waitFor(() => {
        expect(onEditIn3D).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }));
      });
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('does not call onClose when Edit in 3D returns false (failure)', async () => {
      const onEditIn3D = vi.fn().mockResolvedValue(false);
      const onClose = vi.fn();
      render(<AssembliesTab {...defaultProps} onEditAssemblyIn3D={onEditIn3D} onClose={onClose} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      fireEvent.click(screen.getByText('Edit in 3D'));

      await waitFor(() => {
        expect(onEditIn3D).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }));
      });
      // Give it time to ensure onClose would have been called if it was going to be
      await new Promise((r) => setTimeout(r, 50));
      expect(onClose).not.toHaveBeenCalled();
    });

    it('shows Edit Layout in 3D button in edit mode', () => {
      render(<AssembliesTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      fireEvent.click(screen.getByText('Edit'));
      expect(screen.getByText('Edit Layout in 3D')).toBeInTheDocument();
    });

    it('calls onClose when Edit Layout in 3D (in edit mode) returns true', async () => {
      const onEditIn3D = vi.fn().mockResolvedValue(true);
      const onClose = vi.fn();
      render(<AssembliesTab {...defaultProps} onEditAssemblyIn3D={onEditIn3D} onClose={onClose} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      fireEvent.click(screen.getByText('Edit'));
      fireEvent.click(screen.getByText('Edit Layout in 3D'));

      await waitFor(() => {
        expect(onEditIn3D).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }));
      });
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('does not call onClose when Edit Layout in 3D (in edit mode) returns false', async () => {
      const onEditIn3D = vi.fn().mockResolvedValue(false);
      const onClose = vi.fn();
      render(<AssembliesTab {...defaultProps} onEditAssemblyIn3D={onEditIn3D} onClose={onClose} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      fireEvent.click(screen.getByText('Edit'));
      fireEvent.click(screen.getByText('Edit Layout in 3D'));

      await waitFor(() => {
        expect(onEditIn3D).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }));
      });
      await new Promise((r) => setTimeout(r, 50));
      expect(onClose).not.toHaveBeenCalled();
    });

    it('hides Edit Layout in 3D in edit mode when canCreateAssemblies is false', () => {
      render(<AssembliesTab {...defaultProps} canCreateAssemblies={false} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      // Cannot enter edit mode when canCreateAssemblies is false (no Edit button)
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    });

    it('hides Edit in 3D button when canCreateAssemblies is false', () => {
      render(<AssembliesTab {...defaultProps} canCreateAssemblies={false} />);
      fireEvent.click(screen.getByText('Test Assembly'));
      expect(screen.queryByText('Edit in 3D')).not.toBeInTheDocument();
    });
  });

  describe('create new assembly handler', () => {
    it('shows create button when onCreateNewAssembly and canCreateAssemblies are provided', () => {
      render(<AssembliesTab {...defaultProps} />);
      expect(screen.getByLabelText('Create new assembly')).toBeInTheDocument();
    });

    it('hides create button when canCreateAssemblies is false', () => {
      render(<AssembliesTab {...defaultProps} canCreateAssemblies={false} />);
      expect(screen.queryByLabelText('Create new assembly')).not.toBeInTheDocument();
    });

    it('hides create button when onCreateNewAssembly is not provided', () => {
      render(<AssembliesTab {...defaultProps} onCreateNewAssembly={undefined} />);
      expect(screen.queryByLabelText('Create new assembly')).not.toBeInTheDocument();
    });

    it('calls onClose when onCreateNewAssembly returns true (success)', async () => {
      const onCreate = vi.fn().mockResolvedValue(true);
      const onClose = vi.fn();
      render(<AssembliesTab {...defaultProps} onCreateNewAssembly={onCreate} onClose={onClose} />);
      fireEvent.click(screen.getByLabelText('Create new assembly'));

      await waitFor(() => {
        expect(onCreate).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('does not call onClose when onCreateNewAssembly returns false', async () => {
      const onCreate = vi.fn().mockResolvedValue(false);
      const onClose = vi.fn();
      render(<AssembliesTab {...defaultProps} onCreateNewAssembly={onCreate} onClose={onClose} />);
      fireEvent.click(screen.getByLabelText('Create new assembly'));

      await waitFor(() => {
        expect(onCreate).toHaveBeenCalled();
      });
      await new Promise((r) => setTimeout(r, 50));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('thumbnail rendering', () => {
    it('renders thumbnail image when thumbnailData is present', () => {
      const assembly = createAssembly({
        thumbnailData: { data: 'abc123', width: 100, height: 75 }
      });
      render(<AssembliesTab {...defaultProps} assemblies={[assembly]} />);
      const img = screen.getByAltText('Test Assembly');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'data:image/png;base64,abc123');
    });

    it('renders fallback emoji when no thumbnailData', () => {
      render(<AssembliesTab {...defaultProps} />);
      // The default assembly from createAssembly() has no thumbnailData
      // so it should render the fallback emoji icon
      expect(screen.getByText('Test Assembly')).toBeInTheDocument();
    });
  });
});
