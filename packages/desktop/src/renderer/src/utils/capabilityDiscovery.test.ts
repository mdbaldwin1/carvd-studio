import { describe, expect, it } from 'vitest';
import { createTestPart, createTestProject, createTestStock } from '../../../../tests/helpers/factories';
import type { Project, RectCutFeature } from '../types';
import {
  ALL_CAPABILITIES,
  CAPABILITY_INFO,
  EMPTY_CAPABILITY_USAGE,
  detectCapabilities,
  isSuggestionDue,
  recordProjectUsage,
  suggestCapability,
  type CapabilityUsage
} from './capabilityDiscovery';

function cut(cutType: RectCutFeature['cutType']): RectCutFeature {
  return {
    id: `cut-${cutType}`,
    kind: 'rect_cut',
    version: 1,
    enabled: true,
    cutType,
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'min', secondaryFrom: 'min' },
    parameters: { size: { length: 2, width: 1 }, depthMode: 'blind', depth: 0.25 },
    placement: { x: 1, z: 1 }
  };
}

function project(overrides: Partial<Project> = {}): Project {
  return { ...createTestProject(), parts: [], groups: [], groupMembers: [], ...overrides } as Project;
}

describe('detectCapabilities', () => {
  it('finds nothing in an empty project', () => {
    expect(detectCapabilities(project())).toEqual(new Set());
  });

  it('reads groups, assemblies and guides off the project', () => {
    const found = detectCapabilities(
      project({
        groups: [{ id: 'g', name: 'Drawer', expanded: true, color: '#fff' } as never],
        assemblies: [{ id: 'a', name: 'Leg', parts: [], groups: [], groupMembers: [] } as never],
        snapGuides: [{ id: 's' } as never]
      })
    );
    expect(found).toEqual(new Set(['groups', 'assemblies', 'snap_guides']));
  });

  it('reads stock, glue-ups and cuts off the parts', () => {
    const stock = createTestStock();
    const found = detectCapabilities(
      project({
        stocks: [stock],
        parts: [
          createTestPart({ stockId: stock.id }),
          createTestPart({ glueUpPanel: true }),
          createTestPart({ features: [cut('cutout')] })
        ]
      })
    );
    expect(found).toEqual(new Set(['stock_assignment', 'glue_up_panels', 'custom_cuts']));
  });

  it('separates joinery from a plain opening', () => {
    const opening = detectCapabilities(project({ parts: [createTestPart({ features: [cut('cutout')] })] }));
    expect(opening.has('custom_cuts')).toBe(true);
    expect(opening.has('joinery')).toBe(false);

    const housed = detectCapabilities(project({ parts: [createTestPart({ features: [cut('stopped_dado')] })] }));
    expect(housed.has('custom_cuts')).toBe(true);
    expect(housed.has('joinery')).toBe(true);
  });

  it('every capability has something to say for itself', () => {
    for (const capability of ALL_CAPABILITIES) {
      const info = CAPABILITY_INFO[capability];
      expect(info.label.length).toBeGreaterThan(0);
      // The pitch is what a maker reads, so it has to be a sentence about the
      // shop rather than a feature name repeated back at them.
      expect(info.pitch.length).toBeGreaterThan(20);
      expect(info.pitch.toLowerCase()).not.toBe(info.label.toLowerCase());
    }
  });
});

describe('recordProjectUsage', () => {
  const grouped = project({ groups: [{ id: 'g' } as never], parts: [createTestPart(), createTestPart()] });

  it('counts a project once however often it is saved', () => {
    const first = recordProjectUsage(EMPTY_CAPABILITY_USAGE, grouped, 'a.carvd', []);
    const second = recordProjectUsage(first.usage, grouped, 'a.carvd', first.seenKeys);
    const third = recordProjectUsage(second.usage, grouped, 'a.carvd', second.seenKeys);

    expect(third.usage.projectsSeen).toBe(1);
    expect(third.usage.usedIn.groups).toBe(1);
  });

  it('accumulates across different projects', () => {
    const first = recordProjectUsage(EMPTY_CAPABILITY_USAGE, grouped, 'a.carvd', []);
    const second = recordProjectUsage(first.usage, project({ parts: [createTestPart()] }), 'b.carvd', first.seenKeys);

    expect(second.usage.projectsSeen).toBe(2);
    expect(second.usage.usedIn.groups).toBe(1);
  });

  it('remembers the largest project, to judge what is worth suggesting', () => {
    const big = project({ parts: Array.from({ length: 12 }, () => createTestPart()) });
    const usage = recordProjectUsage(EMPTY_CAPABILITY_USAGE, big, 'big.carvd', []).usage;
    const after = recordProjectUsage(usage, project({ parts: [createTestPart()] }), 'small.carvd', ['big.carvd']).usage;
    expect(after.largestPartCount).toBe(12);
  });
});

describe('suggestCapability', () => {
  const seasoned = (overrides: Partial<CapabilityUsage> = {}): CapabilityUsage => ({
    ...EMPTY_CAPABILITY_USAGE,
    projectsSeen: 6,
    largestPartCount: 20,
    ...overrides
  });

  it('says nothing until there is enough work to judge by', () => {
    expect(suggestCapability({ ...seasoned(), projectsSeen: 2 })).toBeNull();
  });

  it('says nothing about a capability already used', () => {
    const usage = seasoned({
      usedIn: Object.fromEntries(ALL_CAPABILITIES.map((capability) => [capability, 1]))
    });
    expect(suggestCapability(usage)).toBeNull();
  });

  it('never offers something that was dismissed', () => {
    const usage = seasoned({ dismissed: ['stock_assignment'] });
    expect(suggestCapability(usage)?.capability).not.toBe('stock_assignment');
  });

  it('keeps quiet about assemblies on a small project', () => {
    // Three parts is not a project that wants sub-assemblies, and saying so
    // would be a pitch rather than help.
    const usage = seasoned({ largestPartCount: 3 });
    const suggestion = suggestCapability(usage);
    expect(suggestion?.capability).not.toBe('assemblies');
    expect(CAPABILITY_INFO.assemblies.relevantAtParts).toBeGreaterThan(3);
  });

  it('offers the one that fits the smallest project first', () => {
    const usage = seasoned();
    expect(suggestCapability(usage)?.capability).toBe('stock_assignment');
  });

  it('can say how long someone has gone without it', () => {
    const usage = seasoned({ projectsSeen: 14, usedIn: { stock_assignment: 14, cut_lists: 9 } });
    const suggestion = suggestCapability(usage)!;
    expect(suggestion.projectsWithout).toBe(14);
    expect(suggestion.info.pitch).toBeTruthy();
  });
});

describe('isSuggestionDue', () => {
  const now = new Date('2026-03-10T12:00:00Z');

  it('is due when nothing has been suggested yet', () => {
    expect(isSuggestionDue(EMPTY_CAPABILITY_USAGE, now)).toBe(true);
  });

  it('waits a week between suggestions', () => {
    const threeDaysAgo = { ...EMPTY_CAPABILITY_USAGE, lastSuggestedAt: '2026-03-07T12:00:00Z' };
    const tenDaysAgo = { ...EMPTY_CAPABILITY_USAGE, lastSuggestedAt: '2026-02-28T12:00:00Z' };
    expect(isSuggestionDue(threeDaysAgo, now)).toBe(false);
    expect(isSuggestionDue(tenDaysAgo, now)).toBe(true);
  });

  it('treats an unreadable timestamp as due rather than never', () => {
    expect(isSuggestionDue({ ...EMPTY_CAPABILITY_USAGE, lastSuggestedAt: 'not a date' }, now)).toBe(true);
  });
});
