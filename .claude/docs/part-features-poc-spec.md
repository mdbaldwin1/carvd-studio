# Part Features POC Spec

Workflow and policy source of truth: see `AGENTS.md`. This file is reference guidance for `carvd-studio-12.1` and downstream part-feature beads.

See also:

- `part-feature-sequential-spec.md` for the ordered multi-operation contract added after the initial POC implementation

## Purpose

Define the canonical fabrication model, user vocabulary, feature taxonomy, measurement semantics, and implementation constraints for the POC that adds mitres, cutouts, and angled end cuts to parts.

The goal is not to turn Carvd Studio into a general CAD modeler. The goal is to let a woodworker start with a rectangular board blank and then describe the operations that shape that blank into the finished part.

## Product Decision

### Canonical model

The POC uses:

- rectangular blank
- plus authored fabrication operations

The blank remains the primary stock/cut-list object.
Operations describe how the blank is modified after or alongside rough cutting.

### Rejected model

The POC does not use:

- arbitrary freeform geometry
- sketch-based modeling
- exact-shape nesting optimization
- unrestricted boolean modeling

That would conflict with the current app architecture and with the table-saw / cabinet-shop workflow Carvd is built around.

## Woodworker Mental Model

The intended thought process is:

1. Decide what board blank is needed.
2. Assign the stock and grain.
3. Choose which end, edge, face, or corner is being modified.
4. Apply a familiar shop operation.
5. Read the result as:
   - blank size
   - plus shaping/cutting instructions

The UI and data model should mirror that sequence. Users should not need to think in raw mesh terms or in abstract 3D axes to author a mitre or notch.

## Terminology

### Primary part language

Use woodworking-facing labels in UI:

- `Blank Size`
- `Operations`
- `Left End`
- `Right End`
- `Top Face`
- `Bottom Face`
- `Front Face`
- `Back Face`
- `Top-Front Edge`
- `Top-Back Edge`
- `Top-Left Edge`
- `Top-Right Edge`
- `Bottom-Front Edge`
- `Bottom-Back Edge`
- `Bottom-Left Edge`
- `Bottom-Right Edge`
- `Front-Left Edge`
- `Front-Right Edge`
- `Back-Left Edge`
- `Back-Right Edge`
- `Front-Top-Left Corner`
- `Front-Top-Right Corner`
- `Front-Bottom-Left Corner`
- `Front-Bottom-Right Corner`
- `Back-Top-Left Corner`
- `Back-Top-Right Corner`
- `Back-Bottom-Left Corner`
- `Back-Bottom-Right Corner`

Avoid leading with:

- `X axis cut`
- `negative Z corner`
- `face normal`

Axis language can exist in internal implementation only.

### Part orientation

For the POC, part-local axes remain:

- `length` = X
- `thickness` = Y
- `width` = Z

User-facing names map to those axes:

- left/right ends are the two faces normal to the length axis
- front/back faces are the two faces normal to the width axis
- top/bottom faces are the two faces normal to the thickness axis
- edges are intersections of two named faces
- corners are intersections of three named faces

`Front` and `Back` are naming aids for operations. They do not imply room-facing semantics in the larger project.

### Canonical target taxonomy

The POC should use a true 3D target taxonomy.

Faces:

- `Top Face`
- `Bottom Face`
- `Front Face`
- `Back Face`
- `Left End`
- `Right End`

Edges:

- `Top-Front Edge`
- `Top-Back Edge`
- `Top-Left Edge`
- `Top-Right Edge`
- `Bottom-Front Edge`
- `Bottom-Back Edge`
- `Bottom-Left Edge`
- `Bottom-Right Edge`
- `Front-Left Edge`
- `Front-Right Edge`
- `Back-Left Edge`
- `Back-Right Edge`

Corners:

- `Front-Top-Left Corner`
- `Front-Top-Right Corner`
- `Front-Bottom-Left Corner`
- `Front-Bottom-Right Corner`
- `Back-Top-Left Corner`
- `Back-Top-Right Corner`
- `Back-Bottom-Left Corner`
- `Back-Bottom-Right Corner`

The earlier flatter naming model is too ambiguous for implementation and should not be used downstream.

## Supported Feature Taxonomy

### Feature families in scope

The POC supports two operation families.

#### 1. End cuts

Applied to:

- left end
- right end

Supported kinds:

- square
- mitre
- bevel
- compound cut

