# Snapping Taxonomy, Priorities, and Indicator Language

Status: Draft for implementation  
Bead: `carvd-studio-2`  
Primary consumers: `snapToPartsUtil.ts`, `snapPriority.ts`, `SnapAlignmentLines.tsx`, drag hooks (`usePartDrag.ts`, `useGroupDrag.ts`)

## 1) Goals

- Define a canonical list of snap families and subtypes.
- Define deterministic per-axis arbitration so mixed candidates do not jitter.
- Define a visual indicator contract for candidate and winning snaps.
- Preserve smooth face-latched sliding while still allowing tangential snaps.

## 2) Non-goals

- This document does not implement UI settings/presets (covered by `carvd-studio-7`).
- This document does not define performance budgets in detail (covered by `carvd-studio-8`).

## 3) Terms

- Contact axis: Axis constrained by face-flush contact (normal direction).
- Tangential axes: The 1-2 axes lying in the contact plane.
- Candidate snap: A valid possible snap for an axis before final arbitration.
- Winning snap: The snap actually applied on an axis this frame.
- Latch: Temporary retention of a prior winner to avoid oscillation.

## 4) Canonical Snap Taxonomy

All snap types below are first-class and should be represented in code and tests.

### A. Structural snaps

- `guide`: User-defined guide planes.
- `origin`: Workspace origin plane/center snaps.
- `face-flush`: Face-to-face contact/flush alignment.

### B. Surface-anchor snaps (new)

Defined only when face-flush compatibility exists between drag and target surfaces.

- `surface-center-1d`: Drag part centered on target face in one tangential axis.
- `surface-center-2d`: Drag part centered on target face in both tangential axes.
- `surface-edge-to-midline`: Drag edge aligns to target face 50% line (midline).
- `surface-edge-to-quarterline`: Drag edge aligns to target face 25% or 75% line.

### C. Fractional-grid snaps on face (new)

- `surface-fractional-line`: Anchors at `[0, 0.25, 0.5, 0.75, 1.0]` along each tangential face axis.
- Supports 1D and 2D combinations.
- `0` and `1` map to face boundary lines; `0.5` is the centerline.

### D. Feature snaps (existing + retained)

- `edge-edge`: Parallel/compatible edge alignment by minimal perpendicular offset.
- `vertex-face`: Vertex projection to compatible face plane within face extents.

### E. Layout snaps (existing)

- `equal-spacing`: Mid-object placement that equalizes two surrounding gaps.
- `dimension-match`: Gap/size matching to standard dimensions or source part dimensions.
- `axis-legacy`: Existing axis-aligned AABB edge/center snaps.

## 5) Per-axis Arbitration Priorities

Use one ordered list per axis (x/y/z), with highest priority winning.

1. `guide`
2. `origin`
3. `face-flush` (contact axis only)
4. `surface-anchor` (`center-2d` > `center-1d` > `edge-to-midline` > `edge-to-quarterline`)
5. `surface-fractional-line` (`0.5` > `0.25/0.75` > `0/1` when all else equal)
6. `feature` (`edge-edge` > `vertex-face`)
7. `equal-spacing`
8. `dimension-match`
9. `axis-legacy`

Notes:

- On the contact axis, `face-flush` should remain dominant while latched.
- On tangential axes, `surface-anchor` and `surface-fractional-line` are allowed even when `face-flush` is active.
- `axis-legacy` is fallback only.

## 6) Tie-breakers (same priority class)

Apply in order:

1. Smaller absolute delta wins.
2. If equal within epsilon, keep previously latched winner (hysteresis).
3. If still tied, prefer candidate with richer constraint:
   - 2-axis relation over 1-axis relation.
   - Explicit anchor (`center`/`fraction`) over derived feature.
4. If still tied, stable deterministic key: target id + anchor id lexicographic.

## 7) Hysteresis / Stability

