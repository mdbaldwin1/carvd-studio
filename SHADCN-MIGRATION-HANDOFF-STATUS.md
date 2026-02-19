# shadcn/ui Migration — Handoff Status

**Date**: 2026-02-19 (updated)
**Branch**: develop
**Last develop SHA**: `b524283` (after 4.4 merge)

## Key Instruction Documents

These documents define the migration workflow and must be followed:

1. **ORCHESTRATOR-INSTRUCTIONS.md** — Coordination strategy, dependency graph, parallelism rules
2. **BEAD-EXECUTION-WORKFLOW.md** — Per-bead execution loop (worktree → implement → test → lint → typecheck → commit → push → PR → merge → cleanup)
3. **SHADCN-MIGRATION-SESSION-HANDOFF.md** — Component mappings, theming bridge, testing patterns, critical constraints

## Completed Beads (Merged to develop)

| Bead | PR   | Description                              |
| ---- | ---- | ---------------------------------------- |
| 2.1  | #213 | Install shadcn/ui dependencies           |
| 2.2  | #215 | Theming bridge                           |
| 2.3  | #216 | cn() utility + component directory       |
| 3.1  | #221 | Button migration                         |
| 3.2  | #223 | Input, Textarea, Label                   |
| 3.3  | #225 | Select                                   |
| 3.4  | #226 | Checkbox, RadioGroup                     |
| 3.5  | #227 | Dialog (Modal base)                      |
| 3.6  | #228 | Toast/Sonner                             |
| 4.1  | #233 | AlertDialog (ConfirmDialog)              |
| 4.4  | #237 | Tooltip/Popover + HelpTooltip refactor   |
| 9.1  | #214 | Website Tailwind foundation              |
| 9.2  | #217 | Website theming                          |
| 9.3  | #218 | Website core shadcn components           |
| 10.1 | #219 | Header, Footer, shared components        |
| 10.2 | #220 | HomePage, FeaturesPage                   |
| 10.3 | #222 | PricingPage                              |
| 10.4 | #229 | DownloadPage, SupportPage, ChangelogPage |
| 10.5 | #230 | Docs layout, sidebar, navigation         |

## Open PRs (CI re-running after fixes)

| Bead | PR   | Status                            | Notes                                                                                                            |
| ---- | ---- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 4.2  | #234 | CI re-running after fix           | ContextMenu migration. Fixed E2E test (version-agnostic regex)                                                   |
| 4.3  | #236 | CI re-running after fix           | DropdownMenu migration. Fixed lint: added `HTMLSpanElement` to eslint globals, removed unused `fireEvent` import |
| 4.5  | #235 | CI re-running after rebase        | Badge, Separator, ScrollArea. Rebased on develop (resolved App.tsx + package.json conflicts)                     |
| 10.6 | #232 | CI re-running after branch update | Docs content pages                                                                                               |
| 10.7 | #231 | CI re-running after branch update | Legal pages + 404                                                                                                |

### Merge Order for Open PRs

**Desktop (Epic 4 beads are independent — any order):**

- Merge whichever goes green first → update other branches → merge next → repeat
- After each merge, the other PRs will need branch updates (use `gh api repos/mdbaldwin1/carvd-studio/pulls/{number}/update-branch -X PUT -f update_method=merge`)
- If update-branch gives a merge conflict (usually package.json/package-lock.json), rebase locally:
  1. `cd /Users/mbaldwin/Carvd/carvd-studio-{bead}` (worktree)
  2. `git fetch origin && git rebase origin/develop`
  3. Resolve package.json conflict (keep both radix dependencies), regenerate package-lock with `git checkout --theirs package-lock.json && npm install --package-lock-only`
  4. `git add -A && git rebase --continue`
  5. `git push --force-with-lease origin feat/carvd-studio-{bead}`

**Website (10.6 and 10.7 are independent — any order):**

- These should merge cleanly after branch updates

## Active Worktrees

| Worktree                                  | Branch                 | State                                    |
| ----------------------------------------- | ---------------------- | ---------------------------------------- |
| `/Users/mbaldwin/Carvd/carvd-studio-4.1`  | feat/carvd-studio-4.1  | **Can be removed** (PR merged)           |
| `/Users/mbaldwin/Carvd/carvd-studio-4.2`  | feat/carvd-studio-4.2  | PR open, CI running                      |
| `/Users/mbaldwin/Carvd/carvd-studio-4.3`  | feat/carvd-studio-4.3  | PR open, CI running                      |
| `/Users/mbaldwin/Carvd/carvd-studio-4.4`  | feat/carvd-studio-4.4  | **Can be removed** (PR merged)           |
| `/Users/mbaldwin/Carvd/carvd-studio-4.5`  | feat/carvd-studio-4.5  | PR open, CI running                      |
| `/Users/mbaldwin/Carvd/carvd-studio-5.1`  | feat/carvd-studio-5.1  | **In-progress work stashed** (see below) |
| `/Users/mbaldwin/Carvd/carvd-studio-10.6` | feat/carvd-studio-10.6 | PR open, CI running                      |
| `/Users/mbaldwin/Carvd/carvd-studio-10.7` | feat/carvd-studio-10.7 | PR open, CI running                      |

