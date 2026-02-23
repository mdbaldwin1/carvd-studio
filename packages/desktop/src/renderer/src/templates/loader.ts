/**
 * Template and Assembly JSON Loader
 *
 * Loads template and assembly definitions from JSON files, converting
 * reference IDs (_refId) to fresh UUIDs for each instantiation.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Project,
  Stock,
  Part,
  Group,
  GroupMember,
  Assembly,
  AssemblyPart,
  AssemblyGroup,
  AssemblyGroupMember,
  Rotation3D,
  StockConstraintSettings
} from '../types';

// ============================================================
// JSON Schema Types (what's stored in .template.json files)
// ============================================================

export interface TemplateStockDefinition {
  _refId: string;
  name: string;
  length: number;
  width: number;
  thickness: number;
  grainDirection: 'length' | 'width' | 'none';
  pricingUnit: 'board_foot' | 'per_item';
  pricePerUnit: number;
  color: string;
}

export interface TemplatePartDefinition {
  _refId: string;
  name: string;
  length: number;
  width: number;
  thickness: number;
  position: { x: number; y: number; z: number };
  rotation: Rotation3D;
  stockRefId: string;
  grainSensitive: boolean;
  grainDirection: 'length' | 'width';
  color: string;
  notes?: string;
  extraLength?: number;
  extraWidth?: number;
  glueUpPanel?: boolean;
  ignoreOverlap?: boolean;
}

export interface TemplateGroupDefinition {
  _refId: string;
  name: string;
}

export interface TemplateGroupMemberDefinition {
  groupRefId: string;
  memberType: 'part' | 'group';
  memberRefId: string;
}

export interface TemplateProjectSettings {
  units: 'imperial' | 'metric';
  gridSize: number;
  kerfWidth: number;
  overageFactor: number;
  projectNotes: string;
  stockConstraints: StockConstraintSettings;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail: string;
  dimensions: { width: number; depth: number; height: number };
  projectSettings: TemplateProjectSettings;
  stocks: TemplateStockDefinition[];
  parts: TemplatePartDefinition[];
  groups: TemplateGroupDefinition[];
  groupMembers: TemplateGroupMemberDefinition[];
}

// ============================================================
// Assembly JSON Schema Types (what's stored in .assembly.json files)
// ============================================================

export interface AssemblyPartDefinition {
  _refId: string;
  name: string;
  length: number;
  width: number;
  thickness: number;
  relativePosition: { x: number; y: number; z: number };
  rotation: Rotation3D;
  grainSensitive: boolean;
  grainDirection: 'length' | 'width';
  color: string;
  notes?: string;
  extraLength?: number;
  extraWidth?: number;
  embeddedStock?: {
    name: string;
    length: number;
    width: number;
    thickness: number;
    grainDirection: 'length' | 'width' | 'none';
    pricingUnit: 'board_foot' | 'per_item';
    pricePerUnit: number;
    color: string;
  };
}

export interface AssemblyGroupDefinition {
  _refId: string;
  name: string;
}

export interface AssemblyGroupMemberDefinition {
  groupRefId: string;
  memberType: 'part' | 'group';
  memberRefId: string;
}

export interface AssemblyDefinition {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  category?: string;
  parts: AssemblyPartDefinition[];
  groups: AssemblyGroupDefinition[];
  groupMembers: AssemblyGroupMemberDefinition[];
}

// ============================================================
// Loader Functions
// ============================================================

/**
 * Load a template definition from JSON and generate a fresh Project
 * with new UUIDs for all entities.
 */
