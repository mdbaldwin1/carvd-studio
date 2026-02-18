Perform a comprehensive audit of the Carvd Studio monorepo (packages/desktop,
packages/website) and CI/CD infrastructure. Do NOT make any code changes.
Your deliverable is a structured set of beads (epics + sub-tasks) capturing
every finding and a prioritized remediation plan.

## Existing Context

Review .beads/issues.jsonl to understand completed work (Epics 1–4: Tailwind
migration, component refactoring, state management split, performance
optimization) and in-progress work (Epics 5–6: testing, website polish).
Your audit should account for what's already been done and avoid
re-litigating completed decisions.

## Audit Scope (in priority order)

### 1. Performance & Optimization (highest priority)

- Bundle size: run `npm run analyze`, identify heavy imports, tree-shaking gaps
- Three.js/R3F: audit render loops, object allocation, geometry/material pooling,
  draw call counts, LOD usage
- React rendering: identify unnecessary re-renders, missing memoization,
  overly broad Zustand selectors
- Lazy loading: audit code-splitting boundaries for modals, heavy features
- Memory: look for leaks (event listeners, subscriptions, unmount cleanup)

### 2. Code Quality (highest priority, tied with performance)

For EACH feature area in the desktop app (parts, groups, assemblies, stock,
cut list, templates, 3D viewport, file I/O, undo/redo, settings, trial/license,
tutorials), individually audit:

- File structure: are components in their own files? Is the directory layout
  intuitive?
- Componentization: are there monolithic components that should be split?
  Reusable patterns that aren't extracted?
- Readability: naming, function length, complexity, dead code
- Error handling: are errors caught, logged, and surfaced to users appropriately?
- Logging: is logger.ts used consistently? Are there bare console.log calls?
- Type safety: any `any` types, missing interfaces, loose typing?
- Styling: consistent Tailwind usage post-migration? Any remaining raw CSS
  that should be converted?
- Reusability: duplicated logic that should be shared utilities or hooks?

### 3. Architecture

- Store design: evaluate the post-split store architecture (7+ stores).
  Are boundaries clean? Any circular dependencies?
- Data flow: prop drilling vs. store access patterns
- IPC: main/renderer process communication — security, error handling, typing
- File format: versioning, migration, backwards compatibility

### 4. Testing

- Coverage gaps: identify untested or under-tested features (reference
  Epic 5's open tickets)
- Test quality: are existing tests meaningful or just covering happy paths?
- Missing test categories: integration tests, edge cases, error scenarios

### 5. CI/CD & DevOps

- GitHub Actions workflows: reliability, speed, security
- Build pipeline: electron-builder config, code signing, auto-update
- Release process: version bumping, changelog, deployment
- Branch protection and merge strategies

### 6. Website (packages/website)

- **Accuracy**: does the website accurately reflect current desktop app features,
  UI, and capabilities? Flag any outdated or misleading content.
- **Completeness**: is every desktop feature documented? Are there features
  missing from the docs/marketing pages?
- **SEO**: meta tags, structured data, heading hierarchy, image alt text,
  sitemap, page speed, Core Web Vitals
- **UX/Design**: navigation, mobile responsiveness, visual consistency,
  call-to-action clarity
- **Code quality**: same code quality criteria as desktop (componentization,
  reusability, readability)

## Deliverable Format

Use beads to track everything. Structure as:

1. **Create a new audit epic** (e.g., Epic 7: Comprehensive Audit)
2. **Create one sub-epic per audit scope area** (7.1 Performance, 7.2 Code
   Quality, etc.)
3. Under each sub-epic, **create individual findings as tasks** with:
   - Clear title describing the issue
   - Description with: what's wrong, where (specific files/lines), why it
     matters, and suggested fix
   - Priority (P0 = critical, P1 = high, P2 = medium, P3 = low)
   - Estimated effort
   - Dependencies on other findings if applicable
4. For Code Quality (scope area 2), **create a separate sub-task group per
   feature area** (e.g., 7.2.1 Parts, 7.2.2 Groups, 7.2.3 Assemblies...)

## Approach

Work methodically:

1. **Phase 1 — Inventory**: Map out every feature area, component, store,
   workflow, and CI pipeline that needs review. Create the epic/sub-epic
   structure in beads.
2. **Phase 2 — Deep Review**: Go through each area one by one. Read the
   actual code. Don't skim — open files, trace data flow, check edge cases.
   Log findings as bead tasks as you go.
3. **Phase 3 — Prioritize & Sequence**: Once all findings are logged, review
   the full list. Assign priorities, estimate effort, add dependencies, and
   propose an execution order that delivers the highest-impact improvements
   first.

Be brutal. Call out everything — even if it means substantial rewrites. I'd
rather know the full picture and choose what to tackle than have problems
hidden to avoid scope.
