# Session Handoff Protocol

**Project:** Carvd Studio - Code Quality Refactoring
**Last Updated:** 2026-02-14
**Status:** Beads configured, ready to start work

---

## 🎯 Quick Start (Read This First!)

Welcome back! Here's how to continue work on Carvd Studio code quality improvements:

1. **Read this file** to understand current context
2. **Check Beads board**: `bd list` or `bd list --ready`
3. **Pick a ticket**: Look for `quick-win` or `low-risk` labels to start
4. **Work on ticket**: Follow the workflow below
5. **Update status**: Mark ticket done when complete
6. **Update this file**: Add session notes at bottom

---

## 📋 Project Context

### Current Situation

- **Blocked on go-to-market**: Waiting for logo from wife (blocks screenshots, demo video, launch)
- **Best use of time**: Code quality improvements while waiting
- **Approach**: Incremental improvements tracked in Beads
- **Goal**: Improve maintainability, performance, and architecture

### Why We're Doing This

- Can't launch without logo/screenshots
- Premature to add features without user feedback
- Perfect time to address technical debt
- Sets foundation for future development

---

## 🗂️ Review Documents Location

All review findings are documented in `review-notes/`:

- **[00-MASTER-PLAN.md](review-notes/00-MASTER-PLAN.md)** - Overall review plan and status
- **[README.md](review-notes/README.md)** - Quick reference guide
- **[EXECUTIVE-SUMMARY.md](review-notes/EXECUTIVE-SUMMARY.md)** - High-level findings summary
- **[07-desktop-ui-components.md](review-notes/07-desktop-ui-components.md)** - Component architecture issues
- **[08-desktop-state-management.md](review-notes/08-desktop-state-management.md)** - Store architecture issues
- **[09-desktop-styling.md](review-notes/09-desktop-styling.md)** - CSS architecture issues
- **[11-website-overview.md](review-notes/11-website-overview.md)** - Website issues

**Read these** before working on related tickets!

---

## 🎫 Beads Issue Tracker

### Commands Quick Reference

```bash
# List all issues
bd list

# List ready work (unblocked, open issues)
bd list --ready

# List issues by label
bd list --label quick-win
bd list --label critical

# Show issue details
bd show carvd-studio-1.1

# Update issue status
bd update carvd-studio-1.1 --status in-progress
bd update carvd-studio-1.1 --status closed

# Add comments to issue
bd comments carvd-studio-1.1 --add "Started work on this ticket"

# List child issues of an epic
bd children carvd-studio-1
```

### Epic Overview

1. **Epic 1: Styling Architecture** (🔴 CRITICAL) - `carvd-studio-1`
   - Blocked by decision (Tailwind vs CSS Modules)
   - Must be resolved before other UI work

2. **Epic 2: Component Refactoring** (🔴 CRITICAL) - `carvd-studio-2`
   - Monster components need breaking down
   - Start with ticket 2.1 (reorganize directories) - **Quick win!**

3. **Epic 3: State Management Split** (🟡 HIGH) - `carvd-studio-3`
   - 2,663-line god object store needs splitting
   - Start with ticket 3.1 (design architecture)

4. **Epic 4: Performance Optimization** (🟡 MEDIUM) - `carvd-studio-4`
   - Profile and optimize Three.js rendering
   - Start with ticket 4.1 (profiling)

5. **Epic 5: Testing Improvements** (🟢 LOW) - `carvd-studio-5`
   - Already at 85% coverage, nice-to-have improvements

6. **Epic 6: Website Polish** (⏸️ BLOCKED) - `carvd-studio-6`
   - Blocked on logo/screenshots
   - Can work on DocsPage split, but screenshots are priority

---

## 🔄 Workflow for Each Ticket

**Important: Use Git Worktrees for Each Ticket**

Each ticket should be worked on in a dedicated git worktree. This allows you to:

- Work on multiple tickets in parallel without switching branches
- Keep each ticket's changes isolated in its own directory
- Avoid losing uncommitted work when switching contexts
- Run tests/builds for different tickets simultaneously

