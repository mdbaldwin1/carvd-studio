/**
 * Project Templates
 *
 * This module provides built-in project templates and utilities
 * for managing user-created templates. Template definitions are
 * stored in JSON files for single-source-of-truth consistency.
 */

export * from './types';

import { BuiltInTemplate, UserTemplate, ProjectTemplate, TemplateThumbnailData } from './types';
import { loadTemplateFromJSON, TemplateDefinition } from './loader';

// Import template JSON data
import simpleDeskData from './data/simple-desk.template.json';
import bookshelfData from './data/bookshelf.template.json';
import endTableData from './data/end-table.template.json';
import tutorialData from './data/tutorial.template.json';

// Import pre-generated thumbnails
import thumbnailsData from './thumbnails.json';

// Type for thumbnails data structure
interface ThumbnailsData {
  templates: Record<string, TemplateThumbnailData>;
  assemblies: Record<string, TemplateThumbnailData>;
}

// Get thumbnails with proper typing (handles both old and new formats)
function getThumbnails(): ThumbnailsData {
  // Handle new format with templates/assemblies keys
  if ('templates' in thumbnailsData) {
    return thumbnailsData as ThumbnailsData;
  }
  // Handle old format (flat structure) - treat all as templates
  return {
    templates: thumbnailsData as Record<string, TemplateThumbnailData>,
    assemblies: {}
  };
}

/**
 * Create a BuiltInTemplate from a JSON template definition
 */
function createBuiltInTemplate(data: TemplateDefinition, thumbnailData?: TemplateThumbnailData): BuiltInTemplate {
  return {
    type: 'built-in',
    id: data.id,
    name: data.name,
    description: data.description,
    dimensions: data.dimensions,
    partCount: data.parts.length,
    thumbnail: data.thumbnail,
    thumbnailData,
    category: data.category as 'furniture' | 'storage' | 'shop' | 'other',
    generate: () => loadTemplateFromJSON(data)
  };
}

// Get thumbnails data
const thumbnails = getThumbnails();

// Create template objects from JSON data with thumbnails
export const tutorialTemplate: BuiltInTemplate = createBuiltInTemplate(
  tutorialData as TemplateDefinition,
  thumbnails.templates['tutorial']
);

export const simpleDeskTemplate: BuiltInTemplate = createBuiltInTemplate(
  simpleDeskData as TemplateDefinition,
  thumbnails.templates['simple-desk']
);

export const bookshelfTemplate: BuiltInTemplate = createBuiltInTemplate(
  bookshelfData as TemplateDefinition,
  thumbnails.templates['basic-bookshelf']
);

export const endTableTemplate: BuiltInTemplate = createBuiltInTemplate(
  endTableData as TemplateDefinition,
  thumbnails.templates['end-table']
);

/**
 * All built-in templates (tutorial first)
 */
export const builtInTemplates: BuiltInTemplate[] = [
  tutorialTemplate,
  simpleDeskTemplate,
  bookshelfTemplate,
  endTableTemplate
];

/**
 * Get a built-in template by ID
 */
export function getBuiltInTemplate(id: string): BuiltInTemplate | undefined {
  return builtInTemplates.find((t) => t.id === id);
}

/**
 * Get all templates (built-in + user), with built-in templates first
 */
export function getAllTemplates(userTemplates: UserTemplate[]): ProjectTemplate[] {
  return [...builtInTemplates, ...userTemplates];
}

/**
 * Format dimensions for display
 */
export function formatDimensions(dimensions: { width: number; depth: number; height: number }): string {
  return `${dimensions.width}" × ${dimensions.depth}" × ${dimensions.height}"`;
}
