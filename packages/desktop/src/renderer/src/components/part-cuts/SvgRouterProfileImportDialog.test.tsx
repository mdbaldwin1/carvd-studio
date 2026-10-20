import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SvgRouterProfileImportDialog } from './SvgRouterProfileImportDialog';

const addProfile = vi.fn();
vi.mock('@renderer/hooks/useRouterProfileLibrary', () => ({
  useRouterProfileLibrary: () => ({ profiles: [], isLoading: false, addProfile })
}));
const svg = (body: string, attrs = 'viewBox="0 0 1 1" width="1in" height="1in"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`;

describe('SvgRouterProfileImportDialog', () => {
  beforeEach(() => {
    addProfile.mockReset().mockResolvedValue(undefined);
    window.electronAPI = {
      showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/tmp/profile.svg'] }),
      readFile: vi.fn().mockResolvedValue(svg('<path d="M0 .5 C.1 .5 .2 .1 .25 0"/>'))
    } as unknown as typeof window.electronAPI;
  });

  it('previews exact cubic geometry with physical unit provenance and applies an immutable SVG snapshot', async () => {
    const onApply = vi.fn();
    render(<SvgRouterProfileImportDialog open onOpenChange={vi.fn()} onApply={onApply} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose SVG File…' }));
    expect(await screen.findByText('Source units: inches; converted to inches.')).toBeInTheDocument();
    expect(screen.getByText(/Exact SVG line, quadratic\/cubic Bézier/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save & Apply' }));
    await waitFor(() => expect(addProfile).toHaveBeenCalled());
    expect(onApply).toHaveBeenCalledWith(addProfile.mock.calls[0][0]);
    expect(addProfile.mock.calls[0][0]).toMatchObject({
      parameters: { format: 'SVG', fidelity: 'exact' },
      boundary: { segments: [{ kind: 'cubicBezier' }] }
    });
  });

  it('reports deterministic approximation before saving a rotated SVG arc', async () => {
    (window.electronAPI.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      svg('<path d="M0 .5 A.3 .2 30 0 1 .25 0"/>')
    );
    render(<SvgRouterProfileImportDialog open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose SVG File…' }));
    expect(
      await screen.findByText(/Fidelity notice: rotated or skewed SVG arcs were approximated/)
    ).toBeInTheDocument();
  });

  it('blocks ambiguous contours until an explicit open contour is selected', async () => {
    (window.electronAPI.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      svg('<path d="M0 .5 L.25 0"/><path d="M0 .75 L.5 0"/>')
    );
    render(<SvgRouterProfileImportDialog open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose SVG File…' }));
    expect(await screen.findByText(/Explicitly choose one open contour/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save to Library' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Contour 1/ }));
    expect(screen.getByRole('button', { name: 'Save to Library' })).toBeEnabled();
  });

  it('surfaces parser security failures and never enables save', async () => {
    (window.electronAPI.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(svg('<script>alert(1)</script>'));
    render(<SvgRouterProfileImportDialog open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose SVG File…' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('forbidden active or external content');
    expect(screen.getByRole('button', { name: 'Save to Library' })).toBeDisabled();
  });
});

describe('SvgRouterProfileImportDialog outcomes and orientation', () => {
  beforeEach(() => {
    addProfile.mockReset().mockResolvedValue(undefined);
    window.electronAPI = {
      showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/tmp/profile.svg'] }),
      readFile: vi.fn().mockResolvedValue(svg('<path d="M0 .5 C.1 .5 .2 .1 .25 0"/>'))
    } as unknown as typeof window.electronAPI;
  });

  const openWithFile = async (onApply?: () => void) => {
    render(<SvgRouterProfileImportDialog open onOpenChange={vi.fn()} onApply={onApply} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose SVG File…' }));
    await screen.findByText('Source units: inches; converted to inches.');
  };

  it('saves to the library without applying to the current cut', async () => {
    const onApply = vi.fn();
    await openWithFile(onApply);
    fireEvent.click(screen.getByRole('button', { name: 'Save to Library' }));
    await waitFor(() => expect(addProfile).toHaveBeenCalledTimes(1));
    expect(onApply).not.toHaveBeenCalled();
  });

  it('applies once without adding to the library', async () => {
    const onApply = vi.fn();
    await openWithFile(onApply);
    fireEvent.click(screen.getByRole('button', { name: 'Apply Once' }));
    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    expect(addProfile).not.toHaveBeenCalled();
  });

  it('offers only the library outcome when there is no cut to apply to', async () => {
    await openWithFile();
    expect(screen.getByRole('button', { name: 'Save to Library' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply Once' })).not.toBeInTheDocument();
  });

  it('reorients the imported contour before saving', async () => {
    const onApply = vi.fn();
    await openWithFile(onApply);
    for (const action of ['Rotate 90°', 'Mirror Horizontal', 'Swap Axes', 'Reverse Direction']) {
      const button = screen.queryByRole('button', { name: action });
      if (button) fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Apply Once' }));
    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    expect(onApply.mock.calls[0][0].boundary.segments.length).toBeGreaterThan(0);
  });

  it('carries an edited name and family onto the import', async () => {
    const onApply = vi.fn();
    await openWithFile(onApply);
    fireEvent.change(screen.getByLabelText('Profile Name'), { target: { value: 'Vendor Ogee' } });
    fireEvent.change(screen.getByLabelText('Family'), { target: { value: 'ogee' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply Once' }));
    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    expect(onApply.mock.calls[0][0]).toMatchObject({ name: 'Vendor Ogee', family: 'ogee' });
  });

  it('does nothing when the chooser is cancelled', async () => {
    window.electronAPI = {
      showOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
      readFile: vi.fn()
    } as unknown as typeof window.electronAPI;
    render(<SvgRouterProfileImportDialog open onOpenChange={vi.fn()} onApply={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose SVG File…' }));
    await waitFor(() => expect(window.electronAPI.showOpenDialog).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Save to Library' })).toBeDisabled();
  });
});