Example: If working on ticket `carvd-studio-2.1`, create a worktree at `../carvd-studio-2.1/`

### 1. Pick a Ticket

**Recommended starting points:**

- `carvd-studio-2.1` - Reorganize components (quick win, low risk)
- `carvd-studio-1.1` - Evaluate CSS approaches (decision needed, unblocks Epic 1)
- `carvd-studio-3.1` - Design store split (planning phase)

```bash
# List ready work
bd list --ready

# Pick a ticket and mark it in progress
bd update carvd-studio-2.1 --status in-progress
```

### 2. Review Phase (if needed)

- Read the relevant review document in `review-notes/`
- Explore the code mentioned in the ticket
- Document additional findings
- Add comments to ticket with discoveries

```bash
# Add findings to ticket
bd comments carvd-studio-2.1 --add "Found 52 components in flat structure. Propose organizing into 10 feature directories."
```

### 3. Planning Phase

- Create detailed implementation plan
- Identify risks and blockers
- Estimate effort
- Document in ticket comments or create sub-tickets

```bash
# Add plan to ticket
bd comments carvd-studio-2.1 --add "Plan: 1. Create directory structure, 2. Move components, 3. Update imports, 4. Run tests. Est: 2-3 hours."
```

### 4. Implementation Phase

**Create a branch using git worktree:**

Git worktrees allow you to work on multiple tickets in parallel without switching branches.

```bash
# Update develop branch
cd /Users/mbaldwin/Carvd/carvd-studio
git checkout develop
git pull origin develop

# Create a worktree for this ticket
git worktree add ../carvd-studio-2.1 -b refactor/carvd-studio-2.1-reorganize-components

# Navigate to the worktree
cd ../carvd-studio-2.1
```

Now you have a dedicated directory for this ticket at `../carvd-studio-2.1/` with its own branch.

**Make changes:**

- Implement the changes
- Write/update tests as needed
- Ensure all tests pass: `npm test`
- Run linter: `npm run lint`
- Type check: `npm run typecheck`

**Commit frequently:**

```bash
git add .
git commit -m "refactor: reorganize components into feature directories

- Created feature-based directory structure
- Moved components into logical groups
- Updated all imports
- Tests passing

Related to carvd-studio-2.1"
```

**After completing the ticket:**

```bash
# Push your branch
git push origin refactor/carvd-studio-2.1-reorganize-components

# Create PR (see step 6)
# After PR is merged, clean up the worktree

# Go back to main directory
cd /Users/mbaldwin/Carvd/carvd-studio

# Remove the worktree
git worktree remove ../carvd-studio-2.1 --force

# Delete the local branch (after it's merged to develop)
git branch -D refactor/carvd-studio-2.1-reorganize-components
```

### 5. Testing Phase

```bash
# Run all tests
cd packages/desktop && npm test

# Run linter
npm run lint

# Type check
npm run typecheck

# Test the app manually
npm run dev
```

### 6. Completion Phase

**Update the ticket:**

```bash
# Mark ticket as done
bd update carvd-studio-2.1 --status closed

# Add completion note
bd comments carvd-studio-2.1 --add "✅ Complete! Reorganized 52 components into 10 feature directories. All tests passing."
```

**Create PR:**

```bash
# From your worktree directory (e.g., ../carvd-studio-2.1)
git push origin refactor/carvd-studio-2.1-reorganize-components

# Create PR (if ready to merge)
gh pr create --title "Reorganize components into feature directories" --body "Fixes carvd-studio-2.1

Reorganized components from flat structure into feature-based directories:
- common/, layout/, workspace/, project/, stock/, etc.
- Updated all imports
- All tests passing

See ticket carvd-studio-2.1 for details." --base develop
```

**Clean up worktree after PR merged:**

