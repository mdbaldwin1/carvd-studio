# shadcn/ui Migration — Handoff Status

**Date**: 2026-02-20 (updated)
**Branch**: develop
**Last develop SHA**: `a5b4cc7` (after bead 11.2 PR #268 merge)

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

### Epic 5: Desktop Complex Components (complete)

| Bead | PR   | Description                              |
| ---- | ---- | ---------------------------------------- |
| 5.1  | #241 | Tabs migration (Start/CutList/Library)   |
| 5.2  | #243 | Table migration (CutList parts table)    |
| 5.3  | #244 | Card migration (Start/Settings/Template) |
| 5.4  | #245 | Collapsible/Accordion migration          |
| 5.5  | #246 | Progress/Skeleton migration              |

### Epic 6: Desktop Modal Migration (complete)

| Bead | PR   | Description                   |
| ---- | ---- | ----------------------------- |
| 6.1  | #247 | Stock modals                  |
| 6.2  | #248 | Assembly modals               |
| 6.3  | #249 | Project modals                |
| 6.4  | #250 | AppSettingsModal              |
| 6.5  | #251 | CutListModal                  |
| 6.6  | #252 | TemplateBrowserModal          |
| 6.7  | #253 | License/trial/utility dialogs |

### Epic 7: Desktop Layout & Specialized Components (complete)

| Bead | PR   | Description                             |
| ---- | ---- | --------------------------------------- |
| 7.1  | #254 | Sidebar migration                       |
| 7.2  | #255 | Header/Toolbar button migration         |
| 7.3  | #256 | Properties panel form-control migration |
| 7.4  | #257 | Banner migration to shadcn Alert        |
| 7.5  | #258 | Tutorial component migration            |
| 7.6  | #259 | StartScreen Card/navigation migration   |

### Epic 8: Desktop CSS Cleanup (complete)

| Bead | PR   | Description                     |
| ---- | ---- | ------------------------------- |
| 8.1  | #261 | Remove primitives.css           |
| 8.2  | #262 | Simplify layout.css             |
| 8.3  | #263 | Simplify domain.css             |
| 8.4  | #264 | Finalize tailwind.css theme map |
| 8.5  | #265 | Update tests + verify coverage  |
| 8.6  | #266 | Bundle size audit               |

**Total: 48 beads merged across 10 epics (2, 3, 4, 5, 6, 7, 8, 9, 10, 11-partial)**

## Active Worktrees

| Worktree                                  | Branch                   | State                         |
| ----------------------------------------- | ------------------------ | ----------------------------- |
| `/Users/mbaldwin/Carvd/carvd-studio-11-3` | `test/carvd-studio-11.3` | Active (website bundle audit) |

## Current Position

- **Current bead**: Epic 11.3 (`Website bundle size audit`) complete on branch `test/carvd-studio-11.3` and ready for PR.
- **Coverage status**: Desktop thresholds pass after bead 8.5 (`Statements 91.7%`, `Branches 82.02%`, `Functions 90.06%`, `Lines 91.98%`).
- **Desktop CSS cleanup status**: Epic 8 is complete (8.1–8.6 merged).
- **Website cleanup status**: 11.1 merged in PR #267; 11.2 merged in PR #268; 11.3 bundle audit completed locally with net reduced website payload.

## Remaining Work (Not Started)

### Desktop Epics 5–8

**Epic 5: Desktop Complex Components** (depends on Epic 3 ✅)

- 5.1: Tabs — **DONE** (PR #241 merged)
- 5.2: Table — **DONE** (PR #243 merged)
- 5.3: Card — **DONE** (PR #244 merged)
- 5.4: Collapsible/Accordion — **DONE** (PR #245 merged)
- 5.5: Progress/Skeleton — **DONE** (PR #246 merged)

**Epic 6: Desktop Modal Migration** (depends on 3.5 ✅ and 3.2 ✅ — complete)

- 6.1: Stock modals (AddStock, EditStock, StockLibrary) — **DONE** (PR #247 merged)
- 6.2: Assembly modals (AddAssembly, SaveAssembly) — **DONE** (PR #248 merged)
- 6.3: Project modals (NewProject, ProjectSettings, ImportAppState) — **DONE** (PR #249 merged)
- 6.4: AppSettingsModal (largest, 7+ sections) — **DONE** (PR #250 merged)
- 6.5: CutListModal (complex: 4 tabs, tables, diagrams) — **DONE** (PR #251 merged)
- 6.6: TemplateBrowserModal — **DONE** (PR #252 merged)
- 6.7: License/trial/utility dialogs — **DONE** (PR #253 merged)

**Epic 7: Desktop Layout & Specialized** (depends on Epics 4 ✅ and 5)

- 7.1: Sidebar → shadcn Sidebar + Collapsible — **DONE** (PR #254 merged)
- 7.2: Header/Toolbar buttons — **DONE** (PR #255 merged)
- 7.3: Properties Panel form controls — **DONE** (PR #256 merged)
- 7.4: Banners → shadcn Alert — **DONE** (PR #257 merged)
- 7.5: Tutorial components — **DONE** (PR #258 merged)
- 7.6: StartScreen layout → Card + Tabs — **DONE** (PR #259 merged)

**Epic 8: Desktop CSS Cleanup** (depends on Epics 6 and 7)

- 8.1: Remove primitives.css — **DONE** (PR #261 merged)
- 8.2: Simplify layout.css — **DONE** (PR #262 merged)
- 8.3: Simplify domain.css — **DONE** (PR #263 merged)
- 8.4: Finalize tailwind.css (clean theming bridge) — **DONE** (PR #264 merged)
- 8.5: Update all tests, verify coverage thresholds — **DONE** (PR #265 merged)
- 8.6: Bundle size audit — **DONE** (PR #266 merged)

### Website Epic 11

**Epic 11: Website CSS Cleanup** (depends on Epic 10 ✅ — ready to start)

- 11.1: Remove old index.css — **DONE** (PR #267 merged)
- 11.2: Update tests, verify build — **DONE** (PR #268 merged)
- 11.3: Bundle size audit — **DONE** (pending PR)

### Epic 12: Final Integration

- 12.1: Cross-app theme consistency check
- 12.2: Update CLAUDE.md with shadcn patterns
- 12.3: Final CHANGELOG.md update

## Dependency Graph Summary

```
Epics 2, 3, 4, 5, 6, 7, 8, 9, 10 are COMPLETE ✅
Epic 8 is COMPLETE ✅
Epic 11 is IN PROGRESS (11.1 + 11.2 merged, 11.3 done pending PR)
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

Bead status state shown here is current as of 2026-02-20.

## Recommended Next Steps

1. Complete merge for **Epic 11.1** (website `index.css` cleanup).
2. Execute **Epic 11.2** (website tests + verification).
3. Execute **Epic 11.3** (website bundle size audit).
4. Complete Epic 12 integration after Epics 8 and 11.
