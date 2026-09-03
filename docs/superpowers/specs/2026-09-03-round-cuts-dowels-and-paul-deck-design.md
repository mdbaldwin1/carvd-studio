# Round Cuts, Dowel Joinery, and Paul Deck Validation Design

## Purpose

Extend Custom Cuts from straight-edged woodworking operations to common round operations without turning Carvd Studio into a free-form CAD or CAM system. The same release must validate and, where necessary, correct the flush-alignment workflows reported by Paul Knapp using his real 109-part deck project.

## Product scope

### Round operations

Carvd Studio will add these operations to the Part Cuts workspace:

- Round Hole
- Countersunk Hole
- Counterbored Hole
- Rounded Slot
- Rounded Rectangular Cutout
- Hole Pattern

A round hole may be blind or through. It may follow the selected face normal or use an authored drilling angle. Countersinks add a conical opening defined by major diameter and included angle. Counterbores add a concentric cylindrical recess defined by diameter and depth.

A rounded slot is defined by center, overall length, width, orientation, and depth mode. A rounded rectangular cutout is defined by center, length, width, corner radius, orientation, and depth mode. The corner radius is constrained to half the smaller profile dimension.

A hole pattern creates a managed collection of identical holes rather than copying unrelated features. The first release supports:

- linear patterns with count and spacing;
- rectangular grid patterns with row/column counts and spacing;
- circular patterns with count, radius, and start angle.

Pattern members share the parent operation's diameter, depth, direction, and termination details. A pattern remains one editable fabrication operation and expands into deterministic member geometry for rendering, validation, snapping, and fabrication output.

### Dowel joinery

The Part Cuts workspace will provide a `Dowel Joint` command after the user selects two compatible parts and a mating face on each part. The command creates:

- matching authored hole operations on both parts;
- a shared `jointId` stored in feature metadata so the relationship can be inspected and edited;
- one or more visible dowel solids in the workspace, controlled by a `Show dowels` display option;
- fabrication instructions on both parts.

The user specifies dowel diameter, embedment depth per part, count, spacing, and the first-hole reference position. Initial creation projects the selected world-space joint axis into each part's local coordinate system. After creation, the holes remain stable part-local fabrication definitions. Moving one part does not silently rewrite the other part's hole coordinates. If the parts no longer mate, the joint becomes visibly out of alignment and reports a non-destructive warning.

Visible dowels are derived joinery visualization, not stock parts, and therefore do not appear as boards in the cut-list optimizer. Fabrication output lists dowel quantity, diameter, and length separately.

### Explicit non-goals

This release does not add:

- arbitrary sketching or free-form curves;
- general-purpose boolean modeling;
- splines, arcs as standalone editable sketches, or imported vector profiles;
- CNC G-code, CAM toolpaths, feeds, speeds, or machine profiles;
- automatic fastener engineering or structural validation.

## User experience

### Operation selection

The operation library groups commands as:

- End Cuts
- Straight Cuts
- Round Cuts
- Joinery

Round operations reuse the existing add-operation, target-picking, inspector, preview, save/discard, undo/redo, copy/paste, and mirror workflows.

### Face targeting and measurements

Round operations target any of the six broad faces: left end, right end, top, bottom, front, or back. Position fields use woodworking-facing primary and secondary offsets measured from the target face's visible edges or center. The UI never asks the user for raw X/Y/Z coordinates.

For a straight hole, the axis points inward along the selected face normal. Angled holes add:

- `Tilt`: degrees away from the face normal, constrained to `0 <= tilt < 90`;
- `Direction`: rotation around the face normal, expressed as a clock-style angle in the face plane.

The preview shows the entry circle, projected drilling axis, and exit location for a through-hole. If an angled blind hole would exit another face before reaching its requested depth, saving is blocked with a plain-language message.

### Inspector fields

Round Hole fields:

- target face;
- primary and secondary offset references and values;
- diameter;
- through/blind;
- blind depth when applicable;
- tilt and direction.

Countersink adds major diameter and included angle. Counterbore adds recess diameter and recess depth. Rounded profiles add length, width, corner radius when applicable, rotation, and through/blind depth.

Pattern controls appear beneath the seed-hole controls and expose pattern type plus the minimum fields needed for that pattern. The preview updates all members as one draft operation.

### Dowel workflow

