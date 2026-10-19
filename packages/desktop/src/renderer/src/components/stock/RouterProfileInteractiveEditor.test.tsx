import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RouterProfileInteractiveEditor, snapProfilePoint } from './RouterProfileInteractiveEditor';

const profile = {
  version: 1 as const,
  id: 'cubic',
  name: 'Cubic',
  family: 'Custom',
  source: 'generic' as const,
  parameters: {},
  boundary: {
    start: { u: 0, v: 0.25 },
    segments: [
      {
        kind: 'cubicBezier' as const,
        control1: { u: 1 / 12, v: 1 / 4 },
        control2: { u: 1 / 6, v: 1 / 12 },
        to: { u: 0.25, v: 0 }
      }
    ]
  }
};

describe('RouterProfileInteractiveEditor', () => {
  it('snaps to grids, axes and alignments while respecting modifiers', () => {
    expect(snapProfilePoint({ u: 0.061, v: 0.063 }, 0.0625, [])).toMatchObject({ point: { u: 0.0625, v: 0.0625 } });
    expect(snapProfilePoint({ u: 0.004, v: 0.2 }, 0, [])).toMatchObject({
      point: { u: 0, v: 0.2 },
      target: 'inset stock axis'
    });
    expect(snapProfilePoint({ u: 0.201, v: 0.31 }, 0, [{ u: 0.2, v: 0.4 }])).toMatchObject({ point: { u: 0.2 } });
    expect(snapProfilePoint({ u: 0.061, v: 0.063 }, 0.0625, [], true).point).toEqual({ u: 0.061, v: 0.063 });
    expect(snapProfilePoint({ u: 0.2, v: 0.03 }, 0, [], false, { u: 0.1, v: 0.1 }, true)).toMatchObject({
      point: { v: 0.1 },
      target: 'Horizontal constraint'
    });
  });

  it('exposes focusable cubic handles and keyboard nudges by the active grid', () => {
    const onChange = vi.fn();
    render(<RouterProfileInteractiveEditor profile={profile} onChange={onChange} />);
    const control = screen.getByRole('button', { name: /Segment 1 cubic control 1/ });
    expect(control).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(control, { key: 'ArrowRight' });
    expect(onChange.mock.calls[0][0].boundary.segments[0].control1.u).toBeCloseTo(1 / 12 + 1 / 32);
    expect(screen.getByRole('status')).toHaveTextContent('control1 moved');
  });

  it('does not alter canonical values merely by rendering', () => {
    render(<RouterProfileInteractiveEditor profile={profile} onChange={vi.fn()} />);
    expect(profile.boundary.segments[0].control1.u).toBe(1 / 12);
    expect(screen.getByRole('group', { name: 'Interactive custom router profile editor' })).toBeInTheDocument();
  });

  it('surfaces neutral sharp-corner continuity and enables shared tangent enforcement', () => {
    const joined = {
      ...profile,
      boundary: {
        start: { u: 0, v: 0 },
        segments: [
          { kind: 'line' as const, to: { u: 1, v: 0 } },
          { kind: 'cubicBezier' as const, control1: { u: 1, v: 0.2 }, control2: { u: 1.8, v: 1 }, to: { u: 2, v: 1 } }
        ]
      }
    };
    const onChange = vi.fn();
    render(<RouterProfileInteractiveEditor profile={joined} onChange={onChange} />);
    expect(screen.getByRole('img', { name: 'Join 1: Sharp corner' })).toBeInTheDocument();
    expect(screen.getByText(/intentional corners are allowed/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Join 1 tangent lock'), { target: { value: 'aligned' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].boundary.segments[1].control1.v).toBe(0);
  });

  it('recommends cubic conversion for arc joins without changing radius', () => {
    const arc = {
      ...profile,
      boundary: {
        start: { u: 1, v: 0 },
        segments: [
          { kind: 'arc' as const, to: { u: 0, v: 1 }, radius: 1, clockwise: false },
          { kind: 'line' as const, to: { u: 0, v: 2 } }
        ]
      }
    };
    render(<RouterProfileInteractiveEditor profile={arc} onChange={vi.fn()} />);
    expect(screen.getByText(/Convert adjacent curve to cubic/)).toBeInTheDocument();
    expect(arc.boundary.segments[0].radius).toBe(1);
  });

  const stubRect = (el: Element, width = 320, height = 240) => {
    el.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: width, bottom: height, width, height, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    Object.assign(el, { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn() });
  };

  // Renders the editor with snapping disabled so pointer coordinates round-trip exactly.
  const renderForDrag = () => {
    const onChange = vi.fn();
    render(<RouterProfileInteractiveEditor profile={profile} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Profile editor snap grid'), { target: { value: '0' } });
    const svg = screen.getByRole('group', { name: 'Interactive custom router profile editor' });
    stubRect(svg);
    const handle = (name: RegExp) => screen.getByRole('button', { name });
    const at = (el: Element) => ({ clientX: Number(el.getAttribute('cx')), clientY: Number(el.getAttribute('cy')) });
    return { onChange, svg, handle, at };
  };

  it('maps pointer positions back through the viewBox so a drag lands on the targeted point', () => {
    const { onChange, svg, handle, at } = renderForDrag();
    const target = at(handle(/Segment 1 cubic control 2/));

    fireEvent.pointerDown(handle(/Profile start point/), { pointerId: 1 });
    fireEvent.pointerMove(svg, { pointerId: 1, ...target });
    fireEvent.pointerUp(svg, { pointerId: 1 });

    // uv() must invert xy(): dragging onto control 2's rendered pixel yields its exact canonical value.
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].boundary.start).toEqual({ u: 1 / 6, v: 1 / 12 });
  });

  it('previews without committing and commits exactly once per completed drag', () => {
    const { onChange, svg, handle, at } = renderForDrag();
    const target = at(handle(/Segment 1 endpoint/));

    fireEvent.pointerDown(handle(/Profile start point/), { pointerId: 1 });
    fireEvent.pointerMove(svg, { pointerId: 1, ...target });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: target.clientX - 4, clientY: target.clientY - 4 });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(/distance .* · angle/);

    fireEvent.pointerUp(svg, { pointerId: 1 });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('ignores unrelated pointers and discards the preview when a drag is canceled', () => {
    const { onChange, svg, handle, at } = renderForDrag();
    const target = at(handle(/Segment 1 endpoint/));

    fireEvent.pointerDown(handle(/Profile start point/), { pointerId: 1 });
    fireEvent.pointerMove(svg, { pointerId: 9, ...target });
    expect(screen.getByRole('status')).not.toHaveTextContent('distance');

    fireEvent.pointerMove(svg, { pointerId: 1, ...target });
    fireEvent.pointerCancel(svg, { pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
    expect(handle(/Profile start point/)).toHaveAttribute('aria-label', 'Profile start point, inset 0, depth 0.25');
  });
});
