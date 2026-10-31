# Changelog

All notable changes to Carvd Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Updated the one-time price for new Carvd Studio licenses to $99.99; existing licenses keep their access and free updates.

### Added

- Free Heron oak-and-walnut cabinet design study with an editable Carvd project, cut-list report, real app views and a joinery walkthrough; replaces the desktop shelf showcase.
- Visual tutorials for matching joints and printable cut lists on the website.

### Added

- Added a public 1.3.0 feature announcement with real app screenshots, linked from the homepage and changelog.

### Fixed

- Keep long fractional dimensions fully visible in the fixed-width Properties panel fields.
- Keep Escape dismissal available immediately when the lighting popup opens or rerenders.

## [1.3.0] - 2026-10-19

### Fixed

- **Responsive settings on Windows** — Changing snapping presets now saves only the affected preferences, avoiding hundreds of redundant disk writes.

- Release publication now waits for the full validation workflow and required credentials. macOS release builds require signing and notarization, and reused version tags must match the validated commit.
- Electron CI validation fails when a test passes only on retry, so an intermittent shutdown failure cannot silently satisfy the release gate.

### Fixed

- Keep release validation compatible with Windows text-file line endings, the current packaging toolchain, and the supported Ubuntu browser-test runner.

- Include Windows installer blockmaps in releases so automatic updates can download changed data instead of the full installer.

- Complete unsaved-project and cut-edit checks before starting an update installer, so canceling or retrying a restart does not start installation or register native update callbacks prematurely.
- Open projects passed by Windows and Linux file associations, including file URLs and paths containing spaces, instead of opening an empty start screen.
- Package the tested, locked workspace dependencies without resolving a separate runtime dependency tree.
- Keep the bundled direct-dependency license inventory synchronized with the lockfile and reject stale inventories during builds.
- Use valid Linux executable and Debian package names, associate Linux windows with the desktop launcher, and register `.carvd` project files with the Linux MIME database.
- Display Carvd Studio in native macOS Hide and Quit menu items.

- Update the desktop runtime to official Electron 43.7.9 while retaining macOS 12 compatibility.

- Always show feedback after a manual update check when the release feed contains an older or ineligible version, and distinguish unavailable checks from a successful result.

- Preserve fabrication dimensions in on-screen cutting diagrams and selected-part details instead of rounding narrow parts to the nearest sixteenth of an inch.

- Make cutter-sampler, stopped-housing and specialized lap recipes discoverable through documentation search.

- Keep joint recipes within the mobile reading column while allowing wide machining tables to scroll independently.

- Add a complete cutter-sampler recipe with every pass, custom profile boundary, drilling pattern and a real native-app screenshot, distinguishing geometric profiles from physical tooling.

- Keep hole-fit warnings stable when rotating an assembled joint or spinning an uncut wooden dowel around its axis; genuinely oversized pins still report interference.

- Document the dovetailed lap splice's complete cut layout and lift-in assembly direction, verified in the native editor at level and 30-degree orientations.

- Preserve mortise end-wall angles and their widening or narrowing direction in part summaries and fabrication exports, including fox-wedge sockets.

- Give the fox-wedge and wedged-through-tenon examples wider wedge heads than their kerfs, with only the narrow tips started; document the rigid model's limits when representing wood spreading.

- Keep modification timestamps out of document undo history so bookkeeping updates do not consume an Undo step.

- Prevent large mouse drags from pulling a cut board through a seated rectangular key, preserving legitimate key withdrawal and board movement after removing the key.

- Add a cutter-head entry pocket to the example sampler’s stopped dovetail route, and document the keyhole route’s existing automatic entry opening.

- Restrict material-collision surface sampling to the shared bounds of the two parts, avoiding unrelated faces in heavily drilled boards while retaining the inward contact tolerance.

- Flag end-face routes following an angled end cut as modeled dimensions requiring a separate shop setup, instead of presenting blank-referenced depth as a router plunge setting.

- Put the pegged-tenon example’s drilling operation before its cheek cuts, matching the stated fabrication order; document the tested recipe with a real app screenshot.

- Allow bored tenons to slide through matching mortises at compound angles by distinguishing Boolean-seam ray misses from actual material collisions. Inserted round pegs now also block large mouse drags that previously passed through them.

- Speed up collision-safe keyboard movement of profiled parts by rejecting paths whose stock envelopes cannot meet, while retaining detailed material checks for possible contact.

- Recognize matching full-thickness built-in roundover and cove profiles as rule-joint assembly references, with guided seating for an engaged pair. Custom profiles, unequal radii, and hinge motion remain outside this helper.
- Include partial-height mitre and bevel cut bands, measured from the board bottom, in feature summaries and shop instructions.

- Check the material crossed during keyboard movement of round pins and profiled parts, preventing thin-obstacle tunneling while preserving movement through existing cavities.

- Keep machine setup groups distinct for saved router contours and tool geometry, corner radii, end versus side wall angles, rabbet shoulders, and partial-height end-cut bands.

- Keep rectangular runners captive beneath routed lips during keyboard nudges, and check the material crossed while moving into position.
- Recognize long-edge tongues made with paired face cutouts when assembling and fitting beaded boards.
- Preserve precise part and stock dimensions in the sidebar and shopping list; label per-board prices correctly and keep router setups distinct by cutter angle, shank diameter, and cutter height.

- Save recovery snapshots on a steady cadence during continuous editing instead of restarting the timer after every edit or camera movement.

- Allow small splines, keys, and wooden T-slot runners to be entered, assigned prepared stock, and resized without inflating their dimensions.

- Keep the opposite end fixed while resizing parts on a coarse grid, preserving pin alignment inside drilled holes.

- Deliberately discarded work no longer reappears as recovery after closing; pending recovery writes finish before cleanup.

- Guide engaged wooden pins along matching drilled holes during dragging, and keep cutting-diagram PDF headings clear of utilization labels. Show only length resize handles on round stock and preserve diameter when resizing its length. Recognize end-rebate tongues when seating and fitting rabbeted dado joints.

- Preserve full mating-face contact for compound mitres and guide interlocked crossed-slot dividers along their withdrawal axis.
- Track unsaved changes correctly when Undo or Redo crosses the latest savepoint.
- Use drilling angles measured from the board face consistently and separate machine setups by angle and recess tooling.
- Wrap long stock names and purchased-hardware descriptions within PDF columns, with repeated headers across page breaks.

- Prevented obsolete reports becoming current through Undo, hidden notifications blocking editor clicks, and housing-fit recipes treating dowels or purchased inserts as mating boards.
- Restored packaged-app branding and PDF watermark assets, and rendered printable checklist headers without unsupported font glyphs.
- Invalidated cutting reports after Reset to Stock and retained validation warnings in fabrication reports and exports.
- Preserved machining on purchased inserts, included post-glue-up operations in setup grouping, and distinguished oversized blanks from finished modeled dimensions and reference edges.
- Blocked purchased-insert size/shape mismatches and rod-diameter mismatches and invalid imported routes from fabrication reports; corrected constrained grain assignment, material-specific movement assumptions, and small joint-interference warnings.

### Security

- Updated Electron, the updater, packaging tools, website routing, and affected dependencies within their existing major versions. Release packaging now uses the checked-in toolchain instead of an older hardcoded packager.

### Documentation

- Documented router profile and physical-tool workflows, SVG import, library version updates, feasibility findings, and matching-layout measurements, with a native edge-profile screenshot.

- Corrected drag-modifier guidance and expanded cut actions, hole patterns, cut-editor shortcuts, plain joints, and the documentation learning path, including a native shelf-pin pattern screenshot.
- Expanded joinery documentation with Part Cuts and joint recipe guides, real app screenshots, and contextual desktop help links for matching layouts, assembly placement, and insert sockets.
- Added real-app screenshots of groove, dowel-socket, and scarf examples, with worked clearance calculations and guidance on cut targets and insert shapes.

### Changed

- Corrected joinery-bench purchasing: hardware and canvas use shopping items, the plywood spline uses actual 1/8-inch stock, factory inserts use their shapes, and the wooden T-slot runner preserves grain. Added missing hardware and adhesive requirements and identified unpriced sample purchases.
- Cut lists now describe preparation when solid-wood parts are thinner than their stock; validation rejects thin sheet parts assigned to thicker sheet stock.
- Removed the Top / Front / Side / Isometric dropdown from the editor toolbar.
- Preserve joint alignment during arbitrary and compound rotations: solve mating constraints in joint directions, reject tilted inserts, retain precise calculated angles, and lift rotated selections as one rigid assembly.

- Keep workspace shortcuts, including F to frame the selection, available after selecting parts with checkboxes.

- Assemble loose splines by their long edges with half-width insertion, keeping an already-seated spline fixed while adding the second board.
- Align complementary shiplap rabbets by their recessed seating faces.
- Avoid false material-interference warnings on rotated, touching joinery faces.

- Correct face-groove help and rectangular-cut fabrication notes to measure offsets from the actual back edge.

- Fabrication notes measure front/back edge grooves from the bottom of the board, matching the cut editor.

- Tongues formed by matching edge rabbets assemble at their shoulders, preserving glue space; groove fitting uses the tongue thickness instead of the full board thickness.

- Deleting an open cut with the keyboard no longer lets its properties panel recreate the removed operation.

- Bridle joints suggest their open mortise end for assembly; through-mortise instructions no longer report a zero cutting depth.
- Outdated cut lists must be regenerated before export. Blocking validation errors remain visible and outdated project-report exports are disabled.

- Added previewed matching layouts for box joints, through, half-blind, mitred blind, and sliding dovetails, mortise-and-tenon, twin tenons, and haunched tenons. Both boards update in one undo step; reference-based assembly seats the pieces without changing their dimensions.
- Dovetail fabrication notes include face tapers and socket-wall slopes with their widening or narrowing direction.
- Sliding dovetails use a center mark for layout and retain solid wood behind their shoulders. Corrected generated tongue geometry, snapping recognition, and cutter-angle descriptions.
- Stopped dados now stop at either or both cross-board edges, with correctly rounded routed ends and full-width open mouths. Assembly defaults align the board edges and preserve underside orientation. Fabrication notes distinguish open edges, stopped ends, and router radius. Existing full-width cuts retain their original geometry. Corrected the reference edge for off-center tenons.
- Matching half laps assemble by their recessed seating faces, keeping cross laps, T-laps, and end-lap splices flush.
- Rabbet ledges are selectable assembly references, with the correct receiving board, orientation, and seating depth suggested automatically.
- Deliberately placed underside assemblies can be withdrawn and reseated below the work plane without a second ground correction undoing the drag.
- New Domino and biscuit parts use their factory outlines and purchased dimensions. Stock selectors retain their actual metric sizes. Explicit factory shapes and stopped spans save as file version 4; existing rectangular inserts remain unchanged on load.

