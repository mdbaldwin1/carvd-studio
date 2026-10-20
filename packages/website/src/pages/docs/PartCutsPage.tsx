import { Link } from "react-router-dom";
import SEO from "../../components/SEO";
import { createBreadcrumbSchema } from "../../utils/jsonLd";
import DocsPrevNext from "./DocsPrevNext";

const cuts = [
  [
    "End cut / edge bevel",
    "Trim an end or bevel a long edge. Choose the target, cut style, mitre or bevel angle, and the long/high-point side. Inspect which material remains, especially for compound cuts.",
  ],
  [
    "Tenon",
    "Leave a projecting tongue on an end. Set its length, width, thickness, and offsets. The shoulder and tip are different assembly references.",
  ],
  [
    "Dado / stopped dado",
    "House a shelf or crossing member in a face. Match the channel to the entering member and specify depth. For a stopped dado, set the stops and check square versus routed ends.",
  ],
  [
    "Groove / stopped groove",
    "Run a channel along the board. Locate it from the named reference edge and set width and depth. A stopped groove also leaves material at an end.",
  ],
  [
    "Half lap",
    "Remove material where two boards cross or overlap. For equal-thickness boards, removing half the thickness from each makes flush outside faces. Unequal members need a deliberate depth on each.",
  ],
  [
    "Rabbet",
    "Remove a ledge along an edge. Shoulder width controls how far it reaches into the face; depth controls how much thickness remains.",
  ],
  [
    "Edge notch / corner notch",
    "Remove material open to an edge or corner. Inspect the chosen edge, cut extent, and remaining web of wood.",
  ],
  [
    "Mortise",
    "Create a rectangular socket on a face. Check length, width, location, corner shape, and blind depth or Through. A socket reaching the end can form an open mortise for a bridle.",
  ],
  [
    "Face cutout",
    "Remove a rectangular region from a face. Use the depth mode intentionally; a pocket and a through opening are different operations.",
  ],
  [
    "Round hole",
    "Choose a bit or hole diameter, locate its center, and select blind depth or Through. Linear, grid, and circular patterns keep repeated holes in one editable operation.",
  ],
  [
    "Countersink",
    "Add a conical recess around a hole. Check both the hole diameter and countersink major diameter, plus the included angle.",
  ],
  [
    "Counterbore",
    "Add a flat-bottomed recess around a hole. Set the counterbore diameter and depth separately from the main hole.",
  ],
  [
    "Rounded slot / rounded rectangle",
    "Create an opening with rounded ends or corners. Check opening length, width, corner radius where available, and depth.",
  ],
  [
    "Routed path",
    "Sweep a cutter along a path on the selected face. Set the bit profile, cutter dimensions, path, and route depth. Inspect cutter entry and exit as well as the finished opening.",
  ],
  [
    "Edge profile",
    "Shape a board edge with a profile. Select the profile and set its size and depth; inspect the cross-section and the edge being shaped.",
  ],
];

