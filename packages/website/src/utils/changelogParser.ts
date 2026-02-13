export interface ChangelogEntry {
  text: string;
  description: string;
}

export interface ChangelogCategory {
  name: string;
  entries: ChangelogEntry[];
}

export interface ChangelogVersion {
  version: string;
  date: string;
  categories: ChangelogCategory[];
}

const VERSION_REGEX = /^## \[(\d+\.\d+\.\d+(?:-[\w.]+)?)\]\s*-\s*(\d{4}-\d{2}-\d{2})$/;
const CATEGORY_REGEX = /^### (.+)$/;
const BOLD_ENTRY_REGEX = /^- \*\*(.+?)\*\*\s*[-–—]\s*(.+)$/;
const PLAIN_ENTRY_REGEX = /^- (.+)$/;

export function parseChangelog(raw: string): ChangelogVersion[] {
  const lines = raw.split('\n');
  const versions: ChangelogVersion[] = [];

  let currentVersion: ChangelogVersion | null = null;
  let currentCategory: ChangelogCategory | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines, title, intro text, and link references
    if (!trimmed || trimmed.startsWith('# ') || trimmed.startsWith('The format') || trimmed.startsWith('All notable') || trimmed.startsWith('and this project') || trimmed.match(/^\[[\d.]+\]:/)) {
      continue;
    }

    // Version heading
    const versionMatch = trimmed.match(VERSION_REGEX);
    if (versionMatch) {
      currentVersion = {
        version: versionMatch[1],
        date: versionMatch[2],
        categories: []
      };
      versions.push(currentVersion);
      currentCategory = null;
      continue;
    }

    // Category heading
    const categoryMatch = trimmed.match(CATEGORY_REGEX);
    if (categoryMatch && currentVersion) {
      currentCategory = {
        name: categoryMatch[1],
        entries: []
      };
      currentVersion.categories.push(currentCategory);
      continue;
    }

    // Entry with bold label
    const boldMatch = trimmed.match(BOLD_ENTRY_REGEX);
    if (boldMatch && currentCategory) {
      currentCategory.entries.push({
        text: boldMatch[1],
        description: boldMatch[2]
      });
      continue;
    }

    // Plain entry
    const plainMatch = trimmed.match(PLAIN_ENTRY_REGEX);
    if (plainMatch && currentCategory) {
      currentCategory.entries.push({
        text: plainMatch[1],
        description: ''
      });
      continue;
    }
  }

  return versions;
}
