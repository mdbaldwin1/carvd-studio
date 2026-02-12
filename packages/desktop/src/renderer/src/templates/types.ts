/**
 * Template system types
 */

import { Project } from '../types';

/**
 * Thumbnail data for templates (base64 encoded image)
 */
export interface TemplateThumbnailData {
  data: string; // Base64 encoded PNG
  width: number;
  height: number;
  generatedAt: string;
  manuallySet?: boolean; // If true, don't auto-override this thumbnail
}

/**
 * Metadata for a project template
 */
export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  dimensions: {
    width: number;
    depth: number;
    height: number;
  };
  partCount: number;
  thumbnail: string; // Emoji fallback
  thumbnailData?: TemplateThumbnailData; // Base64 image thumbnail (preferred)
  category: 'furniture' | 'storage' | 'shop' | 'other';
}

/**
 * Built-in template (generated via code)
 */
export interface BuiltInTemplate extends TemplateMetadata {
  type: 'built-in';
  generate: () => Project;
}

/**
 * User-created template (stored in electron-store)
 */
export interface UserTemplate extends TemplateMetadata {
  type: 'user';
  createdAt: string;
  lastUsedAt?: string; // Track when template was last used for "recently used" ordering
  project: Project;
}

/**
 * Union type for all templates
 */
export type ProjectTemplate = BuiltInTemplate | UserTemplate;

/**
 * Template with source indicator for UI
 */
export interface TemplateWithSource {
  template: ProjectTemplate;
  isBuiltIn: boolean;
}