export function loadTemplateFromJSON(data: TemplateDefinition): Project {
  // Build reference ID → UUID mapping
  const refIdMap = new Map<string, string>();

  // Generate fresh UUIDs for all entities
  for (const stock of data.stocks) {
    refIdMap.set(stock._refId, uuidv4());
  }
  for (const part of data.parts) {
    refIdMap.set(part._refId, uuidv4());
  }
  for (const group of data.groups) {
    refIdMap.set(group._refId, uuidv4());
  }

  // Transform stocks
  const stocks: Stock[] = data.stocks.map((s) => ({
    id: refIdMap.get(s._refId)!,
    name: s.name,
    length: s.length,
    width: s.width,
    thickness: s.thickness,
    grainDirection: s.grainDirection,
    pricingUnit: s.pricingUnit,
    pricePerUnit: s.pricePerUnit,
    color: s.color
  }));

  // Transform parts
  const parts: Part[] = data.parts.map((p) => ({
    id: refIdMap.get(p._refId)!,
    name: p.name,
    length: p.length,
    width: p.width,
    thickness: p.thickness,
    position: { ...p.position },
    rotation: { ...p.rotation },
    stockId: p.stockRefId ? (refIdMap.get(p.stockRefId) ?? null) : null,
    grainSensitive: p.grainSensitive,
    grainDirection: p.grainDirection,
    color: p.color,
    notes: p.notes,
    extraLength: p.extraLength,
    extraWidth: p.extraWidth,
    glueUpPanel: p.glueUpPanel,
    ignoreOverlap: p.ignoreOverlap
  }));

  // Transform groups
  const groups: Group[] = data.groups.map((g) => ({
    id: refIdMap.get(g._refId)!,
    name: g.name
  }));

  // Transform group members
  const groupMembers: GroupMember[] = data.groupMembers.map((gm) => ({
    id: uuidv4(),
    groupId: refIdMap.get(gm.groupRefId)!,
    memberType: gm.memberType,
    memberId: refIdMap.get(gm.memberRefId)!
  }));

  const now = new Date().toISOString();

  return {
    version: '1.0',
    name: data.name,
    stocks,
    parts,
    groups,
    groupMembers,
    assemblies: [],
    units: data.projectSettings.units,
    gridSize: data.projectSettings.gridSize,
    kerfWidth: data.projectSettings.kerfWidth,
    overageFactor: data.projectSettings.overageFactor,
    projectNotes: data.projectSettings.projectNotes,
    stockConstraints: { ...data.projectSettings.stockConstraints },
    createdAt: now,
    modifiedAt: now
  };
}

/**
 * Load an assembly definition from JSON and generate a fresh Assembly
 * with new UUIDs and properly mapped references.
 */
export function loadAssemblyFromJSON(data: AssemblyDefinition): Assembly {
  // Build reference ID → index mapping for parts and groups
  const partRefIdToIndex = new Map<string, number>();
  const groupRefIdToIndex = new Map<string, number>();

  data.parts.forEach((p, idx) => {
    partRefIdToIndex.set(p._refId, idx);
  });
  data.groups.forEach((g, idx) => {
    groupRefIdToIndex.set(g._refId, idx);
  });

  // Transform parts to AssemblyPart format
  const parts: AssemblyPart[] = data.parts.map((p) => {
    const assemblyPart: AssemblyPart = {
      name: p.name,
      length: p.length,
      width: p.width,
      thickness: p.thickness,
      relativePosition: { ...p.relativePosition },
      rotation: { ...p.rotation },
      stockId: null, // Assemblies don't reference project stocks directly
      grainSensitive: p.grainSensitive,
      grainDirection: p.grainDirection,
      color: p.color,
      notes: p.notes,
      extraLength: p.extraLength,
      extraWidth: p.extraWidth
    };

    // Add embedded stock if present
    if (p.embeddedStock) {
      assemblyPart.embeddedStock = {
        name: p.embeddedStock.name,
        length: p.embeddedStock.length,
        width: p.embeddedStock.width,
        thickness: p.embeddedStock.thickness,
        grainDirection: p.embeddedStock.grainDirection,
        pricingUnit: p.embeddedStock.pricingUnit,
        pricePerUnit: p.embeddedStock.pricePerUnit,
        color: p.embeddedStock.color
      };
    }

    return assemblyPart;
  });

  // Transform groups to AssemblyGroup format
  const groups: AssemblyGroup[] = data.groups.map((g) => ({
    originalId: uuidv4(), // Generate ID for internal mapping
    name: g.name
  }));

  // Transform group members to AssemblyGroupMember format
  const groupMembers: AssemblyGroupMember[] = data.groupMembers
    .map((gm) => {
      const groupIndex = groupRefIdToIndex.get(gm.groupRefId);
      let memberIndex: number;

      if (gm.memberType === 'part') {
        memberIndex = partRefIdToIndex.get(gm.memberRefId) ?? -1;
      } else {
        memberIndex = groupRefIdToIndex.get(gm.memberRefId) ?? -1;
      }

      return {
        groupIndex: groupIndex ?? -1,
        memberType: gm.memberType,
        memberIndex
      };
    })
    .filter((gm) => gm.groupIndex >= 0 && gm.memberIndex >= 0);

  const now = new Date().toISOString();

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    thumbnail: data.thumbnail,
    parts,
    groups,
    groupMembers,
    createdAt: now,
    modifiedAt: now
  };
}

/**
 * Get metadata from a template definition without generating a full project.
 * Useful for displaying template info in the UI.
 */
export function getTemplateMetadata(data: TemplateDefinition) {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    category: data.category,
    thumbnail: data.thumbnail,
    dimensions: data.dimensions,
    partCount: data.parts.length,
    stockCount: data.stocks.length
  };
}

/**
 * Get metadata from an assembly definition without generating a full assembly.
 */
export function getAssemblyMetadata(data: AssemblyDefinition) {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    category: data.category,
    thumbnail: data.thumbnail,
    partCount: data.parts.length
  };
}