`Create Dowel Joint` opens a focused stepper:

1. select the first mating face;
2. select the second mating face;
3. set dowel diameter, count, spacing, embedment depths, and first-hole position;
4. review alignment and save.

The action is refused when the faces are not sufficiently parallel and opposing, when requested holes leave either blank, or when the two embedment depths exceed the selected dowel length. The user may change the dowel length or depths without losing face selections.

## Data model and file compatibility

### Feature types

Add two `PartFeature` variants while retaining feature schema version `1`:

```ts
type CircularCutType = "round_hole" | "countersink" | "counterbore";

interface CircularCutFeature extends PartFeatureBase {
  kind: "circular_cut";
  target: { type: "face"; face: FaceTarget };
  cutType: CircularCutType;
  placement: { primary: number; secondary: number; rotation: number };
  parameters: {
    diameter: number;
    depthMode: "through" | "blind";
    depth?: number;
    tilt: number;
    direction: number;
    countersink?: { majorDiameter: number; includedAngle: number };
    counterbore?: { diameter: number; depth: number };
  };
  pattern?:
    | { type: "linear"; count: number; spacing: number; direction: number }
    | {
        type: "grid";
        rows: number;
        columns: number;
        rowSpacing: number;
        columnSpacing: number;
        rotation: number;
      }
    | { type: "circular"; count: number; radius: number; startAngle: number };
}

interface RoundedCutFeature extends PartFeatureBase {
  kind: "rounded_cut";
  target: { type: "face"; face: FaceTarget };
  cutType: "rounded_slot" | "rounded_rectangle";
  placement: { primary: number; secondary: number; rotation: number };
  parameters: {
    length: number;
    width: number;
    cornerRadius: number;
    depthMode: "through" | "blind";
    depth?: number;
  };
}
```

Dowel relationships use a namespaced metadata payload on the generated circular features:

```ts
metadata: {
  dowelJoint: {
    jointId: string;
    matePartId: string;
    memberIndex: number;
    dowelDiameter: number;
    dowelLength: number;
    embedmentDepth: number;
  }
}
```

Runtime parsing validates every field and rejects unknown or malformed round feature payloads without throwing. Existing version-2 projects remain readable. Version-1 projects, including Paul's deck, load unchanged and upgrade to version 2 only when saved with features.

### IDs and copy behavior

Copy/paste and duplicate actions always mint new feature IDs. Copying one part of a dowel relationship removes the relationship metadata, leaving ordinary editable holes; it never creates a hidden link to the source project part. Duplicating or copying both related parts in one action mints a new shared joint ID and remaps mate part IDs.

## Geometry architecture

### Exact representation

The current layered extrusion algorithm remains the source for straight cuts. Round and rounded operations extend the part-feature geometry derivation with analytic profile sampling:

- circles use a deterministic segment count selected by physical diameter and capped for performance;
- rounded rectangles and slots use deterministic quarter-arc sampling;
- blind vertical bores are represented as profile holes only in affected depth layers;
- through bores are represented through all intersected layers;
- angled cylinders are sliced at layer boundaries to produce the correct shifted elliptical cross-section;
- countersinks and counterbores contribute additional depth intervals and profiles.

The derived geometry bundle remains the single consumer contract for rendering, hit testing, bounds, snapping, measurement, ground constraints, and collision. No consumer receives a special-case round-hole path.

### Performance

Feature geometry stays cache-backed and disposes evicted buffers. Pattern expansion is lazy inside derivation and validation; pattern members are not stored as individual feature records. Limits prevent pathological meshes:

- maximum 128 members per pattern;
- maximum 512 effective circular profiles per part;
- deterministic tessellation capped at 64 segments per circular profile.

Invalid or excessive patterns are blocked before geometry construction.

### Snap behavior

Round feature edges are valid snap geometry when feature-anchor snapping is enabled. Hole centers are point anchors. Dowel visualization never becomes an ordinary move/selection target.

## Validation and conflicts

Saving is blocked when:

- diameter, profile dimensions, radius, depth, or counts are non-positive;
- a blind depth reaches or exceeds the available material thickness along the authored axis;
- an entry profile extends beyond the targeted face;
- a requested through or angled path fails to intersect the blank as expected;
- countersink/counterbore dimensions are physically inconsistent;
- pattern members leave the target face or exceed limits;
- a round/rounded removal intersects an existing removal in a way that consumes its anchor or produces unsupported disconnected material;
- a dowel joint is missing either mate or produces mismatched member geometry.

