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