- Keep existing face latch behavior for contact axis.
- Add per-axis winner retention for tangential axes:
  - Hold previous winner until challenger beats by margin:
    - `winDelta + hysteresisBand < currentDelta`
  - Recommended initial hysteresis band:
    - `max(0.02in, snapThreshold * 0.15)`
- Add breakout distance for latched face contact (already present) and preserve it.

## 8) Indicator Language Specification

Indicator style must encode family, confidence, and winner state.

### A. Visual roles

- Candidate indicators: thin, lower opacity.
- Winning indicators: thicker, high opacity.
- Locked/latch indicator: optional short badge near cursor (`LOCK` or `FACE`).

### B. Geometry

- Contact plane indicator for `face-flush`: long dashed plane line on contact axis.
- Tangential anchor lines for surface snaps:
  - centerlines: solid
  - quarterlines: dashed
  - boundary lines (`0`/`1`): dotted/light
- Connection indicator for feature snaps: short segment between matched features.
- Distance labels stay attached to winning indicator only.

### C. Color semantics (family first, axis second)

- `guide`: cyan
- `origin`: white
- `face-flush`: green
- `surface-center`: yellow
- `surface-midline`: amber
- `surface-quarterline`: orange (dashed)
- `feature edge-edge`: blue
- `feature vertex-face`: violet
- `equal-spacing`: magenta
- `dimension-match`: green/orange as currently implemented

Axis tinting can be additive/subtle, but family color must remain primary.

### D. Label format

- Winning label short tokens:
  - `FACE`
  - `CENTER-X` / `CENTER-Z`
  - `CENTER-2D`
  - `MIDLINE`
  - `25%` / `75%`
  - `EDGE`
  - `VTX->FACE`
  - `EQUAL`
- Distance labels remain measurement-first (`3 1/4"`), token optional suffix.

### E. Interaction rules

- Indicators are always non-interactive (`pointerEvents: none`).
- Candidate indicators render only for visible/near candidates (top N per axis, default N=2).
- Winners persist for 100-150ms after leaving threshold to reduce flicker.

## 9) Data Model Additions (for downstream beads)

Extend current line metadata to avoid ad-hoc branching:

- `SnapLine.family`:
  - `guide | origin | face | surface-anchor | surface-fraction | feature | equal-spacing | dimension-match | axis`
- `SnapLine.subtype`:
  - Examples: `center-2d`, `quarterline-25`, `edge-edge`, `vertex-face`
- `SnapLine.state`:
  - `candidate | winner | latched`
- `SnapLine.priority` numeric for debug overlays/testing.
- `SnapLine.anchor` optional:
  - `{ uFraction: number; vFraction: number; targetPartId: string; targetFaceId?: string }`

## 10) Group Drag Requirements

- Group drag must use the same taxonomy and per-axis arbitration as single-part drag.
- Group snap target is group proxy bounds/anchor set, then propagated as delta to members.
- Surface-anchor and fractional face snaps must work against parts and groups uniformly.

## 11) Overlap Policy Interop

- Touching is not overlap.
- Face-flush + tangential sliding must not trigger anti-overlap displacement.
- If either part has `ignoreOverlap=true`, overlap checks between that pair are bypassed.
- Snap arbitration should never force a winner that violates ground constraint.

## 12) Acceptance Criteria for `carvd-studio-2`

- Canonical taxonomy documented and referenced by implementation beads.
- Priority and tie-break rules are deterministic and testable.
- Indicator language has explicit mapping for each family/subtype.
- Group drag parity requirements are explicit.
- Overlap interop constraints are explicit.

## 13) Suggested Test Matrix for Next Beads

- Face latch + tangential centerline slide on rotated target.
- Center-1D, center-2D snaps on same face with deterministic winner.
- Edge-to-midline vs edge-to-quarterline precedence.
- Fractional 25/50/75 with candidate+winner indicator rendering.
- Feature snap fallback when no surface anchor candidate exists.
- Group drag: same winner as equivalent single-part proxy case.
- No overlap displacement when only face contact/touching exists.
