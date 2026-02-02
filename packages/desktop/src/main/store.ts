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

export interface AssemblyLibraryItem {
  id: string;
  name: string;
  description?: string;
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
  // Onboarding
  hasCompletedWelcome: boolean;
  // Other app data
  recentProjects: string[];
  stockLibrary: StockLibraryItem[];
  assemblyLibrary: AssemblyLibraryItem[];
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
  hasCompletedWelcome: false,
  recentProjects: [],
  stockLibrary: [],
  assemblyLibrary: [],
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
export function getAppSettings(): Pick<AppPreferences, 'defaultUnits' | 'defaultGridSize' | 'theme' | 'confirmBeforeDelete' | 'showHotkeyHints' | 'stockConstraints'> {
  return {
    defaultUnits: store.get('defaultUnits'),
    defaultGridSize: store.get('defaultGridSize'),
    theme: store.get('theme'),
    confirmBeforeDelete: store.get('confirmBeforeDelete'),
    showHotkeyHints: store.get('showHotkeyHints'),
    stockConstraints: store.get('stockConstraints')
  };
}

export function setAppSettings(settings: Partial<Pick<AppPreferences, 'defaultUnits' | 'defaultGridSize' | 'theme' | 'confirmBeforeDelete' | 'showHotkeyHints' | 'stockConstraints'>>): void {
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
  store.set('stockLibrary', library.map((s) => (s.id === id ? { ...s, ...updates } : s)));
}

export function removeStockFromLibrary(id: string): void {
  const library = store.get('stockLibrary');
  store.set('stockLibrary', library.filter((s) => s.id !== id));
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
  store.set('assemblyLibrary', library.map((a) => (a.id === id ? { ...a, ...updates } : a)));
}

export function removeAssemblyFromLibrary(id: string): void {
  const library = store.get('assemblyLibrary');
  store.set('assemblyLibrary', library.filter((a) => a.id !== id));
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

export function setLicenseData(data: {
  licenseKey: string;
  licenseEmail: string;
  licenseOrderId: string;
}): void {
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