**Cleanup after merging**: `git worktree remove --force /Users/mbaldwin/Carvd/carvd-studio-{bead} && git branch -D feat/carvd-studio-{bead}`

## In-Progress Work: Bead 5.1 (Tabs)

**Worktree**: `/Users/mbaldwin/Carvd/carvd-studio-5.1`
**Branch**: `feat/carvd-studio-5.1`
**State**: Work is stashed (`git stash pop` to restore)

### What was done:

1. `@radix-ui/react-tabs` installed via npm
2. `components/ui/tabs.tsx` created — shadcn Tabs wrapper with Radix primitives
3. `CutListModal.tsx` — Tabs migration complete (replaced manual `activeTab` state with `<Tabs defaultValue="parts">`)
4. `StartScreen.tsx` — Tabs migration complete (replaced manual `activeTab` state with `<Tabs defaultValue="recents">`)
5. `StockLibraryModal.tsx` — Tabs migration complete (replaced manual `activeTab` state with `<Tabs defaultValue="stocks">`)

### What still needs to be done for 5.1:

1. **Run tests** — `cd packages/desktop && npm test` to verify all tests pass
2. **Fix any test failures** — Tests that click tabs will need to use Radix's `data-state` attributes. Tab buttons now have `role="tab"` via Radix. Tab switching tests may need `getByRole('tab', { name: /Parts List/i })` instead of `getByText`.
3. **Run lint and typecheck** — `npm run lint && npm run typecheck`
4. **Remove CSS** — The `.cut-list-tabs` class in `domain.css` print styles needs review. The `section-tab` CSS class may have been defined in primitives.css (check if removed already).
5. **Commit, push, create PR**

### Tab consumers found (3 total):

- **CutListModal** (`components/stock/CutListModal.tsx`) — 3 tabs: Parts, Diagrams, Shopping
- **StartScreen** (`components/project/StartScreen.tsx`) — 2 tabs: Recents, Favorites
- **StockLibraryModal** (`components/stock/StockLibraryModal.tsx`) — 2 tabs: Stocks, Assemblies

### Radix Tabs testing pattern:

```typescript
// Click a tab
fireEvent.click(screen.getByRole("tab", { name: /Diagrams/i }));
// Or with userEvent
await user.click(screen.getByRole("tab", { name: /Diagrams/i }));

// Verify active tab
expect(screen.getByRole("tab", { name: /Parts List/i })).toHaveAttribute(
  "data-state",
  "active",
);

// Tab content uses role="tabpanel"
expect(screen.getByRole("tabpanel")).toBeInTheDocument();
```

## Remaining Work (Not Started)

### Desktop Epics 5–8

**Epic 5: Desktop Complex Components** (depends on Epic 3 ✅)

- 5.1: Tabs — **IN PROGRESS** (see above)
- 5.2: Table — cut list tables and data displays
- 5.3: Card — StartScreen, Settings sections
- 5.4: Collapsible/Accordion — sidebar sections, joinery
- 5.5: Progress/Skeleton — loading states

**Epic 6: Desktop Modal Migration** (depends on 3.5 ✅ and 3.2 ✅)

- 6.1: Stock modals (AddStock, EditStock, StockLibrary)
- 6.2: Assembly modals (AddAssembly, SaveAssembly)
- 6.3: Project modals (NewProject, ProjectSettings, ImportAppState)
- 6.4: AppSettingsModal (largest, 7+ sections)
- 6.5: CutListModal (complex: 4 tabs, tables, diagrams)
- 6.6: TemplateBrowserModal
- 6.7: License/trial/utility dialogs

**Epic 7: Desktop Layout & Specialized** (depends on Epics 4 and 5)

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

**Epic 11: Website CSS Cleanup** (depends on Epic 10)

- 11.1: Remove old index.css
- 11.2: Update tests, verify build
- 11.3: Bundle size audit

### Epic 12: Final Integration

- 12.1: Cross-app theme consistency check
- 12.2: Update CLAUDE.md with shadcn patterns
- 12.3: Final CHANGELOG.md update

## Dependency Graph Summary

```
Epics 5 & 6 can start NOW (both depend on Epic 3 which is complete)
Epic 7 depends on Epics 4 (almost done) and 5
Epic 8 depends on Epics 6 and 7
Epic 11 depends on Epic 10 (almost done — 10.6, 10.7 in PR)
Epic 12 depends on Epics 8 and 11
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

Note: Many completed beads may not be updated in the JSONL yet. The issue statuses in the file are partially stale.

## Recommended Next Steps

1. **Monitor CI** on all 5 open PRs. Merge as they go green (update branches between merges).
2. **Finish bead 5.1** — Restore stash in the 5.1 worktree, run tests, fix failures, lint, typecheck, commit, push, create PR.
3. **Continue Epic 5** beads (5.2–5.5) sequentially.
4. **Start Epic 6** in parallel with Epic 5 (both dependencies are met). Epic 6 beads are independent of each other.
5. **Merge 10.6 and 10.7** to complete website Epic 10, then start Epic 11.
6. **After Epic 4 merges**, can start Epic 7 (once Epic 5 also done).
7. Epic 8 is last desktop epic (cleanup), Epic 12 is final integration.
