import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * drei's <Html> defaults to a z-index around 16.7 million, far above the
 * app's dialog layers (1100 for a Dialog, 1200 for an AlertDialog). An
 * overlay that does not cap its range therefore paints its label over any
 * open dialog -- which is what the cut editor's angle and dimension
 * indicators did over "Save Part Cuts?".
 *
 * Every overlay has to declare zIndexRange. This reads the source because
 * the alternative is rendering R3F under happy-dom for a prop that has no
 * observable effect there.
 */
const RENDERER_SRC = path.resolve(__dirname, '../..');

function collectTsxFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(full);
    return entry.isFile() && entry.name.endsWith('.tsx') && !entry.name.includes('.test.') ? [full] : [];
  });
}

/** The opening tag starting at `from`, stopping at the `>` that closes it. */
function readOpeningTag(source: string, from: number): string {
  let index = from;
  while (index < source.length && !(source[index] === '>' && source[index - 1] !== '=')) index += 1;
  return source.slice(from, index + 1);
}

describe('drei Html overlays', () => {
  it('cap their z-index so labels cannot paint over dialogs', () => {
    const offenders: string[] = [];

    for (const file of collectTsxFiles(RENDERER_SRC)) {
      const source = fs.readFileSync(file, 'utf8');
      if (!source.includes('<Html')) continue;

      for (const match of source.matchAll(/<Html\b/g)) {
        const tag = readOpeningTag(source, match.index);
        if (tag.includes('zIndexRange')) continue;
        const line = source.slice(0, match.index).split('\n').length;
        offenders.push(`${path.relative(RENDERER_SRC, file)}:${line}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
