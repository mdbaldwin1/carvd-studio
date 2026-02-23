const DOCS_BASE_URL = 'https://carvd-studio.com/docs';

type DocSlug =
  | 'quick-start'
  | 'interface'
  | 'first-project'
  | 'parts'
  | 'stock'
  | 'groups'
  | 'cut-lists'
  | 'assemblies'
  | 'templates'
  | 'snapping'
  | 'joinery'
  | 'shortcuts'
  | 'settings'
  | 'requirements'
  | 'troubleshooting'
  | 'faq';
type SettingsAnchor = 'app-settings' | 'backup-sync' | 'project-settings';

export type DocsSection = DocSlug | SettingsAnchor;

const DOCS_SECTION_URLS: Record<DocsSection, string> = {
  'quick-start': `${DOCS_BASE_URL}/quick-start`,
  interface: `${DOCS_BASE_URL}/interface`,
  'first-project': `${DOCS_BASE_URL}/first-project`,
  parts: `${DOCS_BASE_URL}/parts`,
  stock: `${DOCS_BASE_URL}/stock`,
  groups: `${DOCS_BASE_URL}/groups`,
  'cut-lists': `${DOCS_BASE_URL}/cut-lists`,
  assemblies: `${DOCS_BASE_URL}/assemblies`,
  templates: `${DOCS_BASE_URL}/templates`,
  snapping: `${DOCS_BASE_URL}/snapping`,
  joinery: `${DOCS_BASE_URL}/joinery`,
  shortcuts: `${DOCS_BASE_URL}/shortcuts`,
  settings: `${DOCS_BASE_URL}/settings`,
  requirements: `${DOCS_BASE_URL}/requirements`,
  troubleshooting: `${DOCS_BASE_URL}/troubleshooting`,
  faq: `${DOCS_BASE_URL}/faq`,
  'app-settings': `${DOCS_BASE_URL}/settings#app-settings`,
  'backup-sync': `${DOCS_BASE_URL}/settings#backup-sync`,
  'project-settings': `${DOCS_BASE_URL}/settings#project-settings`
};

export function getDocsUrl(section?: DocsSection): string {
  if (!section) {
    return DOCS_BASE_URL;
  }

  return DOCS_SECTION_URLS[section];
}
