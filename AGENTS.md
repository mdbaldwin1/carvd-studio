# Carvd Studio - Agent Instructions

## Purpose

- This file is the repo-level guide for coding agents (Codex, Claude Code, etc.).
- Keep instructions here concise and stable; put volatile project details in handoff docs.

## Canonical Context

- Read `CLAUDE.md` for supplemental project context and deeper technical notes.
- Beads issue tracker reference: `https://github.com/steveyegge/beads` (when you mention "beads", treat this as the canonical system/workflow).
- For shadcn migration work, read:
- `SHADCN-MIGRATION-SESSION-HANDOFF.md`
- `SHADCN-MIGRATION-HANDOFF-STATUS.md`
- `ORCHESTRATOR-INSTRUCTIONS.md`
- `BEAD-EXECUTION-WORKFLOW.md`

## Docs Taxonomy

- `policy` docs (stable): `AGENTS.md` is the source of truth for workflow, quality gates, security handling, and collaboration rules.
- `status` docs (volatile): migration handoffs/status trackers (for example, `SHADCN-MIGRATION-SESSION-HANDOFF.md`, `SHADCN-MIGRATION-HANDOFF-STATUS.md`) track current state and may change frequently.
- `reference` docs (technical): `CLAUDE.md` and `.claude/docs/*.md` provide architecture, implementation, environment, and operational context.
- When policy conflicts with status/reference text, follow `AGENTS.md` and update the other file to remove drift.
- Avoid duplicating stable policy text into status/reference docs; link back to `AGENTS.md` instead.

## Repo Structure

- Monorepo packages:
- `packages/desktop` (Electron app)
- `packages/website` (marketing site)

## Beads Workflow

- At task start for beads-managed work, run `bd onboard` to sync current issue context.
- Keep bead status current as work progresses (`in_progress`, `done`, `blocked`).

## Working Rules

- Base branch for feature work is `develop` unless task explicitly says otherwise.
- Never push directly to `develop` or `main`; use PR workflow.
- Update `CHANGELOG.md` under `[Unreleased]` for user-visible changes.
- Use conventional commit prefixes: `feat:`, `fix:`, `perf:`, `chore:`, `docs:`, `test:`, `refactor:`.
- Feature/hardening branches target `develop`; urgent hotfix branches start from `main`.
- Merge strategy:
- Feature branch -> `develop`: squash merge.
- `develop` -> `main`: merge commit.
- Hotfix -> `main`: squash merge.
- Run scoped checks for touched package(s):
- Desktop: `npm run lint --workspace=@carvd/desktop`, `npm run typecheck --workspace=@carvd/desktop`, `npm test --workspace=@carvd/desktop`
- Website: `npm run lint --workspace=@carvd/website`, `npm run typecheck --workspace=@carvd/website`, `npm test --workspace=@carvd/website`

## UI Migration Notes

- Prefer shadcn/ui primitives in `packages/desktop/src/renderer/src/components/ui/`.
- For Radix-based tests, use semantic queries (`getByRole(...)`) and `data-state`; avoid class-based selectors.

## Security and Secrets

- Never hardcode API tokens, private keys, or credentials in tracked files.
- Keep local secrets in environment variables or local-only files that are gitignored.
- Do not print full secret values in logs, commits, or docs.

## Multi-Session Safety

- If parallel sessions are active, use a dedicated git worktree per session.
- Do not use branch-switching commands in a shared worktree.
