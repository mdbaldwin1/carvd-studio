import type { EdgeProfileFeature, Part, RouterProfileDefinition } from '../types';
import { getEdgeProfileFeatureBoundary } from './edgeProfileShape';
import { getRouterToolProfileCompatibility, normalizeRouterToolEnvelope } from './routerTools';

export type RouterToolFeasibilitySeverity = 'error' | 'warning' | 'info';
export type RouterToolFeasibilityCode =
  | 'no_physical_tool'
  | 'profile_tool_mismatch'
  | 'profile_tool_linkage'
  | 'profile_exceeds_incident_face'
  | 'insufficient_cutting_height'
  | 'insufficient_cutter_reach'
  | 'shank_stock_collision'
  | 'neck_stock_collision'
  | 'bearing_missing'
  | 'bearing_contact_impossible'
  | 'insufficient_overall_reach'
  | 'zero_remaining_web';

export interface RouterToolFeasibilityFinding {
  severity: RouterToolFeasibilitySeverity;
  code: RouterToolFeasibilityCode;
  message: string;
  details: Record<string, number | string | boolean>;
}

const EPSILON = 1e-7;
const dimensionForFaceName = (name: string, part: Pick<Part, 'length' | 'width' | 'thickness'>): number =>
  name === 'top' || name === 'bottom' ? part.thickness : name === 'front' || name === 'back' ? part.width : part.length;

/**
 * Compare idealized profile removal with one immutable physical tool snapshot.
 * This does not mutate or resolve library state. X is radial reach into the
 * first named incident face; Y is axial engagement into the second.
 */
