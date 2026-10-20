import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import type { Part, PartFeature, Stock } from '../types';
import { getDowelVisualizations } from './dowelJointUtils';
import { resolveStockForm } from '../../../shared/stock';
import { formatFabricationMeasurement } from './fractions';

/**
 * Turn dowel joints authored the old way into real dowels.
 *
 * A dowel joint used to be a pair of metadata blobs stapled onto two holes,
 * with the dowel itself drawn from that metadata and existing nowhere else.
 * Now a dowel is a piece of wood cut from dowel stock, so the joints already
 * in a project have to become that too -- otherwise the same project means
 * two different things depending on when its joints were made.
 *
 * The holes stay exactly where they were bored. Only the metadata goes, and a
 * real dowel takes the place of the picture that stood in for it.
 */

/** Rod stock is sold in lengths; 36" is the common one. */
const DEFAULT_ROD_LENGTH = 36;

export interface DowelJointMigration {
  /** Rod stock the project did not have yet, one per diameter. */
  newStocks: Stock[];
  /** A real dowel for every joint member. */
  newParts: Part[];
  /** The bored parts, with their joint metadata stripped. */
  updatedParts: Part[];
  /** How many joints were converted. */
  jointCount: number;
}

/** Whether this project still holds joints made the old way. */
export function countLegacyDowelJoints(parts: Part[]): number {
  const joints = new Set<string>();
  for (const part of parts) {
    for (const feature of part.features ?? []) {
      const metadata = feature.metadata?.dowelJoint as { jointId?: string } | undefined;
      if (metadata?.jointId) joints.add(metadata.jointId);
    }
  }
  return joints.size;
}

/** The rotation that lays a part's length along `axis`. */
function rotationAlong(axis: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(axis.x, axis.y, axis.z).normalize()
  );
  const euler = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ');
  const degrees = (radians: number) => (radians * 180) / Math.PI;
  return { x: degrees(euler.x), y: degrees(euler.y), z: degrees(euler.z) };
}

function stripDowelMetadata(feature: PartFeature): PartFeature {
  if (!feature.metadata || !('dowelJoint' in feature.metadata)) return feature;
  const metadata = { ...feature.metadata };
  delete metadata.dowelJoint;
  return Object.keys(metadata).length > 0 ? { ...feature, metadata } : { ...feature, metadata: undefined };
}

/** Match on diameter, since that is what makes one rod usable for a dowel. */
function findRodStock(stocks: Stock[], diameter: number): Stock | undefined {
  return stocks.find((stock) => resolveStockForm(stock) === 'rod' && Math.abs(stock.width - diameter) < 1e-6);
}

export function planDowelJointMigration(
  parts: Part[],
  stocks: Stock[],
  units: 'imperial' | 'metric'
): DowelJointMigration {
  const visuals = getDowelVisualizations(parts);
  const newStocks: Stock[] = [];
  const newParts: Part[] = [];
  const joints = new Set<string>();

  for (const visual of visuals) {
    joints.add(visual.jointId);

    let stock = findRodStock(stocks, visual.diameter) ?? findRodStock(newStocks, visual.diameter);
    if (!stock) {
      stock = {
        id: uuidv4(),
        name: `${formatFabricationMeasurement(visual.diameter, units)} Dowel`,
        length: DEFAULT_ROD_LENGTH,
        width: visual.diameter,
        thickness: visual.diameter,
        grainDirection: 'length',
        pricingUnit: 'per_item',
        pricePerUnit: 0,
        color: '#c89b5b',
        form: 'rod'
      };
      newStocks.push(stock);
    }

    newParts.push({
      id: uuidv4(),
      name: `Dowel ${newParts.length + 1}`,
      length: visual.length,
      width: visual.diameter,
      thickness: visual.diameter,
      position: { ...visual.center },
      rotation: rotationAlong(visual.axis),
      stockId: stock.id,
      grainSensitive: false,
      grainDirection: 'length',
      color: stock.color
    });
  }

  const updatedParts = parts.map((part) => {
    const features = part.features ?? [];
    if (!features.some((feature) => feature.metadata?.dowelJoint)) return part;
    return { ...part, features: features.map(stripDowelMetadata) };
  });

  return { newStocks, newParts, updatedParts, jointCount: joints.size };
}
