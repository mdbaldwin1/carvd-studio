import Store from 'electron-store';

// Stock type for app-level library (mirrors renderer Stock type)
export interface StockLibraryItem {
  id: string;
  name: string;
  length: number;
  width: number;
  thickness: number;
  grainDirection: 'length' | 'width' | 'none';
  pricingUnit: 'board_foot' | 'per_item';
  pricePerUnit: number;
  color: string;
}

// Assembly types for app-level library (mirrors renderer Assembly types)
export interface AssemblyPartItem {
  name: string;
  length: number;
  width: number;
  thickness: number;
  relativePosition: { x: number; y: number; z: number };
  rotation: { x: 0 | 90 | 180 | 270; y: 0 | 90 | 180 | 270; z: 0 | 90 | 180 | 270 };
  stockId: string | null;
  grainSensitive: boolean;
  grainDirection: 'length' | 'width';
  color: string;
  notes?: string;
  extraLength?: number;
  extraWidth?: number;
}

export interface AssemblyGroupItem {
  originalId: string;
  name: string;
}

export interface AssemblyGroupMemberItem {
  groupIndex: number;
  memberType: 'part' | 'group';
  memberIndex: number;
}

// Thumbnail data for templates and assemblies
export interface ThumbnailData {
  data: string; // Base64 encoded PNG
  width: number;
  height: number;
  generatedAt: string;
}

export interface AssemblyLibraryItem {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string; // Emoji fallback
  thumbnailData?: ThumbnailData; // Base64 image thumbnail (preferred)
  parts: AssemblyPartItem[];
  groups: AssemblyGroupItem[];
  groupMembers: AssemblyGroupMemberItem[];
  createdAt: string;
  modifiedAt: string;
}

// Stock constraint settings
export interface StockConstraintSettings {
  constrainDimensions: boolean;
  constrainGrain: boolean;
  constrainColor: boolean;
}

// User template (stores the serialized project)
export interface UserTemplateItem {
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
  thumbnailData?: ThumbnailData; // Base64 image thumbnail (preferred)
  category: 'furniture' | 'storage' | 'shop' | 'other';
  createdAt: string;
  lastUsedAt?: string; // Track when template was last used for "recently used" ordering
  project: string; // JSON-serialized Project
}

// New project setup defaults (for "remember these choices" feature)
export interface NewProjectDefaults {
  units: 'imperial' | 'metric';
  addCommonMaterials: boolean;
  selectedMaterials: string[]; // IDs of materials to add
  skipSetupDialog: boolean; // If true, use these defaults without showing dialog
}

export interface AppPreferences {
  // App-level defaults (used when creating new projects)
  defaultUnits: 'imperial' | 'metric';
  defaultGridSize: number; // in inches (e.g., 0.0625 for 1/16")
  // App behavior settings
  theme: 'light' | 'dark' | 'system';
  confirmBeforeDelete: boolean;
  showHotkeyHints: boolean;
  // Default stock constraint settings (used for new projects)
  stockConstraints: StockConstraintSettings;
  // License management
  licenseKey: string | null;
  licenseEmail: string | null;
  licenseOrderId: string | null;
  licenseActivatedAt: string | null;
  // Trial system
  trialFirstLaunchDate: number | null; // Timestamp of first app launch
  trialAcknowledgedExpired: boolean; // User dismissed expired modal this session
  // Onboarding
  hasCompletedWelcome: boolean;
  // Other app data
  recentProjects: string[];
  favoriteProjects: string[]; // User-favorited project paths
  stockLibrary: StockLibraryItem[];
  assemblyLibrary: AssemblyLibraryItem[];
  userTemplates: UserTemplateItem[];
  customColors: string[]; // User-saved custom colors (max 16)
  newProjectDefaults: NewProjectDefaults; // Saved new project setup preferences
  windowBounds: {
    width: number;
    height: number;
    x?: number;
    y?: number;
  };
}

const defaults: AppPreferences = {
  defaultUnits: 'imperial',
  defaultGridSize: 0.0625, // 1/16"
  theme: 'dark',
  confirmBeforeDelete: true,
  showHotkeyHints: true,
  stockConstraints: {
    constrainDimensions: true,
    constrainGrain: true,
    constrainColor: true
  },
  licenseKey: null,
  licenseEmail: null,
  licenseOrderId: null,
  licenseActivatedAt: null,
  trialFirstLaunchDate: null,
  trialAcknowledgedExpired: false,
  hasCompletedWelcome: false,
  recentProjects: [],
  favoriteProjects: [],
  stockLibrary: [],
  assemblyLibrary: [],
  userTemplates: [],
  customColors: [],
  newProjectDefaults: {
    units: 'imperial',
    addCommonMaterials: true,
    selectedMaterials: ['default-plywood-3/4', 'default-plywood-1/2', 'default-oak-4/4', 'default-poplar-4/4'],
    skipSetupDialog: false
  },
  windowBounds: {
    width: 1200,
    height: 800
  }
};

export const store = new Store<AppPreferences>({
  name: 'preferences',
  defaults,
  // Enable watching for changes from other processes (cross-instance sync)
  watch: true
});

// App settings getters/setters
export function getAppSettings(): Pick<
  AppPreferences,
  'defaultUnits' | 'defaultGridSize' | 'theme' | 'confirmBeforeDelete' | 'showHotkeyHints' | 'stockConstraints'
> {
  return {
    defaultUnits: store.get('defaultUnits'),
    defaultGridSize: store.get('defaultGridSize'),
    theme: store.get('theme'),
    confirmBeforeDelete: store.get('confirmBeforeDelete'),
    showHotkeyHints: store.get('showHotkeyHints'),
    stockConstraints: store.get('stockConstraints')
  };
}