export default function PartCutsPage() {
  return (
    <section className="[&_p]:leading-relaxed [&_li]:leading-relaxed">
      <SEO
        title="Part Cuts: Faces, Measurements & Routing - Docs"
        description="Create and edit dados, rabbets, mortises, tenons, holes, end cuts, and routed profiles. Learn reference edges, depth modes, cut order, and saving."
        path="/docs/part-cuts"
        jsonLd={createBreadcrumbSchema([
          { name: "Docs", path: "/docs" },
          { name: "Part Cuts", path: "/docs/part-cuts" },
        ])}
      />
      <h2 className="text-4xl font-bold mb-md">Part Cuts</h2>
      <p className="text-muted mb-xl">
        A part begins as a blank. Each cut removes material from that blank
        while keeping its dimensions and instructions editable. Work from a
        named face and reference edge, as you would with a pencil and marking
        gauge.
      </p>
      <nav aria-label="On this page" className="site-section p-6 mb-xl">
        <ul className="flex flex-wrap gap-4 text-text underline underline-offset-4 decoration-primary">
          {[
            ["first-cut", "Make a cut"],
            ["references", "Faces & measurements"],
            ["worked-example", "Tongue-and-groove example"],
            ["operations", "Cut reference"],
            ["angles", "Angles & socket walls"],
            ["routing", "Routing"],
            ["router-profiles", "Profiles & physical tools"],
            ["patterns", "Hole patterns"],
            ["editing", "Edit & save"],
          ].map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="hover:underline">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="grid gap-xl">
        <section id="first-cut" className="site-section p-6 scroll-mt-28">
          <h3 className="text-2xl font-bold mb-4">Make your first cut</h3>
          <ol className="list-decimal pl-5 space-y-3 text-muted">
            <li>
              Select one board. Confirm its actual dimensions and stock, then
              choose <strong>Edit Part Cuts</strong>.
            </li>
            <li>
              Choose <strong>+</strong> beside <strong>Cuts</strong> in the
              sidebar, then choose its type in{" "}
              <strong>What kind of cut?</strong>. Choose the face, end, edge, or
              corner indicated by the editor.
            </li>
            <li>
              Inspect the highlighted target. Enter the measurements in
              Properties, using the named edges in each label. Fractions such as
              3/4 or 1 1/2 can be entered in imperial measurement fields.
            </li>
            <li>
              Orbit the preview to inspect remaining material. For a pocket or
              hole, verify whether it stops inside the board or passes through.
            </li>
            <li>
              Review any cut conflicts. Choose <strong>Apply cuts</strong> to
              return to the project with the edits, then save the project file.
            </li>
          </ol>
          <p className="text-muted mt-4">
            For complementary joints,{" "}
            <Link
              className="text-text underline underline-offset-4 decoration-primary"
              to="/docs/joinery#matching-cuts"
            >
              Lay out matching cuts
            </Link>{" "}
            avoids independently calculating both members. For an insert socket,
            use the insert itself as the pattern.
          </p>
        </section>
        <section id="references" className="site-section p-6 scroll-mt-28">
          <h3 className="text-2xl font-bold mb-4">
            Faces and measurements stay with the board
          </h3>
          <p className="text-muted mb-4">
            Left and Right are the board’s ends; Front and Back are its long
            edges; Top and Bottom are its broad faces. These names belong to the
            board, even after it rotates. Turning the camera does not change
            them.
          </p>
          <ul className="list-disc pl-5 space-y-3 text-muted">
            <li>
              <strong>Edge offset and center position are different.</strong>{" "}
              Rectangular cuts use the reference shown in their field labels;
              round holes and insert sockets locate a center. Do not add or
              subtract half the opening size unless the label calls for that
              reference.
            </li>
            <li>
              <strong>Rectangular cuts on Top or Bottom:</strong> the
              cross-board reference is Back. For example, a groove 1 inch from
              Back on a 5-inch-wide board begins at that offset; it is not 1
              inch from the edge nearest the camera.
            </li>
            <li>
              <strong>Rectangular cuts on Front or Back:</strong> the height
              reference is Bottom. On a 3/4-inch-thick board, a 1/4-inch-wide
              groove positioned 1/4 inch from Bottom leaves 1/4 inch of material
              above and below it.
            </li>
            <li>
              <strong>Tenon offsets:</strong> follow the tenon’s own labels,
              including its Front reference. Do not copy a top-face cut offset
              into a tenon field without checking the reference.
            </li>
            <li>
              <strong>Blind depth:</strong> measures into the selected face.{" "}
              <strong>Through</strong> passes through the part in that
              direction; it is not a zero-depth cut.
            </li>
          </ul>
          <p className="text-muted mt-4">
            New round holes and rounded openings use offsets from the face
            center: zero along and zero across place the opening at that center.
            The insert-socket dialog instead asks for its center from named
            edges. Cuts created by another workflow can retain their original
            references when reopened, so use the displayed preview to confirm
            the location before copying measurements between workflows.
          </p>
          <p className="text-muted mt-4">
            Set the target before fine-tuning offsets. Changing faces can change
            which dimensions are available and what the measurement labels mean.
            Use a second view to verify the location rather than trusting the
            silhouette of the blank.
          </p>
          <p className="text-muted mt-4">
            To orbit while a cut is selected, begin dragging in empty preview
            space. Clicking a highlighted board face can retarget the cut. If
            the target changes accidentally, undo the cut change and confirm the
            target label before continuing.
          </p>
        </section>
        <section id="worked-example" className="site-section p-6 scroll-mt-28">
          <h3 className="text-2xl font-bold mb-4">
            Worked example: a tongue-and-groove edge joint
          </h3>
          <p className="text-muted mb-4">
            This example uses two 12 × 5 × 3/4-inch boards, a 1/4-inch-thick
            tongue, and a groove with space behind the tongue. Use an imperial
            project for these measurements. These are demonstration dimensions;
            adjust fit clearance for the work you intend to make.
          </p>
          <ol className="list-decimal pl-5 space-y-3 text-muted">
            <li>
              Create two parts from 3/4-inch board stock. Name them{" "}
              <strong>Grooved board</strong> and <strong>Tongued board</strong>,
              set both to 12 × 5 × 3/4 inches, and place them apart so you can
              inspect each.
            </li>
            <li>
              Select Grooved board, open <strong>Edit Part Cuts</strong>, and
              use <strong>+</strong> beside Cuts to choose{" "}
              <strong>Groove</strong>. Target the <strong>Back</strong> edge.
              Run it along the full 12-inch length, set the opening width to 1/4
              inch, locate it 1/4 inch from Bottom, and cut 3/8 inch deep into
              the board’s width. Choose <strong>Apply cuts</strong>.
            </li>
            <li>
              Edit Tongued board. Add a <strong>Rabbet</strong> on the{" "}
              <strong>Top Front</strong> edge, running the full length. Set
              shoulder width to 1/4 inch and depth to 1/4 inch.
            </li>
            <li>
              Add the matching rabbet on the <strong>Bottom Front</strong> edge
              with the same dimensions. In an end view, check that 1/4 inch of
              thickness remains between the cuts. Apply the cuts.
            </li>
            <li>
              Select both boards and choose{" "}
              <strong>Bring pieces together…</strong>. Move the tongued board to
              the grooved board. Choose the tongue shoulder as the moving
              reference and the groove opening as the receiving reference.
              Center the registration, start with zero extra insertion, and
              inspect the preview before placing.
            </li>
            <li>
              Check that the broad faces are flush. The tongue projects 1/4 inch
              into a 3/8-inch-deep groove, leaving 1/8 inch behind its tip. The
              tongue and groove have the same nominal thickness in this example;
              that bottom space is not side clearance.
            </li>
          </ol>
          <p className="text-muted mt-4">
            Use Ghost or Wire to see the tip and groove bottom. If the shoulder
            is not available, inspect the two rabbets: they must form a matching
            tongue on the same edge. If the pieces will not seat, verify which
            board moves, the selected references, and the cross-section before
            changing the insertion amount.
          </p>
          <figure className="my-6">
            <a href="/screenshots/docs-part-cuts-groove.jpg">
              <img
                src="/screenshots/docs-part-cuts-groove.jpg"
                alt="Part Cuts editor showing a groove on the Back Face of a 12-inch board, with Height Across Thickness set to 1/4 inch and Depth Into Width set to 3/8 inch"
                width="1415"
                height="768"
                loading="lazy"
                className="w-full rounded-lg border border-border"
              />
            </a>
            <figcaption className="text-sm text-muted mt-2">
              The groove opens on the board’s long edge. Full Board Run is 12
              inches; Height Across Thickness is 1/4 inch; Depth Into Width is
              3/8 inch. Scroll the Properties panel to find Offset Up From
              Bottom and set it to 1/4 inch. Select the image to enlarge it.
            </figcaption>
          </figure>
        </section>
        <section id="operations" className="site-section p-6 scroll-mt-28">
          <h3 className="text-2xl font-bold mb-4">
            Choose the operation that removes the right material
          </h3>
          <dl className="space-y-5">
            {cuts.map(([name, text]) => (
              <div key={name}>
                <dt className="font-bold">{name}</dt>
                <dd className="text-muted mt-1 leading-relaxed">{text}</dd>
              </div>
            ))}
          </dl>
          <p className="text-muted mt-5">
            A preset is a starting point. Check its default dimensions against
            your actual board and mating part. A routed mortise’s rounded
            corners, for example, need a matching rounded tenon or a separate
            squaring operation in the shop.
          </p>
        </section>
        <section id="angles" className="site-section p-6 scroll-mt-28">
          <h3 className="text-2xl font-bold mb-4">
            End cuts and shaped socket walls
          </h3>
          <p className="text-muted mb-4">
            For an end cut, choose Mitre, Bevel, or Compound. Mitre Angle
            controls the cut across the board; Long Point On chooses Front or
            Back. Bevel Angle controls its tilt through the thickness; High
            Point On chooses Top or Bottom. A compound cut uses both. Inspect
            the resulting lengths before making its mate.
          </p>
          <p className="text-muted mb-4">
            A long-edge bevel tilts the whole selected long face through the
            thickness. It is always a bevel, and the board width remains
            referenced to the long point. This is different from a small
            decorative chamfer made with an edge profile.
          </p>
          <p className="text-muted mb-4">
            Where available, expand Dovetail shaping to adjust a rectangular
            cut’s walls. The angles are measured from square; zero leaves
            straight walls. Tail Splay flares the socket along its run, Socket
            Side Angle leans the long walls through the depth, and Socket End
            Angle leans the end walls. A positive socket wall angle widens the
            opening at the floor; inspect the cross-section to confirm the
            intended undercut.
          </p>
          <p className="text-muted">
            Use the paired matching-layout dialog when you want both members
            calculated together. Editing a socket’s wall angle by itself does
            not reshape the tenon or tongue that enters it.
          </p>
        </section>
        <section id="routing" className="site-section p-6 scroll-mt-28">
          <h3 className="text-2xl font-bold mb-4">Routing and repeated cuts</h3>
          <p className="text-muted mb-4">
            Use a routed path when the route follows a line or curve across a
            face. Use an edge profile when shaping a board edge. Cutter
            diameter, profile angle, cutter height, and depth describe different
            things; changing a diameter alone does not define a dovetail or
            T-slot cutter.
          </p>
          <h4 className="font-bold mb-2">Lay out the cutter’s path</h4>
          <p className="text-muted mb-4">
            Drag the colored points on the part: green marks the start and
            orange points shape the route and its turns. For exact placement,
            edit each point’s along-face and across-face coordinates, measured
            from the center of the face. Use Add Point to extend the path and
            the point’s corner radius to round a turn. Close path back to first
            point makes a closed route.
          </p>
          <h4 className="font-bold mb-2">Use a circle jig</h4>
          <p className="text-muted mb-4">
            Open Circle jig, set the pivot along and across the face, and enter
            Radius to bit center. Apply circle replaces the current route with a
            closed circular layout. The radius is the cutter centerline, not the
            finished outside edge: the cutter extends half its diameter to
            either side. Check both the inside and outside of the resulting cut.
          </p>
          <h4 className="font-bold mb-2">Inspect the cutter and profile</h4>
          <p className="text-muted mb-4">
            The edge-profile cross-section lets you inspect the shape left in
            the wood. For custom or imported profiles, confirm the scale and
            units and inspect the preview before applying. The part still needs
            enough material for the chosen profile and depth.
          </p>
          <h4 className="font-bold mb-2">Drill at an angle</h4>
          <p className="text-muted mb-4">
            Drill angle from face uses the woodworker’s view of the board: 90°
            is square into the face, while 15° runs nearly along it. Drill
            direction across face sets the direction across that face. Inspect
            where an angled hole exits and where a counterbore shoulder falls,
            not just its entry center. Fabrication notes use the same angle from
            the face. Machine setups separate different drilling angles and
            different counterbore or countersink tooling.
          </p>
          <h4 className="font-bold mb-2">Keep repeated holes editable</h4>
          <p className="text-muted mb-4">
            For repeated round holes, use the pattern controls rather than many
            unrelated holes. Check count and spacing, the first center, and the
            last hole’s distance from the board edge. In a grid or circular
            layout, inspect both directions or the full circle.
          </p>
          <p className="text-muted">
            Modeling a route does not produce a machine program or prove that a
            cutter can enter the finished opening. A stopped dovetail, keyhole,
            or T-slot may need an entry opening and a machining sequence beyond
            the visible finished shape. Model an opening large enough for the
            wider cutter head, not just its neck. Keyhole routes model an entry
            opening at the first path point automatically. The example cutter
            sampler adds a separate entry pocket for its stopped dovetail route.
            Follow the{" "}
            <Link
              to="/docs/joint-recipes#cutter-sampler"
              className="text-text underline underline-offset-4 decoration-primary"
            >
              worked cutter-sampler recipe
            </Link>{" "}
            for all route dimensions, edge profiles and the circular hole
            pattern.
          </p>
        </section>
        <section id="router-profiles" className="site-section p-6 scroll-mt-28">
          <h3 className="text-2xl font-bold mb-4">
            Edge profiles and physical router tools
          </h3>
          <p className="text-muted mb-4">
            An edge profile defines the shape removed from a board. A physical
            router tool records the cutter intended to make it. You can model a
            generic profile without assigning a tool, but that does not check
            whether a particular cutter can reach the required depth or clear
            the surrounding material.
          </p>
          <ol className="list-decimal pl-5 space-y-3 text-muted">
            <li>
              Select the edge by its two meeting faces, such as Top-Front Edge.
              Inspect the highlighted edge before choosing the profile.
            </li>
            <li>
              Choose Edge Profile, then set Profile Size and Profile Depth. Size
              is the radius for curved profiles or the shoulder width for
              chamfers and rabbets; depth is a separate setting.
            </li>
            <li>
              Inspect the Edge Cross-Section preview and use Enlarge when
              needed. Follow the two inward face directions and the
              material-removal shape rather than judging only the outside
              silhouette.
            </li>
            <li>
              Assign a Physical Router Tool if you want cutter-specific checks.
              Read its compatibility and feasibility information before applying
              the cut.
            </li>
          </ol>
          <figure className="my-6">
            <a href="/screenshots/docs-edge-profile.jpg">
              <img
                src="/screenshots/docs-edge-profile.jpg"
                alt="Beaded board in Part Cuts with a Top-Front Edge bead, cross-section panel, 1/8-inch profile size and depth, and Generic profile with no physical tool assigned"
                width="1415"
                height="768"
                loading="lazy"
                className="w-full rounded-lg border border-border"
              />
            </a>
            <figcaption className="text-sm text-muted mt-2">
              This bead has a modeled cross-section, but no physical cutter
              assigned. Generic profile describes that missing tool assignment;
              it does not mean the cut is absent. Select the image to enlarge
              it.
            </figcaption>
          </figure>
          <h4 className="text-xl font-bold mb-3">
            Read the feasibility status
          </h4>
          <dl className="space-y-3 text-muted">
            <div>
              <dt className="font-bold text-text">Generic profile</dt>
              <dd>
                No physical tool is assigned. Assign one to evaluate cutter
                reach and clearance.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-text">Not feasible</dt>
              <dd>
                At least one modeled tool or stock condition blocks the
                operation. Read the errors and correct the assignment,
                dimensions, or cut.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-text">Needs attention</dt>
              <dd>
                The analyzer found cautions. Expand the details and check the
                assumptions behind them.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-text">Ready</dt>
              <dd>
                The assigned tool passes the modeled checks. This does not set
                feeds, speeds, workholding, or the router setup.
              </dd>
            </div>
          </dl>
          <p className="text-muted mt-4">
            Tool compatibility is separate from feasibility. Family-only
            unverified means the tool and profile share a category without a
            certified profile link. Exact certified, Geometry equivalent, and
            Manufacturer-certified scalable describe stronger geometry matches;
            inspect any scale or clearance cautions as well. An incompatible
            cutter is not made compatible merely by giving it the same name.
          </p>
          <h4 className="text-xl font-bold mt-6 mb-3">
            Keep project versions deliberate
          </h4>
          <p className="text-muted mb-4">
            Custom profiles and assigned tools retain a copy in the project.
            Editing or deleting the library entry does not silently replace that
            copy. When a profile changes, choose Compare Versions to inspect the
            project and library shapes side by side. Keep Project Version leaves
            the cut unchanged; Update This Cut adopts the newer profile.
          </p>
          <p className="text-muted mb-4">
            Update All Matching Cuts is limited to the current part. Review the
            listed cuts before confirming, then check any skipped cuts or
            cleared incompatible tool assignments. Update Assigned Tool updates
            the cutter record separately. The explicit Use Tool and Linked
            Profile action changes both the profile geometry and tool
            assignment; review its before-and-after preview.
          </p>
          <h4 className="text-xl font-bold mt-6 mb-3">
            Import a custom SVG profile
          </h4>
          <ol className="list-decimal pl-5 space-y-3 text-muted">
            <li>
              Open Edge Profile → Import SVG Profile. In the import dialog,
              choose the file and an open contour. A closed contour cannot be
              selected as the profile.
            </li>
            <li>
              Confirm the physical units when the file has no physical size.
              Inspect scale and orientation in the material-removal preview; use
              the orientation controls if the contour faces the wrong way.
            </li>
            <li>
              Enter a useful profile name and family. Read any fidelity notice,
              particularly for rotated or skewed arcs.
            </li>
            <li>
              Choose Save to Library for future reuse, Apply Once for this
              operation where available, or Save &amp; Apply for both. Inspect
              the resulting edge at the intended size and depth.
            </li>
          </ol>
          <p className="text-muted mt-4">
            The same profile chooser also offers Create Custom Profile for a
            profile you draw, Import Profile for a Carvd .carvd-profile file,
            and Import DXF Profile for a drawing contour. In the DXF dialog,
            choose the connected contour and confirm Drawing Units. If you know
            its actual width, enter Known contour width (inches) and use Set
            Scale. Review the material-removal preview before saving or applying
            any imported profile.
          </p>
        </section>
        <section id="patterns" className="site-section p-6 scroll-mt-28">
          <h3 className="text-2xl font-bold mb-4">Lay out a hole pattern</h3>
          <p className="text-muted mb-4">
            Select the round-hole operation and find Repeating Pattern in
            Properties. Set the hole diameter, depth, and target face before
            repeating it. All holes in that operation share those settings.
          </p>
          <p className="text-muted mb-4">
            Offset Along Face and Offset Across Face locate the pattern’s
            origin. For Linear, that is the first hole; for Grid, it is the
            first row and column intersection. The pattern extends from there.
            For Around a circle, the origin is the circle’s center. Zero offsets
            therefore do not center a linear or grid pattern as a whole.
          </p>
          <dl className="space-y-4 text-muted">
            <div>
              <dt className="font-bold text-text">Single hole</dt>
              <dd>
                One opening at the selected face position. Use this when
                individual holes need different diameters or depths.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-text">Linear</dt>
              <dd>
                Set Hole Count, Spacing, and Direction. Spacing is
                center-to-center. Five holes spaced 2 inches apart span 8 inches
                between the first and last centers, plus the radius beyond each
                end.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-text">Grid</dt>
              <dd>
                Set Rows, Columns, Row Spacing, Column Spacing, and Grid
                Rotation. A 3-by-4 pattern has 12 holes. Check the full pattern
                after rotating it, since its corners may reach the board edge.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-text">Around a circle</dt>
              <dd>
                Set Hole Count, Radius, and Start Angle. The radius locates the
                hole centers around the pattern center; it is not the hole
                radius. Inspect the outermost edge of each hole.
              </dd>
            </div>
          </dl>
          <p className="text-muted mt-4">
            Use the preview to verify the first center and direction before
            adding more holes. For shelf-pin rows on opposite cabinet sides, use
            the same physical reference edge and starting height on both boards.
            Face names can differ on opposing parts; copying numbers without
            checking the reference can reverse a layout.
          </p>
          <figure className="my-6">
            <a href="/screenshots/docs-hole-pattern.jpg">
              <img
                src="/screenshots/docs-hole-pattern.jpg"
                alt="Part Cuts editor showing ten shelf-pin holes as a Grid pattern with 2 rows, 5 columns, 3-inch row spacing, 1.2598-inch column spacing, and zero grid rotation"
                width="1415"
                height="768"
                loading="lazy"
                className="w-full rounded-lg border border-border"
              />
            </a>
            <figcaption className="text-sm text-muted mt-2">
              One operation makes all ten holes in this shelf-pin example. The
              1.2598-inch column spacing corresponds to approximately 32 mm; row
              spacing is 3 inches. The drilling angle is 90° from the face, so
              the holes enter square. Select the image to enlarge it.
            </figcaption>
          </figure>
        </section>
        <section id="editing" className="site-section p-6 scroll-mt-28">
          <h3 className="text-2xl font-bold mb-4">Edit, inspect, and save</h3>
          <p className="text-muted mb-4">
            Select an existing cut in the cut list or preview to edit it. Give
            operations meaningful labels, especially when several similar holes
            or grooves share a face. Cut order matters: an earlier operation can
            remove the material a later operation expects.
          </p>
          <p className="text-muted mb-4">
            Inspect conflicts after changing a target, resizing the blank,
            moving an operation, or changing its depth. Read the actual message
            and correct the affected operation. Hiding or disabling a cut is
            different from deleting it; check which operations are enabled
            before saving.
          </p>
          <h4 className="font-bold mb-2">Use the cut row’s actions</h4>
          <ul className="list-disc pl-5 space-y-3 text-muted mb-4">
            <li>
              <strong>Checkbox:</strong> enable or disable the operation while
              retaining its settings. An unchecked cut does not remove material.
            </li>
            <li>
              <strong>Move Up / Move Down:</strong> change the operation order.
              Inspect any warnings after reordering.
            </li>
            <li>
              <strong>Duplicate:</strong> create a separate copy. Move or edit
              the copy before treating it as another feature; it initially
              shares the original location.
            </li>
            <li>
              <strong>Mirror:</strong> supported cuts offer Mirror to Opposite
              End, Mirror Across Length, or Mirror Across Width. Inspect the new
              target, offsets, and handedness. The mirrored cut is independently
              editable.
            </li>
            <li>
              <strong>Delete:</strong> remove the operation. Undo restores an
              accidental deletion.
            </li>
          </ul>
          <p className="text-muted mb-4">
            For equal repeated holes, use a pattern instead of duplicating many
            operations. Use separate cuts when the holes need different depths,
            diameters, or labels. The available mirror actions depend on the
            cut.
          </p>
          <p className="text-muted mb-4">
            Edits are kept in the Part Cuts workspace while you work.{" "}
            <strong>Apply cuts</strong> commits them to the project; leaving
            with unsaved edits can prompt you to save or discard them. Saving
            the part is separate from saving the project to disk. Use Undo for
            an unintended change and inspect the preview again.
          </p>
          <p className="text-muted">
            After saving, inspect the assembled joint and review the{" "}
            <Link
              className="text-text underline underline-offset-4 decoration-primary"
              to="/docs/cut-lists#part-cut-instructions"
            >
              part-cut instructions
            </Link>
            . The cutting diagram describes the blank; the operations describe
            how that blank becomes the finished part.
          </p>
          <p className="text-muted mt-4">
            For keyboard editing, see the{" "}
            <Link
              className="text-text underline underline-offset-4 decoration-primary"
              to="/docs/shortcuts#part-cuts"
            >
              Part Cuts shortcut reference
            </Link>
            . Arrow-key steps in this workspace differ from the project grid;
            use measurement fields when you need an exact offset.
          </p>
        </section>
      </div>
      <DocsPrevNext />
    </section>
  );
}
