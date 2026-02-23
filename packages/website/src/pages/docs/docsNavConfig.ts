export interface DocPage {
  slug: string;
  title: string;
  section: string;
  searchText?: string;
}

export const docPages: DocPage[] = [
  // Getting Started
  {
    slug: "quick-start",
    title: "Quick Start Guide",
    section: "Getting Started",
    searchText:
      "download install trial create project add part assign stock generate cut list five minutes beginner",
  },
  {
    slug: "interface",
    title: "Interface Overview",
    section: "Getting Started",
    searchText:
      "workspace viewport camera controls sidebar properties panel header selection box select orbit zoom pan focus",
  },
  {
    slug: "first-project",
    title: "Your First Project",
    section: "Getting Started",
    searchText:
      "bookshelf tutorial step by step shelves side panels stock assignment cut list diagrams beginner workflow",
  },
  // Core Features
  {
    slug: "parts",
    title: "Working with Parts",
    section: "Core Features",
    searchText:
      "part dimensions length width thickness position color grain direction duplicate copy paste delete notes overlap joinery",
  },
  {
    slug: "stock",
    title: "Stock Materials",
    section: "Core Features",
    searchText:
      "material library plywood lumber sheet goods board dimensions grain pricing constraints import export stock management",
  },
  {
    slug: "groups",
    title: "Groups & Organization",
    section: "Core Features",
    searchText:
      "group nested groups organize hierarchy merge ungroup rename move parts in sidebar structure",
  },
  {
    slug: "cut-lists",
    title: "Cut List Generation",
    section: "Core Features",
    searchText:
      "optimizer optimization cutting diagrams shopping list board feet waste kerf overage estimate cost pdf csv export",
  },
  // Advanced Features
  {
    slug: "assemblies",
    title: "Assemblies",
    section: "Advanced Features",
    searchText:
      "reusable components save assembly library insert instances drawer door shelf unit smart groups",
  },
  {
    slug: "templates",
    title: "Templates",
    section: "Advanced Features",
    searchText:
      "project templates built in custom template browser save template start from template reusable design",
  },
  {
    slug: "snapping",
    title: "Snapping & Alignment",
    section: "Advanced Features",
    searchText:
      "snap grid edge center corner align nudge measurements precision coordinates placement",
  },
  {
    slug: "joinery",
    title: "Joinery Allowances",
    section: "Advanced Features",
    searchText:
      "dado rabbet mortise tenon allowances extra length extra width cut dimensions woodworking joinery",
  },
  // Reference
  {
    slug: "shortcuts",
    title: "Keyboard Shortcuts",
    section: "Reference",
    searchText:
      "hotkeys keyboard commands undo redo copy paste duplicate group ungroup movement navigation tools",
  },
  {
    slug: "settings",
    title: "Settings & Preferences",
    section: "Reference",
    searchText:
      "app settings project settings defaults units appearance behavior backup import export license preferences",
  },
  {
    slug: "requirements",
    title: "System Requirements",
    section: "Reference",
    searchText:
      "macos windows hardware minimum requirements ram disk display graphics compatibility",
  },
  {
    slug: "troubleshooting",
    title: "Troubleshooting",
    section: "Reference",
    searchText:
      "activation license launch startup crash recovery performance lag cut list errors file problems",
  },
  {
    slug: "faq",
    title: "FAQ",
    section: "Reference",
    searchText:
      "trial free version limits pricing refund offline files export metric imperial support frequently asked questions",
  },
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

export function matchesDocSearch(page: DocPage, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack =
    `${page.title} ${page.slug} ${page.section} ${page.searchText || ""}`.toLowerCase();
  return haystack.includes(q);
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
