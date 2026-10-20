# Carvd Router Interchange Contract

Status: public version 1 contract. The normative machine-readable contracts are the Draft-07 schemas in [`schemas/router-interchange`](schemas/router-interchange). Draft-07 is used because Carvd's existing lightweight validator is Ajv 6; adopting Draft 2020-12 would require a new runtime dependency without changing the version 1 data model.

## Files and versions

`.carvd-profile` contains one `carvd-router-profile` wrapper and `.carvd-tool` contains one `carvd-router-tool` wrapper. Both wrapper and contained definition currently have `version: 1`. Readers must reject unknown future wrapper or definition versions rather than guessing. Version 1 objects are closed: unknown properties are errors.

`.carvd-router-catalog` is the version 1 atomic bundle wrapper for local catalog exchange. It contains up to 512 canonical profiles and 512 physical tools plus catalog provenance. IDs must be unique within each record kind. Tool-produced-profile links must resolve to a bundled profile with the identical canonical revision; the whole bundle is rejected on a duplicate, dangling reference, or conflicting snapshot.

## Optional catalog signatures and publisher trust

A catalog wrapper may contain a `signature` envelope. Version 1 supports only Ed25519. The signed bytes are UTF-8 encoding of the compact canonical JSON for exactly `{ "format": wrapper.format, "version": wrapper.version, "catalog": wrapper.catalog }`: recursively sort every object key lexicographically, preserve array order, omit properties whose value is undefined, and apply standard JSON string/number encoding. Whitespace and original input key order therefore have no effect. Unlike definition revision derivation, no catalog field and no nested `revision` is excluded. The signature envelope itself is never signed. `payloadHash` is lowercase SHA-256 of those exact bytes; `publicKeyFingerprint` is lowercase SHA-256 of the DER-encoded SubjectPublicKeyInfo bytes in `publicKeySpki`. The signature is standard base64 of the 64 Ed25519 signature bytes.

`signed-test-only.carvd-catalog.json` is the deterministic test vector. Its canonical payload SHA-256 is `5f95532e0e7f62543789df99fd308151e335ebf6b6ab6b7804dd795cbe2eb4bf`; its checked-in private key is explicitly test-only and must never be trusted or reused for production publishing.

Verification is offline and classified separately from content parsing: `unsigned`, `verified-untrusted`, `verified-trusted`, `invalid`, or `unsupported`. Unsigned and valid-but-untrusted catalogs may be reviewed/imported with a warning. Invalid, tampered, malformed, or unsupported signatures block installation by default. Optional certificate/source text is non-authoritative metadata and is not a substitute for trust.

Trusted publishers are a capped local preference library of public SPKI keys, SHA-256 fingerprints, display names, source notes, and timestamps. It contains no private-key field; unknown/private fields, duplicate key IDs/fingerprints, stale revisions, and oversized stores are rejected. Trust must be established out of band by comparing the publisher key or fingerprint through an independently authenticated channel.

The schemas describe syntax and locally expressible constraints. The Carvd runtime parser is also normative for the geometric and cross-field invariants listed below. Valid and intentionally invalid files are under `schemas/router-interchange/examples`; `revision-vectors.json` supplies portable checksum vectors.

## Units and coordinates

All lengths are decimal inches, independent of the display-unit preference.

A router profile is an open boundary in a two-dimensional `(u,v)` stock-corner frame. Both coordinates increase inward from the two incident stock faces. `boundary.start` lies on one positive axis and the final segment endpoint lies on the other. Closing the boundary through `(0,0)` describes removed material. Segments execute in array order and support `line`, circular `arc`, axis-aligned `ellipseArc`, and `cubicBezier` primitives. Arc `clockwise` is interpreted in this local frame.

Detailed tool sections use an axial offset measured from the cutter tip: zero is the tip and positive values run toward the collet. Structural cutter, neck, and shank sections may not start below zero. Bearings may use negative offsets when physically below the tip. Diameters are full diameters, not radii. A section occupies `[start,end]`; structural sections are ordered and non-overlapping. A bearing may overlap a structural section only with `stackable: true`.

## Revisions and immutable snapshots

`revision` is a deterministic content checksum, not an edit counter. To derive it:

1. Recursively omit every object property named `revision` and every property whose value is JavaScript `undefined` (JSON has no undefined value).
2. Sort object keys lexicographically at every level. Preserve array order.
3. Serialize compactly with JSON string semantics.
4. Apply unsigned 64-bit FNV-1a using offset basis `0xcbf29ce484222325`, prime `0x100000001b3`, and each JavaScript UTF-16 code unit.
5. Emit `fnv1a64:` plus 16 lowercase hexadecimal digits.

External implementations should verify their output against `revision-vectors.json`. A supplied revision must match exactly. Exporters should include a revision; legacy version 1 records without one remain accepted and receive one when entered into a Carvd library.

