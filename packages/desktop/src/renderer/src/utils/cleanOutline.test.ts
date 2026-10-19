import { describe, expect, it, vi } from 'vitest';
import { BoxGeometry, BufferGeometry, Float32BufferAttribute } from 'three';
import { buildCleanOutlineGeometry } from './cleanOutline';
vi.unmock('three');

describe('stock outlines', () => {
  it('keeps all twelve box creases and removes face triangulation', () => {
    const source = new BoxGeometry(3, 1, 2);
    expect(buildCleanOutlineGeometry(source).getAttribute('position').count).toBe(24);
  });
  it('removes coplanar T-junction edges instead of drawing spokes', () => {
    const source = new BufferGeometry();
    // Left triangle meets two triangles on its long vertical edge.
    source.setAttribute(
      'position',
      new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 2, 0, 1, 0, 0, 2, 0, 0, 1, 1, 0, 1, 1, 0, 2, 0, 0, 1, 2, 0], 3)
    );
    const positions = buildCleanOutlineGeometry(source).getAttribute('position');
    for (let i = 0; i < positions.count; i += 2)
      expect(positions.getX(i) === 1 && positions.getX(i + 1) === 1).toBe(false);
  });
  it('returns a finite empty outline for empty or degenerate stock', () => {
    const source = new BufferGeometry();
    source.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 0, 0, 0, NaN, 0, 0], 3));
    expect(buildCleanOutlineGeometry(source).getAttribute('position').count).toBe(0);
  });
});