export function analyzeEdgeProfileToolFeasibility(
  feature: EdgeProfileFeature,
  part: Pick<Part, 'length' | 'width' | 'thickness'>
): RouterToolFeasibilityFinding[] {
  const boundary = getEdgeProfileFeatureBoundary(feature, { chordError: 0.001, maxSegments: 2048 });
  if (!boundary.length) return [];
  const maxReach = Math.max(...boundary.map(({ x }) => x));
  const maxAxial = Math.max(...boundary.map(({ y }) => y));
  const [firstFace, secondFace] = feature.target.edge.split('_');
  const radialAvailable = dimensionForFaceName(firstFace, part);
  const axialAvailable = dimensionForFaceName(secondFace, part);
  const findings: RouterToolFeasibilityFinding[] = [];
  const add = (
    severity: RouterToolFeasibilitySeverity,
    code: RouterToolFeasibilityCode,
    message: string,
    details: RouterToolFeasibilityFinding['details']
  ) => findings.push({ severity, code, message, details });

  if (maxReach > radialAvailable + EPSILON || maxAxial > axialAvailable + EPSILON) {
    add(
      'error',
      'profile_exceeds_incident_face',
      'Profile depth exceeds an incident face dimension; reduce the profile size/depth or use larger stock.',
      { maxReach, radialAvailable, maxAxial, axialAvailable }
    );
  }
  if (maxReach >= radialAvailable - EPSILON && maxAxial >= axialAvailable - EPSILON) {
    add(
      'warning',
      'zero_remaining_web',
      'The profile reaches both incident face limits and may leave no continuous web at the routed edge; verify the intended section.',
      { maxReach, radialAvailable, maxAxial, axialAvailable }
    );
  }

  const tool = feature.routerToolSnapshot;
  if (!tool) {
    add(
      'info',
      'no_physical_tool',
      'No physical router tool is assigned; geometry is an idealized generic profile and tool clearance is unknown.',
      {}
    );
    return findings;
  }
  const profile: RouterProfileDefinition = feature.routerProfileSnapshot ?? {
    version: 1,
    id: feature.routerProfileId ?? `builtin-${feature.profile}`,
    name: feature.profile,
    family: feature.profile,
    source: 'generic',
    parameters: {},
    boundary: { start: { u: 0, v: 0 }, segments: [{ kind: 'line', to: { u: 1, v: 0 } }] }
  };
  const compatibility = getRouterToolProfileCompatibility(tool, profile);
  if (compatibility.quality === 'mismatch' || compatibility.quality === 'missing_linkage') {
    add(
      'error',
      'profile_tool_mismatch',
      'Assigned router tool does not have a compatible certified profile linkage; assign a tool snapshot that produces this exact shape.',
      {
        toolFamily: tool.profileFamily,
        profileFamily: profile.family,
        exactToolProfileId: tool.routerProfileId ?? '',
        matchQuality: compatibility.quality
      }
    );
  } else if (compatibility.quality !== 'family_compatible') {
    add('info', 'profile_tool_linkage', `Tool linkage is ${compatibility.quality.replaceAll('_', ' ')}.`, {
      matchQuality: compatibility.quality,
      linkedProfileId: compatibility.linkedProfileId ?? '',
      scale: compatibility.scale ?? 1
    });
  }
  if (tool.cuttingHeight + EPSILON < maxAxial) {
    add(
      'error',
      'insufficient_cutting_height',
      'Tool cutting height is shorter than the required axial profile engagement; use a longer cutting edge or reduce profile depth.',
      { cuttingHeight: tool.cuttingHeight, requiredAxialEngagement: maxAxial }
    );
  }
  const requiredRadius =
    typeof profile.parameters.requiredCutterRadius === 'number'
      ? profile.parameters.requiredCutterRadius
      : typeof profile.parameters.cutterRadius === 'number'
        ? profile.parameters.cutterRadius
        : undefined;
  if (requiredRadius !== undefined && tool.cutterDiameter / 2 + EPSILON < requiredRadius) {
    add(
      'error',
      'insufficient_cutter_reach',
      'Tool cutter radius is smaller than the profile’s declared required reach; choose the specified cutter diameter.',
      { cutterRadius: tool.cutterDiameter / 2, requiredCutterRadius: requiredRadius }
    );
  }

  const envelope = normalizeRouterToolEnvelope(tool);
  if (envelope.precision === 'detailed') {
    const cutters = envelope.sections.filter((section) => section.role === 'cutter').sort((a, b) => a.start - b.start);
    let coveredTo = 0;
    for (const cutter of cutters) {
      if (cutter.start > coveredTo + EPSILON) break;
      coveredTo = Math.max(coveredTo, cutter.end);
    }
    if (coveredTo + EPSILON < maxAxial && tool.cuttingHeight + EPSILON >= maxAxial) {
      add(
        'error',
        'insufficient_cutting_height',
        'The detailed cutter sections do not cover the full required axial engagement.',
        {
          cutterCoverage: coveredTo,
          requiredAxialEngagement: maxAxial
        }
      );
    }
  }
  if (
    envelope.precision === 'detailed' &&
    tool.overallLength !== undefined &&
    tool.safeColletInsertion !== undefined &&
    tool.overallLength - tool.safeColletInsertion + EPSILON < maxAxial
  ) {
    add(
      'error',
      'insufficient_overall_reach',
      'The modeled overall length cannot provide the required reach while maintaining safe collet insertion.',
      {
        usableReach: tool.overallLength - tool.safeColletInsertion,
        requiredAxialEngagement: maxAxial,
        safeColletInsertion: tool.safeColletInsertion
      }
    );
  }

  for (const role of ['shank', 'neck'] as const) {
    const sections = envelope.sections.filter((section) => section.role === role);
    const colliding = sections.find(
      (section) => section.start < maxAxial - EPSILON && section.diameter / 2 > maxReach + EPSILON
    );
    const legacyDiameter = role === 'shank' ? tool.shankDiameter : tool.neckDiameter;
    if (envelope.precision === 'detailed' && colliding) {
      add(
        'error',
        role === 'shank' ? 'shank_stock_collision' : 'neck_stock_collision',
        `The detailed ${role} section intersects the required cutting span and exceeds the maximum removed radial envelope.`,
        {
          sectionStart: colliding.start,
          sectionEnd: colliding.end,
          sectionRadius: colliding.diameter / 2,
          modeledProfileReach: maxReach
        }
      );
    } else if (
      envelope.precision === 'legacy' &&
      legacyDiameter !== undefined &&
      legacyDiameter / 2 > maxReach + EPSILON
    ) {
      add(
        'warning',
        role === 'shank' ? 'shank_stock_collision' : 'neck_stock_collision',
        `The legacy ${role} envelope may contact unremoved stock; its axial position is unknown.`,
        {
          sectionRadius: legacyDiameter / 2,
          modeledProfileReach: maxReach,
          assumption: 'legacy tool has no measured axial sections'
        }
      );
    }
  }

  const bearingSections = envelope.sections.filter((section) => section.role === 'bearing');
  if (tool.bearingDiameter === undefined) {
    add(
      'info',
      'bearing_missing',
      'No bearing is recorded. If this is intended as a bearing-guided edge operation, assign a bearing-equipped tool or document a fence/template setup.',
      {}
    );
  } else if (tool.bearingDiameter / 2 > radialAvailable + EPSILON) {
    add(
      envelope.precision === 'detailed' ? 'error' : 'warning',
      'bearing_contact_impossible',
      'The recorded bearing is wider than the available incident face contact region; verify bearing placement or use a fence/template.',
      {
        bearingRadius: tool.bearingDiameter / 2,
        availableContactDepth: radialAvailable,
        detailedEnvelope: envelope.precision === 'detailed'
      }
    );
  } else if (
    envelope.precision === 'detailed' &&
    !bearingSections.some((section) => section.end >= 0 && section.start <= axialAvailable)
  ) {
    add(
      'error',
      'bearing_contact_impossible',
      'The detailed bearing span never reaches the available stock contact interval.',
      {
        availableContactStart: 0,
        availableContactEnd: axialAvailable
      }
    );
  }
  return findings;
}