- Creating stock from part properties now supports all insert types, including prepared loose tenons, and preserves insert dimensions, packaging, and zero prices.
- Added matching socket layout for dowel, Domino, biscuit, and loose-tenon parts, including insertion depth, clearance, and glue space. Insert snaps preserve the specified depth instead of bottoming out in the glue space. Biscuit pockets follow the plate-joiner blade arc; rounded edge mortises and round bores fit their inserts consistently.
- Added explicit part-selection checkboxes. Second insert sockets use the exposed end and let the receiving board move onto the existing assembly.
- Selected faces are highlighted in assembly previews; insert layouts use physical edge measurements. Small-part handles and dimensions are easier to read, purchased inserts retain fixed sizes, and router profile controls use inset/depth labels.
- Plate-joiner fabrication notes describe blade diameter, kerf, and plunge. Purchased-insert shopping lists preserve actual metric sizes; operation notes use readable precision while setup grouping retains exact settings.
- Clarified applying cuts versus saving the project, preserved numeric precision through rounded displays, and removed internal triangulation edges from stock outlines.

- Improved joint authoring with exact dado/groove placement, underside half laps, through edge mortises, editable dovetail angles and correctly measured mitred lips, and visible joint-fit actions. Fixed signed coordinates, mixed-unit entry, shallow hinge recesses, decimal profile entry, and drilling through recessed tenon cheeks. New parts start clear of existing stock.
- Added a circle jig for routed paths and sped up multi-span flat-bottom routing. Corrected the test bench's Domino mortises and insert to use matching rounded cross-sections.

- Improved joint snapping for through and twin tenons, opposed cheeks, sliding dovetails, cross dividers and mixed mitre cuts. Corrected face clearance, conflicting connector constraints, quick-drag release, and drag-plane alignment; dragging over another part no longer selects it on release. Position fields accept negative coordinates, permit valid socket fits consistently with dragging, and Select All respects focused text inputs.

- Removed the obsolete Dowels toolbar toggle. Dowel parts use normal part visibility; older projects still display their legacy dowel joints.

- Corrected the joinery test-bench generator: pocket-hole angles, stopped-dado relief, compound-mitre seating, mating rule-joint profiles, repeated hole patterns, shelf pins, stock assignments, and ineffective router cuts. Hinge recesses open onto the mating edges, the T-slot has an insertion opening, the peg passes through its tenon, and rebuilt sliding dovetail, tambour, birdsmouth, cove-and-pin, cross-dowel, keyed-mitre and wedged-tenon examples include their mating cuts and hardware.

- Corrected shallow V-bit geometry and fit checks for routed dovetail tongues and transverse barrel nuts.

- Added Fit Dado to Mating Part, and the same for grooves, stopped runs and half laps. Select the piece and the part it goes into, and the channel is cut to the piece rather than to a typed number. This quietly fixes the oldest trap in sheet goods: nominal 3/4" plywood is nearer 23/32", so a dado cut to a typed 3/4" is loose every time, while one cut to the actual part is not.

- The cut list now also groups operations by setup. Nobody works part by part: you set the dado stack to three quarters, run every piece that takes that dado, and only then change it. Cuts that need the same machine setting are gathered together, and where a cut sits along a board no longer separates them, because an offset is not a machine setting.

- The cut list now says how far a solid panel will move. Wood takes up moisture in a damp August and gives it back in a dry January, almost entirely across the grain, so wide solid parts carry an allowance and a reminder that a housed panel has to stay free to move. Sheet goods say nothing, because plywood stays put.

- A dado cut with the grain, or a groove cut across it, is now called out. The two words mean grain direction, and on a board whose grain runs across its width the names come out backwards.

- A mortise or a cutout now records how it was made. Chopped with a chisel it has square corners; routed it has corners radiused to the bit, which for a pocket cut with a bit its own width makes the ends half-round. Fitting a tenon to a routed mortise carries the requirement across, and the cut list says to round the tongue to match rather than drawing a square one and staying quiet.

- Added Fit Tenon to Mortise. Select the rail and the part it goes into, and the tenon is cut to the mortise: the mortise's width becomes the tongue's thickness, its length the tongue's width, and the tenon stops a sixteenth short of the bottom so it seats on its shoulders. The mortise is never altered, because it is the harder half to change once it is cut.

- A new mortise and a new tenon now fit each other. Accepting both defaults previously drew a tenon six times too long for its mortise and a third of the width it needed; a tenon is now about a third of the stock it is cut on, and a mortise is cut a sixteenth deeper than the tenon is long so it seats on its shoulders.

- Half Lap is a real joint rather than a dado wearing a label. Its depth is half the board, derived on every read, so resizing a part keeps the lap a half and two laps on matching stock meet flush.

- Cuts entering a part from faces at right angles are now checked against each other. Two mortises meeting in a leg is reported with the remedy — shorten one, or mitre the tenon ends where they cross — rather than refused, because meeting is often the intent.

- Added Bore Through Assembly: a through hole now drills every part stacked behind it in one pass, the way clamping up and drilling straight through does. It stops at the first gap, because a bit travels through wood and not air, and it does nothing from a blind hole, which is where the bit stopped.

- Round holes are now bored with a bit chosen from a drill index rather than a typed number, and a blind hole deeper than the bit reaches says so. A Forstner runs out of flute long before a twist bit does.

- Removed the Create Dowel Joint wizard. Dowel joinery is now done the way it is done at the bench: bore the holes where you want them, transfer them across the joint line, and drop in a dowel cut from dowel stock. Projects holding joints made the old way still open and still show their dowels, and the File menu offers to convert them.

- Legacy dowel joints no longer block a project or an assembly from being saved.

- Dowel joints made the old way can be converted into real dowels: the holes stay exactly where they were bored, the joint metadata goes, and a dowel cut from rod stock takes the place of the picture that used to stand in for it. It is offered rather than applied on open, and lands on the undo stack like any other edit.

- Added Transfer Holes to Mating Part, the software version of dowel centres. Bore the holes where you want them, put the parts together, and right-click the bored part to mark them across the joint line. Every hole of a repeat is marked, and any that land off the edge of the mating part are reported rather than silently drilled into thin air.

- Added biscuits, Dominoes and dowel pins as stock, with the sizes you actually buy: the complete biscuit range, the complete Domino line, and fluted pins in imperial and metric. Pick a size rather than typing one, because a #20 biscuit is a #20 biscuit. They are counted into whole boxes on the shopping list and never reach the cutting diagrams, since nobody cuts a biscuit to fit.

- The cut list and shopping list now talk about dowel the way you buy it: rods rather than boards, a diameter and a length rather than three dimensions, priced per rod, and measured in linear feet. Board feet are withheld for round stock, because run through a dowel they measure the box around it. Cutting diagrams skip dowel rather than drawing a sliver.

- Dowels now snap into bored holes through the same joinery engine that seats a tenon in a mortise. Hold a dowel near a hole and it is drawn in and bottomed out; a repeat of holes offers one seat per hole, and a board too flat to seat is refused.

- Added dowel stock. Choose Dowel as the stock type and give it a diameter and a length, and parts cut from it render as real cylinders. A dowel's diameter comes from its stock and only its length is yours to set, because ripping makes a board narrower but nothing makes a dowel thinner.

- Stock now records how it is bought and broken down, so the library can tell sheet goods from dimensional lumber instead of guessing from a name. Existing projects and libraries are classified on open exactly the way they were already being displayed, and a project only moves to the newer file version once it holds material an older build cannot model.

- Fixed the overlap-prevention preference not surviving a restart, because the main process stored only three of the four stock constraint settings.

- Fixed an assembled joint being discarded on release, dropping the parts back where the drag began, because the commit check did not recognise a seated joint the way the drag did.

- Joinery now captures from further out, so dragging a tenon near its mortise pulls the joint together instead of requiring it to be positioned by hand first.

- Group drags now honour Shift to constrain movement to the ground plane, and lock to the view axis in straight-on views, matching single-part drags.

- Fixed a grouped assembly refusing to close because its joinery mate was blended with other snaps into a position that seated nothing.

- Fixed a frame stopping a tenon's length short of its joints when closing on more than one joint at once.

- Joints that sit a thousandth out through ordinary rounding now assemble instead of being refused as overlapping, while joinery that is genuinely cut wrong is still rejected.

- Joinery now snaps from either side: dragging a mortised leg onto a rail that is already placed seats the joint, where previously only the tenoned part could be moved into position.

- Fixed joinery mating landing between two matching joints instead of seating on one of them, which left every joint fractionally proud and could refuse the assembly outright.

- Fixed a dragged part appearing to snap into place and then jumping back when overlap prevention limited the move; the preview now shows the position that will actually be kept.

- Fixed parts drifting a fraction of an inch along the view axis when dragged in a straight-on view; the drag plane now locks to that axis exactly.

- Hardened router-profile geometry and inert importers with aggregate evaluation/import caps, bounded canonical serialization, linear-time DXF contour joining, structured malformed-limit handling, and deterministic seeded adversarial coverage.
- Added bounded transactional undo/redo to the router-profile definition dialog and validated one-step batch smoothing with explicit eligible/skipped join review.

- Added router-profile continuity markers, neutral intentional-corner diagnostics, smooth-authoring guidance, and aligned/mirrored tangent locks backed by the shared analyzer and enforcer.

- Added scale-aware G0/G1/G2 continuity diagnostics for canonical router-profile joins and immutable tangent-alignment helpers for line/cubic editing, while keeping intentional sharp corners valid.
- Added interactive custom router-profile handles with precise SVG coordinate mapping, snapping, modifiers, keyboard nudging, drag measurements, and cubic control reset.

- Added signed router-catalog verification review with explicit unsigned/untrusted acknowledgement, trusted publisher key confirmation, and bounded signature details.

