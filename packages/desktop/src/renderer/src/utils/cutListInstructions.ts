import { CutInstruction, DowelJointMetadata, PartFeature } from '../types';
import { getReferenceMode } from './endCutUtils';
import { formatFabricationMeasurement as formatMeasurementWithUnit, formatReadableMeasurement } from './fractions';
import { getFeaturePlacementSummary, getFeatureSummary } from './partFeatureSummary';
import { analyzeEdgeProfileToolFeasibility } from './edgeProfileToolFeasibility';

export interface GroupedCutInstruction {
  key: string;
  cutLength: number;
  cutWidth: number;
  thickness: number;
  stockId: string;
  stockName: string;
  grainSensitive: boolean;
  isGlueUp: boolean;
  quantity: number;
  items: CutInstruction[];
}

function getFeatureGroupingKey(feature: PartFeature, jointGroups: Map<string, number>): string {
  if (feature.kind === 'end_cut') {
    return JSON.stringify({
      kind: feature.kind,
      enabled: feature.enabled,
      label: feature.label ?? '',
      target: feature.target,
      reference: feature.reference,
      cutType: feature.cutType,
      // Resolve through the canonical reference-mode helper so features that
      // differ only in legacy lengthMode vs stored reference group together.
      lengthMode: getReferenceMode(feature),
      parameters: feature.parameters
    });
  }

  if (feature.kind === 'routed_path') {
    return JSON.stringify({
      kind: feature.kind,
      enabled: feature.enabled,
      label: feature.label ?? '',
      target: feature.target,
      reference: feature.reference,
      path: feature.path,
      bit: feature.bit,
      parameters: feature.parameters
    });
  }
  if (feature.kind === 'edge_profile') {
    return JSON.stringify({
      kind: feature.kind,
      enabled: feature.enabled,
      label: feature.label ?? '',
      target: feature.target,
      reference: feature.reference,
      profile: feature.profile,
      parameters: feature.parameters,
      routerProfileId: feature.routerProfileId,
      routerProfileRevision: feature.routerProfileRevision,
      routerProfileSnapshot: feature.routerProfileSnapshot,
      routerToolId: feature.routerToolId,
      routerToolRevision: feature.routerToolRevision,
      routerToolSnapshot: feature.routerToolSnapshot
    });
  }

  const dowel = feature.metadata?.dowelJoint as DowelJointMetadata | undefined;
  if (dowel?.jointId && !jointGroups.has(dowel.jointId)) jointGroups.set(dowel.jointId, jointGroups.size);
  return JSON.stringify({
    kind: feature.kind,
    enabled: feature.enabled,
    label: feature.label ?? '',
    target: feature.target,
    reference: feature.reference,
    cutType: feature.cutType,
    parameters: feature.parameters,
    placement: feature.placement,
    pattern: feature.kind === 'circular_cut' ? feature.pattern : undefined,
    // Joint partition and physical dimensions affect shop instructions; copied
    // UUIDs and mate part identities do not affect fabrication equivalence.
    dowelJoint: dowel?.jointId
      ? {
          group: jointGroups.get(dowel.jointId),
          dowelDiameter: dowel.dowelDiameter,
          dowelLength: dowel.dowelLength,
          embedmentDepth: dowel.embedmentDepth
        }
      : undefined
  });
}

export function getInstructionEnabledFeatures(instruction: CutInstruction): PartFeature[] {
  return (instruction.features ?? []).filter((feature) => feature.enabled);
}

/** End-face routing keeps its square-blank reference after an angled end cut. */
export function getRoutedEndReferenceWarning(feature: PartFeature, features: PartFeature[]): string | null {
  if (feature.kind !== 'routed_path' || feature.target.type !== 'face') return null;
  const face = feature.target.face;
  if (face !== 'left_end' && face !== 'right_end') return null;
  const index = features.indexOf(feature);
  const trimmed = features
    .slice(0, index)
    .some(
      (earlier) =>
        earlier.enabled &&
        earlier.kind === 'end_cut' &&
        earlier.target.type === 'face' &&
        earlier.target.face === face &&
        (earlier.parameters.horizontalAngle !== 0 || (earlier.parameters.verticalAngle ?? 0) !== 0)
    );
  return trimmed
    ? 'Model dimensions use the original square end, not the angled cut face. Route depth is not a machine plunge setting. Establish the actual slot depth, entry direction, and tooling before machining.'
    : null;
}

