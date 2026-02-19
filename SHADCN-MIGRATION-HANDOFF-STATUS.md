# shadcn/ui Migration — Handoff Status

**Date**: 2026-02-19 (updated)
**Branch**: develop
**Last develop SHA**: `9dbf5ce` (after bead 5.4 PR #245 merge)

## Key Instruction Documents

These documents define the migration workflow and must be followed:

1. **ORCHESTRATOR-INSTRUCTIONS.md** — Coordination strategy, dependency graph, parallelism rules
2. **BEAD-EXECUTION-WORKFLOW.md** — Per-bead execution loop (worktree → implement → test → lint → typecheck → commit → push → PR → merge → cleanup)
3. **SHADCN-MIGRATION-SESSION-HANDOFF.md** — Component mappings, theming bridge, testing patterns, critical constraints

## Completed Beads (Merged to develop)

### Epic 2: Desktop Foundation (complete)

| Bead | PR   | Description                        |
| ---- | ---- | ---------------------------------- |
| 2.1  | #213 | Install shadcn/ui dependencies     |
| 2.2  | #215 | Theming bridge                     |
| 2.3  | #216 | cn() utility + component directory |

### Epic 3: Desktop Core Primitives (complete)

| Bead | PR   | Description            |
| ---- | ---- | ---------------------- |
| 3.1  | #221 | Button migration       |
| 3.2  | #223 | Input, Textarea, Label |
| 3.3  | #225 | Select                 |
| 3.4  | #226 | Checkbox, RadioGroup   |
| 3.5  | #227 | Dialog (Modal base)    |
| 3.6  | #228 | Toast/Sonner           |

### Epic 4: Desktop Overlay & Navigation (complete)

| Bead | PR   | Description                   |
| ---- | ---- | ----------------------------- |
| 4.1  | #233 | AlertDialog (ConfirmDialog)   |
| 4.2  | #234 | ContextMenu                   |
| 4.3  | #236 | DropdownMenu                  |
| 4.4  | #237 | Tooltip/Popover + HelpTooltip |
| 4.5  | #235 | Badge, Separator, ScrollArea  |

### Epic 9: Website Foundation (complete)

| Bead | PR   | Description                    |
| ---- | ---- | ------------------------------ |
| 9.1  | #214 | Website Tailwind foundation    |
| 9.2  | #217 | Website theming                |
| 9.3  | #218 | Website core shadcn components |

### Epic 10: Website Page Migration (complete)

| Bead | PR   | Description                              |
| ---- | ---- | ---------------------------------------- |
| 10.1 | #219 | Header, Footer, shared components        |
| 10.2 | #220 | HomePage, FeaturesPage                   |
| 10.3 | #222 | PricingPage                              |
| 10.4 | #229 | DownloadPage, SupportPage, ChangelogPage |
| 10.5 | #230 | Docs layout, sidebar, navigation         |
| 10.6 | #232 | Docs content pages                       |
| 10.7 | #231 | Legal pages + 404                        |

### Epic 5: Desktop Complex Components (in progress)

| Bead | PR   | Description                              |
| ---- | ---- | ---------------------------------------- |
| 5.1  | #241 | Tabs migration (Start/CutList/Library)   |
| 5.2  | #243 | Table migration (CutList parts table)    |
| 5.3  | #244 | Card migration (Start/Settings/Template) |
| 5.4  | #245 | Collapsible/Accordion migration          |

**Total: 27 beads merged across 6 epics (2, 3, 4, 5, 9, 10)**

## Active Worktrees

| Worktree                                 | Branch                | State                    |
| ---------------------------------------- | --------------------- | ------------------------ |
| `/Users/mbaldwin/Carvd/carvd-studio-5.5` | feat/carvd-studio-5.5 | **In progress (active)** |

All completed worktrees through bead 5.4 have been cleaned up.

## In-Progress Work: Bead 5.5 (Progress/Skeleton)

**Worktree**: `/Users/mbaldwin/Carvd/carvd-studio-5.5`
**Branch**: `feat/carvd-studio-5.5`
**State**: Implementation complete; PR prep in progress

### What was done:

1. Added Progress primitive at `packages/desktop/src/renderer/src/components/ui/progress.tsx`
2. Added Skeleton primitive at `packages/desktop/src/renderer/src/components/ui/skeleton.tsx`
3. Migrated `components/common/ProgressBar.tsx` to shadcn/Radix progress composition while preserving public props
4. Migrated `components/common/LoadingSpinner.tsx` to shadcn skeleton-based loading visuals
5. Updated `ProgressBar` and `LoadingSpinner` tests for the new primitive structure
6. Verified desktop lint/typecheck and targeted component tests pass locally

### Outstanding before merge:

1. Open PR for bead 5.5 and pass CI checks
2. Merge PR (squash) and clean up worktree/branch

## Remaining Work (Not Started)

### Desktop Epics 5–8

**Epic 5: Desktop Complex Components** (depends on Epic 3 ✅)

- 5.1: Tabs — **DONE** (PR #241 merged)
- 5.2: Table — **DONE** (PR #243 merged)
- 5.3: Card — **DONE** (PR #244 merged)
- 5.4: Collapsible/Accordion — **DONE** (PR #245 merged)
- 5.5: Progress/Skeleton — **IN PROGRESS**

**Epic 6: Desktop Modal Migration** (depends on 3.5 ✅ and 3.2 ✅ — ready to start)

- 6.1: Stock modals (AddStock, EditStock, StockLibrary)
- 6.2: Assembly modals (AddAssembly, SaveAssembly)
- 6.3: Project modals (NewProject, ProjectSettings, ImportAppState)
- 6.4: AppSettingsModal (largest, 7+ sections)
- 6.5: CutListModal (complex: 4 tabs, tables, diagrams)
- 6.6: TemplateBrowserModal
- 6.7: License/trial/utility dialogs

**Epic 7: Desktop Layout & Specialized** (depends on Epics 4 ✅ and 5)

- 7.1: Sidebar → shadcn Sidebar + Collapsible
- 7.2: Header/Toolbar buttons
- 7.3: Properties Panel form controls
- 7.4: Banners → shadcn Alert
- 7.5: Tutorial components
- 7.6: StartScreen layout → Card + Tabs

**Epic 8: Desktop CSS Cleanup** (depends on Epics 6 and 7)

- 8.1: Remove primitives.css
- 8.2: Simplify layout.css
- 8.3: Simplify domain.css
- 8.4: Finalize tailwind.css (clean theming bridge)
- 8.5: Update all tests, verify coverage thresholds
- 8.6: Bundle size audit

### Website Epic 11

**Epic 11: Website CSS Cleanup** (depends on Epic 10 ✅ — ready to start)

- 11.1: Remove old index.css
- 11.2: Update tests, verify build
- 11.3: Bundle size audit

### Epic 12: Final Integration

- 12.1: Cross-app theme consistency check
- 12.2: Update CLAUDE.md with shadcn patterns
- 12.3: Final CHANGELOG.md update

## Dependency Graph Summary

```
Epics 2, 3, 4, 9, 10 are COMPLETE ✅
Epic 5 is IN PROGRESS (5.1/5.2/5.3/5.4 done, 5.5 active)
Epic 6 can start NOW (dependencies 3.5 ✅ and 3.2 ✅ are met)
Epic 7 is BLOCKED on Epic 5 (Epic 4 dependency is met ✅)
Epic 8 is BLOCKED on Epics 6 and 7
Epic 11 can start NOW (dependency Epic 10 ✅ is met)
Epic 12 is BLOCKED on Epics 8 and 11
```

## Key Technical Notes

### ESLint Globals

The eslint.config.js has been updated with DOM type globals needed by shadcn components:
`HTMLButtonElement`, `HTMLDivElement`, `HTMLElement`, `HTMLLabelElement`, `HTMLSelectElement`, `HTMLFormElement`, `HTMLHeadingElement`, `HTMLParagraphElement`, `HTMLSpanElement`

If a new shadcn component uses a new HTML element type in `forwardRef`, you may need to add it to globals.

### Testing Patterns for Radix Components

- **Radix DropdownMenu/ContextMenu**: Use `userEvent.setup()` + `await user.click()`. Find items via `screen.getByRole('menuitem', { name: /text/i })`. Disabled items have `data-disabled` attribute, NOT `disabled` HTML attribute.
- **Radix Dialog**: Renders in a portal. Use `screen.getByRole('dialog')`.
- **Radix Select**: Renders as a Radix popover, not native `<select>`.
- **Radix AlertDialog**: Similar to Dialog but with specific action/cancel roles.
- **Radix Tabs**: Use `screen.getByRole('tab', { name: /text/i })` to find tabs. Active tab has `data-state="active"`. Content uses `role="tabpanel"`.

### Package.json Conflict Resolution Pattern

Every bead that adds a new Radix package will conflict with other beads' package.json. Resolution:

1. Keep BOTH `@radix-ui/react-*` entries (they're separate packages)
2. Regenerate package-lock.json: `git checkout --theirs package-lock.json && npm install --package-lock-only`

### Running Tests from Worktrees

Always run from the `packages/desktop` directory inside the worktree:

```bash
cd /Users/mbaldwin/Carvd/carvd-studio-{bead}/packages/desktop && npm test
```

Running from the worktree root with `npx vitest -c ...` will fail because `tests/setup.ts` is resolved relative to `packages/desktop`.

### Bead Status Tracking

Update `.beads/issues.jsonl` after each merge using:

```bash
bd update carvd-studio-{bead-id} --status done
```

Bead status state shown here is current as of 2026-02-19.

## Recommended Next Steps

1. **Complete bead 5.5** — create PR, pass CI, merge, and cleanup.
2. **After Epic 5 completes**, proceed to Epic 6 and Epic 7 in dependency order.
3. **Run Epic 6 and Epic 11 in parallel where safe** to reduce critical path.
4. Epic 8 remains final desktop cleanup before Epic 12 integration.
