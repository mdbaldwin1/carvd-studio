import { describe, expect, it } from 'vitest';
import type { EdgeProfileFeature, RouterToolDefinition } from '../types';
import { createTestPart } from '../../../../tests/helpers/factories';
import { validatePartsForCutList } from '../store/projectStore';
import { getInstructionFabricationLines } from './cutListInstructions';
import { analyzeEdgeProfileToolFeasibility } from './edgeProfileToolFeasibility';

const tool = (overrides: Partial<RouterToolDefinition> = {}): RouterToolDefinition => ({
  version: 1,
  id: 'cove-tool',
  name: 'Cove Tool',
  source: 'generic',
  profileFamily: 'cove',
  cutterDiameter: 1,
  shankDiameter: 0.25,
  cuttingHeight: 0.5,
  bearingDiameter: 0.5,
  ...overrides
});
const feature = (overrides: Partial<EdgeProfileFeature> = {}): EdgeProfileFeature => ({
  id: 'edge',
  version: 1,
  enabled: true,
  kind: 'edge_profile',
  target: { type: 'edge', edge: 'top_front_edge' },
  reference: { primaryFrom: 'min' },
  profile: 'cove',
  parameters: { size: 0.5, depth: 0.5 },
  routerToolSnapshot: tool(),
  ...overrides
});
const part = { length: 8, width: 4, thickness: 0.75 };

