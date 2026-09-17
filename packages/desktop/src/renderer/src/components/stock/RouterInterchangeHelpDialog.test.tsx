import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseRouterProfileFile, stringifyRouterProfileFile } from '@renderer/utils/routerProfiles';
import { parseRouterToolFile, stringifyRouterToolFile } from '@renderer/utils/routerTools';
import {
  describeRouterImportError,
  EXAMPLE_CUBIC_PROFILE,
  EXAMPLE_DETAILED_TOOL,
  RouterInterchangeHelpDialog
} from './RouterInterchangeHelpDialog';

describe('router interchange help', () => {
  beforeEach(() => {
    window.electronAPI = {
      ...window.electronAPI,
      showSaveDialog: vi.fn().mockResolvedValue({ canceled: false, filePath: '/tmp/example.carvd-profile' }),
      writeFile: vi.fn().mockResolvedValue(undefined)
    } as typeof window.electronAPI;
  });

  it('documents supported formats, fidelity, security, coordinates, and snapshots', () => {
    render(<RouterInterchangeHelpDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByRole('heading', { name: '.carvd-profile — version 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '.carvd-tool — version 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'DXF' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'SVG' })).toBeInTheDocument();
    expect(screen.getByText(/scripts, event handlers, external references/i)).toBeInTheDocument();
    expect(screen.getByText(/library revisions never update cuts automatically/i)).toBeInTheDocument();
  });

  it('saves examples through production serializers and both re-import losslessly', async () => {
    expect(parseRouterProfileFile(stringifyRouterProfileFile(EXAMPLE_CUBIC_PROFILE))).toEqual(EXAMPLE_CUBIC_PROFILE);
    expect(parseRouterToolFile(stringifyRouterToolFile(EXAMPLE_DETAILED_TOOL))).toMatchObject(EXAMPLE_DETAILED_TOOL);
    render(<RouterInterchangeHelpDialog open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save cubic profile example…' }));
    await waitFor(() =>
      expect(window.electronAPI.writeFile).toHaveBeenCalledWith(
        '/tmp/example.carvd-profile',
        stringifyRouterProfileFile(EXAMPLE_CUBIC_PROFILE)
      )
    );
  });

  it.each([
    ['version', new Error('Router tool file version 9 is not supported.'), 'Version mismatch'],
    ['unknown field', new Error('This is not a Carvd router tool file.'), 'Format error'],
    ['section semantics', new Error('tool.sections[2].end is invalid'), 'Schema or semantic error'],
    ['unsafe SVG', new Error('SVG scripts and external references are unsafe'), 'Security restriction'],
    ['malformed DXF', new Error('Invalid DXF group code at line 7'), 'Format error']
  ])('classifies %s without dumping source content', (_case, error, category) => {
    const diagnostic = describeRouterImportError(error, 'shop-file.dat');
    expect(diagnostic.category).toBe(category);
    expect(diagnostic.message).toContain('shop-file.dat');
    expect(diagnostic.action.length).toBeGreaterThan(10);
  });

  it('restores focus to the opener when closed', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open help</button>
          <RouterInterchangeHelpDialog open={open} onOpenChange={setOpen} />
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open help' });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(opener).toHaveFocus());
  });
});

describe('trusted publisher management', () => {
  const publisher = {
    version: 1 as const,
    keyId: 'acme-2026',
    displayName: 'Acme Tooling',
    publicKeySpki: 'MCowBQYDK2VwAyEAhIr8GzpyWEjSVqHQWcCoY71xr7ufM6h2OdLORXVq8dE=',
    fingerprint: 'ead7b7fca9a8db5ed12024cbe819e2856cbcb45235b35a5d605d54ab530e14e0',
    source: 'imported catalog',
    addedAt: '2026-09-15T00:00:00Z'
  };

  const setup = (stored: unknown = [publisher]) => {
    const setPreference = vi.fn().mockResolvedValue(undefined);
    window.electronAPI = {
      ...window.electronAPI,
      getPreference: vi.fn().mockResolvedValue(stored),
      setPreference
    } as typeof window.electronAPI;
    render(<RouterInterchangeHelpDialog open onOpenChange={vi.fn()} />);
    return setPreference;
  };

  it('says plainly when no publisher is trusted', async () => {
    setup([]);
    expect(await screen.findByText('No publisher keys trusted.')).toBeInTheDocument();
  });

  it('shows a trusted publisher with its fingerprint grouped for reading', async () => {
    setup();
    expect(await screen.findByText('Acme Tooling')).toBeInTheDocument();
    expect(screen.getByText(/Key ID: acme-2026/)).toBeInTheDocument();
    // Grouped in fours so a person can actually check it against a published one.
    expect(screen.getByText(/ead7 b7fc a9a8/)).toBeInTheDocument();
    expect(screen.getByText(/imported catalog/)).toBeInTheDocument();
  });

  it('renames a publisher and stores only the public key', async () => {
    const setPreference = setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Rename' }));
    fireEvent.change(screen.getByLabelText('Publisher name'), { target: { value: 'Acme Router Bits' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    await waitFor(() => expect(setPreference).toHaveBeenCalledTimes(1));
    const [key, value] = setPreference.mock.calls[0];
    expect(key).toBe('trustedRouterPublishers');
    const saved = (value as (typeof publisher)[])[0];
    expect(saved.displayName).toBe('Acme Router Bits');
    expect(saved.publicKeySpki).toBe(publisher.publicKeySpki);
    expect(saved).not.toHaveProperty('privateKey');
  });

  it('refuses to save an empty publisher name', async () => {
    const setPreference = setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Rename' }));
    fireEvent.change(screen.getByLabelText('Publisher name'), { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Save name' })).toBeDisabled();
    expect(setPreference).not.toHaveBeenCalled();
  });

  it('abandons a rename without saving', async () => {
    const setPreference = setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Rename' }));
    fireEvent.change(screen.getByLabelText('Publisher name'), { target: { value: 'Discarded' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();
    expect(setPreference).not.toHaveBeenCalled();
  });

  it('warns what removing trust means and only removes on confirmation', async () => {
    const setPreference = setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Remove trust…' }));
    expect(screen.getByRole('alert')).toHaveTextContent('return to untrusted status');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(setPreference).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Remove trust…' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm removal' }));
    await waitFor(() => expect(setPreference).toHaveBeenCalledTimes(1));
    expect(setPreference.mock.calls[0][1]).toEqual([]);
  });

  it('reports a failed example save instead of claiming success', async () => {
    window.electronAPI = {
      ...window.electronAPI,
      getPreference: vi.fn().mockResolvedValue([]),
      showSaveDialog: vi.fn().mockResolvedValue({ canceled: false, filePath: '/tmp/x.carvd-profile' }),
      writeFile: vi.fn().mockRejectedValue(new Error('Disk is read-only'))
    } as typeof window.electronAPI;
    render(<RouterInterchangeHelpDialog open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Save .*example/i })[0]);
    expect(await screen.findByText('Disk is read-only')).toBeInTheDocument();
  });
});
