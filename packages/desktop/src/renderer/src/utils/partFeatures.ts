import { AssemblyPart, Part, PartFeature, PartFeatureReference, PartFeatureTarget } from '../types';

function cloneFeatureTarget(target: PartFeatureTarget): PartFeatureTarget {
  if (target.type === 'face') {
    return { type: 'face', face: target.face };
  }
  if (target.type === 'edge') {
    return { type: 'edge', edge: target.edge };
  }
  return { type: 'corner', corner: target.corner };
}

function cloneFeatureReference(reference: PartFeatureReference): PartFeatureReference {
  return {
    primaryFrom: reference.primaryFrom,
    secondaryFrom: reference.secondaryFrom,
    tertiaryFrom: reference.tertiaryFrom
  };
}

export function clonePartFeature(feature: PartFeature): PartFeature {
  if (feature.kind === 'end_cut') {
    return {
      ...feature,
      target: cloneFeatureTarget(feature.target) as PartFeature['target'],
      reference: cloneFeatureReference(feature.reference),
      metadata: feature.metadata ? { ...feature.metadata } : undefined,
      parameters: { ...feature.parameters }
    };
  }

  return {
    ...feature,
    target: cloneFeatureTarget(feature.target) as PartFeature['target'],
    reference: cloneFeatureReference(feature.reference),
    metadata: feature.metadata ? { ...feature.metadata } : undefined,
    parameters: {
      ...feature.parameters,
      size: { ...feature.parameters.size }
    },
    placement: { ...feature.placement }
  };
}

export function clonePartFeatures(features?: PartFeature[]): PartFeature[] {
  return features?.map((feature) => clonePartFeature(feature)) ?? [];
}

export function normalizePart(part: Part): Part {
  return {
    ...part,
    rotation: part.rotation ?? { x: 0, y: 0, z: 0 },
    grainSensitive: part.grainSensitive ?? true,
    grainDirection: part.grainDirection ?? 'length',
    features: clonePartFeatures(part.features)
  };
}

export function normalizeAssemblyPart(part: AssemblyPart): AssemblyPart {
  return {
    ...part,
    rotation: part.rotation ?? { x: 0, y: 0, z: 0 },
    grainSensitive: part.grainSensitive ?? true,
    grainDirection: part.grainDirection ?? 'length',
    features: clonePartFeatures(part.features)
  };
}
