import { describe, expect, it } from 'vitest';
import type { PartValidationIssue } from '../types';
import { describeIssueCounts, summarizeProjectIssues } from './projectIssues';

function issue(overrides: Partial<PartValidationIssue> = {}): PartValidationIssue {
  return {
    partId: 'part-1',
    partName: 'Side L',
    type: 'no_stock',
    message: 'No stock assigned',
    severity: 'error',
    ...overrides
  };
}

describe('summarizeProjectIssues', () => {
  it('reports nothing for a clean project', () => {
    const summary = summarizeProjectIssues([]);
    expect(summary).toEqual({ errorCount: 0, warningCount: 0, total: 0, groups: [] });
  });

  it('gathers issues per part and counts each severity', () => {
    const summary = summarizeProjectIssues([
      issue(),
      issue({ type: 'grain_mismatch', message: 'Grain mismatch', severity: 'warning' }),
      issue({ partId: 'part-2', partName: 'Door Rail T', message: 'Operation invalid', severity: 'error' })
    ]);

    expect(summary.errorCount).toBe(2);
    expect(summary.warningCount).toBe(1);
    expect(summary.total).toBe(3);
    expect(summary.groups).toHaveLength(2);

    const [side, rail] = summary.groups;
    expect(side.partName).toBe('Side L');
    expect(side.issues).toHaveLength(2);
    expect(side.errorCount).toBe(1);
    expect(side.warningCount).toBe(1);
    expect(rail.partName).toBe('Door Rail T');
    expect(rail.errorCount).toBe(1);
    expect(rail.warningCount).toBe(0);
  });

  it('keeps parts in the order they were first reported', () => {
    const summary = summarizeProjectIssues([
      issue({ partId: 'b', partName: 'B' }),
      issue({ partId: 'a', partName: 'A' }),
      issue({ partId: 'b', partName: 'B' })
    ]);
    expect(summary.groups.map((group) => group.partId)).toEqual(['b', 'a']);
  });
});

describe('describeIssueCounts', () => {
  it.each([
    [1, 0, '1 error'],
    [2, 0, '2 errors'],
    [0, 1, '1 warning'],
    [0, 3, '3 warnings'],
    [2, 1, '2 errors, 1 warning'],
    [0, 0, '']
  ])('describes %i errors and %i warnings', (errors, warnings, expected) => {
    expect(describeIssueCounts(errors, warnings)).toBe(expected);
  });
});
