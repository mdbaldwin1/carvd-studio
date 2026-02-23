export const PROJECT_FILE_VERSION = '1';

export const UNTITLED_PROJECT_NAME = 'Untitled Project';
export const UNTITLED_TEMPLATE_NAME = 'Untitled Template';

export const DEFAULT_PROJECT_GRID_SIZE: Record<'imperial' | 'metric', number> = {
  imperial: 1,
  metric: 25
};

export const TITLE_BAR_OVERLAY_COLORS = {
  dark: { color: '#242424', symbolColor: '#ffffff' },
  light: { color: '#ffffff', symbolColor: '#1a1a1a' }
} as const;
