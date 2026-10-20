import { render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DimensionLabel } from './DimensionLabel';

vi.unmock('three');

/**
 * drei's helpers stand in as plain elements carrying their props, so the test
 * can read back the geometry the component worked out rather than a canvas.
 */
const lines: Array<{ points: number[][]; lineWidth?: number; color?: string }> = [];
const texts: string[] = [];

vi.mock('@react-three/drei', () => ({
  Billboard: ({ children }: { children?: React.ReactNode }) => createElement('billboard', null, children),
  Line: (props: { points: number[][]; lineWidth?: number; color?: string }) => {
    lines.push(props);
    return createElement('dimline', null);
  },
  Text: ({ children }: { children?: React.ReactNode }) => {
    texts.push(String(children));
    return createElement('dimtext', null, String(children));
  }
}));

function renderLabel(overrides: Partial<Parameters<typeof DimensionLabel>[0]> = {}) {
  lines.length = 0;
  texts.length = 0;
  const props = {
    start: [0, 0, 0] as [number, number, number],
    end: [10, 0, 0] as [number, number, number],
    value: 10,
    offsetDir: [0, 0, 1] as [number, number, number],
    units: 'imperial' as const,
    ...overrides
  };
  return { ...render(createElement(DimensionLabel, props)), props };
}

describe('DimensionLabel', () => {
  it('writes the measurement the way a woodworker reads it', () => {
    renderLabel({ value: 10.5 });
    expect(texts[0]).toBe('10 1/2"');
  });

  it('writes millimetres when the project is metric', () => {
    renderLabel({ value: 10, units: 'metric' });
    expect(texts[0]).toBe('254mm');
  });

  it('writes an exact 32nd rather than rounding it to a 16th', () => {
    // The label sits beside the cut it describes, so a thirty-second out is a
    // thirty-second out in the reader's face.
    renderLabel({ value: 0.78125 });
    expect(texts[0]).toBe('25/32"');
  });

  it('stands the dimension line off the part by the offset given', () => {
    renderLabel({ offset: 2 });
    // Measured along x at the origin, held off along +z.
    const everyPoint = lines.flatMap((line) => line.points);
    expect(everyPoint.some((point) => Math.abs(point[2] - 2) < 1e-6)).toBe(true);
  });

  it('normalises the offset direction, so its length does not move the line', () => {
    // The caller passes a direction, not a distance; how long the vector
    // happens to be must not change where the line lands.
    renderLabel({ offsetDir: [0, 0, 1], offset: 1.5 });
    const unit = JSON.stringify(lines.map((line) => line.points));
    renderLabel({ offsetDir: [0, 0, 7], offset: 1.5 });
    expect(JSON.stringify(lines.map((line) => line.points))).toBe(unit);
  });

  it('breaks the line either side of the label instead of running through it', () => {
    renderLabel();
    // The two halves of the dimension line stop short of the middle, leaving
    // the number legible rather than struck through.
    const [left, right] = lines;
    expect(left.points[1][0]).toBeLessThan(5);
    expect(right.points[0][0]).toBeGreaterThan(5);
  });

  it('keeps the gap inside the line when the label is longer than the span', () => {
    // A long number on a short dimension must not turn the line inside out.
    renderLabel({ start: [0, 0, 0], end: [0.5, 0, 0], value: 0.5 });
    const [left, right] = lines;
    expect(left.points[1][0]).toBeLessThanOrEqual(right.points[0][0] + 1e-6);
  });

  it('draws ticks across the line, not along it', () => {
    renderLabel();
    // Measured along x and offset along z, the ticks run along y.
    const tick = lines[lines.length - 1];
    const [from, to] = tick.points;
    expect(Math.abs(to[1] - from[1])).toBeGreaterThan(0);
  });

  it('still draws ticks when the offset runs along the measurement', () => {
    // The cross product collapses, and without a fallback the ticks would be
    // zero-length and invisible.
    renderLabel({ offsetDir: [1, 0, 0] });
    const tick = lines[lines.length - 1];
    const [from, to] = tick.points;
    expect(from).not.toEqual(to);
  });

  it('draws nothing at all when hidden', () => {
    const { container } = renderLabel({ hidden: true });
    expect(container).toBeEmptyDOMElement();
    expect(lines).toHaveLength(0);
  });

  it('draws extension lines thinner than the dimension line', () => {
    renderLabel({ lineWidth: 3 });
    expect(lines[2].lineWidth).toBeLessThan(3);
  });

  it('never lets an extension line vanish on a hairline setting', () => {
    renderLabel({ lineWidth: 0.2 });
    expect(lines[2].lineWidth).toBeGreaterThanOrEqual(1);
  });
});
