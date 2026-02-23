## Summary

<!-- Briefly describe what this PR does and why -->

## Changes

-

## Checklist

- [ ] CHANGELOG.md has been updated with all user-facing changes
- [ ] All tests pass locally (`npm test` in packages/desktop)
- [ ] Website tests pass if website was modified (`npm test` in packages/website)
- [ ] Code is formatted (`npm run format`)
- [ ] No new lint or type errors introduced
- [ ] Commit messages follow conventions (`feat:`, `fix:`, `perf:`, `chore:`, `docs:`, `test:`, `refactor:`)

## Instructions for Claude

When creating or reviewing PRs for this repository, always ensure:

1. **Changelog**: Every PR must update CHANGELOG.md under the `[Unreleased]` section. Group changes under: Added, Changed, Fixed, Removed.
2. **Tests**: Run `npm test` in the relevant package(s) before marking the PR ready. All tests must pass.
3. **Lint & Types**: Run `npm run lint` and `npm run typecheck` to catch issues before pushing.
4. **Commit messages**: Use conventional commit prefixes: `feat:`, `fix:`, `perf:`, `chore:`, `docs:`, `test:`, `refactor:`.
5. **Branch naming**: Use prefixes: `feat/`, `fix/`, `perf/`, `chore/`, `docs/`, `test/`, `refactor/`.
6. **No direct pushes**: Both `develop` and `main` are protected. All changes go through PRs.
7. **Merge strategies**: `develop` → `main` uses merge commit (preserves shared ancestry). Feature branches → `develop` use squash merge. Hotfix branches → `main` use squash merge.