- Added optional offline Ed25519 integrity verification and a capped public-key-only trusted publisher library for router catalog bundles.
- Added deterministic router-catalog export and complete router-data backup with explicit selection, search/filtering, automatic immutable profile dependency closure, stale-review protection, and production-validated round trips.
- Added atomic, optimistic-concurrency-safe installation of router profile and tool catalog libraries through a narrow validated desktop bridge.
- Added accessible certified-profile linking and scaling bounds for physical router tools, compatibility-ranked tool choices, and conflict-reviewed atomic router-catalog installation with optimistic concurrency protection and rollback-safe failure handling.
- Added exact immutable tool-to-profile production links, graded geometry-aware compatibility, atomic versioned router catalog bundles, and deterministic non-mutating catalog import plans.
- Added in-app router interchange format guidance, production-serialized profile/tool examples, actionable categorized import diagnostics, and unobtrusive format-version and revision details in both router libraries.
- Published strict, versioned JSON interchange schemas, conformance fixtures, checksum vectors, and an integration guide for `.carvd-profile` and `.carvd-tool` files.
- Added an optional measured router-tool envelope editor with axial cutter, neck, shank, and stackable-bearing sections, an accessible bit silhouette, inferred starting sections for review, and clear detailed-versus-estimated feasibility status.
- Added versioned axial router-tool envelopes with explicit cutter, neck, shank, and bearing spans, deterministic radial-envelope queries, lossless project/tool-file persistence, and stronger proven tool-clearance and reach checks while retaining conservative legacy-tool guidance.
- Added live physical-router-tool feasibility summaries to edge-profile properties and the cross-section inspector, with grouped remedies and analysis assumptions.
- Added deterministic physical router-tool feasibility checks for edge profiles, including cutting engagement, declared cutter reach, stock-face limits, shank/neck and bearing cautions, compatibility, project issues, and fabrication remedies without changing modeled geometry.
- Added an enlarged, evaluator-accurate cross-section inspector for selected edge-profile cuts, including orientation, dimensions, tool, provenance, and material-removal context.
- Added safe SVG router-profile import with explicit contour choice, unit review, transforms, fidelity provenance, shared topology preview, and library/apply workflows.
- Added a resource-bounded, inert SVG router-profile importer with exact line, cubic, quadratic, and axis-aligned arc conversion; common transforms and physical units; explicit curved-arc approximation fidelity; and rejection of active or external content.
- Added numeric cubic Bézier editing for custom router profiles and clear DXF fidelity reporting for exact versus approximated spline imports.
- Added canonical cubic Bezier router-profile curves with bounded adaptive evaluation shared by previews and modeled cuts, plus exact clamped-cubic and explicit bounded-approximation support for planar ASCII DXF SPLINE entities.
- Added an atomic “Update All Matching Cuts” profile-revision workflow scoped to the current part, with an affected-cut review, stale-target reporting, and one-step undo/redo.
- Added explicit custom router-profile revision status and side-by-side comparison so projects keep immutable snapshots until a user chooses to update a cut.
- Added a physical Router Tools library with validated create, edit, duplicate, import, export, and delete workflows, plus per-edge-profile tool assignment and advisory compatibility warnings.

- Added revisioned router-profile snapshots and a separate physical router-tool library, preserving project geometry while detecting changed or deleted library entries and reporting assigned catalog tooling in fabrication output.
- Added a numeric custom router-profile editor for semantic lines, circular arcs, and elliptical arcs, plus strict lossless `.carvd-profile` import/export and editable copies of built-in profiles.
- Replaced hard-coded edge-profile shape branches with a typed, data-driven registry whose semantic line and arc definitions share one evaluator with custom router profiles, while preserving exact circular roundovers and coves for unequal dimensions.
- Added a DXF router-profile import wizard with contour selection, scale and orientation controls, shared material-removal previews, reusable App Library profiles, and durable custom edge-profile snapshots.
- Wired embedded custom router-profile snapshots into edge-profile CSG through a shared chord-error evaluator for semantic lines, circular arcs, and elliptical arcs, with bounded tessellation, winding normalization, snapshot-aware caching, and consistent orientation on every stock edge.
- Added a dependency-free, resource-bounded ASCII DXF importer for custom router profiles, including line, arc, circle, lightweight/classic polyline and bulge geometry, unit normalization, contour repair, transforms, and basic geometry validation without loading blocks or external references.
- Added a versioned custom router-profile model with semantic line and arc boundaries, embedded edge-profile snapshots for durable project geometry, and a synchronized app-level profile library foundation.
- Unified every edge-profile selector diagram and modeled cut around the same sampled cross-section, with distinct Bead and Ogee geometry instead of approximate look-alikes.
- Fixed Edge Profile front/back geometry and selection highlights using opposite conventions, and replaced its remaining face-sized pick slabs with narrow edge targets. Routed Path remains face-targeted.
- Added a persistent high-contrast selected-edge indicator for edge profiles and reduced routed-segment label collisions on compact paths.
- Added actionable routed-path validation for impossible bit depths, oversized undercut shanks, shallow undercut cavities, off-face points, and blind cuts deeper than the material; profile switches now choose physically valid default depths.
- Fixed deleting a point from a minimal closed route so it reopens cleanly instead of leaving an invalid two-point loop.
- Fixed asymmetric edge-profile dimensions being silently collapsed to the smaller value, and increased router-bit diagram contrast.
- Fixed mirrored edge-profile cutter geometry that could leave roundovers and other profiles visibly uncut on selected edges.
- Added a distinct Edge Profile routing operation with its own visual selector for roundover, cove, chamfer, rabbet, bead, ogee, and thumbnail profiles.
- Added live routed-path point-to-edge dimensions, segment lengths and angles, 45-degree direction snapping, center/edge snapping, point-to-point alignment, and visible alignment guides.
- Consolidated routed-path bit choices by modeled cut geometry, replacing duplicate flat-bottom, round-bottom, and V-shaped bit cards with one clear profile choice each while retaining older project compatibility.
- Added a visual router-bit selector with cross-section previews for every routed-path profile.
- Added draggable routed-path points directly on the part preview, with clear start and route-point guidance.
- Added Ball Nose and Engraving routed-path profiles with real swept geometry and visual selector previews.
- Added Mortising, Spiral Upcut, Spiral Downcut, Compression, and Surfacing routed-path bit choices while preserving each bit's identity in saved projects and fabrication summaries.

- Added face-based routed paths to Custom Cuts: author open or closed polylines, choose straight, core-box, or V bits, and set blind or through depth. Routed paths render as true swept subtractive geometry on every face, persist safely in project files, and appear in cut summaries and fabrication instructions.
- Added per-point routed-path corner radii with tangent fillets, automatic radius clamping on short neighboring spans, open/closed-path support, and optimized interactive geometry generation.
- Added routed dovetail, T-slot, and keyhole bits with narrow shank openings, wider subsurface cavities, keyhole starting plunge pockets, profile-specific validation, editor controls, and fabrication dimensions.
- Added joinery-aware rigid-group and keyboard-nudge snapping: grouped tenons, housed joints, and complementary half-laps now retain their authored mate features, multiple joints must agree on one transform, and paired dowel holes snap back to exact coaxial seated alignment.
- Rigid joinery snapping now evaluates every eligible joint on each member, allowing both ends of an apron to select one shared assembly transform even when a closer unrelated socket competes for either tenon.
- Direct single-part drags now apply the same multi-joint consensus as rigid groups, preventing an apron or dowelled member from snapping one connector while another in-range connector demands a different position.
- Releasing a direct drag with conflicting in-range joinery now explains that snapping was refused, including the connector count and measured positional disagreement.
- Multi-dowel joints now require every paired hole on the moving member to agree on one coaxial seating transform; a misaligned secondary dowel blocks the mate instead of being silently ignored.
- Explicit dowel relationships now find their named mate even in crowded assemblies where the host falls outside the generic nearest-parts candidate cap.
- Complementary mitre, bevel, and compound-cut faces now produce holistic joinery mates that align the full cut-face center on all three axes, while incompatible cut profiles are ignored.

- Added an actionable joinery warning when matching joints in a rigid group demand conflicting transforms, including the measured alignment disagreement.

- Added distinct purple joinery snap guides and labels for mortise-and-tenon, dowel, half-lap, dado, groove, and rabbet mates.

- Tightened joinery compatibility so tenons only enter mortises from the physically valid direction, complementary half-laps require matching remaining-stock and pocket depths, and unrelated cut families cannot attract each other merely because their dimensions are similar.

- Fixed blocked part and group drags being committed in overlapping positions when overlap prevention is enabled.

- Added shoulder-flush feature snapping for tenons entering front- and back-face mortises, including deeper mortises with bottom clearance.

- Fixed single-part dragging in straight-on views so screen-vertical movement follows world Y; hold Shift to constrain movement to the ground plane.

- Added stable accessible names to every custom shopping-item field.

- Added descriptive accessible names to stock and custom-item shopping-list checkboxes.

- Made cutting-diagram boards and parts keyboard accessible, added descriptive part tooltips, named the zoom controls, and clarified how to open diagram details.

- Fixed dimension and rotation edits being silently discarded when overlap prevention blocks the change; the editor now explains why the update was rejected.

- Clarify that cut-list board counts describe optimized boards used while board-foot totals include purchasing overage.

- Fixed a macOS first-save failure where an unowned native file dialog and a renderer exit could leave Electron consuming excessive CPU and swap; save dialogs are now window-owned and single-flight, with renderer recovery logging and reload behavior.

### Added

- **Round cuts and editable hole patterns** — Custom Cuts now supports through and blind round holes, angled bores, countersinks, counterbores, rounded openings, and linear, grid, or circular hole patterns with validated 3D geometry and unit-aware fabrication instructions.
- **Paired dowel joints** — Choose two parts and opposing faces to create matching dowel holes atomically, visualize the physical dowels in the workspace, detect misalignment after parts move, undo the whole joint in one step, and report consolidated dowel drilling instructions in cut-list output.
- **Flush-alignment regression coverage** — An anonymized fixture derived from a real deck project now protects joist-corner and deck-board end-flush snapping without committing customer project data.
- **Privacy-safe Custom Cuts analytics** — Consent-gated analytics can report whether the cuts workspace was opened from Properties or the context menu and a coarse operation-count bucket; part names, dimensions, cut parameters, project identifiers, and file paths are never included.