export function setAppSettings(
  settings: Partial<
    Pick<
      AppPreferences,
      'defaultUnits' | 'defaultGridSize' | 'theme' | 'confirmBeforeDelete' | 'showHotkeyHints' | 'stockConstraints'
    >
  >
): void {
  if (settings.defaultUnits !== undefined) store.set('defaultUnits', settings.defaultUnits);
  if (settings.defaultGridSize !== undefined) store.set('defaultGridSize', settings.defaultGridSize);
  if (settings.theme !== undefined) store.set('theme', settings.theme);
  if (settings.confirmBeforeDelete !== undefined) store.set('confirmBeforeDelete', settings.confirmBeforeDelete);
  if (settings.showHotkeyHints !== undefined) store.set('showHotkeyHints', settings.showHotkeyHints);
  if (settings.stockConstraints !== undefined) store.set('stockConstraints', settings.stockConstraints);
}

export function getTheme(): 'light' | 'dark' | 'system' {
  return store.get('theme');
}

export function setTheme(theme: 'light' | 'dark' | 'system'): void {
  store.set('theme', theme);
}

export function getRecentProjects(): string[] {
  return store.get('recentProjects');
}

export function addRecentProject(filePath: string): void {
  const recent = store.get('recentProjects');
  // Remove if already exists (to move to front)
  const filtered = recent.filter((p) => p !== filePath);
  // Add to front, limit to 10 recent projects
  const updated = [filePath, ...filtered].slice(0, 10);
  store.set('recentProjects', updated);
}

export function clearRecentProjects(): void {
  store.set('recentProjects', []);
}

export function removeRecentProject(filePath: string): void {
  const recent = store.get('recentProjects');
  store.set(
    'recentProjects',
    recent.filter((p) => p !== filePath)
  );
}

export function updateRecentProjectPath(oldPath: string, newPath: string): void {
  // Update in recent projects
  const recent = store.get('recentProjects');
  store.set(
    'recentProjects',
    recent.map((p) => (p === oldPath ? newPath : p))
  );

  // Also update in favorites if present
  const favorites = store.get('favoriteProjects');
  if (favorites.includes(oldPath)) {
    store.set(
      'favoriteProjects',
      favorites.map((p) => (p === oldPath ? newPath : p))
    );
  }
}

// Favorite projects functions
export function getFavoriteProjects(): string[] {
  return store.get('favoriteProjects');
}

export function addFavoriteProject(filePath: string): void {
  const favorites = store.get('favoriteProjects');
  if (!favorites.includes(filePath)) {
    store.set('favoriteProjects', [...favorites, filePath]);
  }
}

export function removeFavoriteProject(filePath: string): void {
  const favorites = store.get('favoriteProjects');
  store.set(
    'favoriteProjects',
    favorites.filter((p) => p !== filePath)
  );
}

export function isFavoriteProject(filePath: string): boolean {
  const favorites = store.get('favoriteProjects');
  return favorites.includes(filePath);
}

export function setFavoriteProjects(filePaths: string[]): void {
  store.set('favoriteProjects', filePaths);
}

// New project defaults functions
export function getNewProjectDefaults(): NewProjectDefaults {
  return store.get('newProjectDefaults');
}

export function setNewProjectDefaults(defaults: Partial<NewProjectDefaults>): void {
  const current = store.get('newProjectDefaults');
  store.set('newProjectDefaults', { ...current, ...defaults });
}

export function getWindowBounds(): AppPreferences['windowBounds'] {
  return store.get('windowBounds');
}

export function setWindowBounds(bounds: AppPreferences['windowBounds']): void {
  store.set('windowBounds', bounds);
}

export function getStockLibrary(): StockLibraryItem[] {
  return store.get('stockLibrary');
}

export function setStockLibrary(stocks: StockLibraryItem[]): void {
  store.set('stockLibrary', stocks);
}

export function addStockToLibrary(stock: StockLibraryItem): void {
  const library = store.get('stockLibrary');
  store.set('stockLibrary', [...library, stock]);
}

export function updateStockInLibrary(id: string, updates: Partial<StockLibraryItem>): void {
  const library = store.get('stockLibrary');
  store.set(
    'stockLibrary',
    library.map((s) => (s.id === id ? { ...s, ...updates } : s))
  );
}

export function removeStockFromLibrary(id: string): void {
  const library = store.get('stockLibrary');
  store.set(
    'stockLibrary',
    library.filter((s) => s.id !== id)
  );
}

// Assembly Library functions
export function getAssemblyLibrary(): AssemblyLibraryItem[] {
  return store.get('assemblyLibrary');
}

export function setAssemblyLibrary(assemblies: AssemblyLibraryItem[]): void {
  store.set('assemblyLibrary', assemblies);
}

export function addAssemblyToLibrary(assembly: AssemblyLibraryItem): void {
  const library = store.get('assemblyLibrary');
  store.set('assemblyLibrary', [...library, assembly]);
}

export function updateAssemblyInLibrary(id: string, updates: Partial<AssemblyLibraryItem>): void {
  const library = store.get('assemblyLibrary');
  store.set(
    'assemblyLibrary',
    library.map((a) => (a.id === id ? { ...a, ...updates } : a))
  );
}

export function removeAssemblyFromLibrary(id: string): void {
  const library = store.get('assemblyLibrary');
  store.set(
    'assemblyLibrary',
    library.filter((a) => a.id !== id)
  );
}

// License management functions
export function getLicenseKey(): string | null {
  return store.get('licenseKey');
}

export function setLicenseKey(key: string | null): void {
  store.set('licenseKey', key);
}

export function getLicenseData(): {
  licenseKey: string | null;
  licenseEmail: string | null;
  licenseOrderId: string | null;
  licenseActivatedAt: string | null;
} {
  return {
    licenseKey: store.get('licenseKey'),
    licenseEmail: store.get('licenseEmail'),
    licenseOrderId: store.get('licenseOrderId'),
    licenseActivatedAt: store.get('licenseActivatedAt')
  };
}

export function setLicenseData(data: { licenseKey: string; licenseEmail: string; licenseOrderId: string }): void {
  store.set('licenseKey', data.licenseKey);
  store.set('licenseEmail', data.licenseEmail);
  store.set('licenseOrderId', data.licenseOrderId);
  store.set('licenseActivatedAt', new Date().toISOString());
}

export function clearLicenseData(): void {
  store.set('licenseKey', null);
  store.set('licenseEmail', null);
  store.set('licenseOrderId', null);
  store.set('licenseActivatedAt', null);
}

