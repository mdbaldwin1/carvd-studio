import { describe, it, expect } from 'vitest';
import {
  builtInTemplates,
  tutorialTemplate,
  simpleDeskTemplate,
  bookshelfTemplate,
  endTableTemplate,
  getBuiltInTemplate,
  getAllTemplates,
  formatDimensions
} from './index';
import type { UserTemplate } from './types';
import type { Project } from '../types';

describe('templates/index', () => {
  describe('built-in templates', () => {
    it('exports 4 built-in templates', () => {
      expect(builtInTemplates).toHaveLength(4);
    });

    it('has tutorial template first', () => {
      expect(builtInTemplates[0]).toBe(tutorialTemplate);
      expect(builtInTemplates[0].id).toBe('tutorial');
    });

    it('includes all expected templates', () => {
      const ids = builtInTemplates.map((t) => t.id);
      expect(ids).toContain('tutorial');
      expect(ids).toContain('simple-desk');
      expect(ids).toContain('basic-bookshelf');
      expect(ids).toContain('end-table');
    });

    it('all templates have required metadata', () => {
      for (const template of builtInTemplates) {
        expect(template.type).toBe('built-in');
        expect(template.name).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.dimensions).toBeDefined();
        expect(template.dimensions.width).toBeGreaterThan(0);
        expect(template.dimensions.depth).toBeGreaterThan(0);
        expect(template.dimensions.height).toBeGreaterThan(0);
        expect(template.partCount).toBeGreaterThan(0);
        expect(template.category).toBeTruthy();
        expect(typeof template.generate).toBe('function');
      }
    });

    it('generate() returns a valid project', () => {
      const project = simpleDeskTemplate.generate();
      expect(project.parts).toBeDefined();
      expect(project.parts.length).toBe(simpleDeskTemplate.partCount);
      expect(project.stocks).toBeDefined();
    });

    it('generate() returns fresh instances each call', () => {
      const project1 = tutorialTemplate.generate();
      const project2 = tutorialTemplate.generate();
      expect(project1).not.toBe(project2);
      expect(project1.parts[0]).not.toBe(project2.parts[0]);
    });
  });

  describe('getBuiltInTemplate', () => {
    it('finds template by id', () => {
      const template = getBuiltInTemplate('simple-desk');
      expect(template).toBeDefined();
      expect(template?.name).toContain('Desk');
    });

    it('returns undefined for unknown id', () => {
      expect(getBuiltInTemplate('non-existent')).toBeUndefined();
    });

    it('finds all built-in templates by id', () => {
      for (const t of builtInTemplates) {
        expect(getBuiltInTemplate(t.id)).toBe(t);
      }
    });
  });

  describe('getAllTemplates', () => {
    it('returns only built-in templates when no user templates', () => {
      const all = getAllTemplates([]);
      expect(all).toHaveLength(4);
      expect(all.every((t) => t.type === 'built-in')).toBe(true);
    });

    it('combines built-in and user templates', () => {
      const userTemplates: UserTemplate[] = [
        {
          type: 'user',
          id: 'user-1',
          name: 'My Template',
          description: 'Custom',
          dimensions: { width: 10, depth: 10, height: 10 },
          partCount: 1,
          thumbnail: '🪑',
          category: 'furniture',
          createdAt: '2026-01-01',
          project: { parts: [], stocks: [], groups: [], groupMembers: [] } as unknown as Project
        }
      ];
      const all = getAllTemplates(userTemplates);
      expect(all).toHaveLength(5);
      expect(all[4].type).toBe('user');
      expect(all[4].id).toBe('user-1');
    });

    it('places built-in templates before user templates', () => {
      const userTemplates: UserTemplate[] = [
        {
          type: 'user',
          id: 'user-1',
          name: 'First',
          description: '',
          dimensions: { width: 1, depth: 1, height: 1 },
          partCount: 0,
          thumbnail: '',
          category: 'other',
          createdAt: '2026-01-01',
          project: {} as unknown as Project
        }
      ];
      const all = getAllTemplates(userTemplates);
      // First 4 are built-in
      for (let i = 0; i < 4; i++) {
        expect(all[i].type).toBe('built-in');
      }
      // Last is user
      expect(all[4].type).toBe('user');
    });
  });

  describe('formatDimensions', () => {
    it('formats dimensions with inch marks', () => {
      expect(formatDimensions({ width: 24, depth: 18, height: 30 })).toBe('24" × 18" × 30"');
    });

    it('handles decimal dimensions', () => {
      expect(formatDimensions({ width: 24.5, depth: 18.75, height: 30.25 })).toBe('24.5" × 18.75" × 30.25"');
    });

    it('handles zero dimensions', () => {
      expect(formatDimensions({ width: 0, depth: 0, height: 0 })).toBe('0" × 0" × 0"');
    });
  });

  describe('individual template exports', () => {
    it('exports tutorialTemplate with correct id', () => {
      expect(tutorialTemplate.id).toBe('tutorial');
    });

    it('exports simpleDeskTemplate with correct id', () => {
      expect(simpleDeskTemplate.id).toBe('simple-desk');
    });

    it('exports bookshelfTemplate with correct id', () => {
      expect(bookshelfTemplate.id).toBe('basic-bookshelf');
    });

    it('exports endTableTemplate with correct id', () => {
      expect(endTableTemplate.id).toBe('end-table');
    });
  });
});