- **Tenons** — A `Tenon` cut leaves a tongue on a board's end, sized by length, width, and thickness and centred in the blank's thickness, with shoulders cut back on all four sides (or a bare-faced full-width variant). Tenons can be cut on both ends of a rail, pair with the new side-face mortises to complete mortise-and-tenon joinery, and need no separate cut-list allowance because the board length already includes the tongue.
- **Side-face mortises and pockets** — Mortises and cutouts can now target the front or back face of a board, recessing into its width — the layout needed for leg-and-apron mortise-and-tenon joinery. Side-face pockets are always blind, render as true recesses within their height band, respect opposing-pocket depth conflicts, and are edited through the inspector with thickness-aware field labels.
- **Long-edge bevels (Edge Bevel)** — Rip bevels along a board's front or back edge, unlocking mitred boxes and waterfall edges. Edge bevels render as true tilted faces, snap and overlap by their real shape, keep the board width locked to the long point with derived long/short-point width readouts, and appear in summaries and fabrication instructions.
- **Half Lap preset** — The cut picker now includes a Half Lap starter that seeds a blind channel at half the board thickness positioned as an end lap, ready to adjust for cross laps.
- **Copy and paste cuts between parts** — Right-click a part with cuts to `Copy Cuts`, then select any number of parts and `Paste Cuts` to apply the same joinery to all of them in one undo step, each part receiving independent cut instances.
- **Undo/redo inside the cuts workspace** — Cut draft changes now step backward and forward with Cmd+Z / Cmd+Shift+Z (and header buttons) without touching project history.
- **Grouped cut picker** — The "What kind of cut?" step now organizes operations into Ends & Edges, Channels & Laps, Edges & Corners, and Pockets & Openings.
- **Part Cuts workspace** — A dedicated editing mode for shaping individual boards, opened from the part's Properties panel (`Edit Part Cuts`) or right-click menu (`Edit Cuts`). A guided `What kind of cut?` flow adds cuts, a focused single-cut editor handles changes, and exiting prompts to save or discard unsaved cut changes.
- **Ten woodworking cut operations** — End cuts (mitres, bevels, and compound cuts on either end), dados, stopped dados, grooves, stopped grooves, rabbets, mortises, face cutouts, edge notches, and corner notches — each with constrained, validated parameters and true 3D preview geometry. Ordinary rectangular parts stay on the high-performance instanced render path.
- **Direct manipulation in the cuts preview** — Face pockets and stopped channels can be moved and resized with drag handles directly in the 3D preview, and cut targets can be retargeted by hovering and clicking faces, edges, and corners on the part itself, with the editor panel as the exact-entry fallback.
- **Cut mirroring** — Supported cuts can be mirrored to the opposite end or across the board's length/width axes without leaving the cuts workspace.
- **Socket mating snaps** — Dragging a board whose cross-section matches a dado, groove, or mortise pocket now snaps it into the socket, taking priority over plain face alignment.
- **Cut-aware snapping and interaction** — Snapping, selection, hit-testing, camera centering, ground contact, and overlap prevention all follow the true cut geometry: mitred and notched parts no longer offer snap targets or block movement at corners that were cut away.
- **Cut-aware fabrication output** — Cut lists, CSV, and PDF reports show blank-first dimensions plus numbered per-cut fabrication instructions in authored order, `Ops` badges surface cut counts across parts lists and assembly previews, and cutting diagrams state explicitly that cut operations happen after blank breakdown.

### Changed

- **Woodworker-oriented dowel setup** — The paired-dowel wizard now validates mating faces before measurement entry, offers a direct return to part alignment, measures hole centers from visible board edges, previews the drilling layout, blocks out-of-bounds holes immediately, and reviews both boards' drilling setups before creation.
- **End-cut measurement semantics** — The part length stays authoritative for cut-list sizing, mitres use an explicit `High Point On` direction control instead of long/short/centerline reference math, saved cuts keep their stored measurement reference across edits, and the editor shows derived long-point, short-point, and centerline measurements as shop-facing data.
- **Ordered multi-cut validation** — Cuts on a board evaluate in list order; duplicate enabled end cuts on the same end, cuts starting inside removed material, and opposing-face blind intersections are blocking conflicts, with the same rules enforced in the cuts workspace, part summaries, and cut-list validation.
- **Project file format version 2** — Projects that use part cuts now save as file format version 2, so older app versions show a clear "please update" message instead of silently opening them with the cuts missing. Projects without cuts keep the older format for maximum compatibility.

### Fixed

- **Deleting a group no longer fails silently** — Confirming a group deletion, or deleting one with "confirm before delete" turned off, called a store action that did not exist and threw. Groups now delete with their contents in one undoable step.
- **Project notes reach the project report** — The PDF report read the wrong store field, so the Notes section was always empty.
- **Toast notifications follow the app theme** — The toast container read a theme value that never existed and always fell back to its own default.
- **Saving a template records the project name** — Template saves read the wrong store field and stored an empty name.
- **Reaching the free stock limit no longer clears part stock** — Creating a stock from the properties panel when the licence limit blocked it assigned the failed result to every selected part, clearing their stock instead of doing nothing.
- **Disabled cut fields are actually disabled** — Several Custom Cuts measurement inputs passed a `disabled` flag the input component ignored, leaving them editable when they should not have been.

- **Assembly and recovery integrity** — Invalid or misaligned paired dowels can no longer be saved inside reusable assemblies or project files. File recovery now applies the same Custom Cuts schema and joinery validation as a normal load and reports malformed data safely instead of accepting an unusable repair.
- **Round-opening joinery collision** — Timber can pass through circular and rounded openings on rotated parts. Collision checks use the remaining wood, distinguish wall contact from intrusion, and avoid solid-boolean stalls when overlapping copied multi-cut parts.
- **Composed tenon shoulders** — Every accepted tenon removes its own shoulders, including multiple cuts on one end and opposing cuts whose lengths meet or overlap. A later cut never restores material removed earlier.
- **Safe cut-editor saves** — Header Save, Cmd+S, Save As (keyboard and native menu), and native Save commit a valid active cut before writing the project, including a still-focused measurement field. Invalid edits stay open with their exact correction; Exit, Home, Close Project, and closing the application window prompt for uncommitted editor or session changes. The window-close dialog validates before saving and shows any exact correction inside the dialog.
- **Protected project navigation and reload** — New/Open shortcuts, recent projects, and file associations cannot replace an active cut session. Reload and Force Reload now offer Save, Don't Save, and Cancel for unsaved project or cut edits, with exact validation errors before any reload.
- **Safe slow saves** — Close/reload save dialogs stay locked while writing, prevent duplicate file commands, and retain failed saves for retry. A completed save cannot mark newer edits clean or close over changes made during the write; those changes stay available to save again.
- **Ordered, document-owned file operations** — Manual, automatic, Save As, and close saves keep their requested order, and close/reload drains pending writes. Finishing an old save cannot retarget a newly opened project or overwrite its file. Delayed Open, Recent, and relocation requests preserve newer project edits and cut sessions instead of replacing them.
- **Queued Save As destination** — Saves requested while Save As is still choosing or writing a file now follow its successful destination, including autosave and Save on close or Quit. Canceling or failing Save As keeps the previous destination. Queued saves preserve their requested edits and explicit project names, and do not switch a newly opened document back to an older file.
- **macOS Quit completion** — Choosing Save or Don't Save after Quit now terminates the application once its windows approve closing. Cancel or a failed validation/save clears the quit request, preserving ordinary macOS window-close behavior.
- **Isolated desktop testing** — macOS qualification runs use disposable, uniquely identified Electron runtimes and graceful shutdown, so abnormal test exits cannot reuse the normal Electron application's restoration identity. The harness no longer destroys test windows or force-kills them after a five-second timeout.
- **Preserved measurement references** — Editing or renaming circular and rounded cuts retains saved minimum, center, and maximum references, including patterns and legacy files.
- **Panel-level glue-up machining** — Cut lists, CSV, and both PDF reports separate strip blanks from machining performed once on the assembled panel, with finished-panel dimensions and an explicit after-glue-up sequence.
- **Fabrication integrity** — Cut List validation blocks inconsistent paired dowel dimensions, depths, alignment, missing mates, and hardware interference. Blank dimensions retain authored precision in PDF/CSV and the parts table. Both PDF reports reserve readable space for part identities; exceptionally long imperial or metric dimensions move to a labeled line below each part instead of overlapping names or rounding measurements.

- **Rotated joinery contact** — Featured boards can touch at arbitrary decimal angles without a collision-check crash. Composed X/Y/Z rotations now keep collision cells and snap targets aligned with the rendered wood, including disconnected pieces and openings.
- **Explicit correction of hidden offsets** — Invalid offsets remain invalid through unrelated edits, even when a cut hides that coordinate. Save Cut stays blocked until the value is corrected; an accessible reset action fixes only invalid offsets and preserves other authored values.

- **Disconnected stock collision** — Through cutouts can leave multiple pieces of stock without restoring collision in earlier openings. Flat collision checks retain every outline and interior opening, and tilted rectangular-cut parts retain all remaining material cells.
- **Responsive patterned cuts** — Compound-cut boards with large hole and counterbore patterns no longer stall on coplanar solid clipping. The clipping envelope preserves authored cutting planes, including nearly meeting end cuts, while geometry and collision caches remain reusable.
- **Invalid cut offsets** — Non-finite rectangular offsets are rejected before normalization, saving, and fabrication validation. Malformed operations remain editable without crashing the preview or silently moving to zero when opened.

- **Cut-aware collision and pocket support** — Adding an opening to a bevelled or mitred part no longer creates invisible collision corners beyond the cut plane. Blind rectangular and rounded pockets validate their complete removal against remaining end-cut, bevel, and tenon stock; intentional open channels and through-boundary cuts remain supported. Entire-blank removal is blocked for every operation family, including rounded-only stacks.
- **Shared geometry for renamed and copied cuts** — Changing a label or copying an otherwise identical feature reuses its geometry instead of rebuilding it; authored dimensions, placement, pattern, and shape changes still invalidate the cache.

- **Combined joinery stays physically correct** — Tenons preserve opposite mitres, bevels, and compound cuts; end cuts and edge bevels now meet at their true intersecting planes. Countersinks have continuous conical walls, and very shallow remaining blind floors are no longer silently cut through.
- **Lossless woodworking dimensions** — Focusing and leaving a measurement field preserves exact authored values such as .755 inches in either unit system. Resizing stock reports an oversized tenon instead of changing its dimensions, and rotated rounded openings use their real curved outline for fit checks.
- **Safer cut and dowel validation** — Cuts cannot remove the entire blank or place holes outside material left by end cuts, bevels, and tenons. Dowel setup rejects overlapping hardware, including existing joints, and diagnoses interference after edits. Distinct overlapping hole patterns and stepped counterbores are no longer mistaken for duplicates.
- **Clearer Custom Cuts feedback** — Invalid operations show a specific explanation and a direct edit action. Measurement inputs announce their units, dowel review respects exact metric dimensions, target buttons expose both selection states, and stopped-dado help clarifies its full-width behavior.

