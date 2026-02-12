/**
 * Built-in Assemblies
 *
 * Pre-defined assembly templates that ship with the app.
 * These are loaded from JSON files for consistency with templates.
 */

import { Assembly, AssemblyThumbnailData } from '../types';
import { loadAssemblyFromJSON, AssemblyDefinition } from './loader';

// Import assembly JSON data
import drawerBoxData from './data/drawer-box.assembly.json';
import faceFrameData from './data/face-frame.assembly.json';

// Import pre-generated thumbnails
import thumbnailsData from './thumbnails.json';

// Type for thumbnails data structure
interface ThumbnailsData {
  templates: Record<string, AssemblyThumbnailData>;
  assemblies: Record<string, AssemblyThumbnailData>;
}

// Get thumbnails with proper typing
function getThumbnails(): ThumbnailsData {
  if ('assemblies' in thumbnailsData) {
    return thumbnailsData as ThumbnailsData;
  }
  return { templates: {}, assemblies: {} };
}

/**
 * Load a built-in assembly from JSON data with optional thumbnail
 * Returns a fresh instance each time (with new timestamps)
 */
function loadBuiltInAssembly(data: AssemblyDefinition, thumbnailData?: AssemblyThumbnailData): Assembly {
  const assembly = loadAssemblyFromJSON(data);
  if (thumbnailData) {
    assembly.thumbnailData = thumbnailData;
  }
  return assembly;
}

// Get thumbnails data
const thumbnails = getThumbnails();

/**
 * Get all built-in assemblies
 * Creates fresh instances to avoid mutation issues
 */
export function getBuiltInAssemblies(): Assembly[] {
  return [
    loadBuiltInAssembly(drawerBoxData as AssemblyDefinition, thumbnails.assemblies['built-in-drawer-box']),
    loadBuiltInAssembly(faceFrameData as AssemblyDefinition, thumbnails.assemblies['built-in-face-frame'])
  ];
}

/**
 * Check if an assembly ID is a built-in assembly
 */
export function isBuiltInAssembly(id: string): boolean {
  return id === 'built-in-drawer-box' || id === 'built-in-face-frame';
}

/**
 * Get a specific built-in assembly by ID
 */
export function getBuiltInAssembly(id: string): Assembly | undefined {
  if (id === 'built-in-drawer-box') {
    return loadBuiltInAssembly(drawerBoxData as AssemblyDefinition, thumbnails.assemblies['built-in-drawer-box']);
  }
  if (id === 'built-in-face-frame') {
    return loadBuiltInAssembly(faceFrameData as AssemblyDefinition, thumbnails.assemblies['built-in-face-frame']);
  }
  return undefined;
}
