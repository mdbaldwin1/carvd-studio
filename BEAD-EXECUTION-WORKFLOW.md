## Bead Execution Workflow

This document defines how to execute a single bead. It is used in two modes:

- **Solo mode**: A single agent executes beads sequentially, selecting the next bead itself.
- **Team mode**: An orchestrator assigns you a specific bead. You execute it and report back.

---

### Session Start (Solo Mode)

- Read `.beads/issues.jsonl` to load current state
- Identify the highest-priority open epic
- Select the highest-priority open bead with no unresolved dependencies

### Session Start (Team Mode)

- Read `SHADCN-MIGRATION-SESSION-HANDOFF.md` for full migration context
- Read `CLAUDE.md` for project conventions
- Your assigned bead will be given to you by the orchestrator
- Do NOT pick your own bead — wait for assignment

---

### Per-Epic (Solo Mode Only)

1. Flesh out the epic: create sub-beads with priorities, effort estimates,
   and dependencies. No approval needed.
2. Loop through sub-beads in priority order (see Per-Bead below).
3. After the final bead's PR merges, mark the epic as complete in that
   same PR (or the next commit on develop).

---

### Per-Bead

1. **Identify the bead** — In solo mode, select the highest-priority open bead
   with no unresolved dependencies. In team mode, use the bead assigned by the
   orchestrator.

2. **Pull latest develop** — Before creating a worktree, ensure develop is current:
   ```bash
   cd /Users/mbaldwin/Carvd/carvd-studio
   git checkout develop && git pull origin develop
   ```

3. **Create a worktree from develop**:
   ```bash
   git worktree add ../carvd-studio-<bead-id> -b <prefix>/<bead-id> develop
   ```
   Use conventional branch prefixes (feat/, fix/, refactor/, etc.)

4. **Plan the implementation** — Review affected files, understand current
   patterns, identify all consumers that need updating. No approval needed.

5. **Implement the changes** — Follow the bead description precisely.
   Stay within scope — do not fix unrelated issues or refactor beyond
   what the bead requires.

6. **Update bead status** to closed in `.beads/issues.jsonl`:
   ```bash
   bd update <bead-id> --status done
   ```

7. **Update CHANGELOG.md** under `[Unreleased]` if the bead included
   functionality changes. Include it in the PR.

8. **Update website docs** if any changes affect documented features
   (`packages/website`). Include in the same PR.

9. **Run quality checks locally** — Fix any failures before proceeding:
   ```bash
   # For desktop beads:
   cd packages/desktop && npm test && npm run lint && npm run typecheck

   # For website beads:
   cd packages/website && npm test && npm run build
   ```

10. **Commit** with a conventional message, **push**, and **create PR**
    targeting `develop`.

11. **Monitor CI** — If checks fail, fix and push. Do not merge with failures.

12. **Merge the PR** (squash merge).

13. **Clean up**:
    ```bash
    git worktree remove ../carvd-studio-<bead-id>
    git branch -D <prefix>/<bead-id>
    git push origin --delete <prefix>/<bead-id>
    ```

14. **Report back** (Team Mode only):
    - Message the orchestrator with:
      - PR URL
      - Summary of changes made
      - Any issues encountered
      - Any new work discovered (the orchestrator will create beads for it)
    - Wait for the next bead assignment

---

### If a Bead is Too Large

Split it into smaller sub-beads, update the parent bead's description,
and proceed with the sub-beads individually. In team mode, message the
orchestrator about the split so it can update the dependency graph.

---

### When to Stop and Ask

**In solo mode** — stop and ask the user:

- The bead requires a design decision not covered by existing patterns
  (e.g., new state management approach, new dependency, API change)
- The implementation contradicts or conflicts with CLAUDE.md guidelines
- A bead's scope grows significantly beyond its original estimate
- Changes would affect user-facing behavior or UX
- A dependency or blocker is discovered that isn't captured in beads
- Tests reveal a bug unrelated to the current bead (flag it, don't fix it)

**In team mode** — message the orchestrator instead of the user:

- Same triggers as above, but direct them to the orchestrator
- The orchestrator will either make the decision or escalate to the user
- Do NOT block silently — always communicate blockers immediately

Otherwise, proceed autonomously.

---

### Team Mode — Communication Protocol

- **Starting a bead**: No need to announce — just begin working
- **Progress updates**: Not needed unless the bead takes significantly longer than estimated
- **Blocker found**: Message the orchestrator immediately with:
  - What the blocker is
  - What you've tried
  - What you need to proceed
- **Bead complete**: Message the orchestrator with PR URL and summary
- **Unrelated bug found**: Message the orchestrator to flag it, then continue your bead
- **Bead too large**: Message the orchestrator with a proposed split before proceeding