```bash
# Go back to main directory
cd /Users/mbaldwin/Carvd/carvd-studio

# Update develop with merged changes
git checkout develop
git pull origin develop

# Remove the worktree
git worktree remove ../carvd-studio-2.1 --force

# Delete the local branch
git branch -D refactor/carvd-studio-2.1-reorganize-components
```

**Update this handoff doc:**

- Scroll to "Session Notes" section at bottom
- Add entry with date, what you completed, and next steps

---

## 🎨 Styling Decision Status

**Status:** 🔴 DECISION NEEDED

Before Epic 1 can proceed, we need to decide on styling approach:

### Options

1. **Tailwind CSS** (Recommended)
   - Pros: Fast development, consistent design, tiny bundle size
   - Cons: Learning curve, verbose classNames
   - Effort: 3-4 weeks migration
   - Recommendation: Best for long-term productivity

2. **CSS Modules**
   - Pros: Automatic scoping, works with existing CSS
   - Cons: Still writing CSS, more boilerplate
   - Effort: 2-3 weeks migration
   - Recommendation: Safer, incremental migration

3. **Styled Components**
   - Pros: True component scoping, dynamic styling
   - Cons: Runtime overhead, different paradigm
   - Effort: 3-4 weeks migration
   - Recommendation: Only if team prefers CSS-in-JS

**Action Required:** Work on ticket `carvd-studio-1.1` to evaluate and decide

---

## 🏗️ Component Organization Decision

**Status:** ✅ READY TO IMPLEMENT

Proposed directory structure (see ticket `carvd-studio-2.1`):

```
components/
├── common/          # Reusable components (Button, Modal, etc.)
├── layout/          # Layout components (Header, Sidebar, etc.)
├── workspace/       # 3D workspace feature
├── project/         # Project management
├── stock/           # Stock/materials feature
├── assembly/        # Assembly feature
├── template/        # Template feature
├── settings/        # Settings/preferences
├── licensing/       # Trial/licensing
├── tutorial/        # Tutorial/onboarding
└── parts-list/      # Parts list feature
```

**This is ready to implement** - it's a quick win with low risk!

---

## 📈 Current Progress

### Completed

- ✅ Phase 1: Initial discovery and review (2026-02-14)
- ✅ Beads setup and configuration (2026-02-14)
- ✅ Epics created (2026-02-14)
- ✅ Initial tickets created (2026-02-14)
- ✅ Session handoff protocol written (2026-02-14)

### In Progress

- 🔄 Waiting for styling decision (carvd-studio-1.1)
- 🔄 Ready to reorganize components (carvd-studio-2.1)

### Next Up

- Pick first ticket to implement
- Likely candidate: `carvd-studio-2.1` (component reorganization)

---

## 💡 Recommendations for Next Session

### If You Want a Quick Win (1-2 hours)

**Work on:** `carvd-studio-2.1` - Reorganize component directory structure

- Low risk, high value
- Doesn't require any big decisions
- Makes future work easier
- All tests should still pass with just import updates

### If You Want to Unblock Epic 1 (2-3 hours)

**Work on:** `carvd-studio-1.1` - Evaluate CSS approaches

- Research Tailwind vs CSS Modules
- Set up small proof of concept
- Make a decision and document it
- Unblocks all styling work

### If You Want to Plan Big Changes (2-3 hours)

**Work on:** `carvd-studio-3.1` - Design store split architecture

- Plan how to split the god object store
- Design data flow between stores
- Document the architecture
- Unblocks all state management tickets

---

## 🔧 Development Environment Notes

### Key Commands

```bash
# Desktop app
cd packages/desktop
npm run dev          # Start dev server
npm test             # Run tests
npm run lint         # Lint check
npm run typecheck    # Type check

# Website
cd packages/website
npm run dev          # Start dev server
npm test             # Run tests
npm run build        # Build for production

# Git workflow with worktrees (recommended)
cd /Users/mbaldwin/Carvd/carvd-studio
git checkout develop
git pull origin develop
git worktree add ../carvd-studio-ticket-name -b feature/branch-name
cd ../carvd-studio-ticket-name
# ... make changes ...
git add .
git commit -m "type: description"
git push origin feature/branch-name
gh pr create --base develop
# After PR merged:
cd /Users/mbaldwin/Carvd/carvd-studio
git worktree remove ../carvd-studio-ticket-name --force
git branch -D feature/branch-name
```