- **Mirrored pocket and bevel orientation** — Mirroring a Front/Back pocket across width now changes its entry face while preserving its height. Opposite-end bevels and compound cuts retain their physical high-point orientation.
- **Angled recess depth** — Angled counterbores and countersinks use depth along the drilling axis for validation and rendered geometry, allowing deep angled recesses that fit while still blocking cutter-edge breakout.
- **Dowel and notch fabrication identity** — Cut List grouping and both PDF exports preserve distinct dowel lengths and joint groupings without depending on copied UUIDs. Blind edge-notch instructions identify Top or Bottom entry; through-notch side labels stay simple.

- **Combined custom-cut geometry** — Multiple edge/corner notches, flush cutouts, and overlapping rectangular removals now preserve the stock contour and remove shared regions only once. Imported blind corner notches consistently enter from the top face.
- **Exact cut faces and physical fit** — Front/Back round holes and Bottom rounded openings now match their handles and named faces; rabbet snapping uses the same edge bounds as the rendered recess. Oversized mitres/bevels and tilted cutters that break out of the blank are rejected without silently changing the requested angle.
- **Independent joinery copies and mirrors** — Dowel joints now require enough combined drilling depth for the dowel, survive assembly capture/edit/repeated placement with fresh identities, and detach excluded mates. Mirroring preserves operation targets, hole-pattern coordinates, and drilling angles without creating hidden dowel links.
- **Shop-ready fabrication detail** — Fabrication instructions retain exact authored dimensions, placement references, rounded rotation, grid dimensions, and every dowel-hole coordinate. Both PDF exports include full, identified, paginated operation blocks for each part.

- **Round and rounded cut final validation** — Saving Part Cuts and generating a Cut List now revalidate round holes, countersinks, counterbores, and rounded openings after a part resize, preventing out-of-bounds operations from reaching fabrication output.
- **Layered compound end geometry** — Compound end cuts now retain both their horizontal mitre and vertical bevel in rendered geometry when the same board also has dados, holes, rounded openings, or other cuts, keeping the visible part aligned with snapping and collision contours.
- **Right-end mitre long-point direction** — Right-end mitre and compound-cut rendered geometry, snapping and collision contours, summaries, Cut Lists, CSV files, and PDF reports now all follow the front or back long point selected in Part Cuts.
- **Patterned recess fabrication details** — Patterned countersink and counterbore instructions now retain the major diameter and included angle or bore diameter and recess depth instead of reporting only the pilot-hole pattern.
- **Cutout and notch fabrication depth** — Cutout, edge-notch, and corner-notch instructions now state whether the removal is through or give its blind depth, preventing dimensionally identical pockets and openings from sharing an ambiguous shop instruction.
- **Mitre and paired-dowel assemblies** — Complementary mitres now snap at their actual cut faces without ghost overlap, including flipped, shallow-angle, bevel, and compound ends. Paired dowels now validate enabled holes against their current host parts, retain their relationship through edits, copy or duplicate with fresh relationship identities, become ordinary holes when a mate or host is removed, and reconcile bulk cut replacement atomically with undo. Creating a joint now requires any pending Part Cuts draft to be saved or discarded first.
- **Custom Cut joinery seating** — Compatible dados, grooves, stopped grooves, rabbets, half laps, mortises, and tenons now seat in their visibly rendered sockets through Prevent Overlap while oversized, depth-mismatched, past-termination, mirrored, partial/noncomplementary, and unrelated overlaps remain blocked. Selected groups, including their first drag from an unselected state and fallback takeover of a direct-part gesture, keep a continuous ordinary snapping/collision preview instead of receiving or retaining a single-part socket mate.
- **Pattern orientation in fabrication output** — Cut List, CSV, and PDF fabrication instructions now retain the authored direction, grid rotation, or circular start angle for patterned holes.
- **Featured-part fabrication validation** — Cut List generation now reports invalid authored operations even when the part also needs a stock assignment, so a resized copy cannot hide an out-of-bounds cut behind a generic stock error.
- **Featured-part rotation history** — X/Y/Z shortcut rotations now commit their ground adjustment with the rotation, keeping real undo/redo steps stable for cut-bearing parts.
- **Complete PDF fabrication operations** — Cut List PDFs now include an untruncated, searchable fabrication-operations section with the full ordered instructions for every enabled cut.
- **Featured-part duplication identities** — Duplicated parts now receive fresh IDs for every Custom Cut while preserving independent operation parameters, preventing copied boards from sharing feature identities with their source.
- **Round-cut validation and preview editing** — Round holes and rounded openings now have accessible move/resize controls in the cuts preview. Invalid patterns, near-vertical bores, incomplete blind/recess settings, and oversized countersink or counterbore profiles are blocked with visible, actionable feedback before they can be saved.
- **Bounded cut geometry cache** — Live cut editing now evicts old generated geometry instead of allowing preview memory use to grow without limit during long editing sessions.
- **Defensive Custom Cuts file loading** — Version 2 project files now validate all saved cut payloads before migration, reporting malformed or unsupported operations instead of crashing while opening a project.

- **Prevent Overlap during resize** — Prevent Overlap now blocks dimension-only edits (including resize commits) that would make a part overlap another part.
- **Part context menu right-click** — Restored right-click-on-part context menu behavior on macOS trackpads (`ctrl`+click).
- **Background clicks selecting parts** — Fixed background clicks sometimes selecting a part due to an over-eager screen-space hit-test fallback.
- **Drag plane Y drift** — Dragging parts now defaults to the ground plane (XZ) to avoid unintended vertical drift; hold `Shift` while dragging to enable face-plane dragging.
- **Drag/drop jumpiness with Prevent Overlap** — Drag commits now respect the grid snap setting and immediately revert the live preview if a drop is rejected, preventing “sticks until deselect then snaps back”.
- **Compound end-cut bevel direction** — End-cut editors expose an explicit `High Point On` control for bevel and compound cuts, and the renderer applies that vertical direction so compound cuts no longer appear to ignore their bevel component.
- **Project shortcuts no longer reach the part being edited in Part Cuts** — While the cuts workspace is open, project-level shortcuts (undo/redo, rotate, duplicate, delete, copy/paste) and the header undo buttons are disabled so they can't silently change the part behind the editor.
- **Saving cuts reports rejection honestly** — If overlap prevention rejects the updated part shape, saving cuts now shows an error and stays in the editor instead of falsely reporting success.

## [1.2.0] - 2026-09-03

### Added

- **Linux desktop release** — Added an x64 Linux build published as both a portable AppImage and a Debian package, with Linux update metadata included in GitHub releases.
- **Linux downloads and installation guidance** — Added separately tracked Linux download links, AppImage and Debian installation instructions, and Linux system requirements throughout the website and documentation.

### Changed

- **Cross-platform product messaging** — Updated checkout context, pricing, support, SEO metadata, and analytics documentation to recognize macOS, Windows, and Linux.

## [1.1.0] - 2026-09-03

### Added

- **Intel Mac downloads** — Release builds now publish separate signed macOS installers for Apple Silicon and Intel processors, and the website offers an explicit architecture choice with separately tracked download links.

### Changed

- **Mac installation guidance** — The download page now explains how to identify a Mac's processor and select the matching Apple Silicon or Intel installer without duplicating the shared installation steps.
- **macOS requirements** — Updated the documented minimum to macOS 12 Monterey to match the Electron 41 runtime shipped by Carvd Studio 1.1.0.

## [1.0.6] - 2026-09-03

### Added

- **Consent-gated desktop analytics delivery** — Added durable local consent preferences, anonymous installation identifiers, bounded offline delivery with retry backoff, and optional PostHog transport configuration. Analytics stays disabled until explicitly granted and clears local analytics data immediately on revocation.
- **Analytics privacy controls** — Added a first-run optional analytics choice after onboarding and a permanent App Settings → Data & License control with a clear disclosure of anonymous usage data and prohibited project data.
- **Privacy disclosure** — Clarified that analytics remains optional, anonymous, and disabled until configured/consented; project design content remains local and revocation deletes queued analytics and the anonymous identifier.

### Fixed

- **Purchase webhook runtime compatibility** — Accept Lemon Squeezy's signed raw request body from Vercel's Node function runtime while retaining exact HMAC verification and retry behavior.
- **Cross-platform release verification** — Made analytics-enabled Electron E2E commands portable to Windows and added a single CI-only retry for transient desktop UI runner failures while keeping local test runs strict.

## [1.0.5] - 2026-08-13

### Added

- **Comprehensive desktop E2E coverage** — Expanded Electron click-through testing across project file lifecycle, recovery/autosave, native menus/import/export, context menus, keyboard shortcuts, canvas drag/resize/rotate handles, toolbar controls, properties editing, cut-list exports/validation, free-mode gates, license/trial lifecycle, assembly/template lifecycle, library import prompts, responsive windows, reload persistence, and OS-style open-file handoff.

### Changed

- **Live move-reference rulers now follow the active transform session** — Moving a part or group relative to reference parts/groups now publishes session-aware reference relations during drag, highlights the strongest active ruler in-canvas, and keeps typed ruler edits aligned to the relation axis instead of relying only on passive overlay geometry.
- **Resize rulers now support direct size and gap editing** — Active resize sessions now publish editable size rulers and reference-gap rulers from the shared preview solver, so resizing against a reference can be driven by typed values in-canvas instead of only by handle dragging and dimension-match snaps.
- **Reference target selection is now more stable during transforms** — Move and resize relation solving now latches near-equal active rulers instead of bouncing between candidates frame-to-frame, grouped references get a stronger preference when they compete with otherwise similar loose-part targets, and active ruler sessions now show a lightweight in-canvas hint so typed distance/size/gap editing is easier to discover.
- **Measurement overlay placement hardening** — Part dimensions, multi-selection bounds, and editable reference-distance labels now choose camera-visible outer edges more intelligently and billboard their text toward the viewer, reducing odd label placement in dense cabinet/furniture assemblies.
- **Measurement overlay decluttering** — Dimension and reference labels now suppress tiny-on-screen spans and low-priority overlapping labels in dense scenes, reducing visual pileups around tight assemblies and small gaps.
- **Measurement label readability** — Measurement labels now use larger text, wider line breaks around the label text, and multi-lane outward stacking before suppression, making dimensions and editable position markers easier to read in crowded views.
- **Selection-relative spacing semantics** — Multi-selection spacing markers now measure between the actual selected entities (selected groups as units plus standalone selected parts) instead of between every descendant part, so relative distances are more meaningful when multiple parts or groups are selected together.

