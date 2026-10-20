import type { CutList } from '../types';

/** Increment when persisted fabrication output must be regenerated. */
export const CUT_LIST_FORMAT_VERSION = 1;

/** A report is derived data. Preserve it for review, but never export obsolete calculations as current. */
export function normalizeSavedCutList(report: CutList | null | undefined): CutList | null {
  if (!report) return null;
  return report.formatVersion === CUT_LIST_FORMAT_VERSION ? report : { ...report, isStale: true };
}
