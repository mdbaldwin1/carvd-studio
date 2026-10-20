import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RouterProfileDefinition, RouterToolDefinition } from '@renderer/types';
import { getRouterProfileRevision, withRouterProfileRevision } from '@renderer/utils/routerProfiles';
import { parseRouterCatalogFile } from '@renderer/utils/routerCatalogs';
import { RouterCatalogExportDialog } from './RouterCatalogExportDialog';

const profile: RouterProfileDefinition = withRouterProfileRevision({
  version: 1,
  id: 'cove',
  name: 'Shop Cove',
  family: 'cove',
  source: 'generic',
  parameters: {},
  boundary: { start: { u: 0, v: 0.25 }, segments: [{ kind: 'line', to: { u: 0.25, v: 0 } }] }
});
const tool: RouterToolDefinition = {
  version: 1,
  id: 'tool',
  name: 'Cove Tool',
  source: 'manufacturer',
  manufacturer: 'Acme',
  sku: '1',
  profileFamily: 'cove',
  cutterDiameter: 0.5,
  shankDiameter: 0.25,
  cuttingHeight: 0.25,
  producedProfiles: [
    { profileId: profile.id, profileRevision: getRouterProfileRevision(profile), profileSnapshot: profile }
  ]
};

describe('RouterCatalogExportDialog', () => {
  beforeEach(() => {
    window.electronAPI = {
      ...window.electronAPI,
      showSaveDialog: vi.fn().mockResolvedValue({ canceled: false, filePath: '/tmp/backup.carvd-router-catalog' }),
      writeFile: vi.fn().mockResolvedValue(undefined)
    } as typeof window.electronAPI;
  });

  it('marks selected-tool dependencies, filters accessibly, and saves a re-importable bundle', async () => {
    render(
      <RouterCatalogExportDialog open onOpenChange={vi.fn()} profiles={[profile]} tools={[tool]} initialScope="tools" />
    );
    expect(screen.getByText(/Required by selected tool/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Shop Cove/ })).toBeDisabled();
    expect(screen.getByRole('region', { name: 'Export scope summary' })).toHaveTextContent(
      '1 profiles (1 automatic dependencies) · 1 tools'
    );
    fireEvent.change(screen.getByLabelText('Search catalog records'), { target: { value: 'Acme' } });
    expect(screen.getByText('Cove Tool')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save Catalog…' }));
    await waitFor(() => expect(window.electronAPI.writeFile).toHaveBeenCalled());
    const text = vi.mocked(window.electronAPI.writeFile).mock.calls[0][1];
    expect(parseRouterCatalogFile(text).tools[0].producedProfiles?.[0].profileId).toBe('cove');
  });

  it('backs up all records and cancel never writes', () => {
    render(
      <RouterCatalogExportDialog
        open
        onOpenChange={vi.fn()}
        profiles={[profile]}
        tools={[tool]}
        initialScope="profiles"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Back up all router data…' }));
    expect(screen.getByRole('region', { name: 'Export scope summary' })).toHaveTextContent('1 profiles');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(window.electronAPI.writeFile).not.toHaveBeenCalled();
  });

  it('keeps the wizard open with a bounded save error', async () => {
    vi.mocked(window.electronAPI.writeFile).mockRejectedValue(new Error('disk unavailable'));
    render(<RouterCatalogExportDialog open onOpenChange={vi.fn()} profiles={[profile]} tools={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save Catalog…' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed: disk unavailable');
  });
});

describe('RouterCatalogExportDialog metadata and filters', () => {
  beforeEach(() => {
    window.electronAPI = {
      ...window.electronAPI,
      showSaveDialog: vi.fn().mockResolvedValue({ canceled: false, filePath: '/tmp/out.carvd-router-catalog' }),
      writeFile: vi.fn().mockResolvedValue(undefined)
    } as typeof window.electronAPI;
  });

  const open = () =>
    render(
      <RouterCatalogExportDialog open onOpenChange={vi.fn()} profiles={[profile]} tools={[tool]} initialScope="tools" />
    );

  it('writes the catalog under an edited name and id', async () => {
    open();
    fireEvent.change(screen.getByLabelText('Catalog Name'), { target: { value: 'Acme Spring Set' } });
    fireEvent.change(screen.getByLabelText('Catalog ID'), { target: { value: 'acme-spring' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Catalog…' }));
    await waitFor(() => expect(window.electronAPI.writeFile).toHaveBeenCalled());
    const written = parseRouterCatalogFile(vi.mocked(window.electronAPI.writeFile).mock.calls[0][1]);
    expect(written.name).toBe('Acme Spring Set');
    expect(written.id).toBe('acme-spring');
  });

  it('records a manufacturer only for a manufacturer catalog', async () => {
    open();
    // The manufacturer field is meaningless for a shop-made bundle, so it only
    // appears once the catalog claims a manufacturer source.
    expect(screen.queryByLabelText('Manufacturer')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Source'), { target: { value: 'manufacturer' } });
    fireEvent.change(screen.getByLabelText('Manufacturer'), { target: { value: 'Acme Tooling' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Catalog…' }));
    await waitFor(() => expect(window.electronAPI.writeFile).toHaveBeenCalled());
    const written = parseRouterCatalogFile(vi.mocked(window.electronAPI.writeFile).mock.calls[0][1]);
    expect(written.source).toBe('manufacturer');
    expect(written.manufacturer).toBe('Acme Tooling');
  });

  it('narrows the listing by family and by manufacturer', () => {
    open();
    fireEvent.change(screen.getByLabelText('Filter export by family'), { target: { value: 'cove' } });
    expect(screen.getByText('Shop Cove')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filter export by family'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Filter export by manufacturer'), { target: { value: 'Acme' } });
    expect(screen.getByText('Cove Tool')).toBeInTheDocument();
  });

  it('lets a profile be removed from the selection when nothing depends on it', async () => {
    render(
      <RouterCatalogExportDialog open onOpenChange={vi.fn()} profiles={[profile]} tools={[]} initialScope="profiles" />
    );
    const checkbox = screen.getByRole('checkbox', { name: /Shop Cove/ });
    expect(checkbox).not.toBeDisabled();
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });
});
