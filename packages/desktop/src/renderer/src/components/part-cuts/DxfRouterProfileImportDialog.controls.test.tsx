import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DxfRouterProfileImportDialog } from './DxfRouterProfileImportDialog';

const addProfile = vi.fn();
vi.mock('@renderer/hooks/useRouterProfileLibrary', () => ({
  useRouterProfileLibrary: () => ({ profiles: [], isLoading: false, addProfile, deleteProfile: vi.fn() })
}));

const entities = (body: string) => `0\nSECTION\n2\nENTITIES\n${body}0\nENDSEC\n0\nEOF\n`;
const inches = (body: string) => `0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n1\n0\nENDSEC\n` + entities(body);

const oneLine = '0\nLINE\n10\n0\n20\n0.5\n11\n1\n21\n0\n';
const dxf = inches(oneLine);

// Two LINEs that never touch, so the parser reports two separate contours and
// the operator has to say which one is the profile. Both are valid edge
// profiles, so picking either one leaves Apply enabled.
const twoContourDxf = inches(oneLine + '0\nLINE\n10\n0\n20\n0.75\n11\n0.75\n21\n0\n');

// The same single line with no $INSUNITS header, so the units are undeclared.
const unitlessDxf = entities(oneLine);

describe('DXF import scaling, contour choice, and dialog exits', () => {
  const setup = async (source = dxf, onOpenChange = vi.fn()) => {
    const onApply = vi.fn();
    addProfile.mockReset().mockResolvedValue(undefined);
    window.electronAPI = {
      showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/tmp/shop-profile.dxf'] }),
      readFile: vi.fn().mockResolvedValue(source)
    } as unknown as typeof window.electronAPI;
    render(<DxfRouterProfileImportDialog open onOpenChange={onOpenChange} onApply={onApply} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose DXF File…' }));
    await screen.findByRole('img', { name: 'Imported profile material-removal preview' });
    return { onApply, onOpenChange };
  };

  it('rescales the contour so its width matches a measured distance', async () => {
    const { onApply } = await setup();
    fireEvent.change(screen.getByLabelText('Known contour width (inches)'), { target: { value: '0.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set Scale' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Once' }));
    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    // The drawing's contour is 1 unit wide, so a measured 0.5" halves every coordinate.
    const { start, segments } = onApply.mock.calls[0][0].boundary;
    expect(start).toMatchObject({ u: 0, v: 0.25 });
    expect(segments[0].to.u).toBeCloseTo(0.5);
  });

  it('leaves the scale alone when the measured width is not a positive number', async () => {
    const { onApply } = await setup();
    fireEvent.change(screen.getByLabelText('Known contour width (inches)'), { target: { value: 'not a number' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set Scale' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Once' }));
    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    expect(onApply.mock.calls[0][0].boundary.segments[0].to.u).toBeCloseTo(1);
  });

  it('imports whichever disconnected contour the operator selects', async () => {
    const { onApply } = await setup(twoContourDxf);
    expect(screen.getAllByRole('button', { name: /^Contour \d/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: /^Contour 2/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Once' }));
    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    // The second line starts at (0, 0.75) — picking it swapped the previewed geometry.
    expect(onApply.mock.calls[0][0].boundary.start).toMatchObject({ u: 0, v: 0.75 });
  });

  it('asks for units the drawing never declared and converts by the chosen one', async () => {
    const { onApply } = await setup(unitlessDxf);
    expect(screen.getByText(/does not declare units/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Drawing Units'), { target: { value: 'millimeters' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply Once' }));
    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    expect(onApply.mock.calls[0][0].boundary.segments[0].to.u).toBeCloseTo(1 / 25.4);
  });

  it('records the manufacturer and SKU and marks the profile as vendor-sourced', async () => {
    const { onApply } = await setup();
    fireEvent.change(screen.getByLabelText('Manufacturer (optional)'), { target: { value: 'Whiteside' } });
    fireEvent.change(screen.getByLabelText('SKU (optional)'), { target: { value: '2102' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply Once' }));
    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    expect(onApply.mock.calls[0][0]).toMatchObject({
      source: 'manufacturer',
      manufacturer: 'Whiteside',
      sku: '2102'
    });
  });

  it('saves to the library without applying the profile to the cut', async () => {
    const { onApply, onOpenChange } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Save to Library' }));
    await waitFor(() => expect(addProfile).toHaveBeenCalledTimes(1));
    expect(onApply).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes from cancel, the header close button, and Escape', async () => {
    const onOpenChange = vi.fn();
    await setup(dxf, onOpenChange);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    // Escape reaches the dialog twice (the overlay's own handler and the
    // content's onClose), so only the count floor and the argument matter.
    expect(onOpenChange.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(onOpenChange.mock.calls.every(([next]) => next === false)).toBe(true);
  });
});