Overlapping compatible holes with identical axes and dimensions are reported as duplicates. Other overlaps use the existing ordered-operation conflict model and identify both operations in plain language. Draft edits are never discarded because of validation failures.

## Fabrication output

Cut list, PDF, and CSV output describe operations in woodworking terms, including reference edges and units. Examples:

- `Drill 3/8 in through-hole on Top Face, 2 in from Left End and 1 in from Front Edge.`
- `Drill 1/4 in hole, 3/4 in deep, tilted 15 degrees toward Right End.`
- `Counterbore 1/2 in diameter x 1/4 in deep over 1/4 in through-hole.`
- `Drill 4-hole linear pattern: 3/8 in diameter, 2 in spacing.`
- `Dowel joint: 3 x 3/8 in dowels, 2 in long; drill 1 in into this part.`

Blank dimensions remain authoritative for optimization. Round removals do not change stock nesting dimensions.

## Paul deck validation

The source project is:

`/Users/michaelbaldwin/Carvd/carvd-studio-project-files/Paul_Knapp-Clay & Sarahs Deck.carvd`

It is a version-1 project containing 109 parts. The raw customer project must not be committed. Automated regression fixtures must be minimal synthetic reproductions derived from the observed part dimensions, rotations, and relative arrangements, with customer names and unrelated project content removed.

Acceptance requires all of the following in the actual project:

1. Open the project without migration warnings or geometry changes.
2. Select representative joist/rail members at a corner, move one well out of alignment, and return it using face/edge/corner snapping without numeric repair.
3. Select representative deck boards, move one well out of alignment, and return its end perfectly flush with adjacent board ends while preserving its surface contact.
4. Confirm the snap indicator identifies the winning face/edge relationship and does not oscillate between incompatible candidates.
5. Save a disposable copy, reopen it, and confirm positions are unchanged.
6. Add regression tests for every failure discovered during the real-project exercise.

The source file is read-only during validation. Any saved test copy goes to a temporary directory and is deleted after inspection.

## Analytics and privacy

Existing `part_cuts_opened` and `part_cuts_saved` events remain deliberately coarse. Do not add cut type, hole dimensions, pattern size, joint IDs, part IDs, project names, or file paths. The operation-count bucket may include these new operation families without changing its privacy boundary.

## Testing and release gates

### Unit and component tests

- strict runtime parsing and malformed-input containment;
- face-coordinate mapping for all six faces;
- straight, angled, blind, and through geometry;
- countersink, counterbore, rounded slot, and rounded rectangle geometry;
- linear, grid, and circular pattern expansion and limits;
- dowel pairing, copy/paste remapping, and misalignment warnings;
- validation/conflict behavior;
- feature-aware bounds, snapping, collision, measurement, and cache disposal;
- fabrication summaries and PDF/CSV instructions;
- inspector accessibility and draft undo/redo.

### Electron end-to-end tests

- create/save/reopen a round through-hole;
- create an angled blind countersunk hole;
- create and edit a hole pattern;
- create a rounded slot and rounded rectangular cutout;
- create a paired dowel joint and toggle dowel visibility;
- reject an invalid out-of-bounds pattern without losing edits;
- copy/paste behavior and file-version assertions.

### Manual acceptance

- complete Paul deck validation on the supplied project;
- complete the Custom Cuts beta checklist on at least one project containing round operations;
- verify on macOS Apple Silicon, macOS Intel CI, Windows x64, and Linux x64;
- run the scoped desktop lint, typecheck, unit, Electron E2E, production build, and packaging checks required by `AGENTS.md` and CI.

## Documentation and release copy

Update the changelog under `Unreleased`, the feature roadmap, Custom Cuts documentation, website Features page, and Joinery documentation. Public copy must call these woodworking operations, not free-form modeling, and must not promise CNC output.

## Delivery strategy

Implement on the existing `codex/custom-cuts-release` branch and update PR #444 rather than creating a second competing Custom Cuts PR. Work remains behind the existing develop-targeted PR until round-operation tests, Paul deck acceptance, full desktop verification, independent code review, and CI are green.