describe('edge profile physical router-tool feasibility', () => {
  it('reports adequate tooling deterministically without warnings or errors', () => {
    const first = analyzeEdgeProfileToolFeasibility(feature(), part);
    expect(first.filter(({ severity }) => severity !== 'info')).toEqual([]);
    expect(analyzeEdgeProfileToolFeasibility(feature(), part)).toEqual(first);
  });

  it('analyzes an immutable manufacturer tool against a sampled custom freeform profile', () => {
    const custom = {
      version: 1 as const,
      id: 'freeform',
      name: 'Freeform',
      family: 'freeform',
      source: 'manufacturer' as const,
      manufacturer: 'Profile Co',
      sku: 'P-1',
      parameters: { fidelity: 'approximated' },
      boundary: {
        start: { u: 0.4, v: 0 },
        segments: [
          {
            kind: 'cubicBezier' as const,
            control1: { u: 0.4, v: 0.15 },
            control2: { u: 0.15, v: 0.4 },
            to: { u: 0, v: 0.4 }
          }
        ]
      }
    };
    const manufacturer = tool({
      id: 'mfg',
      name: 'Catalog Freeform',
      source: 'manufacturer',
      manufacturer: 'Tool Co',
      sku: 'T-1',
      profileFamily: 'freeform',
      routerProfileId: 'freeform'
    });
    const findings = analyzeEdgeProfileToolFeasibility(
      feature({
        profile: 'custom',
        routerProfileId: 'freeform',
        routerProfileSnapshot: custom,
        routerToolId: 'mfg',
        routerToolSnapshot: manufacturer
      }),
      part
    );
    expect(findings.filter(({ severity }) => severity !== 'info')).toEqual([]);
  });

  it('preserves legacy no-tool behavior as explicit information, not an error', () => {
    const findings = analyzeEdgeProfileToolFeasibility(feature({ routerToolSnapshot: undefined }), part);
    expect(findings).toContainEqual(expect.objectContaining({ code: 'no_physical_tool', severity: 'info' }));
    expect(findings.some(({ severity }) => severity === 'error')).toBe(false);
  });

  it('proves insufficient cutting height and metadata-backed cutter reach', () => {
    const profile = {
      version: 1 as const,
      id: 'custom',
      name: 'Custom',
      family: 'custom',
      source: 'generic' as const,
      parameters: { requiredCutterRadius: 0.4 },
      boundary: { start: { u: 0.5, v: 0 }, segments: [{ kind: 'line' as const, to: { u: 0, v: 0.5 } }] }
    };
    const findings = analyzeEdgeProfileToolFeasibility(
      feature({
        profile: 'custom',
        routerProfileId: 'custom',
        routerProfileSnapshot: profile,
        routerToolSnapshot: tool({
          profileFamily: 'custom',
          routerProfileId: 'custom',
          cuttingHeight: 0.49,
          cutterDiameter: 0.7
        })
      }),
      part
    );
    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'insufficient_cutting_height', severity: 'error' }),
        expect.objectContaining({ code: 'insufficient_cutter_reach', severity: 'error' })
      ])
    );
  });

  it('reports family mismatch, conservative shank/neck collision, and bearing constraints', () => {
    const findings = analyzeEdgeProfileToolFeasibility(
      feature({
        routerToolSnapshot: tool({
          profileFamily: 'ogee',
          shankDiameter: 1.25,
          neckDiameter: 1.1,
          cutterDiameter: 1.5,
          bearingDiameter: 2
        })
      }),
      part
    );
    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'profile_tool_mismatch', severity: 'error' }),
        expect.objectContaining({ code: 'shank_stock_collision', severity: 'warning' }),
        expect.objectContaining({ code: 'neck_stock_collision', severity: 'warning' }),
        expect.objectContaining({ code: 'bearing_contact_impossible', severity: 'warning' })
      ])
    );
    expect(
      analyzeEdgeProfileToolFeasibility(feature({ routerToolSnapshot: tool({ bearingDiameter: undefined }) }), part)
    ).toContainEqual(expect.objectContaining({ code: 'bearing_missing', severity: 'info' }));
  });

  it.each([
    'top_front_edge',
    'top_back_edge',
    'top_left_edge',
    'top_right_edge',
    'bottom_front_edge',
    'bottom_back_edge',
    'bottom_left_edge',
    'bottom_right_edge',
    'front_left_edge',
    'front_right_edge',
    'back_left_edge',
    'back_right_edge'
  ] as const)('is orientation invariant for adequate stock on %s', (edge) => {
    const detailed = tool({
      envelopeVersion: 1,
      sections: [
        { role: 'bearing', start: -0.2, end: 0, diameter: 0.5 },
        { role: 'cutter', start: 0, end: 0.5, diameter: 1 },
        { role: 'shank', start: 0.5, end: 2, diameter: 0.25 }
      ]
    });
    const findings = analyzeEdgeProfileToolFeasibility(
      feature({ target: { type: 'edge', edge }, routerToolSnapshot: detailed }),
      { length: 8, width: 4, thickness: 2 }
    );
    expect(findings.filter(({ severity }) => severity !== 'info')).toEqual([]);
  });

  it('reports face overflow and possible zero web only when sampled extents reach the limits', () => {
    const findings = analyzeEdgeProfileToolFeasibility(feature(), { length: 8, width: 0.4, thickness: 0.4 });
    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'profile_exceeds_incident_face', severity: 'error' }),
        expect.objectContaining({ code: 'zero_remaining_web', severity: 'warning' })
      ])
    );
  });

  it('feeds actionable findings into project issues and fabrication instructions', () => {
    const bad = feature({ routerToolSnapshot: tool({ cuttingHeight: 0.25 }) });
    const modeledPart = createTestPart({ stockId: null, features: [bad] });
    expect(
      validatePartsForCutList([modeledPart], []).some(
        (issue) => issue.featureId === bad.id && issue.message.includes('cutting height')
      )
    ).toBe(true);
    const lines = getInstructionFabricationLines(
      {
        partId: 'part',
        partName: 'Part',
        cutLength: 8,
        cutWidth: 4,
        thickness: 0.75,
        stockId: 'stock',
        stockName: 'Stock',
        grainSensitive: false,
        canRotate: true,
        isGlueUp: false,
        features: [bad]
      },
      'imperial'
    );
    expect(lines.some((line) => line.includes('TOOL ERROR') && line.includes('cutting height'))).toBe(true);
  });

  it('uses a detailed envelope to prove a valid below-cutter bearing and clear shank', () => {
    const detailed = tool({
      envelopeVersion: 1,
      sections: [
        { role: 'bearing', start: -0.2, end: 0, diameter: 0.5 },
        { role: 'cutter', start: 0, end: 0.5, diameter: 1 },
        { role: 'shank', start: 0.5, end: 2, diameter: 0.25 }
      ],
      overallLength: 3,
      safeColletInsertion: 1
    });
    expect(analyzeEdgeProfileToolFeasibility(feature({ routerToolSnapshot: detailed }), part)).toEqual([]);
  });

  it('promotes proven detailed shank collision and unusable reach to errors', () => {
    const deep = feature({
      parameters: { size: 0.75, depth: 0.75 },
      routerToolSnapshot: tool({
        cutterDiameter: 1.5,
        shankDiameter: 2,
        envelopeVersion: 1,
        sections: [
          { role: 'cutter', start: 0, end: 0.5, diameter: 1.5 },
          { role: 'shank', start: 0.5, end: 1.5, diameter: 2 }
        ],
        overallLength: 1.5,
        safeColletInsertion: 1
      })
    });
    const findings = analyzeEdgeProfileToolFeasibility(deep, part);
    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'insufficient_cutting_height', severity: 'error' }),
        expect.objectContaining({ code: 'shank_stock_collision', severity: 'error' }),
        expect.objectContaining({ code: 'insufficient_overall_reach', severity: 'error' })
      ])
    );
  });

  it('retains conservative warnings for the same unknown legacy axial setup', () => {
    const findings = analyzeEdgeProfileToolFeasibility(
      feature({
        parameters: { size: 0.75, depth: 0.75 },
        routerToolSnapshot: tool({ cutterDiameter: 1.5, shankDiameter: 2 })
      }),
      part
    );
    expect(findings).toContainEqual(expect.objectContaining({ code: 'shank_stock_collision', severity: 'warning' }));
  });
});
