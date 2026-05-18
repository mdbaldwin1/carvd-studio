# Architecture Decision Records

Each significant architectural decision made during the interaction-architecture redesign produces one ADR here. Phases without ADRs do not merge.

## Backlog

| ADR | Title                                     | Phase | Status      |
| --- | ----------------------------------------- | ----- | ----------- |
| 001 | Selection is not undoable                 | P0    | Accepted    |
| 002 | Hit-testing service architecture          | §11   | Draft       |
| 003 | SessionController state machine           | §3    | Not started |
| 004 | Tool solver interface contract            | §4    | Not started |
| 005 | Overlay model derivation policy           | §10   | Not started |
| 006 | Constraint pipeline ordering              | §8    | Not started |
| 007 | Store ownership graph                     | §12   | Not started |
| 008 | Scene graph derivation vs persistence     | §1    | Not started |
| 009 | Geometry bundle cache invalidation policy | §5    | Not started |
| 010 | Part definition dual-format migration     | §6    | Not started |
| 011 | Snap anchor graph + arbitration           | §7    | Not started |
| 012 | Collision policy state model              | §9    | Not started |

## Template

Copy `_template.md` when starting a new ADR. Fill all sections. Status starts as `Draft`, becomes `Accepted` when the decision is locked, and `Superseded by ADR-NNN` if a later ADR replaces it.

## Linking

- Reference an ADR from code with `// ADR-NNN: <one-line gist>` at the relevant site.
- Reference an ADR from other docs with `[ADR-NNN](./adr/NNN-slug.md)`.
- When you supersede an ADR, leave the old file in place, set its status to `Superseded by ADR-NNN`, and add a `Superseded by:` line at the top.