Project feature snapshots are authoritative for geometry. Library IDs and revisions report current, changed, or missing catalog state; they never silently replace an embedded profile or tool snapshot. A missing library record therefore does not invalidate a project that retained a valid snapshot.

A physical tool may include up to 32 `producedProfiles`. Each record carries the certified profile ID, its exact revision, and an immutable canonical profile snapshot; optional nominal size and a bounded uniform scaling declaration may also be present. Profile geometry remains the authority for shape, and no profile owns or recursively embeds tool data. Compatibility is reported as exact revision match, geometrically equivalent boundary despite metadata differences, explicitly scalable, legacy family-compatible, mismatch, or missing linkage. `profileFamily` and `routerProfileId` remain a backward-compatible advisory fallback only when no produced-profile linkage exists.

## Runtime-only invariants

JSON Schema cannot fully express these version 1 rules, which the runtime parser enforces:

- exact revision/checksum equality;
- profile endpoint axes, measurable removal area, non-self-intersection, and non-degenerate cubic segments;
- circular/elliptical geometric feasibility and contour topology;
- section `end > start`, structural ordering/non-overlap, cutter section presence and tip origin;
- bearing overlap semantics, section diameters/spans matching legacy summary fields, overall reach, and safe collet insertion fitting the modeled shank span;
- compatibility between a tool's `profileFamily`/optional `routerProfileId` and an assigned profile.
- produced-profile snapshot ID/revision consistency, catalog ID uniqueness, dangling references, and conflicting bundled snapshots.

Some invalid fixtures therefore pass JSON Schema but must fail the runtime parser; `examples/invalid/expectations.json` records that distinction explicitly.

## Provenance, fidelity, and security

`source`, manufacturer fields, SKU, and source URL preserve catalog provenance. Profile `parameters` may also retain importer fidelity annotations. These fields are descriptive and must not be treated as proof of authenticity, safety, ownership, or machine compatibility. Import/export is lossless for recognized version 1 fields; migration must preserve source metadata, exact boundary primitives, detailed tool sections, and revisions. Future lossy migrations must require explicit user acknowledgement.

Parsers must enforce the schema limits before expensive geometry work: at most 2,048 profile segments, 256 parameters, 64 tool sections, and absolute coordinate/dimension magnitudes no greater than 1,000 inches. Importers should additionally impose a reasonable file-byte limit and JSON nesting limit at their trust boundary. URLs are data only and must never be fetched automatically. Names, SKUs, and URLs are untrusted text and must be escaped in any HTML or command context.

Signatures prove possession of the corresponding private key and integrity of the complete catalog payload. They do not independently prove a real-world manufacturer identity, that a key remains uncompromised, that dimensions are safe, or that catalog advice fits a particular router/workpiece. Version 1 has no revocation network, certificate-chain validation, timestamp authority, or transparency log; publisher removal is local and affects future trust classification only.

## Integration guide

To export, assemble a canonical definition, validate it, compute and attach its revision, then wrap it with the matching format and wrapper version. To import, parse JSON without evaluating content, validate against the matching schema, reject unsupported versions, run the Carvd runtime invariants, and retain provenance and revision unchanged.

A vendor catalog should distribute independent `.carvd-profile` and `.carvd-tool` records (or a manifest that references those records without altering them). Use stable vendor-scoped IDs, `source: "manufacturer"`, manufacturer, SKU, and an informational HTTPS source URL. A tool may name a broad `profileFamily` and optionally an exact `routerProfileId`. Include a detailed axial envelope whenever measurements are available; keep the required legacy diameter/height summaries consistent for older readers. Catalog ingestion, signature verification, network retrieval, and automatic updates are intentionally outside this contract.

For atomic exchange, vendors may instead ship one `.carvd-router-catalog` wrapper conforming to `router-catalog.schema.json`. Import planning is deterministic and side-effect free: missing IDs are `add`, identical revisions are `skip`, changed same-version definitions from the same declared provenance are `update`, and incompatible versions or ID ownership are `conflict`. Applications must present or otherwise explicitly apply that plan; parsing never mutates a library.

Uniform scaling is intentionally conservative. It is considered only when a linkage explicitly sets `applicability.scalable`, every endpoint, control point, and arc radius shares one positive scale, and that scale falls inside any declared bounds. The current matcher does not infer whether cutter physics, bearing offsets, feed rates, or stock species remain valid after scaling; manufacturers should omit scalable applicability unless the whole declared range is certified.

Backward-compatible version 1 additions may only use a future explicitly versioned extension mechanism; because version 1 objects are closed, producers must not inject private fields. Breaking syntax or semantics requires a new definition and/or wrapper version. Carvd promises to continue accepting valid version 1 files and legacy version 1 tool records without detailed sections.
