import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// Mock return types
interface ExportResult {
  success: boolean;
  canceled?: boolean;
  filePath?: string;
  error?: string;
  stocksIncluded?: number;
  count?: number;
}

interface ImportTemplateResult {
  success: boolean;
  canceled?: boolean;
  templateId?: string;
  error?: string;
}

interface ImportAssemblyResult {
  success: boolean;
  canceled?: boolean;
  assemblyId?: string;
  stocksImported?: number;
  error?: string;
}

interface ImportStocksResult {
  success: boolean;
  canceled?: boolean;
  imported?: number;
  skipped?: number;
  error?: string;
}

describe('Individual Export/Import APIs', () => {
  beforeAll(() => {
    window.electronAPI = {
      exportTemplate: vi.fn(),
      exportAssembly: vi.fn(),
      exportStocks: vi.fn(),
      importTemplate: vi.fn(),
      importAssembly: vi.fn(),
      importStocks: vi.fn(),
      // Add other required methods as stubs
      getPreference: vi.fn(),
      setPreference: vi.fn(),
      onMenuCommand: vi.fn(),
      openExternal: vi.fn()
    } as unknown as typeof window.electronAPI;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportTemplate', () => {
    it('calls export-template IPC handler with template ID', async () => {
      const mockResult: ExportResult = {
        success: true,
        filePath: '/test/path/template.carvd-template'
      };
      vi.mocked(window.electronAPI.exportTemplate).mockResolvedValue(mockResult);

      const result = await window.electronAPI.exportTemplate('template-123');

      expect(window.electronAPI.exportTemplate).toHaveBeenCalledWith('template-123');
      expect(result.success).toBe(true);
      expect(result.filePath).toBe('/test/path/template.carvd-template');
    });

    it('handles canceled export', async () => {
      const mockResult: ExportResult = {
        success: false,
        canceled: true
      };
      vi.mocked(window.electronAPI.exportTemplate).mockResolvedValue(mockResult);

      const result = await window.electronAPI.exportTemplate('template-123');

      expect(result.success).toBe(false);
      expect(result.canceled).toBe(true);
    });

    it('handles export error', async () => {
      const mockResult: ExportResult = {
        success: false,
        error: 'Template not found'
      };
      vi.mocked(window.electronAPI.exportTemplate).mockResolvedValue(mockResult);

      const result = await window.electronAPI.exportTemplate('invalid-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Template not found');
    });
  });

  describe('exportAssembly', () => {
    it('calls export-assembly IPC handler with assembly ID', async () => {
      const mockResult: ExportResult = {
        success: true,
        filePath: '/test/path/assembly.carvd-assembly',
        stocksIncluded: 3
      };
      vi.mocked(window.electronAPI.exportAssembly).mockResolvedValue(mockResult);

      const result = await window.electronAPI.exportAssembly('assembly-123');

      expect(window.electronAPI.exportAssembly).toHaveBeenCalledWith('assembly-123');
      expect(result.success).toBe(true);
      expect(result.stocksIncluded).toBe(3);
    });

    it('handles assembly without referenced stocks', async () => {
      const mockResult: ExportResult = {
        success: true,
        filePath: '/test/path/assembly.carvd-assembly',
        stocksIncluded: 0
      };
      vi.mocked(window.electronAPI.exportAssembly).mockResolvedValue(mockResult);

      const result = await window.electronAPI.exportAssembly('assembly-123');

      expect(result.success).toBe(true);
      expect(result.stocksIncluded).toBe(0);
    });
  });

  describe('exportStocks', () => {
    it('calls export-stocks IPC handler with stock IDs', async () => {
      const mockResult: ExportResult = {
        success: true,
        filePath: '/test/path/stocks.carvd-stocks',
        count: 2
      };
      vi.mocked(window.electronAPI.exportStocks).mockResolvedValue(mockResult);

      const result = await window.electronAPI.exportStocks(['stock-1', 'stock-2']);

      expect(window.electronAPI.exportStocks).toHaveBeenCalledWith(['stock-1', 'stock-2']);
      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
    });

    it('handles empty stock selection', async () => {
      const mockResult: ExportResult = {
        success: false,
        error: 'No stocks found'
      };
      vi.mocked(window.electronAPI.exportStocks).mockResolvedValue(mockResult);

      const result = await window.electronAPI.exportStocks([]);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No stocks found');
    });
  });

  describe('importTemplate', () => {
    it('calls import-template IPC handler', async () => {
      const mockResult: ImportTemplateResult = {
        success: true,
        templateId: 'imported-template-123'
      };
      vi.mocked(window.electronAPI.importTemplate).mockResolvedValue(mockResult);

      const result = await window.electronAPI.importTemplate();

      expect(window.electronAPI.importTemplate).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.templateId).toBe('imported-template-123');
    });

    it('handles duplicate template with replaceIfExists option', async () => {
      const mockResult: ImportTemplateResult = {
        success: true,
        templateId: 'existing-template-id'
      };
      vi.mocked(window.electronAPI.importTemplate).mockResolvedValue(mockResult);

      const result = await window.electronAPI.importTemplate({ replaceIfExists: true });

      expect(window.electronAPI.importTemplate).toHaveBeenCalledWith({ replaceIfExists: true });
      expect(result.success).toBe(true);
    });

    it('handles canceled import', async () => {
      const mockResult: ImportTemplateResult = {
        success: false,
        canceled: true
      };
      vi.mocked(window.electronAPI.importTemplate).mockResolvedValue(mockResult);

      const result = await window.electronAPI.importTemplate();

      expect(result.success).toBe(false);
      expect(result.canceled).toBe(true);
    });

    it('handles invalid file format', async () => {
      const mockResult: ImportTemplateResult = {
        success: false,
        error: 'Not a template file'
      };
      vi.mocked(window.electronAPI.importTemplate).mockResolvedValue(mockResult);

      const result = await window.electronAPI.importTemplate();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not a template file');
    });
  });

  describe('importAssembly', () => {
    it('calls import-assembly IPC handler with options', async () => {
      const mockResult: ImportAssemblyResult = {
        success: true,
        assemblyId: 'imported-assembly-123',
        stocksImported: 2
      };
      vi.mocked(window.electronAPI.importAssembly).mockResolvedValue(mockResult);

      const result = await window.electronAPI.importAssembly({ importStocks: true });

      expect(window.electronAPI.importAssembly).toHaveBeenCalledWith({ importStocks: true });
      expect(result.success).toBe(true);
      expect(result.stocksImported).toBe(2);
    });

    it('handles import without importing stocks', async () => {
      const mockResult: ImportAssemblyResult = {
        success: true,
        assemblyId: 'imported-assembly-123',
        stocksImported: 0
      };
      vi.mocked(window.electronAPI.importAssembly).mockResolvedValue(mockResult);

      const result = await window.electronAPI.importAssembly({ importStocks: false });

      expect(window.electronAPI.importAssembly).toHaveBeenCalledWith({ importStocks: false });
      expect(result.stocksImported).toBe(0);
    });
  });

  describe('importStocks', () => {
    it('calls import-stocks IPC handler', async () => {
      const mockResult: ImportStocksResult = {
        success: true,
        imported: 5,
        skipped: 2
      };
      vi.mocked(window.electronAPI.importStocks).mockResolvedValue(mockResult);

      const result = await window.electronAPI.importStocks();

      expect(window.electronAPI.importStocks).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.imported).toBe(5);
      expect(result.skipped).toBe(2);
    });

    it('handles replaceIfExists option', async () => {
      const mockResult: ImportStocksResult = {
        success: true,
        imported: 7,
        skipped: 0
      };
      vi.mocked(window.electronAPI.importStocks).mockResolvedValue(mockResult);

      const result = await window.electronAPI.importStocks({ replaceIfExists: true });

      expect(window.electronAPI.importStocks).toHaveBeenCalledWith({ replaceIfExists: true });
      expect(result.skipped).toBe(0);
    });
  });
});
