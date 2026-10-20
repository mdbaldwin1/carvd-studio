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
      "workspace viewport camera controls sidebar properties panel header selection box select orbit zoom pan focus rotation snap step precise angles multi-select shared handles",
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
      "part dimensions length width thickness position rotation custom angle precise rotate angle snap snap step reset rotation color grain direction duplicate copy paste delete notes overlap joinery",
  },
  {
    slug: "stock",
    title: "Stock Materials",
    section: "Core Features",
    searchText:
      "material library plywood lumber sheet goods board dimensions grain pricing constraints import export stock management dowel rod insert biscuit domino loose tenon",
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
      "snap grid edge center corner align nudge measurements precision coordinates placement rotated compound joint alignment alt option shift drag ground live grid",
  },
  {
    slug: "joinery",
    title: "Custom Cuts & Joinery",
    section: "Advanced Features",
    searchText:
      "dado rabbet mortise tenon allowances matching cuts layout bring pieces together assembly placement insert socket dowel biscuit domino loose tenon spline clearance glue shoulder joint fit",
  },
  {
    slug: "part-cuts",
    title: "Part Cuts",
    section: "Advanced Features",
    searchText:
      "end cut mitre bevel compound dado groove stopped rabbet mortise tenon notch hole pattern grid rows columns shelf pin countersink counterbore rounded slot routed path router profile cutter reference edge depth through save apply cuts circle jig pivot drill angle face socket wall tail splay mirror duplicate reorder enable disable svg import physical router tool feasibility profile versions library snapshot compatibility",
  },
  {
    slug: "joint-recipes",
    title: "Joint Recipes",
    section: "Advanced Features",
    searchText:
      "butt edge glue glue-up bridle box dovetail half blind sliding twin haunched mortise and tenon fox wedge wedged pegged tenon pin spline biscuit domino shiplap tongue and groove half lap egg crate scarf mitre miter birdsmouth hinge pocket hole counterbore countersink cross dowel barrel nut keyed cleat shelf pin rule t-slot beaded scallop tambour housing dado groove stopped dado stopped groove rabbet rabbeted dado dovetailed lap mitred half lap cutter sampler router bits edge profiles",
  },
  // Reference
  {
    slug: "shortcuts",
    title: "Keyboard Shortcuts",
    section: "Reference",
    searchText:
      "hotkeys keyboard commands undo redo copy paste duplicate group ungroup movement navigation tools rotate rotation custom angles precise rotate angle snap shift drag ring part cuts escape delete apply alt option",
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
