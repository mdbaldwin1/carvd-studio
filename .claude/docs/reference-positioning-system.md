# Reference Positioning System

Status: Active implementation spec
Date: 2026-04-28
Scope: Desktop workspace reference-based move and resize interactions

See also:

- `interaction-architecture-redesign.md`
- `interaction-system-blueprint.md`

## Purpose

This document is the canonical spec for reference-based positioning in Carvd Studio.

It defines:

- the product behavior for reference-driven move and resize
- the terminology the codebase should use
- the state model for reference entities and relations
- the boundary between interaction sessions, solvers, and overlays
- the ambiguity and latching rules that keep the UX stable
- how this system stays compatible with future custom-cut and feature-aware geometry

This spec exists to stop reference-distance behavior from remaining a passive overlay and to turn it into a first-class transform interaction model.

## Current Implementation Status

The branch now includes the first usable version of this system:

- reference entities and selection entities resolve through shared interaction helpers
- move sessions publish active reference relations and render active rulers during drag
- resize sessions publish both size rulers and gap-to-reference rulers
- direct numeric editing supports:
  - move distance edits
  - resize size edits
  - resize gap edits
- near-equal candidates now latch instead of bouncing between relations every frame

The main remaining gaps are:

- richer group face proxies beyond bounds-based outer proxies
- explicit hovered-ruler target switching
- deeper in-app onboarding and affordances around marking references
- future feature-aware/custom-cut anchors

## Product Goals

The user should be able to:

- mark a part or group as a reference target
- select a part or group to move or resize
- see a clear relative ruler between the selected entity and the most relevant reference target
- type a value directly into that ruler to set exact spacing or offset
- understand whether the current edit changes:
  - position
  - part size
  - gap to reference

The user should not have to guess:

- which reference target the app chose
- whether a label is only informational or actually editable
- whether a typed value will move the selection or resize it
- why the active ruler switched to a different target

## UX Principles

### 1. References are interaction context, not decoration

Reference markers should not behave like passive measurements that happen to exist after selection.

When a transform session is active, the strongest relevant reference relation should become an active control surface.

### 2. The active relation must be explicit

At any moment, the app should be able to answer:

- what entity is being manipulated
- what reference entity is being measured against
- what relation kind is active
- what degree of freedom the active relation affects

### 3. Move and resize must share the same mental model

The user should not have to learn two unrelated systems.

Move and resize should both expose:

- passive rulers while idle or lightly selected
- one active ruler during manipulation
- direct in-canvas value entry

### 4. The canvas should stay calm until the user needs precision

Idle selection can show a small number of lightweight rulers.

During move or resize, the active ruler should become stronger and the less relevant rulers should fade or suppress.

### 5. Group references must behave like coherent objects

When the user marks a group as a reference, the app should treat that group as one stable reference entity, not as an arbitrary collection of descendant parts.

## Terminology

### Reference entity

A part or group explicitly marked as reference context.

### Selection entity

The part or group currently being manipulated.

### Reference relation

A measurable relationship between a selection entity and a reference entity.

Initial relation kinds:

- `gap`
- `offset`
- `span`
- `dimension-match`

Future relation kinds:

- `angle`
- `feature-gap`
- `feature-alignment`

### Passive ruler

A visible but low-emphasis ruler shown to help the user understand the current relationship.

### Active ruler

The emphasized ruler currently driving move or resize behavior.

### Ruler edit mode

The semantic meaning of typing into a ruler.

Initial edit modes:

- `move`
- `resize-size`
- `resize-gap`

### Active reference relation

The current winning relation for the interaction session.

This is the relation whose value the user sees as primary and whose label should be directly editable.

## Current Product Gaps

The current implementation already has useful building blocks:

- explicit reference targets through `referencePartIds`
- in-canvas editable reference-distance labels for move
- resize-time dimension matching against references

But it still has major limitations:

- references are collapsed into combined bounds too early
- move-relative editing is overlay-driven instead of relation-driven
- resize does not expose gap-to-reference editing as a first-class interaction
- groups are treated more like descendant bags than stable reference entities
- there is no canonical active relation model shared by move, resize, and overlays

## Interaction Model

### Idle Selection

When:

- at least one reference entity exists
- at least one selection entity exists
- no transform session is active

The app should:

- resolve candidate reference relations
- show a limited number of passive rulers
- prioritize overall meaningful gaps and offsets over incidental internal measurements

### Move Session

When move begins:

- resolve the manipulated selection entity/entities
- resolve reference entities
- generate candidate relations
- score them using movement context
- promote the winning relation to active

The active move ruler should:

- update live while dragging
- visibly identify the current spacing/offset being controlled
- allow direct numeric input

Typing a value into the active move ruler should:

- solve a movement delta from relation semantics
- not just move blindly along the current line segment
- pass through snap and constraint resolution

### Resize Session

When resize begins:

- determine the manipulated face or dimension
- generate candidate reference relations from the moving face to reference entities
- show both:
  - the part size ruler
  - the active gap-to-reference ruler when applicable

The user must be able to tell the difference between:

- editing part size
- editing gap to reference

Typing into the size ruler should:

- set resulting part dimension

Typing into the gap ruler should:

