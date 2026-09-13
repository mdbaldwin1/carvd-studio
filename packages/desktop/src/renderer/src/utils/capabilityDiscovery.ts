import type { DocsSection } from './docsLinks';
import type { Assembly, Group, Part, PartFeature, SnapGuide } from '../types';

/**
 * Just the parts of a project this reads.
 *
 * Narrower than Project on purpose: the live store holds the same fields flat
 * rather than wrapped, so asking for only what is inspected lets a saved file
 * and the open project both be folded in without converting either.
 */
export interface CapabilitySource {
  parts?: Part[];
  groups?: Group[];
  assemblies?: Assembly[];
  snapGuides?: SnapGuide[];
  cutList?: unknown;
}

/**
 * What a maker has actually built with, derived from their own work.
 *
 * Carvd can do a great deal that never gets found: a project can group a
 * drawer's parts so they move together, reuse an assembly, or mark a wide top
 * as a glue-up so the cut list divides it into boards. Someone who has never
 * seen those does not know to look for them.
 *
 * The evidence is the project itself, not a record of clicks. A group either
 * exists in the file or it does not, which needs no telemetry, works offline,
 * survives a reinstall, and reflects what was made rather than what was
 * pressed. Nothing here leaves the machine.
 */
export type Capability =
  | 'groups'
  | 'assemblies'
  | 'custom_cuts'
  | 'joinery'
  | 'glue_up_panels'
  | 'stock_assignment'
  | 'cut_lists'
  | 'snap_guides';

export interface CapabilityInfo {
  /** How the capability is named to a maker. */
  label: string;
  /** What it is for, in the shop rather than in the interface. */
  pitch: string;
  docs: DocsSection;
  /**
   * Below this many parts the capability is not worth suggesting: nobody needs
   * assemblies for a three-part project, and saying so is noise.
   */
  relevantAtParts: number;
}

export const CAPABILITY_INFO: Record<Capability, CapabilityInfo> = {
  groups: {
    label: 'Groups',
    pitch: "Keep a drawer's or door's parts together so they move and rotate as one.",
    docs: 'groups',
    relevantAtParts: 4
  },
  assemblies: {
    label: 'Assemblies',
    pitch: 'Save a sub-assembly once and place it again in this or another project.',
    docs: 'assemblies',
    relevantAtParts: 8
  },
  custom_cuts: {
    label: 'Custom cuts',
    pitch: 'Cut dados, rabbets, holes and openings into a part and see them on the board.',
    docs: 'joinery',
    relevantAtParts: 2
  },
  joinery: {
    label: 'Joinery',
    pitch: 'Mortises, tenons and housed joints that carry through to the cut list.',
    docs: 'joinery',
    relevantAtParts: 3
  },
  glue_up_panels: {
    label: 'Glue-up panels',
    pitch: 'Mark a wide top as a glue-up and the cut list divides it into boards for you.',
    docs: 'cut-lists',
    relevantAtParts: 2
  },
  stock_assignment: {
    label: 'Stock assignment',
    pitch: 'Assign real material to a part and have its size checked against the board.',
    docs: 'stock',
    relevantAtParts: 1
  },
  cut_lists: {
    label: 'Cut lists',
    pitch: 'Turn the design into a cutting plan with offcuts and a shopping list.',
    docs: 'cut-lists',
    relevantAtParts: 2
  },
  snap_guides: {
    label: 'Guides',
    pitch: 'Drop a guide plane and align parts to it instead of measuring each one.',
    docs: 'snapping',
    relevantAtParts: 4
  }
};

export const ALL_CAPABILITIES = Object.keys(CAPABILITY_INFO) as Capability[];

/** Cut types that are joinery rather than a plain opening. */
const JOINERY_CUT_TYPES = new Set([
  'dado',
  'stopped_dado',
  'groove',
  'stopped_groove',
  'rabbet',
  'mortise',
  'tenon',
  'half_lap'
]);

function isJoinery(feature: PartFeature): boolean {
  return feature.kind === 'rect_cut' && JOINERY_CUT_TYPES.has(feature.cutType);
}

/** Which capabilities this project is evidence of. */
export function detectCapabilities(project: CapabilitySource): Set<Capability> {
  const found = new Set<Capability>();
  const parts = project.parts ?? [];

  if ((project.groups?.length ?? 0) > 0) found.add('groups');
  if ((project.assemblies?.length ?? 0) > 0) found.add('assemblies');
  if ((project.snapGuides?.length ?? 0) > 0) found.add('snap_guides');
  if (project.cutList) found.add('cut_lists');

  for (const part of parts) {
    if (part.stockId) found.add('stock_assignment');
    if (part.glueUpPanel) found.add('glue_up_panels');
    const features = part.features ?? [];
    if (features.length > 0) found.add('custom_cuts');
    if (features.some(isJoinery)) found.add('joinery');
  }

  return found;
}

