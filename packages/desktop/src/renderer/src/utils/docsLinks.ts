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
  | 'part-cuts'
  | 'joint-recipes'
  | 'shortcuts'
  | 'settings'
  | 'requirements'
  | 'troubleshooting'
  | 'faq';
type SettingsAnchor = 'app-settings' | 'backup-sync' | 'project-settings';

type JoineryAnchor = 'matching-cuts' | 'assembly-placement' | 'insert-sockets' | 'joint-alignment' | 'router-profiles';

export type DocsSection = DocSlug | SettingsAnchor | JoineryAnchor;

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
  'part-cuts': `${DOCS_BASE_URL}/part-cuts`,
  'joint-recipes': `${DOCS_BASE_URL}/joint-recipes`,
  'matching-cuts': `${DOCS_BASE_URL}/joinery#matching-cuts`,
  'assembly-placement': `${DOCS_BASE_URL}/joinery#assembly-placement`,
  'insert-sockets': `${DOCS_BASE_URL}/joinery#inserts`,
  'joint-alignment': `${DOCS_BASE_URL}/snapping#joint-alignment`,
  'router-profiles': `${DOCS_BASE_URL}/part-cuts#router-profiles`,
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
