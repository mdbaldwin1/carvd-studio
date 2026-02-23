const DOCS_BASE_URL = 'https://carvd-studio.com/docs';

const DOCS_SECTION_URLS: Record<string, string> = {
  settings: `${DOCS_BASE_URL}/settings`,
  'app-settings': `${DOCS_BASE_URL}/settings#app-settings`,
  'backup-sync': `${DOCS_BASE_URL}/settings#backup-sync`,
  'project-settings': `${DOCS_BASE_URL}/settings#project-settings`
};

export function getDocsUrl(section?: string): string {
  if (!section) {
    return DOCS_BASE_URL;
  }

  const mapped = DOCS_SECTION_URLS[section];
  if (mapped) {
    return mapped;
  }

  return `${DOCS_BASE_URL}/${section}`;
}
