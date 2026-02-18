import { describe, it, expect, beforeEach } from 'vitest';
import {
  store,
  getAppSettings,
  setAppSettings,
  getTheme,
  setTheme,
  getRecentProjects,
  addRecentProject,
  clearRecentProjects,
  removeRecentProject,
  updateRecentProjectPath,
  getFavoriteProjects,
  addFavoriteProject,
  removeFavoriteProject,
  isFavoriteProject,
  setFavoriteProjects,
  getNewProjectDefaults,
  setNewProjectDefaults,
  getWindowBounds,
  setWindowBounds,
  getStockLibrary,
  setStockLibrary,
  addStockToLibrary,
  updateStockInLibrary,
  removeStockFromLibrary,
  getAssemblyLibrary,
  addAssemblyToLibrary,
  updateAssemblyInLibrary,
  removeAssemblyFromLibrary,
  getLicenseKey,
  setLicenseKey,
  getLicenseData,
  setLicenseData,
  clearLicenseData,
  getLastKnownVersion,
  setLastKnownVersion,
  getHasCompletedWelcome,
  setHasCompletedWelcome,
  getUserTemplates,
  addUserTemplate,
  updateUserTemplate,
  removeUserTemplate,
  trackTemplateUsage,
  getCustomColors,
  addCustomColor,
  removeCustomColor,
  setCustomColors,
  validateAppStateExport,
  exportAppState,
  previewImport,
  importAppState,
  validateTemplateExport,
  validateAssemblyExport,
  validateStocksExport,
  exportTemplate,
  exportAssembly,
  exportStocks,
  importTemplate,
  importAssembly,
  importStocks,
  seedDefaultLibraries,
  type StockLibraryItem,
  type AssemblyLibraryItem,
  type UserTemplateItem,
  type AppStateExport
} from './store';

// ============================================================
// Factory helpers
// ============================================================

function createStock(overrides: Partial<StockLibraryItem> = {}): StockLibraryItem {
  return {
    id: 'stock-1',
    name: 'Test Stock',
    length: 96,
    width: 48,
    thickness: 0.75,
    grainDirection: 'length',
    pricingUnit: 'per_item',
    pricePerUnit: 45,
    color: '#c4a574',
    ...overrides
  };
}

function createAssembly(overrides: Partial<AssemblyLibraryItem> = {}): AssemblyLibraryItem {
  return {
    id: 'asm-1',
    name: 'Test Assembly',
    parts: [],
    groups: [],
    groupMembers: [],
    createdAt: '2026-01-01T00:00:00Z',
    modifiedAt: '2026-01-01T00:00:00Z',
    ...overrides
  };
}

function createTemplate(overrides: Partial<UserTemplateItem> = {}): UserTemplateItem {
  return {
    id: 'tmpl-1',
    name: 'Test Template',
    description: 'A test template',
    dimensions: { width: 24, depth: 18, height: 30 },
    partCount: 5,
    thumbnail: 'table',
    category: 'furniture',
    createdAt: '2026-01-01T00:00:00Z',
    project: '{}',
    ...overrides
  };
}

function createValidExport(): AppStateExport {
  return {
    version: 1,
    exportedAt: '2026-01-15T00:00:00Z',
    appVersion: '1.0.0',
    data: {
      userTemplates: [createTemplate()],
      assemblyLibrary: [createAssembly()],
      stockLibrary: [createStock()],
      customColors: ['#ff0000']
    }
  };
}

// ============================================================
// Tests
// ============================================================

