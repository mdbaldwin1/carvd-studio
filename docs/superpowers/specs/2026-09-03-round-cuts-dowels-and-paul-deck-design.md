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

Slots use semicircular ends (radius = half width), so length must be at least width. Rotated fit uses the support of the actual rounded profile, not its sharp-corner bounding rectangle. Tangency to the blank is permitted.

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

The action is refused when the faces are not sufficiently parallel, opposing, and touching, when requested holes leave either blank, or when the combined drilling depths are shorter than the selected dowel length. Exact depth fits are accepted; extra drilling depth provides explicit end clearance, distributed proportionally between the two holes in the derived visualization. A gap between selected faces is not supported by the initial joint model. The user may change the dowel length or depths without losing face selections.

Multiple dowels require center spacing at least their diameter. Creation checks the new hardware against existing project joints before any mutation; relationship validation and the visualization also identify interference after edits. Flat-ended cylinders touching at sides or ends are not overlapping hardware. The dimensions step and drilling review use the active project units and retain authored precision.

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

Assembly capture and edit-save persist optional assembly-local part identities. Placement and entry into assembly editing remap these identities, feature IDs, and joint IDs together; excluded mates are detached. Older assemblies without local identities remain readable and reciprocal pairs are recovered from their joint/member references when unambiguous.

The shared face frame uses Front at positive local Z and Back at negative local Z. Bottom secondary coordinates run toward negative Z, including rounded-opening rotations. Legacy canonical corner targets have no vertical selector: blind corner notches enter from Top Face. Fabrication instructions state the physical reference edges, preserve authored numeric precision, and list individual hole coordinates after any consolidated dowel-joint summary.

Blind edge notches retain their Top/Bottom edge identity in fabrication instructions; only through notches use simplified side labels. Mirroring preserves physical coordinates, including side-pocket height and the high point of an end bevel or compound cut. Hole and recess depths are axial drilling distances, not distances along the face normal. Tilted cuts use oriented solid cutters so a counterbore floor is perpendicular to its axis and a countersink retains its included angle. Fabrication grouping compares dowel dimensions and the partition of holes into joints while ignoring instance UUIDs; differing valid dowel lengths must remain distinct in both PDF exports.

## Geometry architecture

### Exact representation

The current layered extrusion algorithm remains the source for straight cuts. Round and rounded operations extend the part-feature geometry derivation with analytic profile sampling plus bounded `three-bvh-csg` solid operations:

- circles use a deterministic segment count selected by physical diameter and capped for performance;
- rounded rectangles and slots use deterministic quarter-arc sampling;
- blind vertical bores are represented as profile holes only in affected depth layers;
- through bores are represented through all intersected layers;
- normal counterbores contribute an additional recess interval;
- all countersinks, including zero tilt, use a continuous conical cutter, never a stack of midpoint cylinders;
- side-face, end-face, and arbitrary-angle bores use finite cylinder/cone cutters through `three-bvh-csg`;
- every closed removal layer is intersected with the end/edge-cut stock solid before merging, so tenons preserve other end cuts and combined planes intersect without vertex warping;
- solid operations run on individual closed layers, not merged stacks containing coincident internal caps; temporary layer buffers are disposed after merging.

When end/edge cuts are combined with other removals, collision hull vertices are derived from the clipped render solid and cached with that geometry. New cut corners must not be warped beyond an authored end or bevel plane. This preserves the existing convex overlap policy while keeping its hull inside the same remaining solid's convex envelope.

Flat rectangular through-cut collision retains the full polygon set, including disconnected components and interior rings. A single-outline bounding fallback must never stand in for the remaining material in collision checks. Tilted rectangular-cut sub-box decomposition also retains every component and excludes interior openings; angled 3D cuts retain their existing convex-envelope policy.

The derived geometry bundle remains the single consumer contract for rendering, hit testing, bounds, snapping, measurement, ground constraints, and collision. No consumer receives a special-case round-hole path.

### Performance

Feature geometry stays cache-backed and disposes evicted buffers. Pattern expansion is lazy inside derivation and validation; pattern members are not stored as individual feature records. Limits prevent pathological meshes:

Geometry keys include dimensions and authored shape, target, placement, references, and pattern fields, excluding feature IDs, labels, and descriptive/relationship metadata. Dowel metadata controls separate hardware visualization and relationship validation, not the drilled part mesh; its actual hole diameter/depth remain geometry parameters in the key. Identical copied cuts share geometry and mixed-operation hulls.

- maximum 128 members per pattern;
- maximum 512 effective circular profiles per part;
- deterministic tessellation capped at 64 segments per circular profile.

Invalid or excessive patterns are blocked before geometry construction.

End/edge stock clipping keeps the authored cutting planes exact and moves only irrelevant blank walls outside the current layer, avoiding expensive coplanar splitting of perforated caps. Its six-halfspace envelope is built from at most twenty triple-plane candidates, including cases where end planes nearly meet; no slow coplanar fallback is used. Fixed 16- and 128-hole fixtures, 128-counterbore face/flip cases, and downstream collision/validation have conservative 1,000ms regression budgets; cache-only reuse has a 50ms budget. These are local regression ceilings, not a promise of identical timings on every device. Actual measured timings are recorded in the qualification report.

### Snap behavior

Round feature edges are valid snap geometry when feature-anchor snapping is enabled. Hole centers are point anchors. Dowel visualization never becomes an ordinary move/selection target.

## Validation and conflicts

Saving is blocked when:

- diameter, profile dimensions, radius, depth, or counts are non-positive;
- either authored rectangular offset is non-finite, checked before family defaults can replace an unused axis; malformed offsets stay available for correction but are excluded from preview triangulation;
- a blind depth reaches or exceeds the available material thickness along the authored axis;
- an entry profile extends beyond the targeted face;
- an entry ellipse or swept blind/recess cutter extends beyond remaining end-cut, bevel, or tenon material, including breakout between valid entry and end disks at a tenon shoulder;
- a blind rectangular or rounded pocket's complete prism extends beyond that remaining material, including its floor and rotated rounded outline; enclosed pockets require stock support, while open channels/notches and through-boundary openings may intentionally intersect an outer cut plane;
- one or more operations of any supported family consume the entire blank; individual cut save, final part save, and Cut List generation share this guard, after numeric/shape validation and a conservative removal-volume bound;
- a requested through or angled path fails to intersect the blank as expected;
- countersink/counterbore dimensions are physically inconsistent;
- pattern members leave the target face or exceed limits;
- a round/rounded removal intersects an existing removal in a way that consumes its anchor or produces unsupported disconnected material;
- a dowel joint is missing either mate, produces mismatched member geometry, or has interfering hardware.

Duplicate round operations must have the same complete expanded member set and removal profile, including active recess diameter, depth, or included angle. Sharing only one pattern member or using a different stepped recess is an overlap, not a duplicate. Other overlaps use the existing ordered-operation conflict model and identify both operations in plain language. Draft edits are never discarded because of validation failures.

Authored tenon dimensions and offsets are not clamped to hide invalid stock resizing. Blind rectangular depth is not snapped to through near the stock thickness. Measurement focus/blur and focused unmount are lossless without a text edit, in both unit systems. Invalid operations remain editable, show their specific error, and have a direct `Fix cut` action from the final-save explanation.

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
