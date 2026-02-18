import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
});