export interface CapabilityUsage {
  /** How many distinct projects have contributed evidence. */
  projectsSeen: number;
  /** Projects that used each capability, so "never, in 14" can be said. */
  usedIn: Partial<Record<Capability, number>>;
  /**
   * Part counts of recent projects, newest last, used to judge whether a
   * suggestion is apt.
   *
   * A list rather than a running maximum because the maximum is set once and
   * never comes down: a single 2,000-part stress file would say forever that
   * this maker builds at a scale that makes every capability worth raising,
   * when their actual work is eight-part desks.
   */
  recentPartCounts: number[];
  /** Capabilities the maker has told us to stop offering. */
  dismissed: Capability[];
  /** ISO timestamp of the last suggestion shown. */
  lastSuggestedAt?: string;
}

export const EMPTY_CAPABILITY_USAGE: CapabilityUsage = {
  projectsSeen: 0,
  usedIn: {},
  recentPartCounts: [],
  dismissed: []
};

/** How many projects are remembered individually. */
const SEEN_PROJECT_LIMIT = 50;

/** What each remembered project has already been credited for. */
export type SeenProjects = Record<string, Capability[]>;

/**
 * Fold one project into what is known.
 *
 * A capability counts once per project rather than once per save, so leaving a
 * file open all afternoon does not make one sitting look like a habit. What is
 * remembered is per project, not merely that the project was seen: someone who
 * finally tries a guide plane in a design they have been saving for weeks has
 * used guides, and must be credited for it the moment they do.
 *
 * Returns the previous values untouched when there is nothing new, so the
 * caller can tell an ordinary save from something worth writing to disk.
 */
export function recordProjectUsage(
  previous: CapabilityUsage,
  project: CapabilitySource,
  projectKey: string,
  seen: SeenProjects = {}
): { usage: CapabilityUsage; seen: SeenProjects } {
  const credited = seen[projectKey];
  const isNewProject = credited === undefined;
  const found = detectCapabilities(project);
  const fresh = [...found].filter((capability) => !credited?.includes(capability));

  if (!isNewProject && fresh.length === 0) return { usage: previous, seen };

  const usedIn = { ...previous.usedIn };
  for (const capability of fresh) {
    usedIn[capability] = (usedIn[capability] ?? 0) + 1;
  }

  const nextSeen = { ...seen, [projectKey]: [...(credited ?? []), ...fresh] };
  // Oldest first, so trimming drops the project touched longest ago.
  const keys = Object.keys(nextSeen);
  for (const key of keys.slice(0, Math.max(0, keys.length - SEEN_PROJECT_LIMIT))) delete nextSeen[key];

  return {
    usage: {
      ...previous,
      projectsSeen: isNewProject ? previous.projectsSeen + 1 : previous.projectsSeen,
      usedIn,
      recentPartCounts: isNewProject
        ? [...previous.recentPartCounts, project.parts?.length ?? 0].slice(-RECENT_PROJECT_WINDOW)
        : previous.recentPartCounts
    },
    seen: nextSeen
  };
}

/** How many recent projects the size judgement is made from. */
const RECENT_PROJECT_WINDOW = 20;

/**
 * The size of project this maker typically builds.
 *
 * The median, so one outsized file -- a stress test, an inherited plan opened
 * once -- does not stand in for the work they actually do.
 */
export function typicalPartCount(usage: CapabilityUsage): number {
  const counts = [...usage.recentPartCounts].sort((a, b) => a - b);
  if (counts.length === 0) return 0;
  const middle = Math.floor(counts.length / 2);
  return counts.length % 2 === 0 ? (counts[middle - 1] + counts[middle]) / 2 : counts[middle];
}

export interface CapabilitySuggestion {
  capability: Capability;
  info: CapabilityInfo;
  /** Projects worked on without ever reaching for it. */
  projectsWithout: number;
}

/**
 * The next capability worth mentioning, or nothing.
 *
 * Only ever one, only something never used, only once there is enough work to
 * judge by, and only when the projects are big enough for it to help. Silence
 * is the right answer far more often than a card is.
 */
export function suggestCapability(
  usage: CapabilityUsage,
  options: { minimumProjects?: number } = {}
): CapabilitySuggestion | null {
  const minimumProjects = options.minimumProjects ?? 3;
  if (usage.projectsSeen < minimumProjects) return null;

  const typicalSize = typicalPartCount(usage);
  const candidates = ALL_CAPABILITIES.filter((capability) => {
    if (usage.dismissed.includes(capability)) return false;
    if ((usage.usedIn[capability] ?? 0) > 0) return false;
    return typicalSize >= CAPABILITY_INFO[capability].relevantAtParts;
  });
  if (candidates.length === 0) return null;

  // Offer the one that fits the smallest project first: it is the most likely
  // to be useful now, and the least likely to feel like a pitch for a feature
  // this maker has no use for.
  const capability = candidates.sort(
    (a, b) => CAPABILITY_INFO[a].relevantAtParts - CAPABILITY_INFO[b].relevantAtParts
  )[0];

  return { capability, info: CAPABILITY_INFO[capability], projectsWithout: usage.projectsSeen };
}

/** Whether enough time has passed to offer another suggestion. */
export function isSuggestionDue(usage: CapabilityUsage, now: Date, minimumDays = 7): boolean {
  if (!usage.lastSuggestedAt) return true;
  const last = Date.parse(usage.lastSuggestedAt);
  if (Number.isNaN(last)) return true;
  return now.getTime() - last >= minimumDays * 24 * 60 * 60 * 1000;
}
