# Interaction Test Strategy

Status: Active
Date: 2026-05-18
Phase: P0.3 (gates Tier 0 work)
Companion docs:

- [`interaction-architecture-execution-plan.md`](./interaction-architecture-execution-plan.md)
- [`interaction-system-blueprint.md`](./interaction-system-blueprint.md)

## Why this exists

The recurring-regression pattern this redesign is solving comes from two things working together: an architecture where every component re-derives shared state, **and** a test layer that only catches obvious failures. Even after the architecture stabilizes, the test layer has to catch the specific bug classes the audit identified or they will sneak back in. This doc defines what gets tested where, and what every phase commit is required to add.

## Three test layers

Phase work must produce tests at each layer that applies to the change. PRs (and internal phase-end commits while we accumulate on this branch) that touch interaction code but skip the appropriate layer do not merge.

### Layer 1 — Engine tests (Vitest, no React)

**Scope:** Pure functions, store actions, solvers, selection resolver, snap arbitration, constraint pipeline, geometry queries, hit-test service.

**Properties:**

- Fast (target < 1 ms per case; full file < 100 ms).
- No `document`, no React, no Three.js scene graph (use stub objects with the minimum surface area each function needs).
- Exhaustive: every branch, every edge case, every documented invariant.
- Use the test fixtures from [P0.6](./interaction-architecture-execution-plan.md#p06--test-fixtures) (`tests/fixtures/`) for realistic input.

**Required for:**

- Every new util in `src/renderer/src/utils/` or `src/renderer/src/interaction/`.
- Every store action that mutates state.
- Every solver method (`begin`, `update`, `commit`, `cancel`).

**Naming:** `*.test.ts` colocated with source.

**Vitest config:** `vitest.config.ts` (renderer, `happy-dom`).

### Layer 2 — Session integration tests (Vitest + `@testing-library/react`)

**Scope:** Component-level tests for components that drive interaction (`Workspace`, `Part`, `InstancedParts`, `usePartDrag`, `useGroupDrag`, `usePartResize`, future `useCanvasPointerSession`). Verify the integration between the React layer and the engine.

**Properties:**

- Mount the component under test with realistic store state (use fixtures).
- Drive interactions with `fireEvent` / `userEvent`. Pointer-event sequences (down → move → up) should match real gesture flow.
- Assert on store state, overlay model output, and committed `projectStore` mutations — not on rendered DOM/three.js where possible.
- Must include the **bug-class regression test** for any fix that ships in the same commit.

**Required for:**

- New components that wire up gestures.
- Any change to a component that owns pointer events.
- Any change that altered control flow across the engine/React boundary.

**Naming:** `*.test.tsx` colocated with the component.

**Vitest config:** `vitest.config.ts`.

### Layer 3 — UI smoke (Playwright)

**Scope:** End-to-end happy-path coverage of the workspace. Verifies that gestures actually work in the packaged Electron app, including overlay portals, IPC, and rendering pipeline behavior that engine + integration tests cannot exercise.

**Properties:**

- One spec per major user workflow (new project, add part, drag, snap, rotate, resize, group, undo/redo, save/load).
- Runs against a built Electron app (not dev server) so it sees the same renderer the user does.
- Slow (target < 30 s per spec, < 5 min total). Run on CI and locally before each phase-end commit lands.
- **Not required for every fix** — engine and integration layers catch most regressions. Smoke is the safety net for cross-cutting issues (e.g., Apple Metal `Html occlude` artifacts, contextmenu portal layering).

**Required for:**

- Any change that touches `<Html>`, drei portals, R3F renderer config, or main-process IPC.
- Any change that touches the canvas event surface (window listeners, pointer capture).
- A new bug-class regression test if the original bug only manifested under packaged-build conditions.

**Spec location:** `packages/desktop/tests/e2e/`.

**Known gap:** `happy-path.spec.ts` currently does not launch under Electron 41 reliably. [CC1](./interaction-architecture-execution-plan.md#cc1--test-infrastructure) covers the harness fix; until then, Playwright is a "best effort" layer.

## Bug-class regression test policy

Every bug fixed during phase work becomes a permanent test in CI. The audit identified these bug classes from this branch that must be locked down by Tier 0 completion:

| Bug class                                | Test layer           | Required by | Location                                         |
| ---------------------------------------- | -------------------- | ----------- | ------------------------------------------------ |
| InstancedMesh raycast bounding sphere    | Engine + Integration | §11         | `hitTest.test.ts`, `InstancedParts.test.tsx`     |
| Right-click overlay portal layering      | Integration + Smoke  | §3          | `Workspace.test.tsx`, `e2e/context-menu.spec.ts` |
| Html occlude=blending Apple Metal leak   | Smoke                | §10         | `e2e/snap-overlay.spec.ts`                       |
| Multi-part drag useEffect dep object ref | Integration          | §3          | `usePartDrag.test.tsx` (or equivalent)           |
| Additive selection clearing on empty     | Integration          | §3          | `Workspace.test.tsx`                             |
| Rotation handle visibility flicker       | Integration          | §3          | `Part.test.tsx`                                  |

Each subsequent fix during Tier 0+ work gets its own regression test in the appropriate layer, in the same commit as the fix.

## Coverage thresholds

CI enforces minimums via `coverage.thresholds` in vitest configs ([CLAUDE.md](../../CLAUDE.md#coverage-thresholds)). The redesign work must not drop coverage. Per-phase commits should run:

```bash
cd packages/desktop && npm run test:coverage
```

and confirm:

- Statements ≥ 91%
- Branches ≥ 82%
- Functions ≥ 90%
- Lines ≥ 91%

When a phase introduces a new top-level module (e.g., `src/renderer/src/interaction/`), the same thresholds apply to that module.

## Performance test gate

Per [P0.5](./interaction-architecture-execution-plan.md#p05--performance-baseline) every phase-end commit re-runs `carvdDev.perfBaseline()` and confirms no regression vs the P0.5 baseline numbers in [`./perf-baseline.md`](./perf-baseline.md). Phases that change rendering or interaction code must include the comparison output in the commit body.

Thresholds (tentative; tighten after P0.5 captures real numbers):

- Per-frame drag cost ≤ baseline × 1.10
- Snap detection cost ≤ baseline × 1.10
- Re-render cascade on selection change ≤ baseline × 1.10

Any regression above threshold blocks the commit. A regression below threshold is documented but allowed.

## What does NOT belong in tests

- **Rendering correctness for arbitrary scenes.** That's what users + manual QA catch. Tests verify behavior, not pixels.
- **Three.js scene graph internals.** We trust `three`/`@react-three/fiber`. Test against the abstractions we own.
- **Store implementation details.** Test that actions produce the right state; don't test the order of internal `set` calls.
- **Snapshots of complex outputs.** Snapshot tests for SVG/HTML structure are too brittle — they break on every prettier run.

## Patterns

### Engine test

```ts
import { describe, it, expect } from "vitest";
import { resolveHitTarget } from "./hitTest";
import { sceneFromFixture } from "../../../tests/fixtures";

describe("resolveHitTarget", () => {
  it("returns part-body when ray hits a part body and no overlay covers it", () => {
    const scene = sceneFromFixture("5-part-assembly");
    const result = resolveHitTarget(
      { x: 100, y: 200 },
      {
        camera: scene.camera,
        parts: scene.parts,
        overlayRegistry: new Map(),
        groupMembers: scene.groupMembers,
        scene: scene.threeScene,
      },
    );
    expect(result).toMatchObject({
      kind: "part-body",
      nodeId: scene.parts[0].id,
    });
  });
});
```

### Session integration test

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { Workspace } from "./Workspace";
import { useProjectStore } from "../../store/projectStore";
import { useSelectionStore } from "../../store/selectionStore";
import { fixtureProject } from "../../../tests/fixtures";

beforeEach(() => {
  useProjectStore.setState(fixtureProject("5-part-assembly"));
  useSelectionStore.setState({ selectedPartIds: [], hoveredPartId: null });
});

it("shift+click extends selection without clearing prior selection", () => {
  render(<Workspace />);
  const part1 = screen.getByTestId("part-body-1");
  const part2 = screen.getByTestId("part-body-2");
  fireEvent.pointerDown(part1, { button: 0 });
  fireEvent.pointerUp(part1, { button: 0 });
  fireEvent.pointerDown(part2, { button: 0, shiftKey: true });
  fireEvent.pointerUp(part2, { button: 0, shiftKey: true });
  expect(useSelectionStore.getState().selectedPartIds).toEqual([
    expect.any(String),
    expect.any(String),
  ]);
});
```

### Smoke spec

```ts
import { test, expect } from "@playwright/test";

test("right-click on a part after move/rotate opens the context menu", async ({
  page,
}) => {
  // ... launch app, load fixture, drag, rotate
  await page.locator('[data-testid="part-body-1"]').click({ button: "right" });
  await expect(page.locator('[role="menu"]')).toBeVisible();
});
```

## What CI runs

- `npm run lint` — every commit
- `npm run typecheck` — every commit
- `npm run test:unit` — every commit (engine + integration layers)
- `npm run test:coverage` — phase-end commit
- `npm run test:e2e` — phase-end commit (best effort until CC1 fixes harness)
- Perf baseline comparison — phase-end commit

## Definition of done — Tier 0

- All bug-class regression tests above present and passing.
- Engine coverage of hit-test, session controller, and selection resolver ≥ 95% on each.
- Layer 2 tests for `Workspace`, `Part`, `InstancedParts` updated for new architecture.
- One Playwright spec passing per major gesture (click select, drag move, drag resize, rotate, right-click menu).
