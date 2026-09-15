import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RouterToolDefinition } from '@renderer/types';
import { stringifyRouterToolFile } from '@renderer/utils/routerTools';
import { RouterToolsTab } from './RouterToolsTab';

const tool: RouterToolDefinition = {
  version: 1,
  id: 'tool-1',
  name: 'Shop Cove Bit',
  source: 'manufacturer',
  manufacturer: 'Acme',
  sku: 'AC-100',
  profileFamily: 'cove',
  cutterDiameter: 0.5,
  shankDiameter: 0.25,
  cuttingHeight: 0.375
};

const library = {
  tools: [tool] as RouterToolDefinition[],
  isLoading: false,
  addTool: vi.fn(),
  updateTool: vi.fn(),
  deleteTool: vi.fn()
};

vi.mock('@renderer/hooks/useRouterToolLibrary', () => ({
  useRouterToolLibrary: () => library
}));
vi.mock('@renderer/hooks/useRouterProfileLibrary', () => ({
  useRouterProfileLibrary: () => ({ profiles: [], isLoading: false })
}));

describe('RouterToolsTab', () => {
  beforeAll(() => {
    window.electronAPI = {
      showOpenDialog: vi.fn(),
      showSaveDialog: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      // Surfaces reached from this tab read their own preferences; give them
      // an empty library rather than undefined.
      getPreference: vi.fn().mockResolvedValue([]),
      setPreference: vi.fn()
    } as unknown as typeof window.electronAPI;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks also drops implementations, and surfaces reached from this
    // tab read their own preferences on mount.
    (window.electronAPI.getPreference as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    library.tools = [tool];
    library.isLoading = false;
  });

  it('lists a saved tool with its shank, cutter and linkage status', () => {
    render(<RouterToolsTab />);
    expect(screen.getByRole('heading', { name: 'Shop Cove Bit' })).toBeInTheDocument();
    expect(screen.getByText(/Acme AC-100/)).toBeInTheDocument();
    expect(screen.getByText('0.25″ / 0.5″')).toBeInTheDocument();
    // No certified profile link, so the card must say so rather than imply one.
    expect(screen.getByText(/Family-only match/)).toBeInTheDocument();
    expect(screen.getByText(/revision assigned on save/)).toBeInTheDocument();
  });

  it('shows the loading and empty states', () => {
    library.isLoading = true;
    const { rerender } = render(<RouterToolsTab />);
    expect(screen.getByText('Loading router tools…')).toBeInTheDocument();
    library.isLoading = false;
    library.tools = [];
    rerender(<RouterToolsTab />);
    expect(screen.getByText('No physical router tools saved')).toBeInTheDocument();
  });

  it('duplicates a tool under a new id and name', async () => {
    render(<RouterToolsTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    await waitFor(() => expect(library.addTool).toHaveBeenCalledTimes(1));
    const copy = library.addTool.mock.calls[0][0] as RouterToolDefinition;
    expect(copy.name).toBe('Shop Cove Bit Copy');
    expect(copy.id).not.toBe(tool.id);
    expect(copy.revision).toBeUndefined();
  });

  it('deletes a tool through its accessible control', () => {
    render(<RouterToolsTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Shop Cove Bit' }));
    expect(library.deleteTool).toHaveBeenCalledWith('tool-1');
  });

  it('exports a tool to a chosen file and skips a canceled dialog', async () => {
    const api = window.electronAPI as unknown as {
      showSaveDialog: ReturnType<typeof vi.fn>;
      writeFile: ReturnType<typeof vi.fn>;
    };
    api.showSaveDialog.mockResolvedValueOnce({ canceled: false, filePath: '/tmp/bit.carvd-tool' });
    render(<RouterToolsTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(api.writeFile).toHaveBeenCalledTimes(1));
    expect(api.writeFile.mock.calls[0][1]).toBe(stringifyRouterToolFile(tool));

    api.showSaveDialog.mockResolvedValueOnce({ canceled: true, filePath: undefined });
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(api.showSaveDialog).toHaveBeenCalledTimes(2));
    expect(api.writeFile).toHaveBeenCalledTimes(1);
  });

  it('imports a valid tool file as a new entry', async () => {
    const api = window.electronAPI as unknown as {
      showOpenDialog: ReturnType<typeof vi.fn>;
      readFile: ReturnType<typeof vi.fn>;
    };
    api.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: ['/tmp/bit.carvd-tool'] });
    api.readFile.mockResolvedValueOnce(stringifyRouterToolFile(tool));
    render(<RouterToolsTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Import Tool…' }));
    await waitFor(() => expect(library.addTool).toHaveBeenCalledTimes(1));
    const imported = library.addTool.mock.calls[0][0] as RouterToolDefinition;
    expect(imported.id).not.toBe(tool.id);
    expect(imported.name).toBe(tool.name);
  });

  it('reports a malformed import instead of adding it', async () => {
    const api = window.electronAPI as unknown as {
      showOpenDialog: ReturnType<typeof vi.fn>;
      readFile: ReturnType<typeof vi.fn>;
    };
    api.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: ['/tmp/broken.carvd-tool'] });
    api.readFile.mockResolvedValueOnce('{ not json');
    render(<RouterToolsTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Import Tool…' }));
    await waitFor(() => expect(screen.getByText(/broken\.carvd-tool/)).toBeInTheDocument());
    expect(library.addTool).not.toHaveBeenCalled();
  });

  it('does nothing when the import dialog is canceled', async () => {
    const api = window.electronAPI as unknown as { showOpenDialog: ReturnType<typeof vi.fn> };
    api.showOpenDialog.mockResolvedValueOnce({ canceled: true, filePaths: [] });
    render(<RouterToolsTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Import Tool…' }));
    await waitFor(() => expect(api.showOpenDialog).toHaveBeenCalledTimes(1));
    expect(library.addTool).not.toHaveBeenCalled();
  });

  it('opens the create, formats and catalog-export surfaces', async () => {
    render(<RouterToolsTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Create Router Tool…' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

    fireEvent.click(screen.getByRole('button', { name: /Formats & examples/ }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
