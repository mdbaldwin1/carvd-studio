import type { EdgeProfile, RouterProfileDefinition } from '../types';

export type BuiltInEdgeProfile = Exclude<EdgeProfile, 'custom'>;

export interface BuiltInRouterProfileRegistration {
  profile: BuiltInEdgeProfile;
  label: string;
  description: string;
  /** Normalized canonical geometry. Authoring dimensions are applied later. */
  definition: RouterProfileDefinition;
  /** Circular keeps roundover/cove radii exact; stretch permits elliptical adaptation. */
  adaptation: 'circular-with-flats' | 'stretch';
}

const definition = (
  id: string,
  name: string,
  family: string,
  boundary: RouterProfileDefinition['boundary']
): RouterProfileDefinition => ({
  version: 1,
  id,
  name,
  family,
  source: 'generic',
  parameters: { normalizedSize: 1, normalizedDepth: 1 },
  boundary
});

export const BUILT_IN_ROUTER_PROFILE_REGISTRY: Readonly<Record<BuiltInEdgeProfile, BuiltInRouterProfileRegistration>> =
  {
    roundover: {
      profile: 'roundover',
      label: 'Roundover',
      description: 'Rounds the corner with an exact circular radius; unequal dimensions add straight reveals.',
      adaptation: 'circular-with-flats',
      definition: definition('builtin-roundover', 'Roundover', 'roundover', {
        start: { u: 1, v: 0 },
        segments: [{ kind: 'arc', to: { u: 0, v: 1 }, radius: 1, clockwise: true }]
      })
    },
    cove: {
      profile: 'cove',
      label: 'Cove',
      description: 'Cuts a concave exact circular quarter-radius; unequal dimensions add straight reveals.',
      adaptation: 'circular-with-flats',
      definition: definition('builtin-cove', 'Cove', 'cove', {
        start: { u: 1, v: 0 },
        segments: [{ kind: 'arc', to: { u: 0, v: 1 }, radius: 1, clockwise: false }]
      })
    },
    chamfer: {
      profile: 'chamfer',
      label: 'Chamfer',
      description: 'Cuts a straight bevel between the authored size and depth.',
      adaptation: 'stretch',
      definition: definition('builtin-chamfer', 'Chamfer', 'chamfer', {
        start: { u: 1, v: 0 },
        segments: [{ kind: 'line', to: { u: 0, v: 1 } }]
      })
    },
    rabbet: {
      profile: 'rabbet',
      label: 'Rabbet',
      description: 'Cuts a square two-leg recess at the authored size and depth.',
      adaptation: 'stretch',
      definition: definition('builtin-rabbet', 'Rabbet', 'rabbet', {
        start: { u: 1, v: 0 },
        segments: [
          { kind: 'line', to: { u: 1, v: 1 } },
          { kind: 'line', to: { u: 0, v: 1 } }
        ]
      })
    },
    bead: {
      profile: 'bead',
      label: 'Bead',
      description: 'Cuts a two-arc bead with explicit fillet transitions.',
      adaptation: 'stretch',
      definition: definition('builtin-bead', 'Bead', 'bead', {
        start: { u: 1, v: 0 },
        segments: [
          { kind: 'arc', to: { u: 0.5, v: 0.5 }, radius: 0.5, clockwise: true },
          { kind: 'arc', to: { u: 0, v: 1 }, radius: 0.5, clockwise: false }
        ]
      })
    },
    ogee: {
      profile: 'ogee',
      label: 'Ogee',
      description: 'Cuts a generic two-arc S profile with opposing curvature.',
      adaptation: 'stretch',
      definition: definition('builtin-ogee', 'Ogee', 'ogee', {
        start: { u: 1, v: 0 },
        segments: [
          { kind: 'arc', to: { u: 0.52, v: 0.48 }, radius: 0.48, clockwise: false },
          { kind: 'arc', to: { u: 0, v: 1 }, radius: 0.52, clockwise: true }
        ]
      })
    },
    thumbnail: {
      profile: 'thumbnail',
      label: 'Generic Thumbnail',
      description: 'Cuts a broad generic elliptical table-edge profile.',
      adaptation: 'stretch',
      definition: definition('builtin-thumbnail', 'Generic Thumbnail', 'thumbnail', {
        start: { u: 1, v: 0 },
        segments: [
          { kind: 'line', to: { u: 0.8, v: 0 } },
          { kind: 'ellipseArc', to: { u: 0, v: 0.8 }, radiusU: 0.8, radiusV: 0.8, clockwise: false },
          { kind: 'line', to: { u: 0, v: 1 } }
        ]
      })
    }
  };

export const BUILT_IN_ROUTER_PROFILES = Object.values(BUILT_IN_ROUTER_PROFILE_REGISTRY);
