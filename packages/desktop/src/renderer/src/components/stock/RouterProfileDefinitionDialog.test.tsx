import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RouterProfileDefinitionDialog } from './RouterProfileDefinitionDialog';

describe('RouterProfileDefinitionDialog', () => {
  it('starts with a useful face-to-face removal boundary', () => {
    render(<RouterProfileDefinitionDialog open onOpenChange={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByRole('group', { name: 'Start Point' })).toBeInTheDocument();
    expect(screen.getByLabelText('Segment 1 endpoint U')).toHaveValue(0.25);
    expect(screen.getByLabelText('Segment 1 endpoint V')).toHaveValue(0);
    expect(screen.getByText('Profile is valid and ready to save.')).toBeInTheDocument();
  });

  it('creates and saves connected semantic segments with a shared live preview', async () => {
    const onSave = vi.fn();
    render(<RouterProfileDefinitionDialog open onOpenChange={vi.fn()} onSave={onSave} />);
    expect(screen.getByRole('img', { name: 'Custom router profile live preview' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Shop Cove' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Segment' }));
    fireEvent.change(screen.getByLabelText('Segment 2 kind'), { target: { value: 'ellipseArc' } });
    expect(screen.getByLabelText('Segment 2 radius U')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save Profile' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      name: 'Shop Cove',
      boundary: { segments: [{ kind: 'line' }, { kind: 'ellipseArc' }] }
    });
  });

  it('reports invalid geometry and prevents saving it', () => {
    render(<RouterProfileDefinitionDialog open onOpenChange={vi.fn()} onSave={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Segment 1 kind'), { target: { value: 'arc' } });
    fireEvent.change(screen.getByLabelText('Segment 1 radius'), { target: { value: '0' } });
    expect(screen.getByRole('alert')).toHaveTextContent('radius is invalid');
    expect(screen.getByRole('button', { name: 'Save Profile' })).toBeDisabled();
  });

  it('converts a segment to an accessible cubic Bezier while preserving its endpoint', () => {
    render(<RouterProfileDefinitionDialog open onOpenChange={vi.fn()} onSave={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Segment 1 kind'), { target: { value: 'cubicBezier' } });
    expect(screen.getByLabelText('Segment 1 endpoint U')).toHaveValue(0.25);
    expect(screen.getByLabelText('Segment 1 endpoint V')).toHaveValue(0);
    expect(Number((screen.getByLabelText('Segment 1 control 1 U') as HTMLInputElement).value)).toBeCloseTo(1 / 12);
    expect(Number((screen.getByLabelText('Segment 1 control 1 V') as HTMLInputElement).value)).toBeCloseTo(1 / 6);
    expect(Number((screen.getByLabelText('Segment 1 control 2 U') as HTMLInputElement).value)).toBeCloseTo(1 / 6);
    expect(Number((screen.getByLabelText('Segment 1 control 2 V') as HTMLInputElement).value)).toBeCloseTo(1 / 12);
    expect(screen.getByLabelText('Segment 1 control 1 U')).toHaveValue(0.0833);
  });

  it('formats generated cubic values for display without rounding stored precision', async () => {
    const onSave = vi.fn();
    render(<RouterProfileDefinitionDialog open onOpenChange={vi.fn()} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('Segment 1 kind'), { target: { value: 'cubicBezier' } });
    expect(screen.getByLabelText('Segment 1 control 1 U')).toHaveValue(0.0833);
    fireEvent.click(screen.getByRole('button', { name: 'Save Profile' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].boundary.segments[0].control1.u).toBe(1 / 12);
  });

  it('resets cubic controls to exact straight one-third and two-third positions', () => {
    render(<RouterProfileDefinitionDialog open onOpenChange={vi.fn()} onSave={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Segment 1 kind'), { target: { value: 'cubicBezier' } });
    fireEvent.change(screen.getByLabelText('Segment 1 control 1 U'), { target: { value: '0.01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset cubic controls to straight' }));
    expect(Number((screen.getByLabelText('Segment 1 control 1 U') as HTMLInputElement).value)).toBeCloseTo(1 / 12);
  });

  it('saves edited cubic controls losslessly', async () => {
    const onSave = vi.fn();
    render(<RouterProfileDefinitionDialog open onOpenChange={vi.fn()} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('Segment 1 kind'), { target: { value: 'cubicBezier' } });
    fireEvent.change(screen.getByLabelText('Segment 1 control 1 U'), { target: { value: '0.04' } });
    fireEvent.change(screen.getByLabelText('Segment 1 control 2 V'), { target: { value: '0.03' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Profile' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].boundary.segments[0]).toMatchObject({
      kind: 'cubicBezier',
      control1: { u: 0.04 },
      control2: { v: 0.03 },
      to: { u: 0.25, v: 0 }
    });
  });

  it('edits a cloned profile without mutating the supplied definition', () => {
    const initial = {
      version: 1 as const,
      id: 'builtin-copy',
      name: 'Roundover Custom',
      family: 'Edge',
      source: 'generic' as const,
      parameters: {},
      boundary: { start: { u: 0, v: 0 }, segments: [{ kind: 'line' as const, to: { u: 0.25, v: 0.25 } }] }
    };
    render(<RouterProfileDefinitionDialog open initialProfile={initial} onOpenChange={vi.fn()} onSave={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Segment 1 endpoint U'), { target: { value: '0.5' } });
    expect(initial.boundary.segments[0].to.u).toBe(0.25);
  });

  it('undoes and redoes a coalesced numeric edit without stealing input undo', () => {
    render(<RouterProfileDefinitionDialog open onOpenChange={vi.fn()} onSave={vi.fn()} />);
    const endpoint = screen.getByLabelText('Segment 1 endpoint U');
    fireEvent.change(endpoint, { target: { value: '0.4' } });
    fireEvent.change(endpoint, { target: { value: '0.45' } });
    expect(endpoint).toHaveValue(0.45);
    fireEvent.click(screen.getByRole('button', { name: 'Undo last profile edit' }));
    expect(endpoint).toHaveValue(0.25);
    fireEvent.click(screen.getByRole('button', { name: 'Redo profile edit' }));
    expect(endpoint).toHaveValue(0.45);
    endpoint.focus();
    fireEvent.keyDown(endpoint, { key: 'z', metaKey: true });
    expect(screen.getByRole('button', { name: 'Undo last profile edit' })).toBeEnabled();
  });

  it('applies batch smoothing as one undoable definition transaction', () => {
    const initial = {
      version: 1 as const,
      id: 'joined',
      name: 'Joined',
      family: 'Custom',
      source: 'generic' as const,
      parameters: {},
      boundary: {
        start: { u: 0, v: 1 },
        segments: [
          { kind: 'line' as const, to: { u: 0.5, v: 0.5 } },
          {
            kind: 'cubicBezier' as const,
            control1: { u: 0.5, v: 0.7 },
            control2: { u: 0.8, v: 0.2 },
            to: { u: 1, v: 0 }
          }
        ]
      }
    };
    render(<RouterProfileDefinitionDialog open initialProfile={initial} onOpenChange={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Smooth eligible joins…' }));
    expect(screen.getByRole('dialog', { name: 'Confirm smooth eligible joins' })).toHaveTextContent(
      'Smooth 1 eligible join'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm smooth joins' }));
    expect(screen.getByLabelText('Segment 2 control 1 U')).not.toHaveValue(0.5);
    fireEvent.click(screen.getByRole('button', { name: 'Undo last profile edit' }));
    expect(screen.getByLabelText('Segment 2 control 1 U')).toHaveValue(0.5);
  });
});
