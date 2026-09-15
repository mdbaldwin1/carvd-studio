import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RouterCatalogImportDialog } from './RouterCatalogImportDialog';
import { stringifyRouterCatalogFile } from '@renderer/utils/routerCatalogs';
import { withRouterProfileRevision } from '@renderer/utils/routerProfiles';
import { EXAMPLE_CUBIC_PROFILE, EXAMPLE_DETAILED_TOOL } from './RouterInterchangeHelpDialog';

vi.mock('@renderer/hooks/useRouterProfileLibrary', () => ({ useRouterProfileLibrary: () => ({ profiles: [] }) }));
vi.mock('@renderer/hooks/useRouterToolLibrary', () => ({ useRouterToolLibrary: () => ({ tools: [] }) }));

describe('RouterCatalogImportDialog', () => {
  beforeEach(() => {
    const profile = withRouterProfileRevision(EXAMPLE_CUBIC_PROFILE);
    const tool = {
      ...EXAMPLE_DETAILED_TOOL,
      producedProfiles: [{ profileId: profile.id, profileRevision: profile.revision!, profileSnapshot: profile }]
    };
    const text = stringifyRouterCatalogFile({
      version: 1,
      id: 'catalog-1',
      name: 'Example Catalog',
      source: 'manufacturer',
      manufacturer: 'Example Manufacturer',
      profiles: [profile],
      tools: [tool]
    });
    window.electronAPI = {
      ...window.electronAPI,
      showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/tmp/example.carvd-router-catalog'] }),
      readFile: vi.fn().mockResolvedValue(text),
      getPreference: vi.fn().mockResolvedValue([]),
      setPreference: vi.fn(),
      transactRouterCatalogLibraries: vi.fn().mockResolvedValue({
        status: 'success',
        current: { profileLibraryHash: 'a'.repeat(64), toolLibraryHash: 'b'.repeat(64) }
      })
    } as typeof window.electronAPI;
  });

  it('shows metadata and performs one atomic transaction with cross-links intact', async () => {
    const onOpenChange = vi.fn();
    render(<RouterCatalogImportDialog open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose .carvd-router-catalog…' }));
    expect(await screen.findByRole('region', { name: 'Catalog metadata' })).toHaveTextContent('Example Manufacturer');
    expect(screen.getByRole('region', { name: 'Catalog metadata' })).toHaveTextContent('1 certified links');
    expect(screen.getByRole('region', { name: 'add records' })).toHaveTextContent('profile: example-cubic-profile');
    const install = screen.getByRole('button', { name: /Import Catalog Atomically/ });
    fireEvent.click(screen.getByRole('checkbox', { name: /catalog is unsigned/i }));
    await waitFor(() => expect(install).toBeEnabled());
    fireEvent.click(install);
    await waitFor(() => expect(window.electronAPI.transactRouterCatalogLibraries).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(window.electronAPI.transactRouterCatalogLibraries!).mock.calls[0][0];
    expect(
      (payload.toolLibrary[0] as { producedProfiles: Array<{ profileId: string }> }).producedProfiles[0].profileId
    ).toBe('example-cubic-profile');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(window.electronAPI.setPreference).not.toHaveBeenCalled();
  });

  it('reports dangling catalog links and cancel remains a no-op', async () => {
    vi.mocked(window.electronAPI.readFile).mockResolvedValue(
      JSON.stringify({
        format: 'carvd-router-catalog',
        version: 1,
        catalog: {
          version: 1,
          id: 'bad',
          name: 'Bad',
          source: 'generic',
          profiles: [],
          tools: [
            {
              ...EXAMPLE_DETAILED_TOOL,
              producedProfiles: [{ profileId: 'missing', profileRevision: 'x', profileSnapshot: EXAMPLE_CUBIC_PROFILE }]
            }
          ]
        }
      })
    );
    const onOpenChange = vi.fn();
    render(<RouterCatalogImportDialog open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose .carvd-router-catalog…' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('dangling profile reference');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(window.electronAPI.setPreference).not.toHaveBeenCalled();
  });

  it('keeps both libraries unchanged on atomic persistence failure', async () => {
    vi.mocked(window.electronAPI.transactRouterCatalogLibraries!).mockResolvedValue({
      status: 'failure',
      reason: 'persistence_failed'
    });
    render(<RouterCatalogImportDialog open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose .carvd-router-catalog…' }));
    const install = await screen.findByRole('button', { name: 'Import Catalog Atomically' });
    fireEvent.click(screen.getByRole('checkbox', { name: /catalog is unsigned/i }));
    await waitFor(() => expect(install).toBeEnabled());
    fireEvent.click(install);
    expect(await screen.findByRole('alert')).toHaveTextContent('Both libraries remain unchanged');
    expect(window.electronAPI.setPreference).not.toHaveBeenCalled();
  });

  it('refreshes and replans after an optimistic concurrency conflict', async () => {
    vi.mocked(window.electronAPI.transactRouterCatalogLibraries!).mockResolvedValue({
      status: 'conflict',
      current: { profileLibraryHash: 'c'.repeat(64), toolLibraryHash: 'd'.repeat(64) }
    });
    render(<RouterCatalogImportDialog open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose .carvd-router-catalog…' }));
    const install = await screen.findByRole('button', { name: 'Import Catalog Atomically' });
    fireEvent.click(screen.getByRole('checkbox', { name: /catalog is unsigned/i }));
    await waitFor(() => expect(install).toBeEnabled());
    fireEvent.click(install);
    expect(await screen.findByRole('alert')).toHaveTextContent('libraries changed after review');
    expect(window.electronAPI.getPreference).toHaveBeenCalledTimes(4);
  });

  it('requires explicit acknowledgement for an unsigned catalog', async () => {
    render(<RouterCatalogImportDialog open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose .carvd-router-catalog…' }));
    expect(await screen.findByRole('status', { name: 'Catalog signature' })).toHaveTextContent('Unsigned');
    const install = screen.getByRole('button', { name: 'Import Catalog Atomically' });
    expect(install).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /catalog is unsigned/i }));
    await waitFor(() => expect(install).toBeEnabled());
  });
});