// Welcome/onboarding functions
export function getHasCompletedWelcome(): boolean {
  return store.get('hasCompletedWelcome');
}

export function setHasCompletedWelcome(completed: boolean): void {
  store.set('hasCompletedWelcome', completed);
}

// User Templates functions
export function getUserTemplates(): UserTemplateItem[] {
  return store.get('userTemplates');
}

export function addUserTemplate(template: UserTemplateItem): void {
  const templates = store.get('userTemplates');
  store.set('userTemplates', [...templates, template]);
}

export function updateUserTemplate(id: string, updates: Partial<UserTemplateItem>): void {
  const templates = store.get('userTemplates');
  store.set(
    'userTemplates',
    templates.map((t) => (t.id === id ? { ...t, ...updates } : t))
  );
}

export function removeUserTemplate(id: string): void {
  const templates = store.get('userTemplates');
  store.set(
    'userTemplates',
    templates.filter((t) => t.id !== id)
  );
}

export function trackTemplateUsage(id: string): void {
  const templates = store.get('userTemplates');
  const now = new Date().toISOString();
  store.set(
    'userTemplates',
    templates.map((t) => (t.id === id ? { ...t, lastUsedAt: now } : t))
  );
}

// Custom Colors functions (max 16 colors)
const MAX_CUSTOM_COLORS = 16;

export function getCustomColors(): string[] {
  return store.get('customColors');
}

export function addCustomColor(color: string): boolean {
  const colors = store.get('customColors');
  // Don't add duplicates
  if (colors.includes(color.toLowerCase())) {
    return false;
  }
  // Enforce max limit
  if (colors.length >= MAX_CUSTOM_COLORS) {
    // Remove oldest color to make room
    colors.shift();
  }
  store.set('customColors', [...colors, color.toLowerCase()]);
  return true;
}

export function removeCustomColor(color: string): void {
  const colors = store.get('customColors');
  store.set(
    'customColors',
    colors.filter((c) => c.toLowerCase() !== color.toLowerCase())
  );
}

export function setCustomColors(colors: string[]): void {
  // Enforce max limit
  const limitedColors = colors.slice(0, MAX_CUSTOM_COLORS).map((c) => c.toLowerCase());
  store.set('customColors', limitedColors);
}

// =============================================================================
// App State Export/Import
// =============================================================================

export interface AppStateExport {
  version: number;
  exportedAt: string;
  appVersion: string;
  data: {
    userTemplates: UserTemplateItem[];
    assemblyLibrary: AssemblyLibraryItem[];
    stockLibrary: StockLibraryItem[];
    customColors: string[];
  };
}

export interface ImportOptions {
  mergeStrategy: 'replace' | 'merge';
  includeTemplates: boolean;
  includeAssemblies: boolean;
  includeStocks: boolean;
  includeColors: boolean;
}

export interface ImportResult {
  success: boolean;
  imported: {
    templates: number;
    assemblies: number;
    stocks: number;
    colors: number;
  };
  skipped: {
    templates: number;
    assemblies: number;
    stocks: number;
  };
  errors: string[];
}

export interface ImportPreview {
  valid: boolean;
  errors: string[];
  counts: {
    templates: number;
    assemblies: number;
    stocks: number;
    colors: number;
  };
  duplicates: {
    templates: string[];
    assemblies: string[];
    stocks: string[];
  };
}

// Built-in IDs (defined here so they can be used by export function)
const BUILT_IN_STOCK_IDS = new Set([
  'default-plywood-3/4',
  'default-plywood-1/2',
  'default-plywood-1/4',
  'default-mdf-3/4',
  'default-oak-4/4',
  'default-walnut-4/4',
  'default-maple-4/4',
  'default-cherry-4/4',
  'default-poplar-4/4',
  'default-oak-8/4',
  'default-walnut-8/4',
  'default-baltic-birch-3/4'
]);

const BUILT_IN_ASSEMBLY_IDS = new Set([
  'default-drawer-box',
  'default-cabinet-box',
  'default-table-base',
  'default-face-frame'
]);

/**
 * Export all user-created app state (excluding built-in items).
 * Returns a serializable object that can be saved to a .carvd-backup file.
 */
export function exportAppState(appVersion: string): AppStateExport {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    appVersion,
    data: {
      userTemplates: store.get('userTemplates', []),
      assemblyLibrary: store.get('assemblyLibrary', []).filter((a) => !BUILT_IN_ASSEMBLY_IDS.has(a.id)),
      stockLibrary: store.get('stockLibrary', []).filter((s) => !BUILT_IN_STOCK_IDS.has(s.id)),
      customColors: store.get('customColors', [])
    }
  };
}

/**
 * Validate an app state export object.
 * Returns validation result with any errors found.
 */
