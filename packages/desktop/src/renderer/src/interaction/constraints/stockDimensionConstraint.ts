// ADR-006: Stock dimension caps. A resize candidate cannot exceed the
// assigned stock's length / width / thickness. Glue-up panels are exempt
// from the width cap (they're explicitly made by edge-gluing boards).
//
// No-op for move and rotate candidates — those don't change dimensions.

import type { Constraint, ConstraintBlocker, ConstraintResult, ConstraintWarning } from './types';

const MIN_LENGTH = 0.5;
const MIN_WIDTH = 0.5;
const MIN_THICKNESS = 0.25;

export const stockDimensionConstraint: Constraint = {
  name: 'stock-dimension',
  apply(ctx): ConstraintResult {
    const candidate = ctx.candidate;
    if (candidate.kind !== 'resize') {
      return { adjusted: candidate, blockers: [], warnings: [] };
    }

    const part = ctx.startingParts.find((p) => p.id === candidate.partId);
    if (!part) {
      return { adjusted: candidate, blockers: [], warnings: [] };
    }

    const stock = part.stockId ? ctx.project.stocks.find((s) => s.id === part.stockId) : undefined;

    // Determine caps.
    const maxLength = stock ? stock.length : Infinity;
    const maxWidth = stock && !part.glueUpPanel ? stock.width : Infinity;
    const maxThickness = stock ? stock.thickness : Infinity;

    const blockers: ConstraintBlocker[] = [];
    const warnings: ConstraintWarning[] = [];

    const newLength = Math.max(MIN_LENGTH, Math.min(maxLength, candidate.dimensions.length));
    const newWidth = Math.max(MIN_WIDTH, Math.min(maxWidth, candidate.dimensions.width));
    const newThickness = Math.max(MIN_THICKNESS, Math.min(maxThickness, candidate.dimensions.thickness));

    if (newLength !== candidate.dimensions.length && candidate.dimensions.length > maxLength) {
      warnings.push({
        constraintName: 'stock-dimension',
        kind: 'near-edge',
        partId: candidate.partId,
        message: `Length capped at stock max (${maxLength}).`
      });
    }
    if (newWidth !== candidate.dimensions.width && candidate.dimensions.width > maxWidth) {
      warnings.push({
        constraintName: 'stock-dimension',
        kind: 'near-edge',
        partId: candidate.partId,
        message: `Width capped at stock max (${maxWidth}).`
      });
    }
    if (newThickness !== candidate.dimensions.thickness && candidate.dimensions.thickness > maxThickness) {
      warnings.push({
        constraintName: 'stock-dimension',
        kind: 'near-edge',
        partId: candidate.partId,
        message: `Thickness capped at stock max (${maxThickness}).`
      });
    }

    if (
      newLength === candidate.dimensions.length &&
      newWidth === candidate.dimensions.width &&
      newThickness === candidate.dimensions.thickness
    ) {
      return { adjusted: candidate, blockers, warnings };
    }

    return {
      adjusted: {
        ...candidate,
        dimensions: { length: newLength, width: newWidth, thickness: newThickness }
      },
      blockers,
      warnings
    };
  }
};
