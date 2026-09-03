import { describe, expect, it } from 'vitest';
import { getRevealActionLabel } from './fileToast';

describe('getRevealActionLabel', () => {
  it.each([
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'Show in Finder'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Show in File Explorer'],
    ['Mozilla/5.0 (X11; Linux x86_64)', 'Show in Folder']
  ])('uses the native file-manager label for %s', (userAgent, expected) => {
    expect(getRevealActionLabel(userAgent)).toBe(expected);
  });
});
