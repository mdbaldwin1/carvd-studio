import type { CutInstruction, PartFeature } from '../types';
import { formatFabricationMeasurement as formatMeasurementWithUnit, formatReadableMeasurement } from './fractions';
import { getInstructionEnabledFeatures, getRoutedEndReferenceWarning } from './cutListInstructions';
import { RECT_CUT_TRAITS } from './rectCutTraits';
import { getRouterProfileRevision } from './routerProfiles';
import { getRouterToolRevision } from './routerTools';

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
  stage: string;
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
function describeSetting(
  feature: PartFeature,
  units: Units
): { operation: string; setting: string; identity?: string } | null {
  const measure = (value: number | undefined) => formatMeasurementWithUnit(value ?? 0, units);

  if (feature.kind === 'rect_cut') {
    const traits = RECT_CUT_TRAITS[feature.cutType];
    const operation = traits.label;
    const depthOnly =
      feature.parameters.depthMode === 'through' ? 'through' : `${measure(feature.parameters.depth)} deep`;
    // A leaning wall is a different cutter, not a different number on the
    // same one, so two cuts at different angles are never the same setup.
    const walls =
      (feature.parameters.wallAngle ? `, ${feature.parameters.wallAngle}° end walls` : '') +
      (feature.parameters.sideWallAngle ? `, ${feature.parameters.sideWallAngle}° side walls` : '');
    // A taper is laid out from the same setup but sawn to a different line,
    // so it belongs in the note the same way the leaning wall does.
    const taper = feature.parameters.taperAngle ? `, ${feature.parameters.taperAngle}° taper` : '';
    const depth = `${depthOnly}${walls}${taper}`;

    // Every channel is set up the same way -- the stack width is the run
    // across the board and the height is the depth. Which stored dimension
    // holds that width is the one thing that differs between a dado and a
    // groove, and the traits table is where that is already recorded.
    if (traits.channel) {
      const ends =
        feature.cutType === 'stopped_dado' && feature.parameters.stoppedSpan
          ? feature.parameters.cornerRadius
            ? `, ${measure(feature.parameters.cornerRadius)} end radius`
            : ', square ends'
          : '';
      return { operation, setting: `${measure(feature.parameters.size[traits.channel.field])} wide, ${depth}${ends}` };
    }

    switch (feature.cutType) {
      case 'rabbet': {
        const shoulder =
          feature.target.type === 'edge' &&
          (feature.target.edge.includes('front') || feature.target.edge.includes('back'))
            ? feature.parameters.size.width
            : feature.parameters.size.length;
        return { operation, setting: `${measure(shoulder)} shoulder, ${depth}` };
      }
      case 'mortise': {
        const corners = feature.parameters.cornerRadius
          ? `routed, ${measure(feature.parameters.cornerRadius)} corner radius`
          : 'square corners';
        return { operation, setting: `${measure(feature.parameters.size.width)} wide, ${depth}, ${corners}` };
      }
      case 'tenon':
        return {
          operation,
          setting: `${measure(feature.parameters.depth)} thick, ${measure(feature.parameters.size.length)} long${feature.parameters.cornerRadius ? `, ${measure(feature.parameters.cornerRadius)} corner radius` : ''}`
        };
      default:
        return {
          operation,
          setting: `${measure(feature.parameters.size.length)} × ${measure(feature.parameters.size.width)}, ${depth}${feature.cutType === 'cutout' && feature.parameters.cornerRadius ? `, ${measure(feature.parameters.cornerRadius)} corner radius` : ''}`
        };
    }
  }

  if (feature.kind === 'circular_cut') {
    const operation = OPERATION_LABELS[feature.cutType] ?? 'Drill';
    const depth = feature.parameters.depthMode === 'through' ? 'through' : `${measure(feature.parameters.depth)} deep`;
    const angle = `${90 - feature.parameters.tilt}° from face`;
    const profile =
      feature.cutType === 'counterbore' && feature.parameters.counterbore
        ? `, ${measure(feature.parameters.counterbore.diameter)} counterbore × ${measure(feature.parameters.counterbore.depth)} recess`
        : feature.cutType === 'countersink' && feature.parameters.countersink
          ? `, ${measure(feature.parameters.countersink.majorDiameter)} countersink, ${feature.parameters.countersink.includedAngle}° included angle`
          : '';
    return { operation, setting: `${measure(feature.parameters.diameter)} bit, ${depth}, ${angle}${profile}` };
  }

  if (feature.kind === 'rounded_cut') {
    if (feature.parameters.plateJoiner && feature.parameters.depth) {
      const depth = feature.parameters.depth;
      const diameter = feature.parameters.length ** 2 / (4 * depth) + depth;
      return {
        operation: 'Plate joiner',
        setting: `${formatMeasurementWithUnit(diameter, 'metric')} blade, ${formatMeasurementWithUnit(feature.parameters.width, 'metric')} kerf, ${formatMeasurementWithUnit(depth, 'metric')} plunge`
      };
    }
    const operation = OPERATION_LABELS[feature.cutType] ?? 'Rounded opening';
    const depth = feature.parameters.depthMode === 'through' ? 'through' : `${measure(feature.parameters.depth)} deep`;
    return { operation, setting: `${measure(feature.parameters.cornerRadius)} radius, ${depth}` };
  }

  if (feature.kind === 'routed_path') {
    const depth = feature.parameters.depthMode === 'through' ? 'through' : `${measure(feature.parameters.depth)} deep`;
    if (feature.bit.profile === 'dovetail')
      return {
        operation: 'Dovetail route',
        setting: `${feature.bit.includedAngle / 2}° slope, ${measure(feature.bit.diameter)} max diameter, ${measure(feature.bit.shankDiameter)} shank, ${depth}`
      };
    if (feature.bit.profile === 'v_bit' || feature.bit.profile === 'engraving') {
      const tool = feature.bit.profile === 'v_bit' ? 'V-bit' : 'Engraving bit';
      return {
        operation: 'Routed path',
        setting: `${measure(feature.bit.diameter)} ${tool}, ${feature.bit.includedAngle}° included angle, ${depth}`
      };
    }
    const profileLabel =
      feature.bit.profile === 't_slot'
        ? 'T-Slot'
        : feature.bit.profile
            .split('_')
            .map((word) => word[0].toUpperCase() + word.slice(1))
            .join(' ');
    const undercutSettings =
      feature.bit.profile === 't_slot' || feature.bit.profile === 'keyhole'
        ? `, ${measure(feature.bit.shankDiameter)} shank, ${measure(feature.bit.cutterHeight)} cutter height`
        : '';
    return {
      operation: 'Routed path',
      setting: `${measure(feature.bit.diameter)} ${profileLabel} bit${undercutSettings}, ${depth}`
    };
  }

  if (feature.kind === 'edge_profile') {
    const profile = feature.routerProfileSnapshot;
    const tool = feature.routerToolSnapshot;
    // Saved definitions are the manufacturing contract, not the current library.
    // Recompute identities so a stale stored revision cannot merge changed geometry.
    const identity = JSON.stringify([
      profile ? getRouterProfileRevision(profile) : [feature.routerProfileId, feature.routerProfileRevision],
      tool ? getRouterToolRevision(tool) : [feature.routerToolId, feature.routerToolRevision]
    ]);
    const tooling = tool
      ? `; Tool: ${tool.name}${tool.manufacturer ? ` (${tool.manufacturer}${tool.sku ? ` ${tool.sku}` : ''})` : tool.sku ? ` (${tool.sku})` : ''}, ${measure(tool.cutterDiameter)} cutter, ${measure(tool.shankDiameter)} shank, ${measure(tool.cuttingHeight)} cutting height`
      : '; no physical tool assigned';
    return {
      operation: 'Edge profile',
      setting: `${profile?.name ?? feature.profile}, ${measure(feature.parameters.size)} × ${measure(feature.parameters.depth)}${tooling}`,
      identity
    };
  }

  if (feature.kind === 'end_cut') {
    const operation = OPERATION_LABELS[feature.cutType] ?? 'End cut';
    // The angles are the saw setting; which end it is cut on is not.
    const vertical = feature.parameters.verticalAngle ? `, ${feature.parameters.verticalAngle}° tilt` : '';
    const band = feature.parameters.band
      ? `, cut band ${measure(feature.parameters.band.from)} to ${measure(feature.parameters.band.to)} from bottom`
      : '';
    return { operation, setting: `${feature.parameters.horizontalAngle}°${vertical}${band}` };
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
    const features = getInstructionEnabledFeatures(instruction);
    for (const feature of features) {
      const described = describeSetting(feature, units);
      if (!described) continue;
      const referenceWarning = getRoutedEndReferenceWarning(feature, features);
      if (referenceWarning) {
        described.operation = 'Routed path — shop setup required';
        described.setting = `${referenceWarning} Modeled cutter and depth: ${described.setting}`;
      }

      const stage =
        instruction.stage === 'post_glue_up'
          ? 'After glue-up'
          : instruction.stage === 'post_purchase'
            ? 'After purchase'
            : 'Stock blanks';
      const key = `${stage}|${described.operation}|${described.setting}${described.identity ? `|${described.identity}` : ''}`;
      const existing = setups.get(key);
      const entry = { partId: instruction.partId, partName: instruction.partName, featureId: feature.id };

      if (existing) {
        existing.parts.push(entry);
        existing.passes += 1;
      } else {
        // Group by precise machine settings above; only round their display.
        const setting = described.setting.replace(/(-?\d+(?:\.\d+)?)(mm|")/g, (_match, value: string, unit: string) =>
          formatReadableMeasurement(Number(value) / (unit === 'mm' ? 25.4 : 1), unit === 'mm' ? 'metric' : 'imperial')
        );
        setups.set(key, { key, stage, operation: described.operation, setting, parts: [entry], passes: 1 });
      }
    }
  }

  return [...setups.values()];
}