export function validateAppStateExport(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid file format: not an object'] };
  }

  const obj = data as Record<string, unknown>;

  // Check version
  if (typeof obj.version !== 'number') {
    errors.push('Missing or invalid version field');
  } else if (obj.version > 1) {
    errors.push(`Unsupported version: ${obj.version}. This backup was created with a newer version of Carvd Studio.`);
  }

  // Check required fields
  if (!obj.exportedAt || typeof obj.exportedAt !== 'string') {
    errors.push('Missing exportedAt timestamp');
  }

  if (!obj.data || typeof obj.data !== 'object') {
    errors.push('Missing or invalid data field');
    return { valid: false, errors };
  }

  const dataObj = obj.data as Record<string, unknown>;

  // Validate userTemplates array
  if (!Array.isArray(dataObj.userTemplates)) {
    errors.push('userTemplates must be an array');
  } else {
    dataObj.userTemplates.forEach((t, i) => {
      if (!t || typeof t !== 'object') {
        errors.push(`userTemplates[${i}] is not an object`);
      } else {
        const template = t as Record<string, unknown>;
        if (!template.id || typeof template.id !== 'string') {
          errors.push(`userTemplates[${i}] missing id`);
        }
        if (!template.name || typeof template.name !== 'string') {
          errors.push(`userTemplates[${i}] missing name`);
        }
        if (!template.project || typeof template.project !== 'string') {
          errors.push(`userTemplates[${i}] missing project data`);
        }
      }
    });
  }

  // Validate assemblyLibrary array
  if (!Array.isArray(dataObj.assemblyLibrary)) {
    errors.push('assemblyLibrary must be an array');
  } else {
    dataObj.assemblyLibrary.forEach((a, i) => {
      if (!a || typeof a !== 'object') {
        errors.push(`assemblyLibrary[${i}] is not an object`);
      } else {
        const assembly = a as Record<string, unknown>;
        if (!assembly.id || typeof assembly.id !== 'string') {
          errors.push(`assemblyLibrary[${i}] missing id`);
        }
        if (!assembly.name || typeof assembly.name !== 'string') {
          errors.push(`assemblyLibrary[${i}] missing name`);
        }
        if (!Array.isArray(assembly.parts)) {
          errors.push(`assemblyLibrary[${i}] missing parts array`);
        }
      }
    });
  }

  // Validate stockLibrary array
  if (!Array.isArray(dataObj.stockLibrary)) {
    errors.push('stockLibrary must be an array');
  } else {
    dataObj.stockLibrary.forEach((s, i) => {
      if (!s || typeof s !== 'object') {
        errors.push(`stockLibrary[${i}] is not an object`);
      } else {
        const stock = s as Record<string, unknown>;
        if (!stock.id || typeof stock.id !== 'string') {
          errors.push(`stockLibrary[${i}] missing id`);
        }
        if (!stock.name || typeof stock.name !== 'string') {
          errors.push(`stockLibrary[${i}] missing name`);
        }
        if (typeof stock.length !== 'number' || stock.length <= 0) {
          errors.push(`stockLibrary[${i}] invalid length`);
        }
        if (typeof stock.width !== 'number' || stock.width <= 0) {
          errors.push(`stockLibrary[${i}] invalid width`);
        }
        if (typeof stock.thickness !== 'number' || stock.thickness <= 0) {
          errors.push(`stockLibrary[${i}] invalid thickness`);
        }
      }
    });
  }

  // Validate customColors array
  if (!Array.isArray(dataObj.customColors)) {
    errors.push('customColors must be an array');
  } else {
    dataObj.customColors.forEach((c, i) => {
      if (typeof c !== 'string') {
        errors.push(`customColors[${i}] must be a string`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Preview what would be imported from an app state export.
 * Returns counts and lists of duplicates that already exist.
 */
export function previewImport(data: AppStateExport): ImportPreview {
  const validation = validateAppStateExport(data);
  if (!validation.valid) {
    return {
      valid: false,
      errors: validation.errors,
      counts: { templates: 0, assemblies: 0, stocks: 0, colors: 0 },
      duplicates: { templates: [], assemblies: [], stocks: [] }
    };
  }

  const currentTemplates = new Set(store.get('userTemplates', []).map((t) => t.id));
  const currentAssemblies = new Set(store.get('assemblyLibrary', []).map((a) => a.id));
  const currentStocks = new Set(store.get('stockLibrary', []).map((s) => s.id));

  const duplicateTemplates = data.data.userTemplates.filter((t) => currentTemplates.has(t.id)).map((t) => t.name);
  const duplicateAssemblies = data.data.assemblyLibrary.filter((a) => currentAssemblies.has(a.id)).map((a) => a.name);
  const duplicateStocks = data.data.stockLibrary.filter((s) => currentStocks.has(s.id)).map((s) => s.name);

  return {
    valid: true,
    errors: [],
    counts: {
      templates: data.data.userTemplates.length,
      assemblies: data.data.assemblyLibrary.length,
      stocks: data.data.stockLibrary.length,
      colors: data.data.customColors.length
    },
    duplicates: {
      templates: duplicateTemplates,
      assemblies: duplicateAssemblies,
      stocks: duplicateStocks
    }
  };
}

/**
 * Import app state from an export object.
 * Handles merge/replace strategy and selective import of data types.
 */
export function importAppState(data: AppStateExport, options: ImportOptions): ImportResult {
  const result: ImportResult = {
    success: false,
    imported: { templates: 0, assemblies: 0, stocks: 0, colors: 0 },
    skipped: { templates: 0, assemblies: 0, stocks: 0 },
    errors: []
  };

  // Validate first
  const validation = validateAppStateExport(data);
  if (!validation.valid) {
    result.errors = validation.errors;
    return result;
  }

  try {
    // Import templates
    if (options.includeTemplates && data.data.userTemplates.length > 0) {
      if (options.mergeStrategy === 'replace') {
        store.set('userTemplates', data.data.userTemplates);
        result.imported.templates = data.data.userTemplates.length;
      } else {
        // Merge: skip duplicates by ID
        const currentTemplates = store.get('userTemplates', []);
        const currentIds = new Set(currentTemplates.map((t) => t.id));
        const newTemplates = data.data.userTemplates.filter((t) => {
          if (currentIds.has(t.id)) {
            result.skipped.templates++;
            return false;
          }
          return true;
        });
        store.set('userTemplates', [...currentTemplates, ...newTemplates]);
        result.imported.templates = newTemplates.length;
      }
    }

    // Import assemblies
    if (options.includeAssemblies && data.data.assemblyLibrary.length > 0) {
      if (options.mergeStrategy === 'replace') {
        // Keep built-in assemblies, replace user assemblies
        const builtIns = store.get('assemblyLibrary', []).filter((a) => BUILT_IN_ASSEMBLY_IDS.has(a.id));
        store.set('assemblyLibrary', [...builtIns, ...data.data.assemblyLibrary]);
        result.imported.assemblies = data.data.assemblyLibrary.length;
      } else {
        // Merge: skip duplicates by ID
        const currentAssemblies = store.get('assemblyLibrary', []);
        const currentIds = new Set(currentAssemblies.map((a) => a.id));
        const newAssemblies = data.data.assemblyLibrary.filter((a) => {
          if (currentIds.has(a.id)) {
            result.skipped.assemblies++;
            return false;
          }
          return true;
        });
        store.set('assemblyLibrary', [...currentAssemblies, ...newAssemblies]);
        result.imported.assemblies = newAssemblies.length;
      }
    }

    // Import stocks
    if (options.includeStocks && data.data.stockLibrary.length > 0) {
      if (options.mergeStrategy === 'replace') {
        // Keep built-in stocks, replace user stocks
        const builtIns = store.get('stockLibrary', []).filter((s) => BUILT_IN_STOCK_IDS.has(s.id));
        store.set('stockLibrary', [...builtIns, ...data.data.stockLibrary]);
        result.imported.stocks = data.data.stockLibrary.length;
      } else {
        // Merge: skip duplicates by ID
        const currentStocks = store.get('stockLibrary', []);
        const currentIds = new Set(currentStocks.map((s) => s.id));
        const newStocks = data.data.stockLibrary.filter((s) => {
          if (currentIds.has(s.id)) {
            result.skipped.stocks++;
            return false;
          }
          return true;
        });
        store.set('stockLibrary', [...currentStocks, ...newStocks]);
        result.imported.stocks = newStocks.length;
      }
    }

    // Import custom colors
    if (options.includeColors && data.data.customColors.length > 0) {
      if (options.mergeStrategy === 'replace') {
        setCustomColors(data.data.customColors);
        result.imported.colors = data.data.customColors.length;
      } else {
        // Merge: add new colors (setCustomColors handles duplicates and max limit)
        const currentColors = store.get('customColors', []);
        const newColors = data.data.customColors.filter((c) => !currentColors.includes(c.toLowerCase()));
        setCustomColors([...currentColors, ...newColors]);
        result.imported.colors = newColors.length;
      }
    }

    result.success = true;
  } catch (error) {
    result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

// Default stock library items for seeding
const DEFAULT_STOCKS: StockLibraryItem[] = [
  // Plywood - common sheet goods
  {
    id: 'default-plywood-3/4',
    name: '3/4" Plywood (4x8)',
    length: 96,
    width: 48,
    thickness: 0.75,
    grainDirection: 'length',
    pricingUnit: 'per_item',
    pricePerUnit: 45,
    color: '#c4a574'
  },
  {
    id: 'default-plywood-1/2',
    name: '1/2" Plywood (4x8)',
    length: 96,
    width: 48,
    thickness: 0.5,
    grainDirection: 'length',
    pricingUnit: 'per_item',
    pricePerUnit: 35,
    color: '#d4b58a'
  },
  {
    id: 'default-plywood-1/4',
    name: '1/4" Plywood (4x8)',
    length: 96,
    width: 48,
    thickness: 0.25,
    grainDirection: 'length',
    pricingUnit: 'per_item',
    pricePerUnit: 25,
    color: '#e4c59a'
  },
  // MDF - common for cabinet work
  {
    id: 'default-mdf-3/4',
    name: '3/4" MDF (4x8)',
    length: 96,
    width: 48,
    thickness: 0.75,
    grainDirection: 'none',
    pricingUnit: 'per_item',
    pricePerUnit: 35,
    color: '#8b7355'
  },
  // Hardwood boards - common lumber
  {
    id: 'default-oak-4/4',
    name: '4/4 Red Oak Board',
    length: 96,
    width: 8,
    thickness: 0.75,
    grainDirection: 'length',
    pricingUnit: 'board_foot',
    pricePerUnit: 6,
    color: '#b5651d'
  },
  {
    id: 'default-walnut-4/4',
    name: '4/4 Walnut Board',
    length: 96,
    width: 8,
    thickness: 0.75,
    grainDirection: 'length',
    pricingUnit: 'board_foot',
    pricePerUnit: 12,
    color: '#6b4423'
  },
  {
    id: 'default-maple-4/4',
    name: '4/4 Hard Maple Board',
    length: 96,
    width: 8,
    thickness: 0.75,
    grainDirection: 'length',
    pricingUnit: 'board_foot',
    pricePerUnit: 7,
    color: '#f5deb3'
  },
  {
    id: 'default-cherry-4/4',
    name: '4/4 Cherry Board',
    length: 96,
    width: 8,
    thickness: 0.75,
    grainDirection: 'length',
    pricingUnit: 'board_foot',
    pricePerUnit: 10,
    color: '#a0522d'
  },
  {
    id: 'default-poplar-4/4',
    name: '4/4 Poplar Board',
    length: 96,
    width: 8,
    thickness: 0.75,
    grainDirection: 'length',
    pricingUnit: 'board_foot',
    pricePerUnit: 4,
    color: '#98fb98'
  },
  // Thicker stock for legs
  {
    id: 'default-oak-8/4',
    name: '8/4 Red Oak (Legs)',
    length: 48,
    width: 6,
    thickness: 1.75,
    grainDirection: 'length',
    pricingUnit: 'board_foot',
    pricePerUnit: 8,
    color: '#cd853f'
  },
  {
    id: 'default-walnut-8/4',
    name: '8/4 Walnut (Legs)',
    length: 48,
    width: 6,
    thickness: 1.75,
    grainDirection: 'length',
    pricingUnit: 'board_foot',
    pricePerUnit: 16,
    color: '#5c4033'
  },
  // Baltic Birch - precision plywood
  {
    id: 'default-baltic-birch-3/4',
    name: '3/4" Baltic Birch (5x5)',
    length: 60,
    width: 60,
    thickness: 0.75,
    grainDirection: 'length',
    pricingUnit: 'per_item',
    pricePerUnit: 65,
    color: '#f5f5dc'
  }
];

// Default assembly library items for seeding
const DEFAULT_ASSEMBLIES: AssemblyLibraryItem[] = [
  // Simple drawer box assembly
  {
    id: 'default-drawer-box',
    name: 'Basic Drawer Box',
    description: 'A simple drawer box with front, back, sides, and bottom. Standard half-blind dovetail proportions.',
    parts: [
      {
        name: 'Drawer Front',
        length: 18,
        width: 4,
        thickness: 0.75,
        relativePosition: { x: 0, y: 2, z: 5.625 },
        rotation: { x: 90, y: 0, z: 0 },
        stockId: null,
        grainSensitive: true,
        grainDirection: 'length',
        color: '#c4a574',
        notes: 'Visible face - sand to 220 grit'
      },
      {
        name: 'Drawer Back',
        length: 18,
        width: 3.5,
        thickness: 0.5,
        relativePosition: { x: 0, y: 2, z: -5.625 },
        rotation: { x: 90, y: 0, z: 0 },
        stockId: null,
        grainSensitive: false,
        grainDirection: 'length',
        color: '#d4b58a'
      },
      {
        name: 'Left Side',
        length: 12,
        width: 4,
        thickness: 0.5,
        relativePosition: { x: -8.75, y: 2, z: 0 },
        rotation: { x: 90, y: 0, z: 90 },
        stockId: null,
        grainSensitive: false,
        grainDirection: 'length',
        color: '#d4b58a'
      },
      {
        name: 'Right Side',
        length: 12,
        width: 4,
        thickness: 0.5,
        relativePosition: { x: 8.75, y: 2, z: 0 },
        rotation: { x: 90, y: 0, z: 90 },
        stockId: null,
        grainSensitive: false,
        grainDirection: 'length',
        color: '#d4b58a'
      },
      {
        name: 'Drawer Bottom',
        length: 17,
        width: 11,
        thickness: 0.25,
        relativePosition: { x: 0, y: 0.125, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        stockId: null,
        grainSensitive: false,
        grainDirection: 'length',
        color: '#e4c59a',
        notes: '1/4" plywood bottom in groove'
      }
    ],
    groups: [{ originalId: 'drawer-sides', name: 'Sides' }],
    groupMembers: [
      { groupIndex: 0, memberType: 'part', memberIndex: 2 },
      { groupIndex: 0, memberType: 'part', memberIndex: 3 }
    ],
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString()
  },
  // Basic cabinet box
  {
    id: 'default-cabinet-box',
    name: 'Base Cabinet Box',
    description: 'A frameless base cabinet box with adjustable shelf. Standard 34.5" height for countertops.',
    parts: [
      {
        name: 'Left Side',
        length: 34.5,
        width: 23.5,
        thickness: 0.75,
        relativePosition: { x: -11.625, y: 17.25, z: 0 },
        rotation: { x: 0, y: 0, z: 90 },
        stockId: null,
        grainSensitive: false,
        grainDirection: 'length',
        color: '#c4a574'
      },
      {
        name: 'Right Side',
        length: 34.5,
        width: 23.5,
        thickness: 0.75,
        relativePosition: { x: 11.625, y: 17.25, z: 0 },
        rotation: { x: 0, y: 0, z: 90 },
        stockId: null,
        grainSensitive: false,
        grainDirection: 'length',
        color: '#c4a574'
      },
      {
        name: 'Bottom',
        length: 22.5,
        width: 23.5,
        thickness: 0.75,
        relativePosition: { x: 0, y: 0.375, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        stockId: null,
        grainSensitive: false,
        grainDirection: 'length',
        color: '#c4a574'
      },
      {
        name: 'Top Nailer',
        length: 22.5,
        width: 4,
        thickness: 0.75,
        relativePosition: { x: 0, y: 34.125, z: -9.75 },
        rotation: { x: 0, y: 0, z: 0 },
        stockId: null,
        grainSensitive: false,
        grainDirection: 'length',
        color: '#c4a574'
      },
      {
        name: 'Back',
        length: 22.5,
        width: 33,
        thickness: 0.25,
        relativePosition: { x: 0, y: 17.25, z: -11.875 },
        rotation: { x: 90, y: 0, z: 0 },
        stockId: null,
        grainSensitive: false,
        grainDirection: 'length',
        color: '#e4c59a',
        notes: '1/4" plywood back panel'
      },
      {
        name: 'Adjustable Shelf',
        length: 22,
        width: 22,
        thickness: 0.75,
        relativePosition: { x: 0, y: 17.25, z: 0.5 },
        rotation: { x: 0, y: 0, z: 0 },
        stockId: null,
        grainSensitive: false,
        grainDirection: 'length',
        color: '#c4a574',
        notes: 'Rests on shelf pins'
      }
    ],
    groups: [],
    groupMembers: [],
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString()
  },
  // Simple table base
  {
    id: 'default-table-base',
    name: 'Table Leg Assembly',
    description: 'Four-leg table base with aprons. Adjustable dimensions for various table sizes.',
    parts: [
      {
        name: 'Front Left Leg',
        length: 28.5,
        width: 2.5,
        thickness: 2.5,
        relativePosition: { x: -14, y: 14.25, z: 8 },
        rotation: { x: 0, y: 0, z: 90 },
        stockId: null,
        grainSensitive: true,
        grainDirection: 'length',
        color: '#6b4423'
      },
      {
        name: 'Front Right Leg',
        length: 28.5,
        width: 2.5,
        thickness: 2.5,
        relativePosition: { x: 14, y: 14.25, z: 8 },
        rotation: { x: 0, y: 0, z: 90 },
        stockId: null,
        grainSensitive: true,
        grainDirection: 'length',
        color: '#6b4423'
      },
      {
        name: 'Back Left Leg',
        length: 28.5,
        width: 2.5,
        thickness: 2.5,
        relativePosition: { x: -14, y: 14.25, z: -8 },
        rotation: { x: 0, y: 0, z: 90 },
        stockId: null,
        grainSensitive: true,
        grainDirection: 'length',
        color: '#6b4423'
      },
      {
        name: 'Back Right Leg',
        length: 28.5,
        width: 2.5,
        thickness: 2.5,
        relativePosition: { x: 14, y: 14.25, z: -8 },
        rotation: { x: 0, y: 0, z: 90 },
        stockId: null,
        grainSensitive: true,
        grainDirection: 'length',
        color: '#6b4423'
      },
      {
        name: 'Front Apron',
        length: 26,
        width: 4,
        thickness: 0.75,
        relativePosition: { x: 0, y: 26.5, z: 8 },
        rotation: { x: 90, y: 0, z: 0 },
        stockId: null,
        grainSensitive: true,
        grainDirection: 'length',
        color: '#b5651d'
      },
      {
        name: 'Back Apron',
        length: 26,
        width: 4,
        thickness: 0.75,
        relativePosition: { x: 0, y: 26.5, z: -8 },
        rotation: { x: 90, y: 0, z: 0 },
        stockId: null,
        grainSensitive: true,
        grainDirection: 'length',
        color: '#b5651d'
      },
      {
        name: 'Left Apron',
        length: 13.5,
        width: 4,
        thickness: 0.75,
        relativePosition: { x: -14, y: 26.5, z: 0 },
        rotation: { x: 90, y: 0, z: 90 },
        stockId: null,
        grainSensitive: true,
        grainDirection: 'length',
        color: '#b5651d'
      },
      {
        name: 'Right Apron',
        length: 13.5,
        width: 4,
        thickness: 0.75,
        relativePosition: { x: 14, y: 26.5, z: 0 },
        rotation: { x: 90, y: 0, z: 90 },
        stockId: null,
        grainSensitive: true,
        grainDirection: 'length',
        color: '#b5651d'
      }
    ],
    groups: [
      { originalId: 'legs', name: 'Legs' },
      { originalId: 'aprons', name: 'Aprons' }
    ],
    groupMembers: [
      { groupIndex: 0, memberType: 'part', memberIndex: 0 },
      { groupIndex: 0, memberType: 'part', memberIndex: 1 },
      { groupIndex: 0, memberType: 'part', memberIndex: 2 },
      { groupIndex: 0, memberType: 'part', memberIndex: 3 },
      { groupIndex: 1, memberType: 'part', memberIndex: 4 },
      { groupIndex: 1, memberType: 'part', memberIndex: 5 },
      { groupIndex: 1, memberType: 'part', memberIndex: 6 },
      { groupIndex: 1, memberType: 'part', memberIndex: 7 }
    ],
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString()
  },
  // Face frame
  {
    id: 'default-face-frame',
    name: 'Cabinet Face Frame',
    description: 'Standard face frame for a single-door cabinet. 1.5" wide rails and stiles.',
    parts: [
      {
        name: 'Left Stile',
        length: 30,
        width: 1.5,
        thickness: 0.75,
        relativePosition: { x: -9.375, y: 15, z: 0.375 },
        rotation: { x: 90, y: 0, z: 0 },
        stockId: null,
        grainSensitive: true,
        grainDirection: 'length',
        color: '#b5651d'
      },
      {
        name: 'Right Stile',
        length: 30,
        width: 1.5,
        thickness: 0.75,
        relativePosition: { x: 9.375, y: 15, z: 0.375 },
        rotation: { x: 90, y: 0, z: 0 },
        stockId: null,
        grainSensitive: true,
        grainDirection: 'length',
        color: '#b5651d'
      },
      {
        name: 'Top Rail',
        length: 17.25,
        width: 1.5,
        thickness: 0.75,
        relativePosition: { x: 0, y: 29.25, z: 0.375 },
        rotation: { x: 90, y: 0, z: 90 },
        stockId: null,
        grainSensitive: true,
        grainDirection: 'length',
        color: '#b5651d'
      },
      {
        name: 'Bottom Rail',
        length: 17.25,
        width: 1.5,
        thickness: 0.75,
        relativePosition: { x: 0, y: 0.75, z: 0.375 },
        rotation: { x: 90, y: 0, z: 90 },
        stockId: null,
        grainSensitive: true,
        grainDirection: 'length',
        color: '#b5651d'
      }
    ],
    groups: [],
    groupMembers: [],
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString()
  }
];

// =============================================================================
// Individual Item Export/Import
// =============================================================================

export interface TemplateExport {
  version: number;
  type: 'template';
  exportedAt: string;
  appVersion: string;
  data: UserTemplateItem;
}

export interface AssemblyExport {
  version: number;
  type: 'assembly';
  exportedAt: string;
  appVersion: string;
  data: AssemblyLibraryItem;
  // Include referenced stocks for complete export
  referencedStocks: StockLibraryItem[];
}

export interface StocksExport {
  version: number;
  type: 'stocks';
  exportedAt: string;
  appVersion: string;
  data: StockLibraryItem[];
}

/**
 * Export a single template to a .carvd-template file format.
 */
export function exportTemplate(templateId: string, appVersion: string): TemplateExport | null {
  const templates = store.get('userTemplates', []);
  const template = templates.find((t) => t.id === templateId);
  if (!template) return null;

  return {
    version: 1,
    type: 'template',
    exportedAt: new Date().toISOString(),
    appVersion,
    data: template
  };
}

/**
 * Export a single assembly to a .carvd-assembly file format.
 * Includes any referenced stocks from the stock library.
 */
export function exportAssembly(assemblyId: string, appVersion: string): AssemblyExport | null {
  const assemblies = store.get('assemblyLibrary', []);
  const assembly = assemblies.find((a) => a.id === assemblyId);
  if (!assembly) return null;

  // Find referenced stocks from assembly parts
  const stockLibrary = store.get('stockLibrary', []);
  const referencedStockIds = new Set(assembly.parts.map((p) => p.stockId).filter((id): id is string => id !== null));
  const referencedStocks = stockLibrary.filter((s) => referencedStockIds.has(s.id));

  return {
    version: 1,
    type: 'assembly',
    exportedAt: new Date().toISOString(),
    appVersion,
    data: assembly,
    referencedStocks
  };
}

/**
 * Export multiple stocks to a .carvd-stocks file format.
 */
export function exportStocks(stockIds: string[], appVersion: string): StocksExport | null {
  const stockLibrary = store.get('stockLibrary', []);
  const stocksToExport = stockLibrary.filter((s) => stockIds.includes(s.id));
  if (stocksToExport.length === 0) return null;

  return {
    version: 1,
    type: 'stocks',
    exportedAt: new Date().toISOString(),
    appVersion,
    data: stocksToExport
  };
}

/**
 * Validate a template export file.
 */
export function validateTemplateExport(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid file format: not an object'] };
  }

  const obj = data as Record<string, unknown>;

  if (obj.type !== 'template') {
    return { valid: false, errors: ['Not a template file'] };
  }

  if (typeof obj.version !== 'number' || obj.version > 1) {
    errors.push('Unsupported file version');
  }

  if (!obj.data || typeof obj.data !== 'object') {
    errors.push('Missing template data');
  } else {
    const template = obj.data as Record<string, unknown>;
    if (!template.id || typeof template.id !== 'string') errors.push('Missing template id');
    if (!template.name || typeof template.name !== 'string') errors.push('Missing template name');
    if (!template.project || typeof template.project !== 'string') errors.push('Missing template project');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate an assembly export file.
 */
export function validateAssemblyExport(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid file format: not an object'] };
  }

  const obj = data as Record<string, unknown>;

  if (obj.type !== 'assembly') {
    return { valid: false, errors: ['Not an assembly file'] };
  }

  if (typeof obj.version !== 'number' || obj.version > 1) {
    errors.push('Unsupported file version');
  }

  if (!obj.data || typeof obj.data !== 'object') {
    errors.push('Missing assembly data');
  } else {
    const assembly = obj.data as Record<string, unknown>;
    if (!assembly.id || typeof assembly.id !== 'string') errors.push('Missing assembly id');
    if (!assembly.name || typeof assembly.name !== 'string') errors.push('Missing assembly name');
    if (!Array.isArray(assembly.parts)) errors.push('Missing assembly parts');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a stocks export file.
 */
export function validateStocksExport(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid file format: not an object'] };
  }

  const obj = data as Record<string, unknown>;

  if (obj.type !== 'stocks') {
    return { valid: false, errors: ['Not a stocks file'] };
  }

  if (typeof obj.version !== 'number' || obj.version > 1) {
    errors.push('Unsupported file version');
  }

  if (!Array.isArray(obj.data) || obj.data.length === 0) {
    errors.push('Missing or empty stocks data');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Import a template from an export file.
 * Returns the new template ID if successful.
 */
export function importTemplate(
  data: TemplateExport,
  options: { replaceIfExists: boolean }
): { success: boolean; templateId?: string; error?: string } {
  const validation = validateTemplateExport(data);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(', ') };
  }

  const templates = store.get('userTemplates', []);
  const existingIndex = templates.findIndex((t) => t.id === data.data.id);

  if (existingIndex >= 0) {
    if (options.replaceIfExists) {
      templates[existingIndex] = data.data;
      store.set('userTemplates', templates);
    } else {
      // Generate new ID for duplicate
      const newId = `${data.data.id}-imported-${Date.now()}`;
      const newTemplate = { ...data.data, id: newId, name: `${data.data.name} (Imported)` };
      store.set('userTemplates', [...templates, newTemplate]);
      return { success: true, templateId: newId };
    }
  } else {
    store.set('userTemplates', [...templates, data.data]);
  }

  return { success: true, templateId: data.data.id };
}

/**
 * Import an assembly from an export file.
 * Also imports any referenced stocks that don't exist.
 * Returns the new assembly ID if successful.
 */
export function importAssembly(
  data: AssemblyExport,
  options: { replaceIfExists: boolean; importStocks: boolean }
): { success: boolean; assemblyId?: string; stocksImported?: number; error?: string } {
  const validation = validateAssemblyExport(data);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(', ') };
  }

  let stocksImported = 0;

  // Import referenced stocks first if requested
  if (options.importStocks && data.referencedStocks && data.referencedStocks.length > 0) {
    const stockLibrary = store.get('stockLibrary', []);
    const existingIds = new Set(stockLibrary.map((s) => s.id));

    const newStocks = data.referencedStocks.filter((s) => !existingIds.has(s.id));
    if (newStocks.length > 0) {
      store.set('stockLibrary', [...stockLibrary, ...newStocks]);
      stocksImported = newStocks.length;
    }
  }

  const assemblies = store.get('assemblyLibrary', []);
  const existingIndex = assemblies.findIndex((a) => a.id === data.data.id);

  if (existingIndex >= 0) {
    if (options.replaceIfExists) {
      assemblies[existingIndex] = data.data;
      store.set('assemblyLibrary', assemblies);
    } else {
      // Generate new ID for duplicate
      const newId = `${data.data.id}-imported-${Date.now()}`;
      const newAssembly = { ...data.data, id: newId, name: `${data.data.name} (Imported)` };
      store.set('assemblyLibrary', [...assemblies, newAssembly]);
      return { success: true, assemblyId: newId, stocksImported };
    }
  } else {
    store.set('assemblyLibrary', [...assemblies, data.data]);
  }

  return { success: true, assemblyId: data.data.id, stocksImported };
}

/**
 * Import stocks from an export file.
 * Returns the number of stocks imported.
 */
export function importStocks(
  data: StocksExport,
  options: { replaceIfExists: boolean }
): { success: boolean; imported: number; skipped: number; error?: string } {
  const validation = validateStocksExport(data);
  if (!validation.valid) {
    return { success: false, imported: 0, skipped: 0, error: validation.errors.join(', ') };
  }

  const stockLibrary = store.get('stockLibrary', []);
  const existingIds = new Set(stockLibrary.map((s) => s.id));
  let imported = 0;
  let skipped = 0;

  const updatedLibrary = [...stockLibrary];

  for (const stock of data.data) {
    const existingIndex = updatedLibrary.findIndex((s) => s.id === stock.id);
    if (existingIndex >= 0) {
      if (options.replaceIfExists) {
        updatedLibrary[existingIndex] = stock;
        imported++;
      } else {
        skipped++;
      }
    } else {
      updatedLibrary.push(stock);
      imported++;
    }
  }

  store.set('stockLibrary', updatedLibrary);

  return { success: true, imported, skipped };
}

/**
 * Seed the stock library and assembly library with default items if they're empty.
 * Called on app initialization.
 */
export function seedDefaultLibraries(): void {
  // Seed stock library if empty
  const stockLibrary = store.get('stockLibrary');
  if (stockLibrary.length === 0) {
    store.set('stockLibrary', DEFAULT_STOCKS);
    console.log('Seeded default stock library with', DEFAULT_STOCKS.length, 'items');
  }

  // Seed assembly library if empty
  const assemblyLibrary = store.get('assemblyLibrary');
  if (assemblyLibrary.length === 0) {
    store.set('assemblyLibrary', DEFAULT_ASSEMBLIES);
    console.log('Seeded default assembly library with', DEFAULT_ASSEMBLIES.length, 'items');
  }
}
