import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DxfRouterProfileImportDialog } from './DxfRouterProfileImportDialog';

const addProfile = vi.fn();
vi.mock('@renderer/hooks/useRouterProfileLibrary', () => ({
  useRouterProfileLibrary: () => ({ profiles: [], isLoading: false, addProfile, deleteProfile: vi.fn() })
}));

const dxf = `0
SECTION
2
HEADER
9
$INSUNITS
70
1
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
10
0
20
0.5
11
1
21
0
0
ENDSEC
0
EOF
`;

const splineDxf = (weights = '') => `0
SECTION
2
ENTITIES
0
SPLINE
70
8
71
3
72
8
73
4
40
0
40
0
40
0
40
0
40
1
40
1
40
1
40
1
${weights}10
0
20
0.5
10
0.1
20
0.4
10
0.2
20
0.1
10
0.25
20
0
0
ENDSEC
0
EOF
`;

describe('DxfRouterProfileImportDialog', () => {
  beforeEach(() => {
    addProfile.mockReset().mockResolvedValue(undefined);
    window.electronAPI = {
      showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/tmp/shop-profile.dxf'] }),
      readFile: vi.fn().mockResolvedValue(dxf)
    } as unknown as typeof window.electronAPI;
  });

  it('parses, previews, orients, and applies a connected DXF contour once', async () => {
    const onApply = vi.fn();
    render(<DxfRouterProfileImportDialog open onOpenChange={vi.fn()} onApply={onApply} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose DXF File…' }));
    expect(await screen.findByRole('img', { name: 'Imported profile material-removal preview' })).toBeInTheDocument();
    expect(screen.getByText('Drawing units: inches')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mirror Horizontal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Once' }));
    await waitFor(() => expect(onApply).toHaveBeenCalled());
    expect(addProfile).not.toHaveBeenCalled();
    expect(onApply.mock.calls[0][0]).toMatchObject({
      name: 'shop-profile',
      parameters: { importedFrom: 'shop-profile.dxf', format: 'DXF' }
    });
  });

  it('saves and applies the same immutable definition', async () => {
    const onApply = vi.fn();
    render(<DxfRouterProfileImportDialog open onOpenChange={vi.fn()} onApply={onApply} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose DXF File…' }));
    await screen.findByRole('img', { name: 'Imported profile material-removal preview' });
    fireEvent.click(screen.getByRole('button', { name: 'Save & Apply' }));
    await waitFor(() => expect(addProfile).toHaveBeenCalled());
    expect(onApply).toHaveBeenCalledWith(addProfile.mock.calls[0][0]);
  });

  it('labels exact cubic spline fidelity before apply', async () => {
    (window.electronAPI.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(splineDxf());
    render(<DxfRouterProfileImportDialog open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose DXF File…' }));
    expect(await screen.findByText(/Exact cubic Bézier controls will be preserved/)).toBeInTheDocument();
  });

  it('warns when rational spline geometry was approximated', async () => {
    (window.electronAPI.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      splineDxf('41\n1\n41\n2\n41\n2\n41\n1\n')
    );
    render(<DxfRouterProfileImportDialog open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose DXF File…' }));
    expect(
      await screen.findByText(/Fidelity notice: rational or higher-degree SPLINE geometry was approximated/)
    ).toBeInTheDocument();
  });
});