### Fixed

- **OS-style project file handoff reliability** — Initial `.carvd` files opened by the operating system are now dispatched to the renderer after either window readiness or load completion, preventing missed open-file handoffs in visible/test-mode windows.
- **Multi-part drag preview now follows the cursor in real time** — When dragging a multi-selection, every selected part now translates with the cursor during the drag instead of only the clicked part moving while the rest jumped on release. The window-listener `useEffect` in `usePartDrag` was depending on the entire `liveDims` object, so every drag frame's `setLiveDims` invalidated the effect, ran cleanup (which calls `clearMoveInteractionPreview`), and tore down the move session — leaving `activeSession.delta` stuck at zero for non-primary parts.
- **InstancedMesh raycast now reliably hits non-selected parts** — Clicks on parts rendered via the bulk `InstancedMesh` (i.e. anything not currently selected/hovered/referenced) were silently passing through to the ground because the bounding sphere was being assigned to `geometry.boundingSphere` (a local-space slot) populated with a world-space union, which corrupted three.js's per-instance `Mesh.raycast` depth-rejection. Switched to writing the InstancedMesh's own `boundingSphere` via `mesh.computeBoundingSphere()` and consolidated matrix + bounding-sphere updates into a single effect so they can never drift.
- **Right-click context menu now opens reliably on canvas overlays** — The `contextmenu` listener was attached to the canvas DOM element, but drei `<Html>` overlay labels (snap tokens, distance labels, reference rulers) render via portal in `document.body` outside the canvas's bubble path; right-clicks landing on those labels never reached the workspace handler. Listener moved to `window` and gated by canvas bounding rect so non-workspace UI keeps its own right-click behavior.
- **Black rectangle artifacts during drag eliminated on macOS Metal/ANGLE** — Workspace `<Html>` overlays were using `occlude='blending'`, which renders an invisible shader plane for depth-based occlusion. The shader leaks black fragments visibly on Apple Metal/ANGLE drivers (Electron 41+ on M-series macOS). Switched to raycast-based `occlude={true}`, which hides occluded labels via CSS visibility instead of the shader plane.
- **Right-click target no longer leaks across gestures** — `globalRightClickTarget` is now reset on every `pointerdown` (capture phase) and consumed eagerly inside the contextmenu handler, so a stale target from a previous gesture can't open the wrong menu (e.g. opening a part menu after clicking on background).
- **Rotation handles + 90° rotate icons stay visible while a single part is selected** — Previously gated on `isHovered` so they vanished the instant the cursor moved off the part body — including onto the handle itself, since R3F dispatches `pointerout` on the part when entering a handle mesh. Resize handles still appear on hover only (so they don't clutter the part during drag).
- **Shift / Cmd+click multi-select no longer double-toggles** — The R3F per-mesh `pointerdown` handler toggles selection, and the native canvas `mouseup` fallback was calling `selectFromPartHit(..., additive=true)` which toggled it back. The native fallback now skips additive selections; R3F's handler is authoritative for shift/cmd toggle.
- **Shift / Cmd+click on empty workspace area preserves the existing selection** — Previously cleared the multi-selection when a click missed a part, so a single mis-aimed shift+click while building up a multi-selection wiped the work.
- **Snap and distance labels less visually intrusive** — Snap-token, distance, and "SNAP LOCK" labels in `SnapAlignmentLines` had `rgba(0,0,0,0.78–0.85)` backgrounds that read as opaque black rectangles wherever the alignment-line midpoint landed. Reduced background opacity to ~0.4 and added `backdrop-filter: blur(4px)` plus a text shadow to keep readability without blocking the workspace.

## [1.0.4] - 2026-04-06

### Changed

- **Transitive dependency security refresh** — Refreshed the npm lockfile and applied targeted override resolutions for vulnerable transitive chains (`dompurify`, `lodash`, `lodash-es`, `undici`, `tar`, `@xmldom/xmldom`, and `minimatch`) so the current Dependabot alert set is cleared on `develop`.

## [1.0.3] - 2026-04-06

### Fixed

- **Unrelated project overlaps no longer freeze valid rotations** — Overlap-prevention checks for store-driven transforms now only evaluate collision pairs involving the part(s) being changed, so pre-existing overlaps elsewhere in a project no longer block rotation handles, 90° face rotates, or rotation input edits on unrelated parts.
- **Rotation handles no longer steal nearby part clicks** — Rotation rings, connector stems, and drag knobs now block the workspace’s native part-selection fallback so clicking near or on those controls no longer re-selects the underlying part by accident.
- **Part selection no longer uses loose screen boxes** — The workspace’s native click fallback now uses a precise ray-vs-rotated-box test instead of projected screen-space bounding boxes, so clicks near a part no longer count as selecting it.

## [1.0.2] - 2026-04-02

### Added

- **Advanced surface snapping framework (POC)** — Added surface-anchor snaps (center-1D, center-2D, edge-to-midline, edge-to-quarterline), fractional face anchors (0/25/50/75/100), and extended per-axis snap arbitration stages (`surface`, `fraction`) for more predictable placement on face-latched drags.
- **Snap indicator language + perf telemetry (POC)** — Added semantic snap line metadata (`family`, `subtype`, `state`) with enhanced workspace indicator tokens/colors, plus dev-time snap-loop performance sampling (`avg/max/over-budget`) to catch drag-time regressions early.
- **Precise part rotation controls (POC)** — Added single-part `Rotation (X, Y, Z)` controls in the Properties panel with direct degree entry, angle snap toggle, adjustable snap step, one-click reset, and drag-to-rotate ring handles with live angle feedback.
- **Feature-level part snapping for angled assemblies (POC)** — Added true feature snap candidates during drag: edge-to-edge (parallel edge alignment) and vertex-to-face projection, layered on top of oriented face snapping for non-axis-aligned parts.
- **Group-wide rotation drag handles (POC)** — Added shared rotation handles for multi-part/group selections so selected sets can be rotated together around a common pivot using the same drag interaction as single-part rotation.

### Changed

- **Snapping settings expanded with presets and anchor toggles** — App Settings now expose advanced snap controls (`Simple`/`Precision`/`Layout` preset, surface-anchor toggle, fractional-anchor toggle, candidate-indicator toggle), and drag pipelines respect those preferences in both single-part and group drag flows.
- **Ghost display mode readability** — Increased Ghost/translucent part opacity and added outline rendering so part silhouettes are easier to read while staying semi-transparent.
- **Rotation model generalized beyond 90° increments** — Internal rotation typing and transformation utilities now support arbitrary angles while preserving fast `X/Y/Z` keyboard rotations for intuitive quick-turn workflows.
- **Rotated-part snapping and overlap hardening** — Face-to-face snapping now validates oriented face compatibility (opposing normals plus in-plane overlap) and solves oriented snap deltas, overlap prevention during drag/properties edits now uses OBB-vs-OBB tests instead of broad AABB-only checks, and drag overlap resolution now applies swept/binary-search fallback so parts can approach contact smoothly without hard blocking.
- **Unified overlap policy enforcement** — Centralized overlap checks now apply symmetric `ignoreOverlap` behavior (if either part opts out, overlap is allowed) and consistent OBB-based prevention across drag, group drag, keyboard/reference moves, store-driven transforms, and properties overlap warnings.
- **Canvas interaction hardening for angled parts** — Drag/resize interaction planes are now chosen from camera-facing local part planes for more intuitive movement on arbitrarily rotated parts, group drag overlap checks now use OBB tests with swept fallback (matching single-part behavior), and legacy axis-only snap candidates are automatically disabled for non-axis-aligned contexts to avoid conflicting snap pulls.

### Fixed

- **Angled movement + rotation axis UX hardening** — Non-90° part drag now uses orthonormalized virtual axes, group drag now mirrors angled virtual-axis behavior from the grabbed part context, and rotation-handle axis locking now uses pointer-down world-point projection for more reliable camera-angle axis selection.
- **Angled group drag snap/movement regressions** — Group dragging now uses the same camera-projected drag plane model as single-part drag (removing camera-axis lock jumps), axis-legacy group snaps are automatically skipped in non-axis-aligned contexts, and final placement now preserves snapped axes instead of always re-quantizing to grid on drop.
- **Layout snap commit flags for axis snaps** — `detectSnaps` now marks distribution/pattern layout snaps as snapped axes, so those snaps are consistently applied by drag handlers and no longer show visual snap lines without committing the matching axis move.
- **Overlap-prevention blocking during movement** — Live drag overlap checks are now always enforced (including face-latched drag states), and overlap-safe translation solving now performs swept path checks to prevent high-speed “tunneling” through blockers while still preserving tangential slide where possible.
- **Side-view face-snap drift while blocked** — Axis-aligned face-latched drags now stay on the standard drag plane (instead of tangent-plane remapping), preventing the “moves away from camera while pushing into a blocker” behavior on vertical/horizontal part contact.
- **Odd-angle blocked face-latch drift** — Face-latched overlap prevention now supports a no-axis-redirection solve mode during part drag, so blocked push-through attempts on angled contacts remain on the user’s drag vector instead of “sliding away” on a secondary axis.

## [1.0.1] - 2026-02-25

### Changed

- **Maintenance PR auto-merge automation** — Added a dedicated workflow that auto-enables merge for `sync main back to develop` PRs using merge commits and auto-enables merge for version-bump PRs using squash, reducing manual release-ops steps while preserving main/develop ancestry on syncs.

### Fixed

- **Maintenance auto-merge workflow execution context** — Added an explicit repository checkout before running `gh pr merge` in the maintenance auto-merge workflow to prevent `fatal: not a git repository` failures on `pull_request_target` runs.
- **Release packaging builder stability in CI** — Pinned release packaging to `electron-builder@26.7.0` in CI (instead of transient `npx` latest), avoiding the `26.8.x` app-entry corruption regression where `out/main/index.js` is missing from `app.asar`.
- **Ubuntu E2E dependency install CI hang** — Hardened desktop Linux E2E setup by wrapping `playwright install-deps` with timeout/retry guards so `Test` workflows no longer block indefinitely on runner apt lock/deps stalls.

## [1.0.0] - 2026-02-25

### Added

- **Expanded source branding asset pack** — Added new `assets/` source logos in PNG/SVG variants for icon, horizontal, horizontal-words, vertical, and white-header use cases to support consistent marketing and in-app branding exports.
- **Website SEO automation + docs-search schema** — Added build-time sitemap generation (`npm run generate:sitemap` via website `prebuild`), introduced `WebSite` JSON-LD `SearchAction` targeting `/docs?search={search_term_string}`, and documented SEO operations/manual search engine submission steps in `packages/website/SEO.md`.
- **Start screen Settings & Library buttons** — Added icon buttons in the start screen header for quick access to App Settings and Stock/Assembly Library without needing to open a project first
- **Assembly editing from start screen** — Can now enter assembly edit mode directly from the start screen's assembly library
- **Inline name editing on AssemblyEditingBanner** — Click the assembly name in the editing banner to rename it in-place
- **Cut diagram detail modal** — Cutting diagrams in the Cut List modal are now clickable to open a larger detail view with zoom controls and per-part inspection.
- **Error fallback copy action** — Added an icon-only copy button on the crash fallback screen to copy full error details to clipboard for easier bug reporting.
- **Website download redirect tracking endpoint** — Added a Vercel API redirect (`/api/download`) that resolves latest GitHub release assets by platform and logs structured download-click events for analytics.

### Changed

- **Desktop checkout/support/legal link centralization** — Consolidated upgrade checkout URLs into a single renderer link config (with optional `VITE_LEMON_SQUEEZY_CHECKOUT_URL` override), switched in-app support actions to the website support page, and added a `Help -> Support` menu item so purchase/help/legal flows consistently route through the website.
- **Trial license activation access in App Settings** — Trial users can now open `Enter License Key` directly from `App Settings -> Data & License` (in addition to purchasing), instead of waiting for late-trial/expired prompts.
- **Sync workflow sequencing hardening** — `sync-develop` now runs after the `Release` workflow completes (instead of directly on `main` push), uses workflow-level concurrency, reuses an existing open sync PR branch when present, and auto-closes redundant zero-diff sync PRs to reduce release-race churn.
- **Website social preview image hardening** — Switched OG/Twitter metadata to a dedicated `1200x630` PNG (`/branding/og-image-1200x630.png`) for better social crawler compatibility and more consistent preview rendering across platforms.
- **Docs search URL state** — Documentation search now syncs with `?search=` query params so results are shareable, crawlable, and aligned with structured search metadata.
- **Hotkey hint layout simplification** — Consolidated editor shortcut hints by moving view/undo hints into the bottom-left navigation helper, reducing duplicate hint blocks and improving readability on narrow windows with right-aligned stacked hints.
- **PDF diagram label routing readability** — Improved small-part callout routing in cut-diagram PDFs with collision-aware lane placement, side-biased part anchors, and label-lane-aligned targets to reduce crossed/ambiguous leader lines.
- **Website download links now use tracked redirects** — Home and Download page platform buttons now route through `/api/download` before forwarding to GitHub assets, enabling per-source/per-platform click tracking in Vercel logs.
- **Download toasts now include file-manager actions** — Export/download success toasts now include a contextual `Show in Finder`/`Show in File Explorer` button, and CSV exports in Cut List tabs now use native save dialogs so the saved file can always be revealed.
- **New Project material seeding now uses App Library** — Removed hardcoded starter stock definitions from the New Project dialog flow; selected materials now clone directly from the persisted app `stockLibrary`, so project defaults always reflect the user’s current library.
- **Stock-to-part visual highlighting** — Selecting a stock row in the sidebar now highlights all matching parts in the 3D workspace for quick material-based scanning.
- **Cut diagram detail UX** — Enlarged the diagram detail modal, switched zoom to uniform scaling across both axes, and added selected-part overlays/metadata (dimensions plus group-chain context).
- **Website visual-system overhaul** — Refined website design tokens (surfaces, borders, contrast, radii, and shadows), updated shared shadcn primitives (`Button`, `Card`, `Badge`, `NavigationMenu`), and applied consistent desktop-aligned styling across header/footer, marketing pages, and docs navigation/content containers for a more cohesive Carvd Studio brand experience.
- **Modal UX consistency pass (desktop)** — Standardized sizing, spacing, and section surfaces across major dialogs (`Stock Library`, `Add/Edit Stock`, `Add/Save Assembly`, `Import App State`, `Import to Library`, `File Recovery`, and `Template Browser`) to match the App/Project Settings visual system and improve readability on varied screen sizes.
- **App Settings modal UX refresh** — Reorganized App Settings into focused tabs (`General`, `Snapping & Constraints`, `Data & License`), widened the dialog for better readability, and improved section scannability without changing existing setting behavior.
- **App Settings tutorial cleanup** — Removed the `Reset Tutorial` action from App Settings now that tutorial access/reset is available from the start screen flow.
- **Project Settings visual alignment** — Updated Project Settings sections to use the same card-style containers as App Settings for more consistent contrast and grouping.
- **Properties panel UX refresh** — Increased panel width, added card-style grouping for key editing sections, and added toast feedback when position edits are blocked by overlap prevention.
- **Properties panel advanced controls** — Consolidated `Allow Overlap`, `Glue-Up Panel`, and `Joinery Adjustments` under a collapsed `Advanced Settings` section to reduce noise in the main editing flow.
- **Edit-mode header UX** — Replaced template/assembly editing banners with header-integrated mode chips (`Template`/`Assembly`) and inline editable name controls in the existing title area for project/template/assembly workflows.
- **Library modal edit-flow hardening** — Added unsaved-change confirmation when switching selections during stock/assembly edits, ensured `Esc` cancels in-panel edits before closing the modal, and improved list keyboard accessibility (Enter/Space selection).
- **Desktop library componentization and reuse pass** — Extracted shared library UI building blocks (`LibrarySidebar`, `LibraryDetailPane`, `LibraryDetailHeader`, `LibraryDetailRow`, `LibraryEmptyState`, `DocsLink`) plus reusable domain components (`StockFormFields`, `StockListItem`, `AssemblyListItem`, `AssemblyDetails`, `AssemblyPartsList`), and refactored stock/assembly tabs and add-modals to consume them for cleaner one-component-per-file structure and reduced duplicate markup.
- **Desktop dialog + styling alignment pass** — Reworked the shared desktop `Dialog` wrapper to use Radix dialog primitives with preserved legacy close semantics, reduced per-screen tab style overrides on Start Screen/Cut List/Library flows, and migrated high-traffic desktop forms/actions (stock/assembly search bars, project/template dialogs, recents/favorites actions, template manager actions, and shopping-item forms) from custom/raw controls to shared ShadCN primitives (`Button`, `IconButton`, `Input`, `Textarea`, `Tabs`).
- **Cross-app theme consistency alignment (bead carvd-studio-12.1)** — Aligned website typography and core theme semantics with desktop Twilight Studio conventions: website now uses Nunito Sans, maps `primary` to Gold CTA tokens, maps `accent`/`ring` to Cerulean interaction tokens, and maps `secondary` to Twilight Indigo to match desktop shadcn usage.
- **Migrated UI component library to shadcn/ui with Radix UI primitives** across both desktop and website surfaces.
- **Desktop migration completion** — Replaced custom button/form/overlay/layout primitives with shadcn components (`Button`, `Input`, `Select`, `Dialog`, `AlertDialog`, `Tabs`, `Table`, `Card`, `Accordion`, `Sidebar`, `Alert`, etc.), removed obsolete `primitives.css`, and simplified `layout.css`/`domain.css` to keep only Electron/domain-specific rules.
- **Website migration completion** — Migrated all shared/page/docs/legal views to Tailwind + shadcn, removed legacy `packages/website/src/index.css`, and consolidated styling into `tailwind.css` with Twilight Studio dark/light theme token mapping.
- **Accessibility and test modernization** — Shifted tests to role-based + Radix-compatible patterns, including portal-aware queries and state assertions (`data-state`/`data-disabled`), with desktop coverage thresholds maintained (`91/82/90/91`).
- **Performance and bundle validation** — Completed desktop and website bundle audits; desktop net payload improved slightly post-migration, and website CSS dropped substantially (`-25.5%` raw, `-22.6%` gzip) with JS effectively flat.
- **Migration documentation alignment** — Updated `CLAUDE.md` and migration handoff docs to reflect final shadcn architecture, component inventory, testing guidance, and bundle-impact expectations.
- **Aesthetic redesign ("Twilight Studio" theme)** — Refreshed dark/light color palette with Twilight Indigo (#203864), Cerulean (#077187), Lilac Ash (#AEA4BF), Gold (#FFD21F), and Papaya Whip (#FFEECF); updated backgrounds, borders, text tones, sidebar, header, and button styles
- **Font update** — Switched to Nunito Sans for improved readability and warmth
- **Splash screen theming** — Splash screen now respects light/dark mode with theme-aware colors and font
- **3D scene theming** — Canvas background and grid colors now follow the active theme
- **Group actions in Properties panel** — Expanded group-focused controls in the Properties panel to mirror context-menu capabilities (center view, save as assembly, reference toggles, merge/group operations, add/remove group membership, and delete actions for single/multi/mixed selections).
- **Cut diagram PDF readability overhaul** — Diagram exports now prioritize one board per page with orientation/scale tuned for legibility, plus improved callout labeling and larger text to better match real shop-floor usage.
- **Website/docs screenshot refresh** — Replaced placeholder and stale captures across Home/Features/docs with current desktop screenshots and updated capture scripts for repeatable, dock-safe framing and timed interactive shots.
- **Documentation alignment pass** — Updated docs for current template entry points (`File → New from Template...` and templates screen flow), cut-list diagram detail/export behavior, app-library stock save flow, and Project Settings favorites guidance.

### Fixed

- **Lemon Squeezy activation `instance_id` error** — Activation now follows Lemon Squeezy’s instance lifecycle (activate with `instance_name`, then persist and reuse the returned `instance.id` for validate/deactivate), including stale-instance recovery when `instance_id` no longer exists.
- **Updater restart crash in packaged app** — Hardened desktop packaging so runtime deps are always installed in `packages/desktop/node_modules` before `electron-builder` runs (local scripts and release CI), resolving `ERR_MODULE_NOT_FOUND` for `electron-log` after auto-update restart.
- **Crawler handling for website API redirects** — Added `X-Robots-Tag: noindex, nofollow, noarchive` and `Disallow: /api/` policy for website API endpoints to reduce accidental indexing of non-content URLs.
- **Start screen overlap in short windows** — Prevented the `Recents`/`Favorites` section from overlapping template tiles by allowing the start screen content column to scroll when vertical space is constrained.
- **Packaged app header logo loading** — Fixed editor/header branding images not rendering in packaged desktop builds by switching renderer logo paths from absolute (`/branding/...`) to relative (`./branding/...`) URLs.
- **Website link target fixes** — Corrected broken website navigation links by replacing invalid in-page `#download` anchors on Features/Pricing flows with `/download`, and added a missing `id="requirements"` anchor on the Download page for Support deep links.
- **3D part visibility during orbit** — Disabled frustum culling for instanced part meshes to prevent parts disappearing at certain camera angles.
- **Stock highlight dismissal** — Clicking empty workspace space now clears sidebar stock highlighting along with part selection.
- **Desktop app icon color update** — Updated the branded app icon artwork to use the Carvd yellow beaver treatment and regenerated desktop icon assets (`icon.png`, `icon.icns`, `icon.ico`).
- **Assembly thumbnail rendering** — Fixed missing `data:image/png;base64,` prefix in AssembliesTab causing broken thumbnail images
- **Library icon inconsistency** — Start screen library button now uses the same `Library` icon as the editor header
- **New Template button text contrast** — Button text on gold background is now dark (Twilight Indigo) instead of invisible white
- **"Start Editing" from new template modal** — Creating a new template from the templates screen now correctly enters the 3D editor
- **Recents not opening after templates navigation** — Clicking a recent project after visiting the templates screen now reliably opens the project
- **Update Notification Visibility** — Update toast now appears above all modals on the start screen (z-index increased from 1100 to 10003)
- **Automated PRs Now Trigger CI** — Version bump and sync PRs now use `WORKFLOW_PAT` instead of `GITHUB_TOKEN`, enabling CI checks on automated pull requests
- **Sync-Develop Workflow Detection** — Fixed bug where sync workflow checked file differences instead of commit history, causing it to miss merge commits from main
- **Keyboard ungroup parity** — `Ctrl/Cmd+Shift+G` now also ungroup selected groups (not only groups inferred from selected parts).
- **PDF watermark logo distortion** — Watermark logo now preserves intrinsic image aspect ratio when rendered into exported PDFs.
- **Assembly stock duplication on add** — Adding an assembly to a project now reuses equivalent existing project stock entries instead of creating duplicate stock rows when the same material already exists.

## [0.1.11] - 2026-02-14

### Changed

- **Standalone Sync-Develop Workflow** — Separated main-to-develop sync into its own workflow that runs on every push to main, decoupled from the release pipeline
- **Merge Strategy Convention** — Documented merge commit (not squash) for develop-to-main PRs to preserve shared ancestry and prevent sync conflicts

### Fixed

- **Vercel Build Failure** — Fixed `husky` command not found (exit 127) during `npm ci` in Vercel's build environment by making the prepare script resilient (`husky || true`)

## [0.1.10] - 2026-02-14

### Added

- **Group Bounding Box Dimensions** — When a group is selected, only the group's overall dimensions are shown instead of cluttering the view with every child part's individual measurements
- **PR Template** — Added `.github/pull_request_template.md` with checklist and Claude instructions for consistent PR quality
- **Changelog CI Check** — PRs to main now fail if CHANGELOG.md hasn't been updated
- **CLAUDE.md** — Added project-level development guidelines covering git workflow, branch naming, commit conventions, and testing
- **Pre-commit Hooks** — Added husky + lint-staged to auto-check formatting on commit
- **Issue Templates** — Added GitHub issue templates for bug reports and feature requests
- **Dependabot Config** — Configured Dependabot for automated dependency update PRs with grouped packages

### Changed

- **Decoupled Website & Desktop Deployments** — Website and desktop app now have independent versioning and deployment pipelines; website fetches the latest version dynamically from GitHub Releases API
- **Vercel Ignore Script** — Moved ignoreCommand logic to a shell script to stay within Vercel's 256-character limit
- **Branch Protection** — Both `develop` and `main` are now fully protected; all 7 CI checks must pass, no direct pushes even for admins
- **Website Auto-Versioning** — Website version bumps are automated via GitHub Actions after each deployment
- **Website Icons** — Replaced all emojis across the website with proper SVG icons (Apple logo, Windows logo) and lucide-react icons for a more professional appearance
- **CI Checks** — Added website lint, typecheck, and format checks to CI; all workflows now use `.nvmrc` for consistent Node.js version
- **Website Code Quality** — Removed unused React imports (React 19), added `typecheck` and `format:check` scripts, excluded test files from typecheck, auto-formatted all source files
- **Versioning Standards** — Documented semver conventions and version management in CLAUDE.md

### Fixed

- **Desktop dev startup self-healing** — `npm run dev` in `packages/desktop` now preflights missing native `rolldown` bindings and missing Electron runtime assets, automatically repairing the common optional-dependency/worktree install failures that previously broke local startup.
- **Release Version Comparison** — Replaced fragile `HEAD~1` version comparisons with durable artifact checks (GitHub Releases for desktop, `website-v*` git tags for website) to prevent skipped releases on squash merges
- **Website Deployment Gate** — Website version tagging now waits for Vercel deployment to succeed before creating the `website-v*` tag
- **Vercel Deployment Failure** — Fixed `ignoreCommand` exceeding Vercel's 256-character schema limit, which caused all deployments to fail

## [0.1.8] - 2026-02-13

### Fixed

- **Update Toast Z-Index** — Update notification toast was hidden behind the StartScreen overlay due to z-index conflict
- **Release Workflow** — Improved version comparison to skip releases when the desktop version is unchanged; fixed sync-develop step

## [0.1.6] - 2026-02-13

### Fixed

- **Auto-Update 404** — Resolved issue where the auto-updater returned 404 errors when checking for updates
- **Update Notification UX** — Converted update notification from a banner to a toast for less intrusive presentation

## [0.1.4] - 2026-02-13

### Changed

- **React Rendering Performance** — Added React.memo to Part component, memoized Zustand selectors and AABB calculations, implemented code splitting for modals
- **GPU Performance** — Capped device pixel ratio, reused Vector3 objects, removed unused shadow maps
- **Production GPU Optimization** — Optimized Three.js rendering pipeline for production builds

### Fixed

- **Download URLs** — Fixed website download links to match actual GitHub Release filenames
- **Vercel Deployment** — Fixed ignoreCommand and redeploy triggering for the marketing website

## [0.1.1] - 2026-02-13

### Added

- **Changelog Page** — New page on the website showing release history
- **Post-Update Notification** — Desktop app shows what's new after an update
- **Windows E2E Tests** — Playwright end-to-end tests now run on Windows in CI

### Changed

- **React 19** — Upgraded from React 18 to React 19
- **Three.js Ecosystem** — Upgraded to @react-three/fiber v9, drei v10, three.js v0.182
- **CI Pipeline** — Streamlined test matrix; cross-platform E2E on Ubuntu, macOS, and Windows

### Fixed

- **macOS Notarization** — App is now signed with a Developer ID Application certificate and notarized by Apple, so macOS no longer blocks it on first launch
- **electron-builder v26 Compatibility** — Removed deprecated `publisherName` config
- **Flaky E2E Tests** — Resolved timing issues in macOS Playwright tests
- **Website Download Links** — URLs now match actual GitHub Release filenames
- **Security Vulnerabilities** — Resolved 14 Dependabot alerts

## [0.1.0] - 2025-02-12

### Added

- **3D Furniture Design Editor** - Interactive workspace with real-time 3D visualization using Three.js
- **Part Management** - Create, edit, duplicate, and organize rectangular parts with precise dimensions
- **Stock/Material System** - Define lumber and sheet goods with pricing, grain direction, and board foot calculations
- **Groups & Assemblies** - Organize parts into logical groups and reusable assembly templates
- **Snap-to-Part Alignment** - Intelligent snapping system for precise part positioning (edge, center, flush)
- **Cut List Optimizer** - Automatic cut list generation with material optimization and waste calculation
- **PDF Export** - Export cut lists as formatted PDF documents
- **Project Templates** - Built-in starter templates (Bookshelf, End Table, Simple Desk) and tutorial project
- **Custom Templates** - Save and load your own project and assembly templates
- **Stock Library** - Persistent material library with common lumber and plywood presets
- **Undo/Redo** - Full history support for all design operations
- **Auto-Save & Recovery** - Automatic project backup with crash recovery
- **Keyboard Shortcuts** - Comprehensive shortcuts for common operations
- **Project File Format** - Save/load projects as `.carvd` files with full version migration support
- **Start Screen** - Quick access to recent projects, favorites, and templates
- **Welcome Tutorial** - Interactive onboarding tutorial for new users
- **Trial System** - 14-day full-feature trial with graceful degradation to free tier
- **License Activation** - License key validation and activation via LemonSqueezy
- **Auto-Updates** - Built-in update checking and notification system
- **Cross-Platform** - macOS and Windows desktop application
- **Marketing Website** - Product website with features, pricing, documentation, and download pages

[Unreleased]: https://github.com/mdbaldwin1/carvd-studio/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/mdbaldwin1/carvd-studio/compare/v1.2.0...v1.3.0
[1.0.5]: https://github.com/mdbaldwin1/carvd-studio/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/mdbaldwin1/carvd-studio/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/mdbaldwin1/carvd-studio/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/mdbaldwin1/carvd-studio/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/mdbaldwin1/carvd-studio/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/mdbaldwin1/carvd-studio/compare/v0.1.11...v1.0.0
[0.1.11]: https://github.com/mdbaldwin1/carvd-studio/compare/v0.1.10...v0.1.11
[0.1.10]: https://github.com/mdbaldwin1/carvd-studio/compare/v0.1.8...v0.1.10
[0.1.8]: https://github.com/mdbaldwin1/carvd-studio/compare/v0.1.6...v0.1.8
[0.1.6]: https://github.com/mdbaldwin1/carvd-studio/compare/v0.1.4...v0.1.6
[0.1.4]: https://github.com/mdbaldwin1/carvd-studio/compare/v0.1.1...v0.1.4
[0.1.1]: https://github.com/mdbaldwin1/carvd-studio/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/mdbaldwin1/carvd-studio/releases/tag/v0.1.0