### Testing Requirements

- All tests must pass before merging
- Run `npm test` in relevant package
- Run `npm run lint` and `npm run typecheck`
- Manually test the app if UI changes

### Branch Naming Convention

- `refactor/carvd-studio-X.X-description` - For refactoring work
- `feat/description` - For new features (if any)
- `fix/description` - For bug fixes

---

## 📊 Key Metrics to Track

As we make improvements, track these metrics:

### Before (Baseline)

- **Desktop CSS:** 6,686 lines in one file
- **Largest Component:** 1,974 lines (Part.tsx)
- **Largest Store:** 2,663 lines (projectStore.ts)
- **Component Directory:** 52 components in flat structure
- **Test Coverage:** ~85% statements, ~76% branches

### After (Target)

- **Desktop CSS:** Modular (component-scoped or Tailwind)
- **Largest Component:** <500 lines (ideally <300)
- **Stores:** 7-8 focused stores (<800 lines each)
- **Component Directory:** Feature-based organization
- **Test Coverage:** Maintain or improve 85%+

---

## ❓ Common Questions

### Q: Should I create PRs for each ticket?

**A:** Yes! Small, focused PRs are easier to review. One ticket = one PR.

### Q: Should I merge to develop or wait?

**A:** Create the PR targeting develop. The user can review and merge when ready.

### Q: What if I find additional issues while working on a ticket?

**A:** Create new Beads tickets! Use `bd create --title "..." --description "..." --label "discovered-during-work"`

### Q: What if a ticket is blocked?

**A:** Update the ticket with the blocker: `bd comments carvd-studio-X.X --add "Blocked by: [reason]"` and pick a different ticket.

### Q: Should I run the website or just the desktop app?

**A:** Depends on the ticket. Desktop refactoring = desktop app. Website improvements = website.

### Q: How do I list all my worktrees?

**A:** Use `git worktree list` to see all active worktrees and their branches.

### Q: What if I want to switch to a different worktree?

**A:** Just `cd` to the worktree directory (e.g., `cd ../carvd-studio-2.1`). Each worktree is a separate directory.

### Q: Can I delete a worktree if I change my mind about a ticket?

**A:** Yes! Use `git worktree remove ../carvd-studio-ticket-name --force` and then `git branch -D branch-name`.

### Q: What happens if my machine crashes with worktrees open?

**A:** Worktrees are just directories. You can clean them up later with `git worktree prune` to remove stale references.

---

## 📝 Session Notes

Add notes here after each work session. Format:

```markdown
### Session: YYYY-MM-DD

**Worked on:** [Ticket ID] - [Title]
**Completed:** [What was accomplished]
**Next:** [What should be done next]
**Blockers:** [Any blockers encountered]
**Notes:** [Any additional context]
```

---

### Session: 2026-02-14 (Initial Setup)

**Worked on:** Beads setup and configuration
**Completed:**

- Installed Beads issue tracker
- Created 6 epics (Styling, Components, State, Performance, Testing, Website)
- Created 6 initial tickets under epics
- Wrote this Session Handoff Protocol document
- Documented review findings in `review-notes/`

**Next:**

- Pick first ticket to implement
- Recommend starting with `carvd-studio-2.1` (component reorganization) - quick win!
- Or work on `carvd-studio-1.1` (CSS decision) to unblock Epic 1

**Blockers:** None - ready to start work!

**Notes:**

- Project is blocked on logo for go-to-market activities
- Best use of time is code quality improvements
- All review documents are in `review-notes/`
- Beads issues are in `.beads/issues.jsonl`

---

### Session: [Next session date]

[Add your notes here]
