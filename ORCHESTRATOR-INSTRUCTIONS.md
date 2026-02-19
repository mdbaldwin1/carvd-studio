# shadcn Migration — Orchestrator Instructions

> **You are the team lead** for the shadcn/ui migration of Carvd Studio.
> Your job is to coordinate teammates, not to implement code yourself.

---

## Your Responsibilities

1. Read the bead dependency graph and understand what can run in parallel
2. Spawn teammates and assign beads to them
3. Monitor progress and assign new work as dependencies clear
4. Handle issues (merge conflicts, test failures, blocked beads)
5. Update bead status in `.beads/issues.jsonl` as work completes
6. Shut down teammates and clean up the team when all beads are done

**You do NOT write code.** You delegate all implementation to teammates.

---

## Startup Sequence

1. Read these files to understand the project and migration plan:
   - `CLAUDE.md` — Project conventions (loaded automatically)
   - `SHADCN-MIGRATION-SESSION-HANDOFF.md` — Full migration context
   - `BEAD-EXECUTION-WORKFLOW.md` — Per-bead workflow for teammates
   - `.beads/issues.jsonl` — Current bead statuses and dependencies

2. Identify all open epics and their sub-beads. Build a mental model of:
   - Which beads are **ready** (all dependencies complete)
   - Which beads are **blocked** (waiting on other beads)
   - Which beads can run **in parallel** (no shared file conflicts)

3. Create the team and begin dispatching work.

---

## Parallelism Strategy

### Dependency Graph (Epics)

```
DESKTOP TRACK                          WEBSITE TRACK
─────────────                          ─────────────
carvd-studio-2  (Foundation)           carvd-studio-9  (Foundation)
       │                                      │
       ▼                                      ▼
carvd-studio-3  (Core Primitives)      carvd-studio-10 (Migration)
       │                                      │
       ├───────────┐                          ▼
       ▼           ▼                   carvd-studio-11 (Cleanup)
carvd-studio-4  carvd-studio-5                │
(Overlays)      (Complex)                     │
       │           │                          │
       ├───────────┤                          │
       ▼           ▼                          │
carvd-studio-6  carvd-studio-7               │
(Modals)        (Layout)                      │
       │           │                          │
       └─────┬─────┘                          │
             ▼                                │
      carvd-studio-8  (Desktop Cleanup)       │
             │                                │
             └────────────┬───────────────────┘
                          ▼
                   carvd-studio-12 (Final Integration)
```

### Phase Plan

The Desktop and Website tracks are **fully independent** and should always run in parallel.

| Phase | Desktop Agent(s)                                    | Website Agent                   | Max Agents |
| ----- | --------------------------------------------------- | ------------------------------- | ---------- |
| **1** | Epic 2: Foundation (sequential sub-beads)           | Epic 9: Foundation (sequential) | 2          |
| **2** | Epic 3: Core Primitives (sequential — high overlap) | Epic 10: Component Migration    | 2          |
| **3** | Epic 4: Overlays + Epic 5: Complex (2 agents)       | Epic 10: (continued)            | 3          |
| **4** | Epic 6: Modals + Epic 7: Layout (2 agents)          | Epic 11: Cleanup                | 3          |
| **5** | Epic 8: Desktop Cleanup                             | —                               | 1          |
| **6** | Epic 12: Final Integration                          | —                               | 1          |

### Rules for Parallel Execution

1. **Between tracks**: Desktop and Website agents always run in parallel (no shared files)
2. **Within an epic**: Sub-beads run **sequentially by default** (they often touch overlapping files like CSS, shared components, or test utilities)
3. **Exception — Modal sub-beads**: Beads within Epic 6 (Modals) touch different modal files and CAN run in parallel via 2 agents, as long as:
   - Agent A takes odd-numbered modal beads (6.1, 6.3, 6.5, 6.7)
   - Agent B takes even-numbered modal beads (6.2, 6.4, 6.6)
   - Neither agent modifies the base Dialog component (already done in Epic 3)
4. **Never run simultaneously**: Two beads that both modify `tailwind.css`, `primitives.css`, `layout.css`, or `domain.css`

### Develop Branch Drift

As PRs merge into `develop`, later worktrees become stale. **Every teammate must pull latest develop** before starting a new bead:

```bash
# In main repo (not worktree)
git checkout develop && git pull origin develop
# Then create worktree from updated develop
git worktree add ../carvd-studio-<bead-id> -b <prefix>/<bead-id> develop
```

Include this instruction when assigning each bead.

---

## Spawning Teammates

### Teammate Roles

Spawn teammates with descriptive names and clear bead assignments:

| Name               | Role                              | Handles                               |
| ------------------ | --------------------------------- | ------------------------------------- |
| `desktop-worker-1` | Desktop implementation            | Desktop beads (sequential)            |
| `desktop-worker-2` | Desktop implementation (parallel) | Parallel desktop beads when available |
| `website-worker`   | Website implementation            | All website beads                     |

### Spawn Prompt Template

When spawning a teammate, include this in their prompt:

