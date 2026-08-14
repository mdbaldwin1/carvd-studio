import { CutInstruction, PartFeature } from '../types';
import { getReferenceMode } from './endCutUtils';
import { getFeatureSummary } from './partFeatureSummary';

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

function getFeatureGroupingKey(feature: PartFeature): string {
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

  return JSON.stringify({
    kind: feature.kind,
    enabled: feature.enabled,
    label: feature.label ?? '',
    target: feature.target,
    reference: feature.reference,
    cutType: feature.cutType,
    parameters: feature.parameters,
    placement: feature.placement
  });
}

export function getInstructionEnabledFeatures(instruction: CutInstruction): PartFeature[] {
  return (instruction.features ?? []).filter((feature) => feature.enabled);
}

export function getInstructionFabricationLines(instruction: CutInstruction, units: 'imperial' | 'metric'): string[] {
  const lines = getInstructionEnabledFeatures(instruction).map((feature, index) => {
    const label = feature.label?.trim() || getFeatureSummary(feature, units);
    return `${index + 1}. ${label}`;
  });
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
    const featureKey = getInstructionEnabledFeatures(inst).map(getFeatureGroupingKey).join('|');
    const noteKey = inst.notes?.trim() ?? '';
    const key = `${inst.cutLength}-${inst.cutWidth}-${inst.thickness}-${inst.stockId}-${inst.grainSensitive}-${inst.isGlueUp}-${featureKey}-${noteKey}`;

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