#### 2. Rectangular removals

Applied to:

- corner notch
- edge notch
- face-anchored rectangular cutout

Supported kinds:

- corner notch
- edge notch
- rectangular cutout
- dado
- rabbet
- groove
- mortise

### Out of scope for the POC

- grooves
- sliding dovetails
- curved cutouts
- arcs
- chamfers along long edges
- round-overs
- drilling
- mortises
- tenons as visible 3D geometry
- CNC toolpaths
- kerf-by-kerf machining simulation

Joinery allowances remain separate from part features. They still describe extra material for the blank, not visible shape changes.

## Data Model Semantics

### High-level structure

Each part gains:

- `blank`: still represented by `length`, `width`, `thickness`
- `features`: ordered collection of authored operations

The blank dimensions are the source of truth for stock fit and optimization.

### Extensibility rule

Downstream beads must implement this as a feature framework with initial feature kinds, not as two isolated special cases.

That means:

- a shared base type
- a shared target model
- a shared placement/reference model
- per-feature parameter payloads
- room for metadata and future schema evolution

The framework should be future-proof for more woodworking and fabrication features without pretending to be a full CAD kernel.

### Suggested type shape

This is the canonical conceptual schema for downstream beads.

```ts
type PartFeature = EndCutFeature | RectCutFeature;

type PartFeatureId = string;
type PartFeatureKind = "end_cut" | "rect_cut";
type PartFeatureVersion = 1;

interface PartFeatureBase {
  id: PartFeatureId;
  kind: PartFeatureKind;
  version: PartFeatureVersion;
  enabled: boolean;
  label?: string;
  metadata?: Record<string, unknown>;
  target: PartFeatureTarget;
  reference: PartFeatureReference;
}

type PartFeatureTarget =
  | { type: "face"; face: FaceTarget }
  | { type: "edge"; edge: EdgeTarget }
  | { type: "corner"; corner: CornerTarget };

interface PartFeatureReference {
  primaryFrom: "min" | "center" | "max";
  secondaryFrom?: "min" | "center" | "max";
  tertiaryFrom?: "min" | "center" | "max";
}

interface EndCutFeature extends PartFeatureBase {
  kind: "end_cut";
  target: { type: "face"; face: "left_end" | "right_end" };
  cutType: "square" | "mitre" | "bevel" | "compound";
  lengthMode: "long_point" | "short_point" | "centerline";
  parameters: {
    horizontalAngle: number;
    verticalAngle?: number;
  };
}

interface RectCutFeature extends PartFeatureBase {
  kind: "rect_cut";
  cutType: "corner_notch" | "edge_notch" | "cutout";
  parameters: {
    size: {
      length: number;
      width: number;
    };
    depthMode: "through" | "blind";
    depth?: number;
  };
  placement: {
    x: number;
    z: number;
  };
}

type FaceTarget =
  | "left_end"
  | "right_end"
  | "top_face"
  | "bottom_face"
  | "front_face"
  | "back_face";

type EdgeTarget =
  | "top_front_edge"
  | "top_back_edge"
  | "top_left_edge"
  | "top_right_edge"
  | "bottom_front_edge"
  | "bottom_back_edge"
  | "bottom_left_edge"
  | "bottom_right_edge"
  | "front_left_edge"
  | "front_right_edge"
  | "back_left_edge"
  | "back_right_edge";

type CornerTarget =
  | "front_top_left_corner"
  | "front_top_right_corner"
  | "front_bottom_left_corner"
  | "front_bottom_right_corner"
  | "back_top_left_corner"
  | "back_top_right_corner"
  | "back_bottom_left_corner"
  | "back_bottom_right_corner";
```

Downstream implementation can refine this, but should preserve the semantics below.

### Why this schema is future-proof enough

This shape intentionally leaves room for future woodworking features such as:

- dados
- rabbets
- grooves
- chamfers
- drilling
- mortises

Those features can reuse:

- `kind`
- `target`
- `reference`
- `parameters`
- `metadata`

without forcing a schema rewrite.

### What is intentionally not future-proofed

This schema is not trying to pre-solve:

- arbitrary freeform modeling
- sketch constraints
- feature dependency graphs between arbitrary parameters
- full parametric CAD behavior

That is intentional. The goal is extensible woodworking operations, not general CAD.

### Ordering

Features are stored in authored order.

For the POC, ordering mainly matters for:

- UI display
- deterministic geometry generation
- future expandability

For POC-supported operations, the system may also enforce a stable evaluation order internally:

1. end cuts
2. rectangular removals

If implementation needs a stricter order than user-authored order, preserve the user-authored order for display and use a derived evaluation order for geometry generation.

## Measurement Semantics

### Blank dimensions remain primary

`length`, `width`, and `thickness` describe the blank before visible shaping features are applied.

This is the critical rule that keeps:

- stock validation coherent
- cut-list optimization coherent
- woodworking intent coherent

### End-cut measurements

End cuts need measurement language a woodworker recognizes.

Use:

- `Long Point`
- `Short Point`
- `Centerline`

Rules:

- For a square cut, all three resolve identically.
- For a mitre/bevel/compound cut, one of these becomes the controlling reference.
- The blank length shown in the main dimensions remains the actual blank length.
- The selected reference mode controls how the UI describes the sloped end, not whether the blank becomes non-rectangular in stock math.

POC simplification:

- The base blank length stays explicit and numeric.
- Long-point / short-point values are shown as derived measurements in the operations UI.
- The system does not replace the core part length field with ambiguous finished-length semantics.

### Rectangular removal measurements

Rectangular removals use:

- target
- placement offsets from the selected target reference
- length and width of the removal
- optional depth

For through cuts:

- depth is the full thickness

For blind cuts:

- depth must be less than thickness

### Coordinate conventions

Internal coordinates should be part-local and derived from blank dimensions.

User-facing coordinates should always be described relative to:

- a named face
- a named edge
- a named corner

Never expose raw signed coordinates as the primary authoring method in the POC UI.

## UX Specification

### Entry point

Single-part properties gets a new section:

- `Shape` or `Operations`

Recommendation:

- use `Operations`

Reason:

- woodworkers think in cuts and operations
- `Shape` sounds more CAD-like and less fabrication-oriented

### Operations panel layout

Recommended structure:

1. `Blank Size`
2. `Operations`
3. `Operation Summary`

Within `Operations`, show:

- a board diagram with selectable targets
- an `Add Operation` control
- existing operations as editable cards

### Board diagram

The diagram should show a simple rectangular board and expose clickable targets for:

- 6 faces
- 12 edges
- 8 corners

The UI should not render all 26 targets with equal visual weight at the same time.

Recommended behavior:

- show the broad structure of the part by default
- after the user picks an operation kind, highlight only valid targets
- allow hovering a face to reveal related edges and corners
- use progressive disclosure to avoid label clutter

The diagram is not decorative. It is the primary way to avoid axis-language confusion.

### Add operation flow

Recommended interaction:

1. Choose operation kind first.
2. Highlight only valid targets for that operation.
3. Select target on diagram or viewport affordance.
4. Enter dimensions / angle values.
5. Preview immediately in 3D.
6. Save operation into the part's operations list.

Reason:

- woodworkers usually think about the cut they want to make before the exact geometric target name
- the full face/edge/corner taxonomy is clearer when invalid targets are hidden
- this avoids forcing users to parse 26 possible targets up front

### Existing operation cards

Each operation card should show:

- operation type
- target
- key dimensions or angles
- enabled state
- duplicate
- delete

Examples:

- `Left End - Mitre 45 deg`
- `Right End - Compound 45 deg / 10 deg`
- `Back-Bottom-Left Corner - Notch 3/4 x 3/4 through`

### Viewport affordances

Viewport support is desirable but secondary to the properties panel.

POC requirement:

- clear visual preview of operations

POC optional:

- hover highlight of valid targets
- click-to-add from viewport

If viewport target picking becomes expensive or unstable, the properties diagram remains the canonical authoring surface for the POC.

## Geometry Rules

### Blank-first rule

Generated geometry represents:

- the blank
- minus or plus visible operations in scope

### End cuts

End cuts alter one end plane of the blank.

Rules:

- `square` is the identity operation
- `mitre` slopes across face width
- `bevel` slopes across thickness
- `compound` combines both

Implementation detail may vary, but the resulting mesh must visibly communicate the sloped cut direction and target end.

### Rectangular removals

Rectangular removals subtract from the blank.

Rules:

- `corner_notch` originates at a fully named corner target
- `edge_notch` originates from a fully named edge target
- `cutout` originates from a fully named face target with explicit placement offsets