```
You are a team member executing shadcn/ui migration beads for Carvd Studio.

BEFORE doing any work, read these files thoroughly:
1. SHADCN-MIGRATION-SESSION-HANDOFF.md — Full migration context, component mappings, theming bridge, testing patterns
2. BEAD-EXECUTION-WORKFLOW.md — Step-by-step workflow for each bead
3. CLAUDE.md — Project conventions (loaded automatically)

Your assigned bead: <BEAD-ID> — "<BEAD-TITLE>"
Bead description: <PASTE FULL DESCRIPTION FROM .beads/issues.jsonl>

Execute this bead following BEAD-EXECUTION-WORKFLOW.md exactly.
When complete, message me with the PR URL and a summary of changes.
If you encounter a blocker or need a design decision, message me immediately — do not guess.
```

### Model Selection

- Use **Sonnet** for straightforward beads (simple modal migrations, CSS cleanup, docs pages)
- Use **Opus** for complex beads (Button migration, AppSettingsModal, CutListModal, theming bridge)

---

## Monitoring & Coordination

### When a Teammate Finishes a Bead

1. Verify the PR was created and CI is passing
2. Squash-merge the PR into develop (or instruct the teammate to do so)
3. Update the bead status to `done` in `.beads/issues.jsonl`:
   ```bash
   bd update <bead-id> --status done
   ```
4. Check if any blocked beads are now unblocked
5. Assign the next available bead to the idle teammate

### When a Teammate Reports a Blocker

- **Merge conflict**: Tell the teammate to rebase on latest develop and resolve
- **Test failure unrelated to their bead**: Flag it but tell them to skip (create a new bead for it)
- **Design decision needed**: Make the decision based on CLAUDE.md guidelines and the handoff doc. If truly ambiguous, stop and ask the user.
- **Scope creep**: Tell the teammate to stay within the bead scope. Create a new bead for additional work discovered.

### When CI Fails on a PR

1. Ask the teammate to check the failure
2. Common causes after shadcn migration:
   - Test selectors changed (`.btn` → `role="button"`)
   - Radix portals causing queries to fail (use `screen` not `container`)
   - Import paths wrong (`@renderer/` vs `@/`)
   - Coverage dropped below thresholds (need more tests)
3. Tell the teammate to fix and push — do not merge with failures

---

## Progress Tracking

After each bead completes, update `.beads/issues.jsonl` and mentally track:

```
[x] Phase 1: Foundation (Desktop + Website) ✅
  [x] carvd-studio-2 (Desktop Foundation)
    [x] carvd-studio-2.1
    [x] carvd-studio-2.2
    [x] carvd-studio-2.3
  [x] carvd-studio-9 (Website Foundation)
    [x] carvd-studio-9.1
    [x] carvd-studio-9.2
    [x] carvd-studio-9.3

[x] Phase 2: Core Primitives + Website Migration ✅
  [x] carvd-studio-3 (Desktop Core Primitives)
    [x] carvd-studio-3.1 (Button)
    [x] carvd-studio-3.2 (Input/Textarea/Label)
    [x] carvd-studio-3.3 (Select)
    [x] carvd-studio-3.4 (Checkbox/RadioGroup)
    [x] carvd-studio-3.5 (Dialog)
    [x] carvd-studio-3.6 (Toast/Sonner)
  [x] carvd-studio-10 (Website Migration)
    [x] carvd-studio-10.1 through 10.7

[~] Phase 3: Overlays + Complex Components (partially complete)
  [x] carvd-studio-4 (Overlays) ✅
  [ ] carvd-studio-5 (Complex Components) — 5.1 in progress, 5.2–5.5 not started

[ ] Phase 4: Modals + Layout
  [ ] carvd-studio-6 (Modals) — can parallel with 7
  [ ] carvd-studio-7 (Layout) — can parallel with 6

[ ] Phase 5: Cleanup
  [ ] carvd-studio-8 (Desktop Cleanup)
  [ ] carvd-studio-11 (Website Cleanup)

[ ] Phase 6: Final Integration
  [ ] carvd-studio-12
```

---

## Shutdown Procedure

When all beads in all epics are complete:

1. Verify all PRs are merged to develop
2. Verify all bead statuses are `done` in `.beads/issues.jsonl`
3. Run a final check on develop:
   ```bash
   cd packages/desktop && npm test && npm run lint && npm run typecheck
   cd packages/website && npm test && npm run build
   ```
4. Send shutdown requests to all active teammates
5. Wait for all teammates to confirm shutdown
6. Clean up the team (TeamDelete)
7. Report final summary to the user:
   - Total beads completed
   - Total PRs merged
   - Any issues encountered
   - Remaining work (if any beads were deferred)

---

## Important Reminders

- **Do not implement code yourself.** Your job is coordination only.
- **Wait for teammates to finish** before assigning new work. Don't start implementing tasks yourself because a teammate is slow.
- **Always check bead dependencies** before assigning. Never assign a bead whose dependencies aren't complete.
- **Keep `.beads/issues.jsonl` up to date.** This is the source of truth for migration progress.
- **Prefer sequential sub-beads within an epic** to avoid merge conflicts. Only parallelize when beads touch completely separate files.
- **The Desktop and Website tracks are independent.** Always have at least one agent on each track when beads are available.
