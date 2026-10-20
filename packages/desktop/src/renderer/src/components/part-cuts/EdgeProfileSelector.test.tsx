import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EdgeProfileSelector } from './EdgeProfileSelector';

const profile = {
  version: 1 as const,
  id: 'custom-1',
  name: 'Imported Ogee',
  family: 'Decorative',
  source: 'generic' as const,
  parameters: {},
  boundary: { start: { u: 0, v: 0 }, segments: [{ kind: 'line' as const, to: { u: 0.5, v: 0.25 } }] }
};
vi.mock('@renderer/hooks/useRouterProfileLibrary', () => ({
  useRouterProfileLibrary: () => ({ profiles: [profile], isLoading: false, addProfile: vi.fn() })
}));
vi.mock('./DxfRouterProfileImportDialog', () => ({ DxfRouterProfileImportDialog: () => null }));
vi.mock('./SvgRouterProfileImportDialog', () => ({ SvgRouterProfileImportDialog: () => null }));

describe('EdgeProfileSelector custom profiles', () => {
  it('previews and selects a library profile with its definition', () => {
    const onSelect = vi.fn();
    render(<EdgeProfileSelector value="roundover" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose edge profile' }));
    expect(screen.getByRole('img', { name: 'Imported Ogee profile preview' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Select Imported Ogee custom edge profile' }));
    expect(onSelect).toHaveBeenCalledWith('custom', profile);
  });

  it('offers safe SVG profile import from the selector', () => {
    render(<EdgeProfileSelector value="roundover" onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose edge profile' }));
    expect(screen.getByRole('button', { name: 'Import SVG Profile…' })).toBeInTheDocument();
  });
});

describe('EdgeProfileSelector built-ins and import entry points', () => {
  const openPicker = (onSelect = vi.fn()) => {
    render(<EdgeProfileSelector value="roundover" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose edge profile' }));
    return onSelect;
  };

  it('marks the profile currently in use', () => {
    openPicker();
    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('selects a built-in profile without a custom definition', () => {
    const onSelect = openPicker();
    fireEvent.click(screen.getByRole('button', { name: /Select Cove edge profile/i }));
    expect(onSelect).toHaveBeenCalledWith('cove');
  });

  it('opens the numeric editor for a brand new profile', () => {
    openPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Create Custom Profile…' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('offers every import route from the picker', () => {
    openPicker();
    for (const label of ['Import Profile…', 'Import DXF Profile…', 'Import SVG Profile…']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('reads a chosen .carvd-profile through the file bridge', async () => {
    window.electronAPI = {
      ...window.electronAPI,
      showOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
      readFile: vi.fn()
    } as typeof window.electronAPI;
    openPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Import Profile…' }));
    await waitFor(() => expect(window.electronAPI.showOpenDialog).toHaveBeenCalled());
    // A cancelled chooser must not attempt to read anything.
    expect(window.electronAPI.readFile).not.toHaveBeenCalled();
  });
});
