// ADR-006: Pipeline runner. Composes constraints in order; each constraint
// sees the previous one's output as its candidate. Blockers and warnings
// accumulate across the chain.

import type { CandidateTransform, Constraint, ConstraintBlocker, ConstraintContext, ConstraintWarning } from './types';

export interface PipelineResult {
  adjusted: CandidateTransform;
  blockers: ConstraintBlocker[];
  warnings: ConstraintWarning[];
}

/**
 * Run an ordered constraint pipeline. Each constraint sees the previous
 * constraint's adjusted candidate. Blockers and warnings accumulate; the
 * pipeline never short-circuits — a constraint that surfaces a blocker still
 * passes its adjustment to the next constraint (this keeps the chain
 * deterministic and makes "blocked but with snap engaged" intermediate states
 * inspectable for the host).
 */
export function applyConstraints(ctx: ConstraintContext, pipeline: ReadonlyArray<Constraint>): PipelineResult {
  let current: CandidateTransform = ctx.candidate;
  const blockers: ConstraintBlocker[] = [];
  const warnings: ConstraintWarning[] = [];

  for (const constraint of pipeline) {
    const stepCtx: ConstraintContext = { ...ctx, candidate: current };
    const result = constraint.apply(stepCtx);
    current = result.adjusted;
    if (result.blockers.length > 0) blockers.push(...result.blockers);
    if (result.warnings.length > 0) warnings.push(...result.warnings);
  }

  return { adjusted: current, blockers, warnings };
}
