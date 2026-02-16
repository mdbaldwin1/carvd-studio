export interface DocPage {
  slug: string;
  title: string;
  section: string;
}

export const docPages: DocPage[] = [
  // Getting Started
  {
    slug: "quick-start",
    title: "Quick Start Guide",
    section: "Getting Started",
  },
  {
    slug: "interface",
    title: "Interface Overview",
    section: "Getting Started",
  },
  {
    slug: "first-project",
    title: "Your First Project",
    section: "Getting Started",
  },
  // Core Features
  { slug: "parts", title: "Working with Parts", section: "Core Features" },
  { slug: "stock", title: "Stock Materials", section: "Core Features" },
  { slug: "groups", title: "Groups & Organization", section: "Core Features" },
  { slug: "cut-lists", title: "Cut List Generation", section: "Core Features" },
  // Advanced Features
  { slug: "assemblies", title: "Assemblies", section: "Advanced Features" },
  { slug: "templates", title: "Templates", section: "Advanced Features" },
  {
    slug: "snapping",
    title: "Snapping & Alignment",
    section: "Advanced Features",
  },
  {
    slug: "joinery",
    title: "Joinery Allowances",
    section: "Advanced Features",
  },
  // Reference
  { slug: "shortcuts", title: "Keyboard Shortcuts", section: "Reference" },
  { slug: "settings", title: "Settings & Preferences", section: "Reference" },
  { slug: "requirements", title: "System Requirements", section: "Reference" },
  { slug: "troubleshooting", title: "Troubleshooting", section: "Reference" },
  { slug: "faq", title: "FAQ", section: "Reference" },
];

export interface NavSection {
  title: string;
  pages: DocPage[];
}

export function getNavSections(): NavSection[] {
  const sectionMap = new Map<string, DocPage[]>();
  for (const page of docPages) {
    const existing = sectionMap.get(page.section);
    if (existing) {
      existing.push(page);
    } else {
      sectionMap.set(page.section, [page]);
    }
  }
  return Array.from(sectionMap.entries()).map(([title, pages]) => ({
    title,
    pages,
  }));
}

export interface PrevNext {
  prev: DocPage | null;
  next: DocPage | null;
}

export function getPrevNext(slug: string): PrevNext {
  const index = docPages.findIndex((p) => p.slug === slug);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? docPages[index - 1] : null,
    next: index < docPages.length - 1 ? docPages[index + 1] : null,
  };
}
