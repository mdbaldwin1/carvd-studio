import { Link } from "react-router-dom";
import SEO from "../../components/SEO";
import { createBreadcrumbSchema } from "../../utils/jsonLd";
import DocsPrevNext from "./DocsPrevNext";

const topics = [
  ["choose-workflow", "Choose a workflow"],
  ["matching-cuts", "Lay out matching cuts"],
  ["assembly-placement", "Bring pieces together"],
  ["inserts", "Dowels, biscuits & loose tenons"],
  ["check-fit", "Check the fit"],
  ["fabrication", "From model to shop"],
  ["terms", "Useful joint terms"],
  ["troubleshooting", "Troubleshoot a joint"],
];

export default function JoineryPage() {
  return (
    <section className="[&_p]:leading-relaxed [&_li]:leading-relaxed">
      <SEO
        title="Custom Cuts & Joinery - Docs"
        description="Lay out complementary woodworking joints, model real dowels and inserts, seat shoulders and housings, and check the fit before generating shop instructions."
        path="/docs/joinery"
        jsonLd={createBreadcrumbSchema([
          { name: "Docs", path: "/docs" },
          { name: "Custom Cuts & Joinery", path: "/docs/joinery" },
        ])}
      />
      <h2 className="text-4xl font-bold mb-md">Custom Cuts & Joinery</h2>
      <p className="text-muted mb-xl">
        Start with the boards you will actually use. Mark the faces and
        shoulders, remove material, then bring the pieces together to inspect
        the joint. Carvd keeps the blank, the cuts, and the placement as
        separate decisions, just as they are in the shop.
      </p>
      <nav aria-label="On this page" className="site-section p-6 mb-xl">
        <h3 className="font-bold mb-3">On this page</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {topics.map(([id, title]) => (
            <li key={id}>
              <a
                className="text-text underline underline-offset-4 decoration-primary hover:underline"
                href={`#${id}`}
              >
                {title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="grid gap-xl">
        <section id="choose-workflow" className="site-section p-6 scroll-mt-28">
          <h3 className="text-2xl font-bold mb-4">Choose a workflow</h3>
          <ul className="list-disc pl-5 space-y-3 text-muted">
            <li>
              <strong>Shape one board:</strong> select it and choose{" "}
              <strong>Edit Part Cuts</strong> in Properties or its context menu.
              Add a dado, rabbet, tenon, hole, end cut, or routing operation.
              Follow the{" "}
              <Link
                className="text-text underline underline-offset-4 decoration-primary"
                to="/docs/part-cuts"
              >
                Part Cuts guide
              </Link>{" "}
              for targets, measurements, and editing.
            </li>
            <li>
              <strong>Transfer one layout to two boards:</strong> select exactly
              two parts, then choose <strong>Lay out matching cuts…</strong>.
              This creates complementary geometry on both boards.
            </li>
            <li>
              <strong>Seat parts that already have the right shape:</strong>{" "}
              select two parts and choose{" "}
              <strong>Bring pieces together…</strong>. This changes their
              placement; it does not cut a mortise or trim a tenon for you.
            </li>
            <li>
              <strong>Make a socket for a real insert:</strong> select an insert
              part and its receiving board, then use{" "}
              <strong>Cut socket for insert…</strong>. The opening is based on
              the insert’s actual dimensions.
            </li>
            <li>
              <strong>Allow extra material only:</strong> use joinery allowances
              in part properties. An allowance changes the required blank
              dimensions; it does not create a visible joint.
            </li>
          </ul>
          <p className="mt-4 text-muted">
            For a particular construction, use the{" "}
            <Link
              className="text-text underline underline-offset-4 decoration-primary"
              to="/docs/joint-recipes"
            >
              joint recipes
            </Link>
            . Saving a reusable collection of parts is a different workflow: see{" "}
            <Link
              className="text-text underline underline-offset-4 decoration-primary"
              to="/docs/assemblies"
            >
              Assemblies
            </Link>
            .
          </p>
        </section>
        <section id="matching-cuts" className="site-section p-6 scroll-mt-28">
          <h3 className="text-2xl font-bold mb-4">Lay out matching cuts</h3>
          <ol className="list-decimal pl-5 space-y-3 text-muted">
            <li>
              Set both boards’ actual length, width, and thickness, and assign
              their stock. Give them useful names such as Drawer front and
              Drawer side.
            </li>
            <li>
              Select both boards with Shift-click or their checkboxes. Choose{" "}
              <strong>Lay out matching cuts…</strong> in Properties.
            </li>
            <li>
              Read the board roles at the top. Use <strong>Swap boards</strong>{" "}
              if the receiving board, rail, or tails are assigned to the wrong
              member.
            </li>
            <li>
              Choose the joint and enter the layout. The preview lays the boards
              flat so you can inspect the cuts independently of their current
              position.
            </li>
            <li>
              Resolve any message that prevents applying. Choose{" "}
              <strong>Apply matching cuts</strong>, then bring the parts
              together to check the assembled result.
            </li>
          </ol>
          <figure className="my-6">
            <a href="/screenshots/docs-joinery-layout.jpg">
              <img
                src="/screenshots/docs-joinery-layout.jpg"
                alt="Carvd’s matching joint dialog showing the two board roles, Box joint selection, fingers per board, and complementary cuts in the preview"
                loading="lazy"
                width="1415"
                height="768"
                className="w-full rounded-lg border border-border"
              />
            </a>
            <figcaption className="text-sm text-muted mt-2">
              Matching cuts share one layout. The preview is for inspecting the
              cuts, not the final assembled orientation. Select the image to
              view it at full size.
            </figcaption>
          </figure>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left [&_th]:p-3 [&_td]:p-3 [&_tr]:border-b [&_tr]:border-border">
              <caption className="text-left font-bold mb-3">
                Available matching layouts
              </caption>
              <thead>
                <tr>
                  <th scope="col">Joint</th>
                  <th scope="col">What to set and inspect</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Box joint</th>
                  <td>
                    Fingers per board. Check the fingers and spaces at both
                    edges.
                  </td>
                </tr>
                <tr>
                  <th scope="row">Through dovetail</th>
                  <td>
                    Tail count and slope in degrees. Check which board carries
                    tails and which carries pins.
                  </td>
                </tr>
                <tr>
                  <th scope="row">Half-blind dovetail</th>
                  <td>
                    Tail count, slope, and socket depth. Leave material between
                    the socket bottom and the show face.
                  </td>
                </tr>
                <tr>
                  <th scope="row">Mitred blind dovetail</th>
                  <td>
                    Tail count, slope, and mitred lip thickness. Inspect the lip
                    as well as the concealed interlock.
                  </td>
                </tr>
                <tr>
                  <th scope="row">Sliding dovetail</th>
                  <td>
                    Housing depth and housing center measured from the receiving
                    board’s left end. Tongue and housing share a slope; the
                    joint must have an open edge for assembly.
                  </td>
                </tr>
                <tr>
                  <th scope="row">Mortise and tenon</th>
                  <td>
                    Mortise face, tenon length and thickness, shoulder width,
                    and layout from the receiving board’s left end.
                  </td>
                </tr>
                <tr>
                  <th scope="row">Twin tenon</th>
                  <td>
                    The mortise-and-tenon dimensions plus the gap between the
                    two tenons.
                  </td>
                </tr>
                <tr>
                  <th scope="row">Haunched tenon</th>
                  <td>
                    The mortise-and-tenon dimensions plus haunch length. Check
                    the shallow haunch housing separately from the main mortise.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <h4 className="text-xl font-bold mt-6 mb-3">
            Check what each layout dimension measures
          </h4>
          <ul className="list-disc pl-5 space-y-3 text-muted">
            <li>
              <strong>Fingers per board / Tail count:</strong> these count
              different features. Inspect the preview after changing the joint
              type instead of assuming the same number produces the same
              spacing.
            </li>
            <li>
              <strong>Tail slope / Dovetail slope:</strong> enter degrees. A
              slope ratio such as 1:6 is not a degree value.
            </li>
            <li>
              <strong>Shoulder width:</strong> determines how much of the rail
              width is removed beside the tenon. For an ordinary tenon on a
              3-inch-wide rail, two 1/2-inch shoulders leave a 2-inch-wide
              tenon. Tenon thickness is a separate dimension through the rail’s
              thickness.
            </li>
            <li>
              <strong>Layout from receiving board’s left end:</strong> locates
              the start of the mortise layout. Sliding dovetail’s Housing center
              field instead locates its center. Check the label before
              transferring a measurement between these layouts.
            </li>
            <li>
              <strong>Mortise face:</strong> Front edge cuts into board width;
              Top face cuts into board thickness. These can allow very different
              socket depths on the same board.
            </li>
          </ul>
          <p className="text-muted mt-4">
            The paired tenon layouts create blind mortises and require material
            behind them. To model a through mortise, edit the resulting mortise
            in Part Cuts and choose Through, then inspect the tenon length and
            exit face. A haunch must remain shorter than the main tenon; twin
            tenons need enough wood on both sides of the gap. Read the dialog’s
            specific validation message when Apply matching cuts is unavailable.
          </p>
          <p className="mt-4 text-muted">
            The dialog marks the first board’s left end; end-to-end layouts mark
            both left ends. Reapplying a layout replaces cuts belonging to that
            pair’s layout and keeps unrelated cuts. Applying is one undoable
            change to both boards. Once applied, individual cuts can be edited
            separately: later changes to one board do not automatically remake
            its mate. Recheck both members after changing dimensions.
          </p>
        </section>
        <section
          id="assembly-placement"
          className="site-section p-6 scroll-mt-28"
        >
          <h3 className="text-2xl font-bold mb-4">Bring pieces together</h3>
          <p className="text-muted mb-4">
            Think of holding one board on the bench and offering the other up to
            it. Choose the two surfaces that should meet, then decide which
            edges should be flush.
          </p>
          <ol className="list-decimal pl-5 space-y-3 text-muted">
            <li>
              Select exactly two parts and choose{" "}
              <strong>Bring pieces together…</strong>. Read “Move … to …”;
              orange moves and blue stays in place. Use{" "}
              <strong>Swap boards</strong> to reverse them.
            </li>
            <li>
              Choose the <strong>Moving surface or shoulder</strong> and{" "}
              <strong>Receiving surface or opening</strong>. You can also click
              faces in the preview. A cut’s shoulder or socket opening is
              usually a better reference than the original blank face.
            </li>
            <li>
              Set <strong>Turn around the joint</strong> in quarter turns to
              orient the pieces around their meeting surfaces.
            </li>
            <li>
              Use the two <strong>Register</strong> controls to center the part
              or make it flush with the first or opposite edge of the receiving
              surface. “Along” and “across” refer to that surface, including
              when the board is rotated.
            </li>
            <li>
              When an opening is selected, set{" "}
              <strong>Insertion past the opening</strong>. Inspect the preview
              and its interference message, then choose{" "}
              <strong>Place the piece</strong>. Cancel leaves the project
              unchanged.
            </li>
          </ol>
          <p className="text-muted mt-4">
            For an exact full-thickness circular rule joint, choose the named
            <strong> Rule joint roundover</strong> and{" "}
            <strong>Rule joint cove</strong> references instead of the original
            blank edges. Both built-in profiles must have Size and Depth equal
            to the same board thickness, on opposite top/bottom edges. Keep the
            turn at 0 degrees and across registration centered; the helper
            accounts for the radius overlap. Saved/custom contours and profiles
            with reveals are not automatically fitted. See the{" "}
            <Link
              to="/docs/joint-recipes#rule-joint"
              className="text-text underline underline-offset-4 decoration-primary"
            >
              rule-joint worked example
            </Link>
            .
          </p>
          <figure className="my-6">
            <a href="/screenshots/docs-joinery-assembly.jpg">
              <img
                src="/screenshots/docs-joinery-assembly.jpg"
                alt="Real bridle joint assembly preview with Tenon shoulder meeting Open mortise at left end, centered registration, and insertion set to zero"
                width="1415"
                height="768"
                loading="lazy"
                className="w-full rounded-lg border border-border"
              />
            </a>
            <figcaption className="text-sm text-muted mt-2">
              This bridle joint seats the tenon shoulder against the open
              mortise end. Extra insertion is zero because the tenon already
              projects beyond its shoulder.
            </figcaption>
          </figure>
          <ul className="list-disc pl-5 space-y-2 text-muted">
            <li>
              <strong>Tenon shoulder → mortise opening:</strong> start with zero
              insertion.
            </li>
            <li>
              <strong>Plain shelf end → dado opening:</strong> insert by the
              housing depth.
            </li>
            <li>
              <strong>Tongue shoulder → groove opening:</strong> seat the
              shoulder; do not bury the full board edge.
            </li>
            <li>
              <strong>Rabbeted shelf tongue → dado opening:</strong> choose the
              end tongue's shoulder and zero extra insertion. Match the housing
              to the tongue thickness; a one-sided rebate leaves the tongue
              off-center in the original blank. See the{" "}
              <Link
                to="/docs/joint-recipes#rabbeted-dado"
                className="text-accent hover:underline"
              >
                rabbeted dado recipe
              </Link>
              .
            </li>
            <li>
              <strong>Rabbet seating face → matching seating face:</strong>{" "}
              inspect the ledges and turn before placing.
            </li>
            <li>
              <strong>Loose insert → socket:</strong> insert only the intended
              embedded portion; leave enough exposed for the second member.
            </li>
          </ul>
          <p className="mt-4 text-muted">
            Placement is not a permanent constraint. Moving one member later
            does not pull the others with it. Select all members or group the
            completed joint when you want to move or rotate it as a unit.
          </p>
        </section>
        <section id="inserts" className="site-section p-6 scroll-mt-28">
          <h3 className="text-2xl font-bold mb-4">
            Dowels, biscuits & loose tenons
          </h3>
          <p className="text-muted mb-4">
            Dowels and other inserts are real parts with stock assignments,
            dimensions, and positions. There is no separate Dowel display
            toggle. Select and move them like other parts; use Ghost or Wire
            view when you need to see a concealed insert.
          </p>
          <ol className="list-decimal pl-5 space-y-3 text-muted">
            <li>
              Add the appropriate prepared stock to the project and create the
              insert part. Check its diameter or cross-section and length before
              making the socket.
            </li>
            <li>
              Select the insert and one receiving board. Open the socket command
              and choose which end of the insert enters this board and which
              face receives it.
            </li>
            <li>
              Locate the <strong>center</strong> using the two named reference
              edges. Set <strong>Insert depth</strong>,{" "}
              <strong>Total width clearance</strong>, and{" "}
              <strong>Extra depth for glue</strong>.
            </li>
            <li>
              Inspect the socket preview and apply it. Clearance enlarges the
              whole opening’s width and thickness; it is not an amount added to
              each side, and it does not shrink the insert.
            </li>
            <li>
              Use <strong>Bring pieces together…</strong> to seat the insert.
              Repeat for the second board, using the other end or half. Keep the
              seated insert fixed when placing the second board.
            </li>
          </ol>
          <p className="text-muted mt-4">
            For biscuits, the two ends are the front and back halves.
            Receiving-face choices depend on the insert shape. A spline running
            along a board edge needs a matching groove; do not treat it as a
            short peg entering an end hole. Keep the socket’s width clearance
            separate from the space left at its bottom for glue.
          </p>
          <p className="text-muted mt-4">
            Check the insert’s actual shape as well as its name. Renaming a
            rectangular part “Biscuit” does not give it a biscuit profile. A
            biscuit-shaped part offers Front half and Back half; a dowel or
            loose tenon offers Right end and Left end. If an older project shows
            unexpected choices, inspect the insert and its stock before cutting
            a socket.
          </p>
          <h4 className="text-xl font-bold mt-6 mb-3">
            Read the socket measurements
          </h4>
          <p className="text-muted mb-4">
            In this imperial example, a 3/8-inch-diameter, 1-inch-long dowel
            enters a 3/4-inch-thick board. Its center is 6 inches from the left
            end and 3/8 inch from the bottom face, placing it halfway through
            the board’s thickness.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-muted">
            <li>
              <strong>Insert depth = 1/2 inch:</strong> half the dowel enters
              this board; the other half remains available for the second board.
            </li>
            <li>
              <strong>Total width clearance = 0.01 inch:</strong> the opening
              diameter becomes 0.385 inch. This leaves 0.005 inch on each side
              of a centered dowel, not 0.01 inch on each side.
            </li>
            <li>
              <strong>Extra depth for glue = 0.04 inch:</strong> the socket is
              0.54 inch deep while insertion stays at 0.5 inch. The extra space
              is beyond the tip, not around the dowel.
            </li>
          </ul>
          <p className="text-muted mt-4">
            These values illustrate the controls, rather than prescribe a fit
            for every material or tool. Check the actual insert and a test cut
            before choosing production clearances. Changing the receiving face
            recenters the socket on that face; recheck both center measurements.
          </p>
          <figure className="my-6">
            <a href="/screenshots/docs-insert-socket.jpg">
              <img
                src="/screenshots/docs-insert-socket.jpg"
                alt="Dowel socket dialog showing the receiving Front edge, center measurements of 6 and 3/8 inches, half-inch insertion, 0.01-inch total clearance, and 0.04-inch glue space"
                width="1415"
                height="768"
                loading="lazy"
                className="w-full rounded-lg border border-border"
              />
            </a>
            <figcaption className="text-sm text-muted mt-2">
              Preview a socket from a real dowel part. The receiving board’s
              existing cuts remain visible alongside the proposed socket. Apply
              socket adds the cut; Bring pieces together seats the insert.
              Select the image to enlarge it.
            </figcaption>
          </figure>
          <p className="text-muted mt-4">
            Stock included in a project can remain local to that project. An
            invitation to import it into your library is for future reuse;
            skipping the import does not remove the project’s stock. See{" "}
            <Link
              className="text-text underline underline-offset-4 decoration-primary"
              to="/docs/stock"
            >
              Stock Materials
            </Link>
            .
          </p>
        </section>
        <section id="check-fit" className="site-section p-6 scroll-mt-28">
          <h3 className="text-2xl font-bold mb-4">
            Check the fit from more than one view
          </h3>
          <ol className="list-decimal pl-5 space-y-3 text-muted">
            <li>
              Focus the selected members with <kbd>F</kbd>. Inspect an outside
              view for flush faces and a second view for depth.
            </li>
            <li>
              Use Ghost or Wire to inspect hidden shoulders, socket bottoms, and
              insert embedment.
            </li>
            <li>
              Enable <strong>Snap</strong> for compatible part and cut
              alignment. Drag a member slightly away, then offer it back toward
              the joint. A snap helps place compatible geometry; it does not
              resize a bad fit.
            </li>
            <li>
              If Properties offers a fit action, read which member it will
              resize. Check the result and any clearance before moving the
              pieces together.
            </li>
            <li>
              For a rotated assembly, select all its members and rotate them
              together. For members at different angles, align their meeting
              faces first. Translation snapping cannot straighten a tilted tenon
              inside a rectangular mortise.
            </li>
          </ol>
          <p className="text-muted mt-4">
            While crossed-slot dividers are engaged, dragging follows their
            shared slot direction. Lift the divider completely above the other
            piece before moving it freely sideways. Partly withdrawn slots can
            still catch at their corners during a diagonal drag.
          </p>
          <p className="text-muted mt-4">
            With Prevent Overlap enabled, a matching round pin already seated in
            a hole follows the drilled axis as you drag it. Withdraw it fully
            before moving it sideways. This guidance applies to holes drilled
            square to the part face; angled holes do not receive this drag
            guide.
          </p>
          <p className="text-muted mt-4">
            With Prevent Overlap enabled, an exact centered roundover/cove rule
            joint also follows its withdrawal direction while engaged. A nearby
            correctly oriented pair can return to its centered seat; this guide
            does not rotate the leaf or simulate a hinge. It applies only to
            equal full-thickness built-in circular profiles. Withdraw fully to
            move freely sideways, or hold Shift to bypass the guide. Normal
            collision checks still apply.
          </p>
          <p className="text-muted mt-4">
            Review joint-fit warnings even when the difference is small. An
            interference warning means the modeled mate is larger than its
            opening; a loose-fit advisory is not a recommended glue clearance.
            Set the clearance for the joint, material, and tools you are using,
            then verify it with a test piece.
          </p>
          <p className="text-muted mt-4">
            A clear preview means the modeled parts do not interfere in that
            placement. It does not establish joint strength, manufacturing
            tolerance, or a practical assembly path. A sliding dovetail still
            needs to enter from an open edge. Plan which pieces go together
            first and how clamps and tools will reach them. For a hinged door or
            folding leaf, check the full travel separately: Carvd does not model
            a hinge pivot, swing limits, or a swept motion envelope. An overlap
            check at the closed position cannot establish clearance while open.
            See{" "}
            <Link
              className="text-text underline underline-offset-4 decoration-primary"
              to="/docs/snapping#joint-alignment"
            >
              joint alignment and rotated parts
            </Link>
            .
          </p>
        </section>
        <section id="fabrication" className="site-section p-6 scroll-mt-28">
          <h3 className="text-2xl font-bold mb-4">From model to shop</h3>
          <p className="text-muted mb-4">
            Apply cuts to commit the edited cuts, then save the project file.
            Open <strong>View Cut List</strong> after changing dimensions or
            operations. The report starts with the blank and includes the part’s
            cut instructions. Read the named face, reference edges, dimensions,
            depth or Through setting before exporting. The listed operations are
            a record of the modeled cuts, not an automatically planned machining
            sequence. Decide when to establish reference faces, cut joinery,
            glue up, and apply edge profiles for your actual tools.
          </p>
          <p className="text-muted mb-4">
            Resolve blocking errors before exporting a PDF. If a report is out
            of date, regenerate it so the instructions match the current model.
            Keep allowances intentional: extra blank material is not a
            substitute for a modeled tenon, and adding an allowance to a blank
            that already includes it can leave more material than intended.
          </p>
          <p className="text-muted">
            Custom Cuts records finished geometry and shop instructions. It does
            not produce CNC toolpaths or G-code. Check cutter access, corner
            shape, actual material thickness, and the fit on a test piece.
            Continue with{" "}
            <Link
              className="text-text underline underline-offset-4 decoration-primary"
              to="/docs/cut-lists"
            >
              Cut List Generation
            </Link>
            .
          </p>
        </section>
        <section id="terms" className="site-section p-6 scroll-mt-28">
          <h3 className="text-2xl font-bold mb-4">Useful joint terms</h3>
          <dl className="grid gap-4 text-muted sm:grid-cols-2">
            <div>
              <dt className="font-bold text-text">Blank</dt>
              <dd>
                The starting piece of material before the modeled operations
                remove wood. Its dimensions drive the stock requirement.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-text">Shoulder</dt>
              <dd>
                The step where a tenon or tongue joins the full section of the
                board. A seated shoulder can stop at the socket opening while
                the projection extends inside.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-text">Cheek</dt>
              <dd>
                A broad side of a tenon. Check the fit of the cheeks as well as
                the contact at the shoulders.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-text">Housing or socket</dt>
              <dd>
                The opening that receives another part, such as a dado for a
                shelf, a mortise for a tenon, or a bore for a dowel.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-text">Registration</dt>
              <dd>
                How parts line up along a meeting surface: centered, flush with
                the first edge, or flush with the opposite edge.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-text">Insertion</dt>
              <dd>
                How far the selected moving reference passes the opening. A tip
                and a shoulder are different references, so the same insertion
                value will not place them identically.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-text">Total width clearance</dt>
              <dd>
                The difference between an insert and the full width of its
                opening. For a centered 0.25-inch insert in a 0.26-inch opening,
                total clearance is 0.01 inch, leaving 0.005 inch on each side.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-text">Extra depth for glue</dt>
              <dd>
                Space beyond the embedded tip. It adds socket depth without
                increasing the amount of insert buried in the board.
              </dd>
            </div>
          </dl>
        </section>
        <section id="troubleshooting" className="site-section p-6 scroll-mt-28">
          <h3 className="text-2xl font-bold mb-4">Troubleshoot a joint</h3>
          <dl className="space-y-4 text-muted">
            <div>
              <dt className="font-bold text-text">The command is missing</dt>
              <dd>
                Select exactly two parts for layout or placement. Socket
                creation also needs a supported insert part. Edit Part Cuts is a
                single-part command.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-text">
                The cut is on the wrong side
              </dt>
              <dd>
                Check the named target and its highlighted face. Face names
                follow the board when it rotates; camera left is not necessarily
                the board’s Left end.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-text">
                The parts look aligned but will not seat
              </dt>
              <dd>
                Check the tenon’s full cross-section, the mortise depth, and
                whether the faces are parallel. Use a shoulder reference instead
                of the tip; check that insertion is not being counted twice.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-text">
                The joint changed after resizing a board
              </dt>
              <dd>
                Inspect the cuts on both members. Matching layout does not
                continuously drive the mate. Reapply the shared layout where
                appropriate, or edit both cuts to the new dimensions.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-text">
                The preview reports interference
              </dt>
              <dd>
                Inspect remaining material and unrelated cuts on both boards.
                Check registration, turn, and insertion. Correct the geometry or
                placement instead of assuming the blank outlines describe the
                joint.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-text">
                A long insert seats into the wrong opening
              </dt>
              <dd>
                Use explicit assembly references and swap which member moves.
                Confirm the selected end or half of the insert and the receiving
                face.
              </dd>
            </div>
          </dl>
        </section>
      </div>
      <DocsPrevNext />
    </section>
  );
}
