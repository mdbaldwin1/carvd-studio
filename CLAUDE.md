# Carvd Studio — Development Guidelines

## Monorepo Structure

- `packages/desktop` — Electron desktop app (React + TypeScript + Three.js)
- `packages/website` — Marketing website (React + TypeScript + Vite)

## Git Workflow

### Branches
- **develop** — Integration branch. All feature work targets here via PRs.
- **main** — Production branch. Protected. Only receives PRs from develop. Squash-merged.
- **Feature branches** — Created from develop. Named with prefixes: `feat/`, `fix/`, `chore/`, `docs/`, `test/`, `refactor/`.

### Branch Protection
Both `develop` and `main` are protected:
- No direct pushes (even for admins)
- All changes must go through pull requests
- All CI checks must pass before merging

### Commit Messages
Use conventional commit prefixes:
- `feat:` — New feature or functionality
- `fix:` — Bug fix
- `chore:` — Maintenance, dependencies, CI/CD changes
- `docs:` — Documentation only
- `test:` — Test additions or modifications
- `refactor:` — Code restructuring without behavior change

### Pull Request Workflow
1. Create a feature branch from `develop`
2. Make changes and commit with conventional prefixes
3. **Update CHANGELOG.md** under `[Unreleased]` — this is required for PRs to main
4. Run tests: `npm test` in the relevant package
5. Run lint: `npm run lint` and typecheck: `npm run typecheck`
6. Push the branch and create a PR targeting `develop`
7. Ensure all CI checks pass before requesting merge

### Changelog Format
```markdown
## [Unreleased]

### Added
- New features go here

### Changed
- Modifications to existing features

### Fixed
- Bug fixes

### Removed
- Removed features or deprecated items
```

## Testing

- Desktop tests: `cd packages/desktop && npm test`
- Website tests: `cd packages/website && npm test`
- Test framework: Vitest with v8 coverage
- Tests are colocated with source files (`*.test.ts`, `*.test.tsx`)

## Key Commands

```bash
# Desktop
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
```
