import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImportAppStateModal } from './ImportAppStateModal';
import { useProjectStore } from '../store/projectStore';

// Mock the project store
vi.mock('../store/projectStore', () => ({
  useProjectStore: vi.fn()
}));

describe('ImportAppStateModal', () => {
  const mockShowToast = vi.fn();
  const mockOnClose = vi.fn();

  beforeAll(() => {
    window.electronAPI = {
      previewImportAppState: vi.fn(),
      importAppState: vi.fn(),
      // Add other required methods as stubs
      getPreference: vi.fn(),
      setPreference: vi.fn(),
      onMenuCommand: vi.fn(),
      openExternal: vi.fn()
    } as unknown as typeof window.electronAPI;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProjectStore).mockReturnValue(mockShowToast);
  });

  describe('initial state', () => {
    it('renders nothing when closed', () => {
      const { container } = render(<ImportAppStateModal isOpen={false} onClose={mockOnClose} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('renders the modal when open', () => {
      render(<ImportAppStateModal isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText('Import App State')).toBeInTheDocument();
    });

    it('shows select file step initially', () => {
      render(<ImportAppStateModal isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText('Select Backup File')).toBeInTheDocument();
    });
  });

  describe('file selection', () => {
    it('calls previewImportAppState when selecting a file', async () => {
      vi.mocked(window.electronAPI.previewImportAppState).mockResolvedValue({
        success: true,
        filePath: '/test/path.carvd-backup',
        preview: {
          valid: true,
          errors: [],
          counts: { templates: 2, assemblies: 3, stocks: 5, colors: 4 },
          duplicates: { templates: [], assemblies: [], stocks: [] }
        }
      });

      render(<ImportAppStateModal isOpen={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('Select Backup File'));

      await waitFor(() => {
        expect(window.electronAPI.previewImportAppState).toHaveBeenCalled();
      });
    });

    it('shows error when file selection fails', async () => {
      vi.mocked(window.electronAPI.previewImportAppState).mockResolvedValue({
        success: false,
        error: 'Invalid file format'
      });

      render(<ImportAppStateModal isOpen={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('Select Backup File'));

      await waitFor(() => {
        expect(screen.getByText('Invalid file format')).toBeInTheDocument();
      });
    });

    it('shows options step after successful file selection', async () => {
      vi.mocked(window.electronAPI.previewImportAppState).mockResolvedValue({
        success: true,
        filePath: '/test/path.carvd-backup',
        preview: {
          valid: true,
          errors: [],
          counts: { templates: 2, assemblies: 3, stocks: 5, colors: 4 },
          duplicates: { templates: [], assemblies: [], stocks: [] }
        }
      });

      render(<ImportAppStateModal isOpen={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('Select Backup File'));

      await waitFor(() => {
        expect(screen.getByText('Backup Contents')).toBeInTheDocument();
      });
    });

    it('does nothing when selection is canceled', async () => {
      vi.mocked(window.electronAPI.previewImportAppState).mockResolvedValue({
        success: false,
        canceled: true
      });

      render(<ImportAppStateModal isOpen={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('Select Backup File'));

      await waitFor(() => {
        expect(screen.getByText('Select Backup File')).toBeInTheDocument();
      });
    });
  });

  describe('options step', () => {
    const setupOptionsStep = async () => {
      vi.mocked(window.electronAPI.previewImportAppState).mockResolvedValue({
        success: true,
        filePath: '/test/path.carvd-backup',
        preview: {
          valid: true,
          errors: [],
          counts: { templates: 2, assemblies: 3, stocks: 5, colors: 4 },
          duplicates: { templates: ['Existing Template'], assemblies: [], stocks: [] }
        }
      });

      render(<ImportAppStateModal isOpen={true} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Select Backup File'));

      await waitFor(() => {
        expect(screen.getByText('Backup Contents')).toBeInTheDocument();
      });
    };

    it('displays preview counts', async () => {
      await setupOptionsStep();

      expect(screen.getByText('2')).toBeInTheDocument(); // templates count
      expect(screen.getByText('3')).toBeInTheDocument(); // assemblies count
      expect(screen.getByText('5')).toBeInTheDocument(); // stocks count
      expect(screen.getByText('4')).toBeInTheDocument(); // colors count
    });

    it('shows duplicate warning when duplicates exist', async () => {
      await setupOptionsStep();

      expect(screen.getByText('1 existing')).toBeInTheDocument();
    });

    it('shows duplicate handling options when duplicates exist', async () => {
      await setupOptionsStep();

      expect(screen.getByText('Duplicate Handling')).toBeInTheDocument();
      expect(screen.getByText('Keep existing (recommended)')).toBeInTheDocument();
      expect(screen.getByText('Replace all')).toBeInTheDocument();
    });

    it('can toggle import options', async () => {
      await setupOptionsStep();

      const templatesCheckbox = screen.getByRole('checkbox', { name: /Templates/ });
      expect(templatesCheckbox).toBeChecked();

      fireEvent.click(templatesCheckbox);
      expect(templatesCheckbox).not.toBeChecked();
    });

    it('disables import button when nothing is selected', async () => {
      await setupOptionsStep();

      // Uncheck all options
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((checkbox) => {
        if ((checkbox as HTMLInputElement).checked) {
          fireEvent.click(checkbox);
        }
      });

      expect(screen.getByText('Import')).toBeDisabled();
    });

    it('allows going back to file selection', async () => {
      await setupOptionsStep();

      fireEvent.click(screen.getByText('Back'));

      expect(screen.getByText('Select Backup File')).toBeInTheDocument();
    });
  });

  describe('import', () => {
    const setupAndImport = async () => {
      vi.mocked(window.electronAPI.previewImportAppState).mockResolvedValue({
        success: true,
        filePath: '/test/path.carvd-backup',
        preview: {
          valid: true,
          errors: [],
          counts: { templates: 2, assemblies: 3, stocks: 5, colors: 4 },
          duplicates: { templates: [], assemblies: [], stocks: [] }
        }
      });

      vi.mocked(window.electronAPI.importAppState).mockResolvedValue({
        success: true,
        imported: { templates: 2, assemblies: 3, stocks: 5, colors: 4 },
        skipped: { templates: 0, assemblies: 0, stocks: 0 },
        errors: []
      });

      render(<ImportAppStateModal isOpen={true} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Select Backup File'));

      await waitFor(() => {
        expect(screen.getByText('Backup Contents')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Import'));
    };

    it('calls importAppState with correct options', async () => {
      await setupAndImport();

      await waitFor(() => {
        expect(window.electronAPI.importAppState).toHaveBeenCalledWith('/test/path.carvd-backup', {
          mergeStrategy: 'merge',
          includeTemplates: true,
          includeAssemblies: true,
          includeStocks: true,
          includeColors: true
        });
      });
    });

    it('shows result step after successful import', async () => {
      await setupAndImport();

      await waitFor(() => {
        expect(screen.getByText('Import Complete')).toBeInTheDocument();
      });
    });

    it('displays imported counts', async () => {
      await setupAndImport();

      await waitFor(() => {
        expect(screen.getByText('2 templates imported')).toBeInTheDocument();
        expect(screen.getByText('3 assemblies imported')).toBeInTheDocument();
        expect(screen.getByText('5 stock materials imported')).toBeInTheDocument();
        expect(screen.getByText('4 custom colors imported')).toBeInTheDocument();
      });
    });

    it('shows error when import fails', async () => {
      vi.mocked(window.electronAPI.previewImportAppState).mockResolvedValue({
        success: true,
        filePath: '/test/path.carvd-backup',
        preview: {
          valid: true,
          errors: [],
          counts: { templates: 2, assemblies: 0, stocks: 0, colors: 0 },
          duplicates: { templates: [], assemblies: [], stocks: [] }
        }
      });

      vi.mocked(window.electronAPI.importAppState).mockResolvedValue({
        success: false,
        imported: { templates: 0, assemblies: 0, stocks: 0, colors: 0 },
        skipped: { templates: 0, assemblies: 0, stocks: 0 },
        errors: ['Import failed']
      });

      render(<ImportAppStateModal isOpen={true} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Select Backup File'));

      await waitFor(() => {
        expect(screen.getByText('Backup Contents')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Import'));

      await waitFor(() => {
        expect(screen.getByText('Import failed')).toBeInTheDocument();
      });
    });
  });

  describe('result step', () => {
    it('shows toast and closes on Done click', async () => {
      vi.mocked(window.electronAPI.previewImportAppState).mockResolvedValue({
        success: true,
        filePath: '/test/path.carvd-backup',
        preview: {
          valid: true,
          errors: [],
          counts: { templates: 2, assemblies: 0, stocks: 0, colors: 0 },
          duplicates: { templates: [], assemblies: [], stocks: [] }
        }
      });

      vi.mocked(window.electronAPI.importAppState).mockResolvedValue({
        success: true,
        imported: { templates: 2, assemblies: 0, stocks: 0, colors: 0 },
        skipped: { templates: 0, assemblies: 0, stocks: 0 },
        errors: []
      });

      render(<ImportAppStateModal isOpen={true} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Select Backup File'));

      await waitFor(() => {
        expect(screen.getByText('Backup Contents')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Import'));

      await waitFor(() => {
        expect(screen.getByText('Import Complete')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Done'));

      expect(mockShowToast).toHaveBeenCalledWith('Successfully imported 2 items', 'success');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('shows skipped items in result', async () => {
      vi.mocked(window.electronAPI.previewImportAppState).mockResolvedValue({
        success: true,
        filePath: '/test/path.carvd-backup',
        preview: {
          valid: true,
          errors: [],
          counts: { templates: 5, assemblies: 0, stocks: 0, colors: 0 },
          duplicates: { templates: ['A', 'B'], assemblies: [], stocks: [] }
        }
      });

      vi.mocked(window.electronAPI.importAppState).mockResolvedValue({
        success: true,
        imported: { templates: 3, assemblies: 0, stocks: 0, colors: 0 },
        skipped: { templates: 2, assemblies: 0, stocks: 0 },
        errors: []
      });

      render(<ImportAppStateModal isOpen={true} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Select Backup File'));

      await waitFor(() => {
        expect(screen.getByText('Backup Contents')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Import'));

      await waitFor(() => {
        expect(screen.getByText('2 templates')).toBeInTheDocument();
      });
    });
  });

  describe('escape key handling', () => {
    it('closes modal on escape key', () => {
      render(<ImportAppStateModal isOpen={true} onClose={mockOnClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