describe('store', () => {
  beforeEach(() => {
    // Reset to defaults
    store.set('recentProjects', []);
    store.set('favoriteProjects', []);
    store.set('stockLibrary', []);
    store.set('assemblyLibrary', []);
    store.set('userTemplates', []);
    store.set('customColors', []);
    store.set('theme', 'dark');
    store.set('defaultUnits', 'imperial');
    store.set('defaultGridSize', 0.0625);
    store.set('confirmBeforeDelete', true);
    store.set('showHotkeyHints', true);
    store.set('licenseKey', null);
    store.set('licenseEmail', null);
    store.set('licenseOrderId', null);
    store.set('licenseActivatedAt', null);
    store.set('lastKnownVersion', null);
    store.set('hasCompletedWelcome', false);
  });

  // ============================
  // App Settings
  // ============================

  describe('getAppSettings / setAppSettings', () => {
    it('returns default settings', () => {
      const settings = getAppSettings();
      expect(settings.theme).toBe('dark');
      expect(settings.defaultUnits).toBe('imperial');
      expect(settings.confirmBeforeDelete).toBe(true);
    });

    it('updates partial settings', () => {
      setAppSettings({ theme: 'light', defaultUnits: 'metric' });
      const settings = getAppSettings();
      expect(settings.theme).toBe('light');
      expect(settings.defaultUnits).toBe('metric');
      expect(settings.confirmBeforeDelete).toBe(true); // unchanged
    });
  });

  describe('getTheme / setTheme', () => {
    it('gets and sets theme', () => {
      expect(getTheme()).toBe('dark');
      setTheme('light');
      expect(getTheme()).toBe('light');
      setTheme('system');
      expect(getTheme()).toBe('system');
    });
  });

  // ============================
  // Recent Projects
  // ============================

  describe('recent projects', () => {
    it('starts empty', () => {
      expect(getRecentProjects()).toEqual([]);
    });

    it('adds project to front', () => {
      addRecentProject('/path/a.carvd');
      addRecentProject('/path/b.carvd');
      expect(getRecentProjects()).toEqual(['/path/b.carvd', '/path/a.carvd']);
    });

    it('moves existing project to front', () => {
      addRecentProject('/path/a.carvd');
      addRecentProject('/path/b.carvd');
      addRecentProject('/path/a.carvd');
      expect(getRecentProjects()).toEqual(['/path/a.carvd', '/path/b.carvd']);
    });

    it('limits to 10 projects', () => {
      for (let i = 0; i < 15; i++) {
        addRecentProject(`/path/${i}.carvd`);
      }
      expect(getRecentProjects()).toHaveLength(10);
      expect(getRecentProjects()[0]).toBe('/path/14.carvd');
    });

    it('removes a project', () => {
      addRecentProject('/path/a.carvd');
      addRecentProject('/path/b.carvd');
      removeRecentProject('/path/a.carvd');
      expect(getRecentProjects()).toEqual(['/path/b.carvd']);
    });

    it('clears all projects', () => {
      addRecentProject('/path/a.carvd');
      clearRecentProjects();
      expect(getRecentProjects()).toEqual([]);
    });
  });

  describe('updateRecentProjectPath', () => {
    it('updates path in recent projects', () => {
      addRecentProject('/old/path.carvd');
      updateRecentProjectPath('/old/path.carvd', '/new/path.carvd');
      expect(getRecentProjects()).toEqual(['/new/path.carvd']);
    });

    it('also updates in favorites', () => {
      addRecentProject('/old/path.carvd');
      addFavoriteProject('/old/path.carvd');
      updateRecentProjectPath('/old/path.carvd', '/new/path.carvd');
      expect(getFavoriteProjects()).toEqual(['/new/path.carvd']);
    });

    it('does not update favorites if not present', () => {
      addRecentProject('/old/path.carvd');
      addFavoriteProject('/other/path.carvd');
      updateRecentProjectPath('/old/path.carvd', '/new/path.carvd');
      expect(getFavoriteProjects()).toEqual(['/other/path.carvd']);
    });
  });

  // ============================
  // Favorite Projects
  // ============================

  describe('favorite projects', () => {
    it('starts empty', () => {
      expect(getFavoriteProjects()).toEqual([]);
    });

    it('adds and checks favorites', () => {
      addFavoriteProject('/path/a.carvd');
      expect(isFavoriteProject('/path/a.carvd')).toBe(true);
      expect(isFavoriteProject('/path/b.carvd')).toBe(false);
    });

    it('does not add duplicates', () => {
      addFavoriteProject('/path/a.carvd');
      addFavoriteProject('/path/a.carvd');
      expect(getFavoriteProjects()).toHaveLength(1);
    });

    it('removes favorites', () => {
      addFavoriteProject('/path/a.carvd');
      removeFavoriteProject('/path/a.carvd');
      expect(isFavoriteProject('/path/a.carvd')).toBe(false);
    });

    it('sets favorites list directly', () => {
      setFavoriteProjects(['/a.carvd', '/b.carvd']);
      expect(getFavoriteProjects()).toEqual(['/a.carvd', '/b.carvd']);
    });
  });

  // ============================
  // Stock Library
  // ============================

  describe('stock library', () => {
    it('starts empty', () => {
      expect(getStockLibrary()).toEqual([]);
    });

    it('adds stock', () => {
      const stock = createStock();
      addStockToLibrary(stock);
      expect(getStockLibrary()).toHaveLength(1);
      expect(getStockLibrary()[0].name).toBe('Test Stock');
    });

    it('updates stock', () => {
      addStockToLibrary(createStock());
      updateStockInLibrary('stock-1', { name: 'Updated Stock' });
      expect(getStockLibrary()[0].name).toBe('Updated Stock');
    });

    it('removes stock', () => {
      addStockToLibrary(createStock());
      removeStockFromLibrary('stock-1');
      expect(getStockLibrary()).toHaveLength(0);
    });

    it('sets entire library', () => {
      setStockLibrary([createStock({ id: 'a' }), createStock({ id: 'b' })]);
      expect(getStockLibrary()).toHaveLength(2);
    });
  });

  // ============================
  // Assembly Library
  // ============================

  describe('assembly library', () => {
    it('starts empty', () => {
      expect(getAssemblyLibrary()).toEqual([]);
    });

    it('adds assembly', () => {
      addAssemblyToLibrary(createAssembly());
      expect(getAssemblyLibrary()).toHaveLength(1);
    });

    it('updates assembly', () => {
      addAssemblyToLibrary(createAssembly());
      updateAssemblyInLibrary('asm-1', { name: 'Updated' });
      expect(getAssemblyLibrary()[0].name).toBe('Updated');
    });

    it('removes assembly', () => {
      addAssemblyToLibrary(createAssembly());
      removeAssemblyFromLibrary('asm-1');
      expect(getAssemblyLibrary()).toHaveLength(0);
    });
  });

  // ============================
  // User Templates
  // ============================

  describe('user templates', () => {
    it('starts empty', () => {
      expect(getUserTemplates()).toEqual([]);
    });

    it('adds template', () => {
      addUserTemplate(createTemplate());
      expect(getUserTemplates()).toHaveLength(1);
    });

    it('updates template', () => {
      addUserTemplate(createTemplate());
      updateUserTemplate('tmpl-1', { name: 'Updated Template' });
      expect(getUserTemplates()[0].name).toBe('Updated Template');
    });

    it('removes template', () => {
      addUserTemplate(createTemplate());
      removeUserTemplate('tmpl-1');
      expect(getUserTemplates()).toHaveLength(0);
    });

    it('tracks template usage', () => {
      addUserTemplate(createTemplate());
      trackTemplateUsage('tmpl-1');
      const templates = getUserTemplates();
      expect(templates[0].lastUsedAt).toBeDefined();
    });
  });

  // ============================
  // Custom Colors
  // ============================

  describe('custom colors', () => {
    it('starts empty', () => {
      expect(getCustomColors()).toEqual([]);
    });

    it('adds a color (lowercased)', () => {
      addCustomColor('#FF0000');
      expect(getCustomColors()).toEqual(['#ff0000']);
    });

    it('rejects duplicate colors', () => {
      addCustomColor('#ff0000');
      const added = addCustomColor('#FF0000');
      expect(added).toBe(false);
      expect(getCustomColors()).toHaveLength(1);
    });

    it('removes oldest when at max (16)', () => {
      for (let i = 0; i < 16; i++) {
        addCustomColor(`#${i.toString(16).padStart(6, '0')}`);
      }
      expect(getCustomColors()).toHaveLength(16);

      addCustomColor('#ffffff');
      expect(getCustomColors()).toHaveLength(16);
      // First color should have been removed
      expect(getCustomColors()).not.toContain('#000000');
      expect(getCustomColors()).toContain('#ffffff');
    });

    it('removes a color (case-insensitive)', () => {
      addCustomColor('#ff0000');
      removeCustomColor('#FF0000');
      expect(getCustomColors()).toHaveLength(0);
    });

    it('sets colors with max limit and lowercase', () => {
      const colors = Array.from({ length: 20 }, (_, i) => `#${i.toString(16).padStart(6, '0')}`);
      setCustomColors(colors);
      expect(getCustomColors()).toHaveLength(16);
    });
  });

  // ============================
  // License Management
  // ============================

  describe('license management', () => {
    it('starts with null key', () => {
      expect(getLicenseKey()).toBeNull();
    });

    it('sets and gets license key', () => {
      setLicenseKey('test-key');
      expect(getLicenseKey()).toBe('test-key');
    });

    it('sets and gets full license data', () => {
      setLicenseData({
        licenseKey: 'key',
        licenseEmail: 'test@example.com',
        licenseOrderId: 'order-1'
      });

      const data = getLicenseData();
      expect(data.licenseKey).toBe('key');
      expect(data.licenseEmail).toBe('test@example.com');
      expect(data.licenseActivatedAt).toBeTruthy();
    });

    it('clears license data', () => {
      setLicenseData({
        licenseKey: 'key',
        licenseEmail: 'test@example.com',
        licenseOrderId: 'order-1'
      });
      clearLicenseData();

      const data = getLicenseData();
      expect(data.licenseKey).toBeNull();
      expect(data.licenseEmail).toBeNull();
    });
  });

  // ============================
  // Version tracking and Welcome
  // ============================

  describe('version tracking', () => {
    it('starts with null version', () => {
      expect(getLastKnownVersion()).toBeNull();
    });

    it('sets and gets version', () => {
      setLastKnownVersion('1.2.3');
      expect(getLastKnownVersion()).toBe('1.2.3');
    });
  });

  describe('welcome/onboarding', () => {
    it('starts as not completed', () => {
      expect(getHasCompletedWelcome()).toBe(false);
    });

    it('sets completed', () => {
      setHasCompletedWelcome(true);
      expect(getHasCompletedWelcome()).toBe(true);
    });
  });

  // ============================
  // New Project Defaults
  // ============================

  describe('new project defaults', () => {
    it('has default values', () => {
      const defaults = getNewProjectDefaults();
      expect(defaults.units).toBe('imperial');
      expect(defaults.addCommonMaterials).toBe(true);
      expect(defaults.skipSetupDialog).toBe(false);
    });

    it('updates partial defaults', () => {
      setNewProjectDefaults({ units: 'metric', skipSetupDialog: true });
      const defaults = getNewProjectDefaults();
      expect(defaults.units).toBe('metric');
      expect(defaults.skipSetupDialog).toBe(true);
      expect(defaults.addCommonMaterials).toBe(true); // unchanged
    });
  });

  // ============================
  // Window Bounds
  // ============================

  describe('window bounds', () => {
    it('has default bounds', () => {
      const bounds = getWindowBounds();
      expect(bounds.width).toBe(1200);
      expect(bounds.height).toBe(800);
    });

    it('sets custom bounds', () => {
      setWindowBounds({ width: 1920, height: 1080, x: 100, y: 50 });
      const bounds = getWindowBounds();
      expect(bounds.width).toBe(1920);
      expect(bounds.x).toBe(100);
    });
  });

  // ============================
  // Validation
  // ============================

  describe('validateAppStateExport', () => {
    it('validates correct export data', () => {
      const result = validateAppStateExport(createValidExport());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects null', () => {
      const result = validateAppStateExport(null);
      expect(result.valid).toBe(false);
    });

    it('rejects non-object', () => {
      const result = validateAppStateExport('string');
      expect(result.valid).toBe(false);
    });

    it('reports missing version', () => {
      const data = createValidExport();
      delete (data as Record<string, unknown>).version;
      const result = validateAppStateExport(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid version field');
    });

    it('reports unsupported version', () => {
      const data = createValidExport();
      data.version = 99;
      const result = validateAppStateExport(data);
      expect(result.errors.some((e) => e.includes('Unsupported version'))).toBe(true);
    });

    it('reports missing exportedAt', () => {
      const data = createValidExport();
      delete (data as Record<string, unknown>).exportedAt;
      const result = validateAppStateExport(data);
      expect(result.errors).toContain('Missing exportedAt timestamp');
    });

    it('reports missing data field', () => {
      const data = createValidExport();
      delete (data as Record<string, unknown>).data;
      const result = validateAppStateExport(data);
      expect(result.valid).toBe(false);
    });

    it('validates stock library entries', () => {
      const data = createValidExport();
      data.data.stockLibrary = [{ id: 'x', name: 'Y' } as never];
      const result = validateAppStateExport(data);
      expect(result.errors.some((e) => e.includes('invalid length'))).toBe(true);
    });

    it('validates template entries', () => {
      const data = createValidExport();
      data.data.userTemplates = [{ id: 'x' } as never];
      const result = validateAppStateExport(data);
      expect(result.errors.some((e) => e.includes('missing name'))).toBe(true);
    });

    it('validates assembly entries', () => {
      const data = createValidExport();
      data.data.assemblyLibrary = [{ id: 'x', name: 'Y' } as never];
      const result = validateAppStateExport(data);
      expect(result.errors.some((e) => e.includes('missing parts'))).toBe(true);
    });
  });

  describe('validateTemplateExport', () => {
    it('validates correct template', () => {
      const result = validateTemplateExport({
        type: 'template',
        version: 1,
        data: { id: 't1', name: 'T', project: '{}' }
      });
      expect(result.valid).toBe(true);
    });

    it('rejects wrong type', () => {
      const result = validateTemplateExport({ type: 'assembly', version: 1, data: {} });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateAssemblyExport', () => {
    it('validates correct assembly', () => {
      const result = validateAssemblyExport({
        type: 'assembly',
        version: 1,
        data: { id: 'a1', name: 'A', parts: [] }
      });
      expect(result.valid).toBe(true);
    });

    it('rejects wrong type', () => {
      const result = validateAssemblyExport({ type: 'template', version: 1, data: {} });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateStocksExport', () => {
    it('validates correct stocks', () => {
      const result = validateStocksExport({
        type: 'stocks',
        version: 1,
        data: [createStock()]
      });
      expect(result.valid).toBe(true);
    });

    it('rejects empty data', () => {
      const result = validateStocksExport({ type: 'stocks', version: 1, data: [] });
      expect(result.valid).toBe(false);
    });
  });

  // ============================
  // Export
  // ============================

  describe('exportAppState', () => {
    it('exports user data excluding built-ins', () => {
      addStockToLibrary(createStock({ id: 'user-stock' }));
      addStockToLibrary(createStock({ id: 'default-plywood-3/4' })); // built-in
      addAssemblyToLibrary(createAssembly({ id: 'user-asm' }));
      addAssemblyToLibrary(createAssembly({ id: 'default-drawer-box' })); // built-in
      addCustomColor('#ff0000');

      const exported = exportAppState('1.0.0');

      expect(exported.version).toBe(1);
      expect(exported.appVersion).toBe('1.0.0');
      expect(exported.data.stockLibrary).toHaveLength(1);
      expect(exported.data.stockLibrary[0].id).toBe('user-stock');
      expect(exported.data.assemblyLibrary).toHaveLength(1);
      expect(exported.data.assemblyLibrary[0].id).toBe('user-asm');
      expect(exported.data.customColors).toEqual(['#ff0000']);
    });
  });

  describe('exportTemplate', () => {
    it('exports existing template', () => {
      addUserTemplate(createTemplate({ id: 'tmpl-1' }));
      const result = exportTemplate('tmpl-1', '1.0.0');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('template');
      expect(result!.data.id).toBe('tmpl-1');
    });

    it('returns null for non-existent template', () => {
      expect(exportTemplate('nonexistent', '1.0.0')).toBeNull();
    });
  });

  describe('exportAssembly', () => {
    it('exports assembly with referenced stocks', () => {
      addStockToLibrary(createStock({ id: 'ref-stock' }));
      addAssemblyToLibrary(
        createAssembly({
          id: 'asm-1',
          parts: [
            {
              name: 'Part',
              length: 10,
              width: 5,
              thickness: 0.75,
              relativePosition: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              stockId: 'ref-stock',
              grainSensitive: false,
              grainDirection: 'length',
              color: '#000'
            }
          ]
        })
      );

      const result = exportAssembly('asm-1', '1.0.0');
      expect(result!.referencedStocks).toHaveLength(1);
      expect(result!.referencedStocks[0].id).toBe('ref-stock');
    });
  });

  describe('exportStocks', () => {
    it('exports selected stocks', () => {
      addStockToLibrary(createStock({ id: 'a' }));
      addStockToLibrary(createStock({ id: 'b' }));
      const result = exportStocks(['a'], '1.0.0');
      expect(result!.data).toHaveLength(1);
      expect(result!.data[0].id).toBe('a');
    });

    it('returns null for no matching stocks', () => {
      expect(exportStocks(['nonexistent'], '1.0.0')).toBeNull();
    });
  });

  // ============================
  // Import
  // ============================

  describe('previewImport', () => {
    it('returns counts and duplicates', () => {
      addStockToLibrary(createStock({ id: 'stock-1' }));

      const exportData = createValidExport();
      const preview = previewImport(exportData);

      expect(preview.valid).toBe(true);
      expect(preview.counts.templates).toBe(1);
      expect(preview.counts.stocks).toBe(1);
      expect(preview.duplicates.stocks).toEqual(['Test Stock']);
    });

    it('returns invalid for bad data', () => {
      const preview = previewImport({ version: 99 } as never);
      expect(preview.valid).toBe(false);
    });
  });

  describe('importAppState', () => {
    it('imports with replace strategy', () => {
      addUserTemplate(createTemplate({ id: 'existing' }));
      const data = createValidExport();

      const result = importAppState(data, {
        mergeStrategy: 'replace',
        includeTemplates: true,
        includeAssemblies: true,
        includeStocks: true,
        includeColors: true
      });

      expect(result.success).toBe(true);
      expect(result.imported.templates).toBe(1);
      expect(getUserTemplates()).toHaveLength(1); // replaced, not merged
    });

    it('imports with merge strategy (skips duplicates)', () => {
      addStockToLibrary(createStock({ id: 'stock-1' }));
      const data = createValidExport();

      const result = importAppState(data, {
        mergeStrategy: 'merge',
        includeTemplates: true,
        includeAssemblies: true,
        includeStocks: true,
        includeColors: true
      });

      expect(result.success).toBe(true);
      expect(result.skipped.stocks).toBe(1);
      expect(result.imported.stocks).toBe(0);
    });

    it('respects include flags', () => {
      const data = createValidExport();

      const result = importAppState(data, {
        mergeStrategy: 'replace',
        includeTemplates: false,
        includeAssemblies: false,
        includeStocks: true,
        includeColors: false
      });

      expect(result.success).toBe(true);
      expect(result.imported.templates).toBe(0);
      expect(result.imported.stocks).toBe(1);
    });

    it('rejects invalid data', () => {
      const result = importAppState({ version: 99 } as never, {
        mergeStrategy: 'replace',
        includeTemplates: true,
        includeAssemblies: true,
        includeStocks: true,
        includeColors: true
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('importTemplate', () => {
    it('imports new template', () => {
      const data = {
        version: 1,
        type: 'template' as const,
        exportedAt: '2026-01-01T00:00:00Z',
        appVersion: '1.0.0',
        data: createTemplate({ id: 'new-tmpl' })
      };

      const result = importTemplate(data, { replaceIfExists: false });
      expect(result.success).toBe(true);
      expect(result.templateId).toBe('new-tmpl');
      expect(getUserTemplates()).toHaveLength(1);
    });

    it('replaces existing when flag is set', () => {
      addUserTemplate(createTemplate({ id: 'tmpl-1', name: 'Old' }));

      const data = {
        version: 1,
        type: 'template' as const,
        exportedAt: '2026-01-01T00:00:00Z',
        appVersion: '1.0.0',
        data: createTemplate({ id: 'tmpl-1', name: 'New' })
      };

      importTemplate(data, { replaceIfExists: true });
      expect(getUserTemplates()[0].name).toBe('New');
    });

    it('creates copy when duplicate exists and replaceIfExists is false', () => {
      addUserTemplate(createTemplate({ id: 'tmpl-1' }));

      const data = {
        version: 1,
        type: 'template' as const,
        exportedAt: '2026-01-01T00:00:00Z',
        appVersion: '1.0.0',
        data: createTemplate({ id: 'tmpl-1' })
      };

      const result = importTemplate(data, { replaceIfExists: false });
      expect(result.success).toBe(true);
      expect(result.templateId).toContain('imported');
      expect(getUserTemplates()).toHaveLength(2);
    });
  });

  describe('importStocks', () => {
    it('imports new stocks', () => {
      const data = {
        version: 1,
        type: 'stocks' as const,
        exportedAt: '2026-01-01T00:00:00Z',
        appVersion: '1.0.0',
        data: [createStock({ id: 'new-1' }), createStock({ id: 'new-2' })]
      };

      const result = importStocks(data, { replaceIfExists: false });
      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
    });

    it('skips existing when replaceIfExists is false', () => {
      addStockToLibrary(createStock({ id: 'existing' }));

      const data = {
        version: 1,
        type: 'stocks' as const,
        exportedAt: '2026-01-01T00:00:00Z',
        appVersion: '1.0.0',
        data: [createStock({ id: 'existing' })]
      };

      const result = importStocks(data, { replaceIfExists: false });
      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('replaces existing when replaceIfExists is true', () => {
      addStockToLibrary(createStock({ id: 'existing', name: 'Old' }));

      const data = {
        version: 1,
        type: 'stocks' as const,
        exportedAt: '2026-01-01T00:00:00Z',
        appVersion: '1.0.0',
        data: [createStock({ id: 'existing', name: 'New' })]
      };

      const result = importStocks(data, { replaceIfExists: true });
      expect(result.imported).toBe(1);
      expect(getStockLibrary()[0].name).toBe('New');
    });
  });

  describe('importAssembly', () => {
    it('imports assembly with referenced stocks', () => {
      const data = {
        version: 1,
        type: 'assembly' as const,
        exportedAt: '2026-01-01T00:00:00Z',
        appVersion: '1.0.0',
        data: createAssembly({ id: 'new-asm' }),
        referencedStocks: [createStock({ id: 'ref-stock' })]
      };

      const result = importAssembly(data, { replaceIfExists: false, importStocks: true });
      expect(result.success).toBe(true);
      expect(result.stocksImported).toBe(1);
      expect(getStockLibrary()).toHaveLength(1);
    });
  });

  // ============================
  // Seed defaults
  // ============================

  describe('seedDefaultLibraries', () => {
    it('seeds stock and assembly library when empty', () => {
      seedDefaultLibraries();
      expect(getStockLibrary().length).toBeGreaterThan(0);
      expect(getAssemblyLibrary().length).toBeGreaterThan(0);
    });

    it('does not overwrite existing libraries', () => {
      addStockToLibrary(createStock({ id: 'my-stock' }));
      addAssemblyToLibrary(createAssembly({ id: 'my-asm' }));

      seedDefaultLibraries();

      expect(getStockLibrary()).toHaveLength(1);
      expect(getStockLibrary()[0].id).toBe('my-stock');
    });
  });
});
