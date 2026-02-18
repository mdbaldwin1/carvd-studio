import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles falsy values', () => {
    expect(cn('base', false, 'visible')).toBe('base visible');
    expect(cn('base', 0, 'visible')).toBe('base visible');
    expect(cn('base', '', 'visible')).toBe('base visible');
  });

  it('handles undefined and null', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end');
  });

  it('handles empty inputs', () => {
    expect(cn()).toBe('');
  });

  it('merges conflicting Tailwind classes (last wins)', () => {
    expect(cn('px-4', 'px-6')).toBe('px-6');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('preserves non-conflicting Tailwind classes', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('handles array inputs', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });

  it('handles object inputs', () => {
    expect(cn({ active: true, disabled: false })).toBe('active');
  });
});