The geometry engine may implement all of these through one rectangular-subtraction primitive so long as the authored semantics remain distinct in the UI and data model.

## Validation Rules

### General

Validation should prevent impossible or misleading operations.

### End cuts

Reject:

- non-finite angles
- zero-thickness or zero-width cases caused by an end cut
- feature combinations that invert the part or remove the entire blank

Warn or defer if exact geometry interactions are not yet modeled cleanly.

### Rectangular removals

Reject:

- negative offsets
- non-positive cut sizes
- blind depth greater than or equal to thickness
- through or blind cuts that extend outside the blank

### Feature conflicts

The POC may disallow some combinations that would be valid in a full CAD system.

Explicitly allowed behavior for the POC:

- reject overlapping or contradictory operations when geometry resolution would be ambiguous

Prefer explicit validation over silent geometry corruption.

## Cut List and Reporting Rules

### Primary rule

Cut lists optimize the blank, not the final silhouette.

That means:

- stock fit uses blank dimensions
- nesting uses blank dimensions
- waste calculations use blank dimensions

### Reporting output

Every feature-bearing part should report:

- blank dimensions
- operation instructions

Example output:

- `Rail A - Blank 18 x 2 1/2 x 3/4`
- `Ops: Left end mitre 45 deg, Right end mitre 45 deg`

For rectangular removals:

- `Ops: Back-left corner notch 3/4 x 3/4 through`

### Diagrams

POC diagrams do not need exact silhouette nesting.

They should:

- continue showing rectangular blank placements on stock
- annotate that secondary operations are required after rough cutting

## Interaction Constraints

### Snapping and overlap

The POC may use one of two strategies for non-rectangular interaction math:

1. feature-aware bounds where practical
2. conservative blank bounds where feature-aware math would destabilize drag/resize

Preferred rule:

- use feature-aware bounds for selection, framing, and display
- allow conservative blank bounds for snap/overlap if needed for stability

If conservative bounds are used, that limitation must be documented and applied consistently.

### Resizing

Blank resizing remains the primary dimension-edit workflow.

Operations should update or validate against the new blank size.

POC-safe behavior:

- resizing a blank may invalidate operations
- invalid operations should surface visibly and require correction

The system should not silently reinterpret anchors in a surprising way.

## Recommended Defaults

### End cuts

Defaults:

- target end selected from diagram
- `mitre` default angle `45 deg`
- `bevel` default angle `10 deg`
- `compound` default `45 deg / 10 deg`
- reference mode default `long_point`

### Rectangular removals

Defaults:

- `corner_notch` if a corner target is selected
- `edge_notch` if an edge target is selected
- `cutout` if a face target is selected
- initial size `0.75 x 0.75`
- default depth `through`

## Non-Goals

The POC does not need to solve:

- production-ready exact machining data
- arbitrary feature stacking logic
- perfect topological robustness
- full viewport target authoring
- exact non-rectangular stock packing
- joinery modeling beyond current allowances
- parametric references between parts

## Future Expansion Guardrails

When adding new feature kinds later, follow these rules:

1. Reuse the shared `target` model before inventing a feature-specific target field.
2. Reuse `parameters` payloads instead of adding top-level one-off fields to every feature.
3. Prefer additive schema evolution over mutating the meaning of existing fields.
4. Add new `kind` variants without changing the meaning of `end_cut` or `rect_cut`.
5. Keep blank dimensions authoritative for stock planning unless the product intentionally changes to a different manufacturing model.

## Downstream Bead Guidance

### For `12.2`

Implement the schema as blank-plus-operations. Do not collapse the blank dimensions into finished silhouette dimensions. Build a reusable feature framework with shared target/reference semantics instead of hard-coding only the two initial feature kinds.

### For `12.3`

Preserve the fast instanced-box path for plain parts. Feature-bearing parts can use a separate cached mesh path.

### For `12.6`

Lead with woodworking nouns:

- ends
- faces
- edges
- corners
- operations

Do not lead with:

- axes
- transforms
- mesh editing

### For `12.10`

Report blank-first fabrication instructions. Do not imply exact-shape nesting optimization.

## Acceptance Mapping for `carvd-studio-12.1`

This document resolves:

- supported operations
- coordinate and anchor semantics
- displayed terminology
- measurement references
- cut-list behavior
- explicit POC non-goals

Downstream beads should treat this file as the implementation reference unless a later decision bead intentionally supersedes part of it.
