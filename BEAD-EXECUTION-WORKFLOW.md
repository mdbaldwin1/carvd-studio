## Bead Execution Workflow

Execute this loop until all epics are complete.

### Session Start

- Read .beads/issues.jsonl to load current state
- Identify the highest-priority open epic

### Per-Epic

1. Flesh out the epic: create sub-beads with priorities, effort estimates,
   and dependencies. No approval needed.
2. Loop through sub-beads in priority order (see Per-Bead below).
3. After the final bead's PR merges, mark the epic as complete in that
   same PR (or the next commit on develop).

### Per-Bead

1. Select the highest-priority open bead with no unresolved dependencies
2. Create a worktree from develop:
   `git worktree add ../carvd-studio-<bead-id> -b <prefix>/<bead-id>`
   Use conventional branch prefixes (feat/, fix/, refactor/, etc.)
3. Plan the implementation. No approval needed.
4. Implement the changes
5. Update the bead status to closed in .beads/issues.jsonl
6. If the bead included functionality changes, update CHANGELOG.md under
   [Unreleased] and include it in the PR
7. If any of those changes affect documented features, update the relevant
   website docs (`packages/website`) as part of the same PR
8. Run locally: `npm test`, `npm run lint`, `npm run typecheck`
   Fix any failures before proceeding.
9. Commit (conventional message), push, create PR targeting develop
10. Monitor CI. If checks fail, fix and push — do not merge with failures.
11. Merge the PR (squash merge)
12. Clean up: `git worktree remove`, delete local and remote branch

### If a bead is too large

Split it into smaller sub-beads, update the parent bead's description,
and proceed with the sub-beads individually.

### When to stop and ask

- The bead requires a design decision not covered by existing patterns
  (e.g., new state management approach, new dependency, API change)
- The implementation contradicts or conflicts with CLAUDE.md guidelines
- A bead's scope grows significantly beyond its original estimate
- Changes would affect user-facing behavior or UX
- A dependency or blocker is discovered that isn't captured in beads
- Tests reveal a bug unrelated to the current bead (flag it, don't fix it)

Otherwise, proceed autonomously.
