# Carvd Studio — Development Guidelines

## Monorepo Structure

- `packages/desktop` — Electron desktop app (React + TypeScript + Three.js)
- `packages/website` — Marketing website (React + TypeScript + Vite)

## Git Workflow

### Branches

- **develop** — Integration branch. All feature work targets here via PRs.
- **main** — Production branch. Protected. Only receives PRs from develop. Merge commit (not squash).
- **Feature branches** — Created from develop. Named with prefixes: `feat/`, `fix/`, `chore/`, `docs/`, `test/`, `refactor/`.
- **Hotfix branches** — Created from **main** (not develop). Named `hotfix/description`. Used for urgent production fixes.

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

### Merge Strategies

- **Feature branches → develop**: Squash merge (clean history, one commit per feature)
- **develop → main**: Merge commit (preserves shared ancestry so syncing main back to develop is conflict-free)
- **Hotfix branches → main**: Squash merge

### Pull Request Workflow

1. Create a feature branch from `develop`
2. Make changes and commit with conventional prefixes
3. **Update CHANGELOG.md** under `[Unreleased]` — this is required for PRs to main
4. Run tests: `npm test` in the relevant package
5. Run lint: `npm run lint` and typecheck: `npm run typecheck`
6. Push the branch and create a PR targeting `develop`
7. Ensure all CI checks pass before requesting merge

### Hotfix Workflow

Hotfixes bypass `develop` to get urgent fixes into production quickly:

1. Create a `hotfix/` branch from **main**
2. Make the fix and commit
3. Update CHANGELOG.md
4. PR into **main** (squash merge) — deploys the fix to production
5. The `sync-develop` workflow automatically merges main back into develop

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

## Versioning

This project follows [Semantic Versioning](https://semver.org/). Desktop and website are versioned independently.

### Pre-1.0 Conventions (current)

- **MINOR** (0.X.0) — New features or breaking changes
- **PATCH** (0.0.X) — Bug fixes and small improvements

### Post-1.0 Conventions

- **MAJOR** (X.0.0) — Breaking changes
- **MINOR** (0.X.0) — New features (backwards-compatible)
- **PATCH** (0.0.X) — Bug fixes

### Version Management

- **Desktop version** (`packages/desktop/package.json`) drives GitHub Releases, auto-update, and git tags (`v0.1.10` → tag `v0.1.10`)
- **Website version** (`packages/website/package.json`) is independent and tracks website-specific changes with `website-v*` git tags
- After a desktop release, CI creates a PR to bump the desktop patch version on `develop`
- After a website deployment, CI waits for Vercel to succeed, creates a `website-v*` tag, then creates a PR to bump the website patch version on `develop`
- After any push to main, the `sync-develop` workflow merges main back into develop automatically
- Never manually edit version numbers on `main` — versions are bumped on `develop` and flow to `main` via PR

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
npm run analyze      # Bundle size analysis (opens treemap)

# Website
cd packages/website
npm run dev          # Start dev server
npm test             # Run tests
npm run build        # Build for production
```

## Performance Guidelines

### React & Rendering

- Use `React.memo` for components rendered inside `.map()` loops or passed as children to Three.js groups
- Use `useCallback` for event handlers passed as props to memoized children
- Use `useMemo` for expensive computations derived from props or state
- Use fine-grained Zustand selectors with `useShallow` — select only the fields your component needs

### Three.js / React Three Fiber

- Never allocate objects (`new Vector3()`, `new Color()`, `new Float32Array()`) inside `useFrame` or render — pre-allocate at module scope and reuse with `.set()` / `.copy()`
- Pool geometries and materials at module level in shared files (e.g., `partGeometry.ts`) — all instances should share via import
- Prefer conditional mounting (`{condition && <Component />}`) over `visible={false}` for complex Three.js objects — unmounted components don't consume draw calls
- Use distance-based LOD for decorative elements (grain arrows, labels) in large scenes

### Code Splitting & Bundle Size

- Lazy-load components not visible on initial render (modals, dialogs, secondary screens) with `React.lazy` + `<Suspense>`
- Use dynamic `await import()` for heavy optional features triggered by user action (PDF export, CSV download)
- Audit `optionalDependencies` when adding large libraries — stub unused optional deps via `resolve.alias` in `electron.vite.config.ts`
- Run `npm run analyze` before and after changes that add dependencies to verify bundle impact

### State Management

- Keep undo-tracked stores (zundo) focused on domain data only — exclude transient UI state (hover, selection, camera, drag)
- Batch related store updates into single actions to minimize re-render cascades
- Use separate stores for independent concerns (UI, camera, selection, etc.) to avoid unnecessary subscriber notifications