- resize the moving face until the reference gap matches the typed value
- keep the opposite side anchored according to handle semantics

## Domain Model

Suggested core types:

```ts
type ReferenceEntityKind = "part" | "group";
type ReferenceRelationKind = "gap" | "offset" | "span" | "dimension-match";
type ReferenceEditMode = "move" | "resize-size" | "resize-gap";

interface ReferenceEntity {
  id: string;
  kind: ReferenceEntityKind;
  partIds: string[];
  proxy: ReferenceGeometryProxy;
  candidateAnchors: ReferenceAnchor[];
}

interface SelectionEntity {
  id: string;
  kind: "part" | "group";
  partIds: string[];
  proxy: ReferenceGeometryProxy;
  candidateAnchors: ReferenceAnchor[];
}

interface ReferenceRelation {
  id: string;
  kind: ReferenceRelationKind;
  axis: "x" | "y" | "z" | null;
  fromEntityId: string;
  toEntityId: string;
  fromAnchorId: string;
  toAnchorId: string;
  value: number;
  editMode: ReferenceEditMode;
  priority: number;
  source: "idle" | "move" | "resize";
}
```

## Entity Resolution Rules

### References

- each referenced part is one reference entity
- each referenced group is one reference entity
- nested referenced groups collapse to the highest referenced ancestor
- referenced parts already contained in a referenced group are not duplicated as separate reference entities

### Selection

- selected parts stay standalone unless covered by a selected group
- selected groups become selection entities
- nested selected groups collapse to the highest selected ancestor
- selected parts already contained in a selected group are not duplicated

### Group proxy strategy

Short term:

- use a stable outer proxy per group

Medium term:

- derive candidate outer faces from descendant geometry

Long term:

- use feature-aware face and edge graphs

## Relation Solver

The relation solver should:

1. resolve selection entities
2. resolve reference entities
3. enumerate candidate anchors
4. generate candidate relations
5. score the candidates
6. return:
   - passive rulers
   - active recommended ruler
   - edit metadata for transform solving

### Initial relation families

- axis gap between outer faces
- axis offset between corresponding faces
- size match or dimension match where appropriate
- moving-face-to-reference-face gap during resize

### Scoring factors

Prefer:

- the currently manipulated axis
- the nearest meaningful gap
- visible and outward-facing candidates
- same-plane or near-aligned targets
- the target nearest the drag direction or moving face

Deprioritize:

- tiny incidental internal gaps
- inward or hidden faces
- noisy descendants inside reference groups

## Active Target and Latching Rules

The active relation must not flicker across similar candidates every frame.

### Latching behavior

Once a relation becomes active during a move or resize session, keep it latched until:

- a substantially better candidate appears
- the user changes the manipulated axis or face decisively
- the current relation becomes invalid
- the user explicitly hovers or picks another relation

### Ambiguity rules

If multiple candidates are near-equal:

- prefer the current latched relation
- otherwise prefer the candidate on the dominant interaction axis
- otherwise prefer the nearest visible outer face
- otherwise prefer the smaller meaningful gap

## Ruler Model

The current flat distance-indicator model should evolve into a richer ruler model.

Suggested shape:

```ts
interface ReferenceRuler {
  id: string;
  relationId: string;
  kind: "passive" | "active" | "hovered" | "editing";
  editMode: ReferenceEditMode;
  axis: "x" | "y" | "z" | null;
  value: number;
  worldLine: { start: Vec3; end: Vec3 };
  labelPosition: Vec3;
  priority: number;
}
```

Rendering rules:

- passive rulers are lower emphasis
- active rulers are visually dominant
- resize size and resize gap rulers must be visually distinguishable
- editing rulers must clearly indicate focus and semantic meaning

## Transform Solving Semantics

### Move

Typing into a move ruler should:

- solve the desired relation value
- compute the required translation
- run through:
  - snap resolution
  - ground constraint
  - overlap prevention
  - final commit

### Resize

Typing into a resize-size ruler should:

- set part size directly

Typing into a resize-gap ruler should:

- solve the new moving-face position relative to the reference
- compute the implied new part size and center
- respect stock and overlap constraints

## Session Integration

Reference positioning should be part of the shared interaction session model.

Move and resize sessions should carry:

- resolved selection entities
- resolved reference entities
- candidate relations
- active relation
- hover relation
- relation latch state
- derived rulers

That state should drive both:

- transform solving
- overlay rendering

## Future Custom-Cut Implications

Custom cuts are one of the reasons this model needs to be relation- and face-oriented.

Future work should support:

- reference gaps to feature edges
- alignment to cut-derived faces
- angle relations for mitres and bevels
- feature-aware measurement overlays

## Documentation Requirements

This initiative must keep these docs aligned:

- `interaction-architecture-redesign.md`
- `interaction-system-blueprint.md`
- `reference-positioning-system.md`

Implementation beads should update these docs when architectural reality changes rather than letting the docs drift.

## Validation Checklist

The final implementation should be verified with:

- unit tests for entity resolution
- unit tests for relation generation and scoring
- unit tests for latching and ambiguity resolution
- move-relative editing integration tests
- resize-relative editing integration tests
- group reference tests
- manual UX checks in dense real projects
