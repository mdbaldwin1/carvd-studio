import type { CutInstruction, PartFeature } from '../types';
import { formatFabricationMeasurement as formatMeasurementWithUnit } from './fractions';
import { getInstructionEnabledFeatures } from './cutListInstructions';
import { RECT_CUT_TRAITS } from './rectCutTraits';

/**
 * The same cut, on every piece that needs it.
 *
 * Nobody works part by part. You set the dado stack to three quarters, run
 * every piece that takes that dado, and only then change the setup -- because
 * the setup is the expensive part and re-dialling one you had already got
 * right is the easiest hour to waste in a day's work.
 *
 * Carvd's cut list is organised by blank, which is the right answer for buying
 * and breaking down material and the wrong one for standing at a machine. This
 * regroups the same operations by what the machine has to be set to.
 */

export interface CutSetup {
  /** Stable identity for the setting, so the same setup groups across parts. */
  key: string;
  /** What the operation is, in the words the cut list already uses. */
  operation: string;
  /** What the machine has to be set to. */
  setting: string;
  /** Every piece that goes through this setup, in cut-list order. */
  parts: Array<{ partId: string; partName: string; featureId: string }>;
  /** How many pieces, counting a part that needs the setup twice as two. */
  passes: number;
}

/** Names for the cuts that are not rectangular; the rest come from traits. */
const OPERATION_LABELS: Record<string, string> = {
  round_hole: 'Drill',
  countersink: 'Countersink',
  counterbore: 'Counterbore',
  rounded_slot: 'Rounded slot',
  rounded_rectangle: 'Rounded opening',
  mitre: 'Mitre',
  bevel: 'Bevel',
  compound: 'Compound mitre'
};

type Units = 'imperial' | 'metric';

/**
 * What the machine has to be set to for one operation.
 *
 * Two cuts share a setup when these agree -- which is deliberately not the
 * same as the cuts being identical. Where a dado sits along a board does not
 * change the stack width or the blade height, so two dados at different
 * offsets run back to back without touching the machine.
 */
function describeSetting(feature: PartFeature, units: Units): { operation: string; setting: string } | null {
  const measure = (value: number | undefined) => formatMeasurementWithUnit(value ?? 0, units);

  if (feature.kind === 'rect_cut') {
    const traits = RECT_CUT_TRAITS[feature.cutType];
    const operation = traits.label;
    const depth = feature.parameters.depthMode === 'through' ? 'through' : `${measure(feature.parameters.depth)} deep`;

    // Every channel is set up the same way -- the stack width is the run
    // across the board and the height is the depth. Which stored dimension
    // holds that width is the one thing that differs between a dado and a
    // groove, and the traits table is where that is already recorded.
    if (traits.channel) {
      return { operation, setting: `${measure(feature.parameters.size[traits.channel.field])} wide, ${depth}` };
    }

    switch (feature.cutType) {
      case 'rabbet':
        return { operation, setting: `${measure(feature.parameters.size.width)} shoulder, ${depth}` };
      case 'mortise': {
        const corners = feature.parameters.cornerRadius ? 'routed' : 'square corners';
        return { operation, setting: `${measure(feature.parameters.size.width)} wide, ${depth}, ${corners}` };
      }
      case 'tenon':
        return {
          operation,
          setting: `${measure(feature.parameters.depth)} thick, ${measure(feature.parameters.size.length)} long`
        };
      default:
        return {
          operation,
          setting: `${measure(feature.parameters.size.length)} × ${measure(feature.parameters.size.width)}, ${depth}`
        };
    }
  }

  if (feature.kind === 'circular_cut') {
    const operation = OPERATION_LABELS[feature.cutType] ?? 'Drill';
    const depth = feature.parameters.depthMode === 'through' ? 'through' : `${measure(feature.parameters.depth)} deep`;
    return { operation, setting: `${measure(feature.parameters.diameter)} bit, ${depth}` };
  }

  if (feature.kind === 'rounded_cut') {
    const operation = OPERATION_LABELS[feature.cutType] ?? 'Rounded opening';
    const depth = feature.parameters.depthMode === 'through' ? 'through' : `${measure(feature.parameters.depth)} deep`;
    return { operation, setting: `${measure(feature.parameters.cornerRadius)} radius, ${depth}` };
  }

  if (feature.kind === 'routed_path') {
    const depth = feature.parameters.depthMode === 'through' ? 'through' : `${measure(feature.parameters.depth)} deep`;
    return {
      operation: 'Routed path',
      setting: `${measure(feature.bit.diameter)} ${feature.bit.profile} bit, ${depth}`
    };
  }

  if (feature.kind === 'edge_profile') {
    return {
      operation: 'Edge profile',
      setting: `${feature.profile}, ${measure(feature.parameters.size)} × ${measure(feature.parameters.depth)}`
    };
  }

  if (feature.kind === 'end_cut') {
    const operation = OPERATION_LABELS[feature.cutType] ?? 'End cut';
    // The angles are the saw setting; which end it is cut on is not.
    const vertical = feature.parameters.verticalAngle ? `, ${feature.parameters.verticalAngle}° tilt` : '';
    return { operation, setting: `${feature.parameters.horizontalAngle}°${vertical}` };
  }

  return null;
}

/**
 * Regroup a cut list by what the machine has to be set to.
 *
 * Setups come back in the order their first piece appears, so the sequence
 * still follows the cut list rather than jumping about.
 */
export function getCutSetups(instructions: CutInstruction[], units: Units): CutSetup[] {
  const setups = new Map<string, CutSetup>();

  for (const instruction of instructions) {
    for (const feature of getInstructionEnabledFeatures(instruction)) {
      const described = describeSetting(feature, units);
      if (!described) continue;

      const key = `${described.operation}|${described.setting}`;
      const existing = setups.get(key);
      const entry = { partId: instruction.partId, partName: instruction.partName, featureId: feature.id };

      if (existing) {
        existing.parts.push(entry);
        existing.passes += 1;
      } else {
        setups.set(key, { key, operation: described.operation, setting: described.setting, parts: [entry], passes: 1 });
      }
    }
  }

  return [...setups.values()];
}
