import { fireEvent, render, screen } from '@testing-library/react';
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
