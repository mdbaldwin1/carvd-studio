import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RouterProfileDefinition } from '@renderer/types';
import { stringifyRouterProfileFile, withRouterProfileRevision } from '@renderer/utils/routerProfiles';
import { RouterProfilesTab } from './RouterProfilesTab';

const cove: RouterProfileDefinition = withRouterProfileRevision({
  version: 1,
  id: 'cove-1',
  name: 'Shop Cove',
  family: 'cove',
  source: 'generic',
  manufacturer: 'Acme',
  sku: 'AC-9',
  parameters: {},
  boundary: { start: { u: 0, v: 0.25 }, segments: [{ kind: 'line', to: { u: 0.25, v: 0 } }] }
});
const bead: RouterProfileDefinition = withRouterProfileRevision({
  version: 1,
  id: 'bead-1',
  name: 'Shop Bead',
  family: 'bead',
  source: 'generic',
  parameters: {},
  boundary: { start: { u: 0, v: 0.5 }, segments: [{ kind: 'line', to: { u: 0.5, v: 0 } }] }
});

const library = {
  profiles: [cove, bead] as RouterProfileDefinition[],
  isLoading: false,
  addProfile: vi.fn(),
  updateProfile: vi.fn(),
  deleteProfile: vi.fn()
};

vi.mock('@renderer/hooks/useRouterProfileLibrary', () => ({
  useRouterProfileLibrary: () => library
}));
vi.mock('@renderer/hooks/useRouterToolLibrary', () => ({
  useRouterToolLibrary: () => ({ tools: [], isLoading: false })
}));

describe('RouterProfilesTab', () => {
  beforeAll(() => {
    window.electronAPI = {
      showOpenDialog: vi.fn(),
      showSaveDialog: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      getPreference: vi.fn(),
      setPreference: vi.fn()
    } as unknown as typeof window.electronAPI;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks drops implementations; nested surfaces read preferences.
    (window.electronAPI.getPreference as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    library.profiles = [cove, bead];
    library.isLoading = false;
  });

  it('lists saved profiles with provenance and revision', () => {
    render(<RouterProfilesTab />);
    expect(screen.getByRole('heading', { name: 'Shop Cove' })).toBeInTheDocument();
    expect(screen.getByText(/cove · Acme · AC-9/)).toBeInTheDocument();
    expect(screen.getAllByText(/Format v1/).length).toBeGreaterThan(0);
  });

  it('filters by search text and by family', () => {
    render(<RouterProfilesTab />);
    fireEvent.change(screen.getByLabelText('Search router profiles'), { target: { value: 'bead' } });
    expect(screen.queryByRole('heading', { name: 'Shop Cove' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Shop Bead' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search router profiles'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Filter router profiles by family'), { target: { value: 'cove' } });
    expect(screen.getByRole('heading', { name: 'Shop Cove' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Shop Bead' })).not.toBeInTheDocument();
  });

  it('reports the loading and empty states', () => {
    library.isLoading = true;
    const { rerender } = render(<RouterProfilesTab />);
    expect(screen.getByText('Loading router profiles…')).toBeInTheDocument();
    library.isLoading = false;
    library.profiles = [];
    rerender(<RouterProfilesTab />);
    expect(screen.getByText('No custom router profiles found')).toBeInTheDocument();
  });

  it('duplicates a profile under a new id and name', async () => {
    render(<RouterProfilesTab />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Duplicate' })[0]);
    await waitFor(() => expect(library.addProfile).toHaveBeenCalledTimes(1));
    const copy = library.addProfile.mock.calls[0][0] as RouterProfileDefinition;
    expect(copy.name).toBe('Shop Cove Copy');
    expect(copy.id).not.toBe(cove.id);
  });

  it('deletes a profile through its accessible control', () => {
    render(<RouterProfilesTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Shop Cove' }));
    expect(library.deleteProfile).toHaveBeenCalledWith('cove-1');
  });

  it('exports a profile and skips a canceled dialog', async () => {
    const api = window.electronAPI as unknown as {
      showSaveDialog: ReturnType<typeof vi.fn>;
      writeFile: ReturnType<typeof vi.fn>;
    };
    api.showSaveDialog.mockResolvedValueOnce({ canceled: false, filePath: '/tmp/cove.carvd-profile' });
    render(<RouterProfilesTab />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Export' })[0]);
    await waitFor(() => expect(api.writeFile).toHaveBeenCalledTimes(1));
    expect(api.writeFile.mock.calls[0][1]).toBe(stringifyRouterProfileFile(cove));

    api.showSaveDialog.mockResolvedValueOnce({ canceled: true, filePath: undefined });
    fireEvent.click(screen.getAllByRole('button', { name: 'Export' })[0]);
    await waitFor(() => expect(api.showSaveDialog).toHaveBeenCalledTimes(2));
    expect(api.writeFile).toHaveBeenCalledTimes(1);
  });

  it('imports a valid profile file under a fresh id', async () => {
    const api = window.electronAPI as unknown as {
      showOpenDialog: ReturnType<typeof vi.fn>;
      readFile: ReturnType<typeof vi.fn>;
    };
    api.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: ['/tmp/cove.carvd-profile'] });
    api.readFile.mockResolvedValueOnce(stringifyRouterProfileFile(cove));
    render(<RouterProfilesTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Import Profile…' }));
    await waitFor(() => expect(library.addProfile).toHaveBeenCalledTimes(1));
    expect((library.addProfile.mock.calls[0][0] as RouterProfileDefinition).id).not.toBe(cove.id);
  });

  it('reports a malformed import instead of adding it', async () => {
    const api = window.electronAPI as unknown as {
      showOpenDialog: ReturnType<typeof vi.fn>;
      readFile: ReturnType<typeof vi.fn>;
    };
    api.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: ['/tmp/bad.carvd-profile'] });
    api.readFile.mockResolvedValueOnce('{ not json');
    render(<RouterProfilesTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Import Profile…' }));
    await waitFor(() => expect(screen.getByText(/bad\.carvd-profile/)).toBeInTheDocument());
    expect(library.addProfile).not.toHaveBeenCalled();
  });

  it('does nothing when the import dialog is canceled', async () => {
    const api = window.electronAPI as unknown as { showOpenDialog: ReturnType<typeof vi.fn> };
    api.showOpenDialog.mockResolvedValueOnce({ canceled: true, filePaths: [] });
    render(<RouterProfilesTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Import Profile…' }));
    await waitFor(() => expect(api.showOpenDialog).toHaveBeenCalledTimes(1));
    expect(library.addProfile).not.toHaveBeenCalled();
  });

  it('opens a built-in profile as an editable custom copy', async () => {
    render(<RouterProfilesTab />);
    const builtIn = screen.getAllByRole('button', { name: /^Duplicate .+/ })[0];
    fireEvent.click(builtIn);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