export function getInstructionFabricationLines(instruction: CutInstruction, units: 'imperial' | 'metric'): string[] {
  const enabledFeatures = getInstructionEnabledFeatures(instruction);
  const descriptions: string[] = [];
  const describedDowelJoints = new Set<string>();
  for (const feature of enabledFeatures) {
    const dowel = feature.metadata?.dowelJoint as DowelJointMetadata | undefined;
    if (dowel?.jointId && !describedDowelJoints.has(dowel.jointId)) {
      describedDowelJoints.add(dowel.jointId);
      const count = enabledFeatures.filter(
        (candidate) => (candidate.metadata?.dowelJoint as DowelJointMetadata | undefined)?.jointId === dowel.jointId
      ).length;
      descriptions.push(
        `Dowel joint: ${count} × ${formatMeasurementWithUnit(dowel.dowelDiameter, units)} dowels, ${formatMeasurementWithUnit(dowel.dowelLength, units)} long; drill ${formatMeasurementWithUnit(dowel.embedmentDepth, units)} into this part.`
      );
    }
    const summary = [
      getRoutedEndReferenceWarning(feature, enabledFeatures),
      getFeatureSummary(feature, units),
      getFeaturePlacementSummary(feature, units, instruction.finishedWidth ?? instruction.cutWidth)
    ]
      .filter(Boolean)
      .join(' · ');
    const label = feature.label?.trim();
    descriptions.push(label ? `${label} — ${summary}` : summary);
    if (feature.kind === 'edge_profile') {
      const findings = analyzeEdgeProfileToolFeasibility(feature, {
        length: instruction.finishedLength ?? instruction.cutLength,
        width: instruction.finishedWidth ?? instruction.cutWidth,
        thickness: instruction.thickness
      });
      for (const finding of findings) {
        const prefix =
          finding.severity === 'error' ? 'TOOL ERROR' : finding.severity === 'warning' ? 'Tool warning' : 'Tool note';
        descriptions.push(`${prefix}: ${finding.message}`);
      }
    }
  }
  const lines = descriptions.map((description, index) => `${index + 1}. ${description}`);

  // Solid wood moves across the grain whatever the drawing says, so the number
  // belongs next to the cut rather than in somebody's head. Unnumbered: it is
  // something to allow for, not an operation to perform.
  if (instruction.movementAllowance) {
    lines.push(
      `Board stock assumed solid wood: allow about ${formatReadableMeasurement(instruction.movementAllowance, units)} of seasonal movement across the grain. Housed panels must stay free to move.`
    );
  }

  if (
    instruction.finishedLength !== undefined &&
    instruction.finishedWidth !== undefined &&
    (instruction.finishedLength !== instruction.cutLength || instruction.finishedWidth !== instruction.cutWidth)
  ) {
    lines.unshift(
      `Blank: ${formatMeasurementWithUnit(instruction.cutLength, units)} × ${formatMeasurementWithUnit(instruction.cutWidth, units)}. Finished modeled envelope: ${formatMeasurementWithUnit(instruction.finishedLength, units)} × ${formatMeasurementWithUnit(instruction.finishedWidth, units)} × ${formatMeasurementWithUnit(instruction.thickness, units)}. Allowance is unassigned to edges. Establish the modeled envelope and reference edges before locating these cuts; do not measure their offsets from an oversized blank edge. Authored cuts describe the modeled envelope, not extra material.`
    );
  }
  const note = instruction.notes?.trim();
  if (note) lines.push(note);
  return lines;
}

export function getInstructionFabricationSummary(
  instruction: CutInstruction,
  units: 'imperial' | 'metric'
): string | null {
  const lines = getInstructionFabricationLines(instruction, units);
  return lines.length > 0 ? lines.join('; ') : null;
}

export function groupCutInstructions(instructions: CutInstruction[]): GroupedCutInstruction[] {
  const groups = new Map<string, GroupedCutInstruction>();

  for (const inst of instructions) {
    const jointGroups = new Map<string, number>();
    const featureKey = getInstructionEnabledFeatures(inst)
      .map((feature) => getFeatureGroupingKey(feature, jointGroups))
      .join('|');
    // A glue-up panel puts its note on the first strip only, so keying on it
    // would split one panel into "Qty 1" plus "Qty 2" of identical blanks and
    // inflate the unique-blank count. Distinct notes still separate ordinary
    // parts, which is what this key was added for.
    const noteKey = inst.isGlueUp ? '' : (inst.notes?.trim() ?? '');
    const key = `${inst.stage ?? 'blank'}-${inst.finishedLength ?? ''}-${inst.finishedWidth ?? ''}-${inst.cutLength}-${inst.cutWidth}-${inst.thickness}-${inst.stockId}-${inst.grainSensitive}-${inst.isGlueUp}-${featureKey}-${noteKey}`;

    const existing = groups.get(key);
    if (existing) {
      existing.quantity++;
      existing.items.push(inst);
    } else {
      groups.set(key, {
        key,
        cutLength: inst.cutLength,
        cutWidth: inst.cutWidth,
        thickness: inst.thickness,
        stockId: inst.stockId,
        stockName: inst.stockName,
        grainSensitive: inst.grainSensitive,
        isGlueUp: inst.isGlueUp,
        quantity: 1,
        items: [inst]
      });
    }
  }

  return Array.from(groups.values());
}
