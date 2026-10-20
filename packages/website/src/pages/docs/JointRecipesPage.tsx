import { Link } from "react-router-dom";
import SEO from "../../components/SEO";
import { createBreadcrumbSchema } from "../../utils/jsonLd";
import DocsPrevNext from "./DocsPrevNext";

const recipes = [
  [
    "butt-edge",
    "Butt joints & edge glue-ups",
    "Start with square-ended boards at their actual finished dimensions. A plain butt joint meets an end to a face or another end. An edge glue-up meets the long edges. Neither needs a modeled socket unless you are adding reinforcement.",
    "Use Bring pieces together with the actual meeting faces. For a simple face contact, use zero insertion and register the outside faces or ends flush. Check which board moves before placing it.",
    "Inspect the complete contact surface and the overall width or length. A flush outside corner can hide a gap elsewhere. Add wooden dowels, biscuits, and splines as parts with their receiving cuts, and purchased fasteners as shopping items; naming the joint does not add reinforcement.",
  ],
  [
    "housing",
    "Dados, grooves & housed joints",
    "Cut the housing into the receiving board; match its width to the entering shelf or rail. Use a dado across the face and a groove along the board. Set the depth deliberately so there is enough wood behind the housing.",
    "For a plain entering end, choose the housing opening and insert by its depth. Check flush faces and the remaining wall. A housed full lap has one deeper member receiving the other; it is not two half-depth cuts.",
    "For stopped dados or grooves, inspect each stop and the end shape. A square-ended shelf cannot fully enter a rounded stopped end without a corresponding allowance or shaped corner.",
  ],
  [
    "rabbets",
    "Rabbets, shiplap & tongue-and-groove",
    "A rabbet makes a ledge open to an edge. Shiplap uses opposing rabbets. A tongue can be formed by matching cuts above and below an edge, leaving a central projection; its mate is a groove.",
    "Use rabbet seating faces for shiplap and the tongue shoulder against the groove opening for tongue-and-groove. Check the width of the tongue itself, not the thickness of the whole blank.",
    "For two 3/4-inch-thick boards, 1/4-inch-deep cuts above and below an edge leave a 1/4-inch tongue. A 1/4-inch groove positioned 1/4 inch from Bottom centers the mate. Choose projection and groove depth separately and allow the intended clearance.",
  ],
  [
    "rabbeted-dado",
    "Rabbeted dado",
    "Rabbet the entering shelf end so a thin tongue enters a narrow dado while the shoulder rests on the receiving face. For an 8-inch-wide, 3/4-inch-thick shelf, a Bottom Face cutout running 1/4 inch from the left end, across the full 8-inch width, and 1/2 inch deep leaves a 1/4-inch-thick tongue projecting 1/4 inch.",
    "Cut a 1/4-inch-wide dado at least as deep as the tongue projects. Bring the tongue shoulder at the left end to the dado opening with zero extra insertion. The tongue is offset toward the shelf's top face, so centering the whole 3/4-inch end in the dado would be wrong.",
    "Check the shoulder contact and tongue clearance in an oblique view. Fit the housing to the remaining tongue thickness. Automatic end-tongue recognition requires a straight, full-width blind rebate at the end; partial-width reliefs, angled ends, and other cuts through the tongue need individual inspection.",
  ],
  [
    "laps",
    "Half laps, T-laps, end laps & crossed grids",
    "Cut away complementary material where members overlap. Use a half-lap preset or a carefully sized housing. Cross laps and egg-crate grids need slots positioned to coincide at every crossing.",
    "Inspect both outside faces and the bottom of each lap. Equal-thickness members can each lose half their thickness; unequal members need depths calculated from the desired final surfaces.",
    "For mitred half laps or dovetailed lap splices, model the additional end geometry or routed shape explicitly. A rectangular half lap alone does not make either joint.",
  ],
  [
    "dovetailed-lap",
    "Worked example: a dovetailed lap splice",
    "Start with two 12 × 3 × 3/4-inch boards. On Board B's Top Face, make a blind Mortise with Run Along Blank 1 1/2 inches, Cross-Cut Width 2 inches and Blind Depth 3/8 inch. Place it 10 1/2 inches from Left and 1/2 inch from Back. Expand Dovetail shaping and set Tail Splay to −10 degrees, leaving both wall angles at zero. The socket narrows toward the right end in the plane of the face; its walls remain square through its depth.",
    "On Board A, add a Bottom Face Half Lap with a 1 1/2-inch run starting at the left end. Then add two Top Face blind Cutouts, each 1 1/2 × 1/2 inch and 3/8 inch deep, with Tail Splay +10 degrees. Both start at zero from Left; place one zero from Back and the other 2 1/2 inches from Back. These are the waste cuts on either side of the remaining tongue. Keep both boards unrotated and put their centers at B (0, 3/8, 0) and A (10 1/2, 3/8, 0) inches. Their full-thickness surfaces finish flush over a 1 1/2-inch overlap.",
    "Lift Board A above the open socket to assemble or separate this lap. Its tapered cheeks prevent pulling it out along the boards' length; it is not an undercut sliding dovetail that enters along a groove. With overlap prevention enabled, check that longitudinal movement is blocked, lift and reseat the tongue, and verify Undo/Redo. Group both pieces before rotating the assembly, then ungroup to check the individual fit. Exact placement for this worked example uses Position fields; no dedicated splice-alignment preset is required. The report should list two wooden blanks, the socket's narrowing taper, the underside half lap, and two widening waste cuts with their separate edge offsets.",
  ],
  [
    "mitred-half-lap",
    "Worked example: a mitred half lap with a partial-thickness lip",
    "Start with two 12 × 3 × 3/4-inch boards, a rail and a stile. On each Right End, add a 45-degree Mitre and enable Cut only a lip. Set Band Start From Bottom to 3/8 inch and Band End From Bottom to 3/4 inch: only the upper half is mitred. Set the rail's Long Point On to Back and the stile's to Front. On the stile, also add a Bottom Face Half Lap, with a 3-inch run starting 9 inches from the left end. Its 3/8-inch depth removes the lower half at that end; the rail's lower half remains to form the receiving lap.",
    "Keep the rail unrotated and turn the stile 90 degrees around Y. For a reproducible centered placement, put the rail at (0, 3/8, 0) inches and the stile at (4 1/2, 3/8, 4 1/2). The prepared right ends meet at a right-angle corner. Inspect from above and below: the upper lips form the mitred seam, while the retained lower material fills the stile's lap. A full-thickness mitre would remove the support this construction needs.",
    "Check that each mitre's operation summary and report includes the 3/8-to-3/4-inch cut band measured from Bottom; a plain 45-degree instruction is incomplete. Inspect the lap floor in Ghost or Wire. Withdraw and re-seat the stile, then use Undo and Redo to check that the original seat returns. Select both members together before tilting the assembly so their relationship stays intact. Regenerate the fabrication report after edits and reopen the saved project before using the dimensions in the shop.",
  ],
  [
    "tenons",
    "Mortise-and-tenon, twin & haunched tenons",
    "Start with Lay out matching cuts for the supported paired layouts. Choose the rail and receiver, mortise face, tenon length and thickness, shoulder width, and position. Twin layouts add a gap; haunched layouts add a shallow projection and housing.",
    "Bring the tenon shoulder to the mortise opening with zero extra insertion. Inspect all shoulders and the socket bottom. A through mortise should be marked Through; a blind mortise must leave the intended wall.",
    "A wedged through tenon also needs room for its wedge and the corresponding cuts. A pegged joint needs aligned holes through the assembled members and a real peg part. These additions are separate operations, not implied by the tenon preset.",
  ],
  [
    "bridle",
    "Bridle & open mortise",
    "Make an open-ended socket in one member and a complementary tenon on the other. Check that the socket really reaches the end instead of leaving a thin closing wall.",
    "Choose Tenon shoulder and Open mortise at left or right end as appropriate. Begin with zero insertion and inspect the cheeks from an oblique view.",
    "A bridle can be an end-to-end splice or corner construction depending on the cut layout and meeting orientation. The names alone do not set that orientation.",
  ],
  [
    "pegged-tenon",
    "Worked example: a pegged mortise and tenon",
    "Make a 16 × 1 3/4 × 1 3/4-inch leg and a 12 × 3 × 3/4-inch rail. On the leg's Top Face, add a 2 × 1/4-inch Mortise, 1 1/16 inches deep, 12 inches from Left and 3/4 inch from Back. Add a 1/4-inch Through Round Hole on Front Face: Primary 5 inches from center toward Right, Secondary 3/8 inch from center toward Top. On the rail, first add a 1/4-inch Through Round Hole on Top Face at Primary 5 1/2 inches toward Right and Secondary zero. Then add a Right End Tenon, 1 inch long, 2 inches wide and 1/4 inch thick, with Shoulder Offset 1/2 inch. Keeping the bore before the cheek cuts makes the drilling operation explicit in the report.",
    "For the un-tilted example, set the leg center to (0, 8, 0) inches with Z rotation 90 degrees. Set the rail center to (−5 7/8, 13, 0) with X rotation 90 degrees. The shoulder seats against the leg and the tenon has 1/16 inch of extra mortise depth. Create a separate 2 1/2-inch-long part using actual 1/4-inch wooden dowel stock; its round shape and diameter come from that stock. Give the peg Y rotation 90 degrees and center (−3/8, 13, 0). Inspect both bores with Ghost before inserting it. Rotate all three members together to keep the holes aligned when tilting the assembly.",
    "Withdraw the peg before pulling the rail out. With overlap prevention enabled, an inserted peg blocks rail withdrawal, including a large mouse drag; after clearing the peg, withdraw and reseat the rail and check Undo/Redo. The report should contain three wooden blanks, one mortise, two through bores and one tenon. Buy the peg stock in rods of the stated diameter, not as rectangular lumber or a steel bolt. This example has coaxial bores: it does not model drawboring, intentional hole offset, peg bending or clamping force. Choose actual fit and machining allowances for your shop separately.",
  ],
  [
    "interlocking",
    "Box joints & dovetails",
    "Use Lay out matching cuts for box, through dovetail, half-blind dovetail, or mitred blind dovetail. Confirm which board has tails or fingers, set count and slope where applicable, and inspect both edges.",
    "Bring the prepared ends together and inspect both the visible arris and the concealed interlock. For a half-blind joint, also inspect the material left behind the sockets.",
    "A blind or mitred lip can make a joint look closed from outside while an internal cut is wrong. Use Ghost or Wire to inspect the hidden surfaces. Recheck both boards after editing either layout.",
  ],
  [
    "sliding",
    "Sliding dovetail",
    "Choose Sliding dovetail in matching cuts. Set housing depth, slope, and the housing center measured from the receiver’s left end. The complementary tongue is made on the shelf’s left end.",
    "Align the tongue and housing and inspect their cross-sections. Plan to slide the tongue in from an open edge.",
    "A finished assembled preview does not prove that the joint can be pushed straight through its narrow opening. Consider the actual insertion direction and any stops.",
  ],
  [
    "inserts",
    "Dowels, pins, biscuits, loose tenons & splines",
    "Create the insert as a stock-backed part. Use its actual shape to make sockets, then seat the insert and the second board. For a long loose spline, make grooves along the mating edges.",
    "Check the intended embedment into each member, clearance, and any extra depth for glue. A centered spline should engage both grooves without bottoming out.",
    "A biscuit uses its front and back halves; a dowel enters along its length. Keep the first seated member fixed while bringing the second to it. See the detailed insert workflow in the main guide.",
  ],
  [
    "mitres",
    "Mitres, compound mitres & scarf splices",
    "Add end cuts to the appropriate ends. Set the mitre and, for a compound cut, the bevel. Check Long Point On and High Point On before making the mate.",
    "Use the cut end faces as assembly references and inspect the complete seam. Rotate all members together when placing the finished assembly at an angle.",
    "A scarf needs matching sloped surfaces with adequate overlap. A splined mitre additionally needs matching grooves and a separate spline; end cuts alone do not create the reinforcement.",
  ],
  [
    "birdsmouth",
    "Worked example: a birdsmouth seat at 45 degrees",
    "Make a 14 × 3 × 1 3/4-inch rafter. In Part Cuts, add Routed Path on Bottom Face and choose a 90-degree V-bit with a 1-inch cutter diameter and 1/2-inch route depth. Measure the path coordinates from the face center: run from (−3, −1.6) to (−3, 1.6) inches. The first coordinate stays fixed along the rafter; the second crosses its full 3-inch width and extends 0.1 inch beyond each edge. This makes the V across the width, not along the rafter. Then set the rafter's center to (0, 6, 0) inches and its Z rotation to 45 degrees.",
    "Make a separate plate 10 inches long, 0.7071067812 inch wide, and 1 1/2 inches thick. Set its Y rotation to 90 degrees and its center to (−1.50260191, 2.86351461, 0) inches. These coordinates place the plate against the modeled seat and heel; enter them in Properties rather than relying on automatic Assembly recognition. Inspect both contact surfaces with Ghost or Wire. In this example both parts use 8/4 White Oak stock entered at its actual 1 3/4-inch thickness; the thinner plate requires preparation to 1 1/2 inches, which must appear in the fabrication report.",
    "Withdraw and re-seat the rafter, then check Undo and Redo before rotating both members together. Inspect the remaining rafter section and the actual contact from two views. This is a geometric seating demonstration, not a structural roof design, allowable-notch calculation, or approval of a cutter or machining method. Choose structural dimensions and a safe shop process separately; a clean preview alone establishes neither.",
  ],
  [
    "keys",
    "Keys and splined mitres",
    "For an external key, prepare and assemble the mitred members, then make a slot crossing the seam. For a concealed spline, prepare matching grooves in the mitred faces before bringing the members together. Create the key or spline as a separate stock-backed part; insert a concealed spline while the joint is open. The opening must continue correctly into both members.",
    "Place the insert so it bridges the seam and engages both slots. Inspect its thickness, its depth below the outside face, and any intended protrusion for trimming. Withdraw an external key before separating the boards: an installed key should prevent sideways movement through its slot walls. For precise mitre reseating, select the two boards and use Bring pieces together with their actual mitred ends. A freehand drag can lift a board over an obstruction instead of returning it to the joint. For a thin insert that is difficult to grab, select its name in the Parts list and use Position fields; check that you have not grabbed a resize handle.",
    "A decorative strip laid over an uncut corner is not a keyed joint. Check the material removed from each member and make sure the key can enter the opening. End-face Routed Path coordinates remain referenced to the original square end after a mitre. The displayed route depth is therefore not a plunge depth measured from the mitred face. The fabrication report flags these operations as requiring a shop setup; establish the actual slot depth, entry direction, and tooling separately.",
  ],
  [
    "wedges",
    "Wedged tenons and fox wedges",
    "Make the tenon and mortise, then add the wedge kerfs and separate tapered wedges. A fox-wedged construction uses a blind undercut socket; a wedged through tenon has an opening through the receiver and can stand proud.",
    "Use an exploded or pre-driving view to show the kerfs, wedges, and socket geometry. Start only the narrow tips in the kerfs, leaving the wider heads outside. A wedge whose thick end is no wider than the kerf cannot spread the tenon. The example bench uses 1/4-inch wedge heads with 1/8-inch kerfs; these are demonstration dimensions, not a universal fit recommendation.",
    "Carvd models rigid shapes and their placement, not the elastic spreading of wood as wedges are driven. Further insertion of a spreading wedge therefore meets a material collision in the model. Do not shrink the wedge merely to make a fully driven model pass collision checks. Establish the actual wedge travel, socket relief, grain direction, and assembly sequence separately. Prepare small wedges on a larger workpiece with a suitable shop setup rather than interpreting the modeled mitre as instructions to hold a tiny loose blank against a saw.",
  ],
  [
    "fasteners",
    "Pocket holes, countersunk cleats & cross dowels",
    "For a pocket hole, use an angled round operation with a stepped counterbore for the screw head. For a cleat, use countersunk holes and a linear pattern. A cross-dowel connection needs an end passage for the bolt and a perpendicular bore for the barrel nut.",
    "Butt or register the wood members as intended, then inspect the hole axes through both members. Add the complete bolt and matching barrel nut as purchased hardware in the Shopping tab. Do not represent metal hardware with dowel stock: that generates rod-cutting instructions. Hardware shopping items are not shown in 3D.",
    "Use Drill angle from face: 90 degrees drills square into the face, while a 15-degree pocket hole runs nearly along it. Check Drill direction across face as well as the drill angle. A countersink is conical; a counterbore has a flat shoulder. For a cross dowel, the bolt passage must meet the barrel’s cross bore.",
  ],
  [
    "hinges",
    "Hinge mortises and shelf-pin holes",
    "Use a shallow edge-opening recess for a hinge leaf. Match its length, width, depth, and corner treatment to the intended leaf. Use a round-hole pattern for shelf pins, located from a consistent reference on each side panel.",
    "Inspect opposing hinge recesses in an exploded view, or align the side panels to compare their hole patterns. Confirm that the first and last pin holes line up at the same height.",
    "A hinge recess does not create a functioning hinge or test a door swing. A hole pattern does not create the pins automatically. Add separate parts where those shapes are needed in the design.",
  ],
  [
    "rule-joint",
    "Worked example: a full-thickness circular rule joint",
    "Make a tabletop and leaf, each 12 × 8 × 3/4 inches. Add the built-in Roundover to the tabletop's Top Front Edge and the built-in Cove to the leaf's Bottom Back Edge. Set both Size and Depth to 3/4 inch on both profiles. This exact pair has complementary circular surfaces through the full thickness; naming an imported or custom curve Roundover or Cove does not establish a match.",
    "Select the two parts and choose Bring pieces together. With one unambiguous matching pair, the helper keeps the rounded tabletop fixed and moves the coved leaf. Choose Rule joint cove — bottom back edge as the moving reference and Rule joint roundover — top front edge as the receiving reference. Keep Turn around the joint at 0 degrees and Register across at Center. The profiled references seat with 3/4 inch of blank overlap, rather than merely bringing the original rectangular edges together. Register along can center the leaf or make its end flush. Inspect the curved seam with Ghost or Wire before placing it.",
    "With Prevent Overlap enabled, a centered, engaged pair follows its withdrawal direction during an ordinary single-part drag. Near its exact centered seat, a correctly oriented leaf can snap back without lifting. Withdraw fully before moving freely sideways; Shift bypasses the guide. This support covers equal full-thickness circular built-ins on opposite top/bottom edges, including a rigidly rotated assembly. It does not fit unequal radii, profiles with reveals, saved/custom contours, or simulate hinges. A closed static seam does not establish hinge travel or machining clearance; choose and test those separately.",
  ],
  [
    "profiles",
    "Beaded boards & scalloped corners",
    "A beaded board adds a decorative edge profile to an already formed tongue-and-groove joint. A scallop-and-dowel corner needs rounded fingers, matching sockets, and pin holes.",
    "Inspect the profile cross-sections and the mating surfaces. For scalloped corners, inspect the fingers before locating the pin holes through the assembled corner.",
    "The visible bead or curved edge does not replace the underlying joint. Profile contact in a static view does not demonstrate hinge travel or flexing. Keep pin parts distinct from the holes that receive them.",
  ],
  [
    "scallop-dowel",
    "Worked example: a scallop-and-dowel corner",
    "Make a 12 × 4 × 3/4-inch front and a 12 × 4 × 1-inch side. Assign real wood stock and retain the preparation instruction for milling the side to 1 inch. On the front's Top Face, add a 1-inch Round Hole, Blind Depth 1/2 inch, Offset Along Face −5 1/2 inches and Offset Across Face −1 1/2 inches. Use a Linear repeating pattern: 3 holes, 1 1/2-inch spacing, Direction 90 degrees. Duplicate that operation, change the diameter to 1/4 inch and depth to Through for the coaxial pin bores.",
    "On the side's Left End, add a Flat Bottom Routed Path with Cutter Diameter 0.28 inch and Route Depth 0.502 inch. Expand Circle jig, set Radius to bit center to 5/8 inch, Pivot along face to −1 1/2 inches and Pivot across face to zero, then Apply circle. Duplicate for two more fingers, applying circles at pivots zero and +1 1/2 inches; re-enter the 5/8-inch radius each time. Add two Top Face Through Cutouts, each 1/2 × 1/2 inch, zero from Left, at 1 inch and 2 1/2 inches from Back, to clear the waste between fingers. Finally add a Left End 1/4-inch Round Hole, Blind Depth 1 inch, Offset Along Face −1 1/2 inches and Offset Across Face zero, with a 3-hole Linear pattern at 1 1/2-inch spacing and Direction zero. These model dimensions include a small clearance; choose actual cutters and a supported jigging method separately.",
    "Put the front center at (0, 3/8, 0) inches with zero rotation and the side center at (−5 1/2, 6.255, 0) with Z rotation 90 degrees. Make three separate 1 1/4-inch-long parts from actual 1/4-inch wooden dowel stock. Give them Z rotation 90 degrees and centers (−5 1/2, 5/8, −1 1/2), (−5 1/2, 5/8, 0), and (−5 1/2, 5/8, 1 1/2). Approach through the front's underside bores; moving a pin sideways through the board is not an insertion path. Inspect the rounded fingers, sockets and pins in an exploded or Ghost view, then check withdrawal, reseating and Undo/Redo. These coaxial pins do not prevent withdrawal along their own axes in the rigid model; glue strength and friction are not simulated. The report must include two board blanks, three round pins, both drilling patterns, all finger routes and both clearance cuts, plus side-stock preparation. Buy wood rods of the stated diameter, not metal fasteners or rectangular strips.",
  ],
  [
    "t-slot-runner",
    "Worked example: a captive wooden T-slot runner",
    "Start with a 12 × 3 × 3/4-inch rail. In Part Cuts, add Routed Path on Top Face and choose the T-Slot bit. Set Cutter Diameter to 1/2 inch, Shank Diameter to 1/4 inch, Cutter Height to 3/16 inch, and Route Depth to 7/16 inch. With coordinates measured from the face center, route from (−6, 0) to (5, 0), leaving the left end open for entry.",
    "Make a separate wooden runner 4 inches long, 0.47 inch wide, and 0.1675 inch thick. These example clearances leave 0.03 inch across the buried channel and 0.02 inch above the runner; adjust them for your material and machining. Assign stock that represents the prepared thin strip, and record any milling needed to produce it. A wooden runner belongs in the cut list; a purchased metal T-nut belongs in purchased hardware.",
    "The channel floor is 5/16 inch above the rail's bottom face. Put the runner's bottom on that floor and center its width on the route. Inspect with Ghost or Wire: the runner must fit below the narrow opening and must enter from the open end. Do not treat a placement preview as proof that the runner can be lowered through the slot. Review the route dimensions and the prepared strip separately in the fabrication report.",
  ],
  [
    "cutter-sampler",
    "Worked example: a cutter and edge-profile sampler",
    "Create a 12 × 14 × 3/4-inch board from purchased pre-glued oak panel stock, and a separate 12 × 6 × 3/4-inch walnut board. The wide panel is a purchased blank: Carvd does not generate its glue-up. On the oak board, add Top Face Routed Paths from −5 to +5 inches Along Face, with both endpoints at the same Across Face coordinate. Use the pass table below. Duplicate a pass to retain its endpoints, then change its label, profile, diameter, depth and both across-face coordinates. Flat Bottom represents the straight, mortising, spiral, compression and surfacing shapes; Round Bottom represents core-box and ball-nose shapes; V-Groove represents V-bit and engraving shapes. The label records your intent; it does not assign a physical cutter or its flute geometry.",
    "On the walnut board, add four Edge Profiles: Ogee on Top-Front Edge, Thumbnail on Top-Back Edge, and Rabbet on Bottom-Front Edge, each with Size and Depth 1/4 inch; use a custom stepped profile on Bottom-Back Edge with Size and Depth 3/8 inch. In Create Custom Profile, define its boundary in inches from Start (u=3/8, v=0), then straight segments to (3/8, 3/16), (3/16, 3/16), (3/16, 3/8), and (0, 3/8). The name Stepped bead describes this sample; its boundary is stepped, not a rounded bead. Add a Top Face 1/4-inch Through Round Hole centered at zero/zero. Choose Repeating Pattern → Around a circle, Hole Count 6, Pattern Radius 1 3/4 inches, and Start Angle zero. Keep the boards separated for inspection; this station is not a mating joint.",
    "Before the stopped dovetail route, add a Top Face 1/2-inch Round Hole, Blind Depth 3/8 inch, at Along Face −5 and Across Face 3 1/2 inches for cutter entry. The keyhole route models its entry opening automatically. Check every groove, the six separate holes and all four edge cross-sections. Exercise Undo/Redo, Apply cuts, save and reopen. Reports should list two blanks, thirteen oak operations (twelve routes plus the entry pocket), and five walnut operations. Generic edge profiles must retain the no-physical-tool-assigned note. The setup list can group equal geometric cutters together; it does not establish that a spiral and compression cutter are interchangeable or supply a machining sequence. Select actual tools, reach, entry/exit, workholding and pass depths separately. This is a geometry sampler, not a tool shopping list or machine program.",
  ],
  [
    "tracks",
    "T-slots and tambour tracks",
    "For a T-slot, use a routed path with a T-slot cutter profile and distinguish head diameter, shank diameter, cutter height, and route depth. For tambour, groove the opposing inside edges of the guides and create individual slats with the intended edge treatment and backing.",
    "Inspect the captive bar beneath the narrow T-slot opening and leave an open end or entry opening. For tambour, check that both slat ends enter their guides, with space for the backing and the intended movement.",
    "A straight groove does not produce a T-shaped undercut. A straight section of tambour does not prove that the slats and backing can negotiate a curved track. Model and check those clearances separately.",
  ],
];
export default function JointRecipesPage() {
  return (
    <section className="[&_p]:leading-relaxed">
      <SEO
        title="Woodworking Joint Recipes - Docs"
        description="Practical modeling recipes for housings, laps, mortise-and-tenon, bridle, dovetails, dowels, splines, mitres, and special joints in Carvd Studio."
        path="/docs/joint-recipes"
        jsonLd={createBreadcrumbSchema([
          { name: "Docs", path: "/docs" },
          { name: "Joint Recipes", path: "/docs/joint-recipes" },
        ])}
      />
      <h2 className="text-4xl font-bold mb-md">Joint Recipes</h2>
      <p className="text-muted mb-xl">
        Choose the construction, then work through the material removed, the
        surfaces that meet, and the fit you need to inspect. These are modeling
        recipes, not structural specifications. Use actual stock sizes and
        choose tolerances for your tools and material.
      </p>
      <nav aria-label="Joint families" className="site-section p-6 mb-xl">
        <ul className="grid gap-3 sm:grid-cols-2">
          {recipes.map(([id, title]) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="text-text underline underline-offset-4 decoration-primary hover:underline"
              >
                {title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <p className="text-muted mb-xl">
        New to the controls? Start with{" "}
        <Link
          to="/docs/part-cuts"
          className="text-text underline underline-offset-4 decoration-primary"
        >
          Part Cuts
        </Link>
        , then{" "}
        <Link
          to="/docs/joinery#matching-cuts"
          className="text-text underline underline-offset-4 decoration-primary"
        >
          matching layouts
        </Link>{" "}
        and{" "}
        <Link
          to="/docs/joinery#assembly-placement"
          className="text-text underline underline-offset-4 decoration-primary"
        >
          assembly placement
        </Link>
        .
      </p>
      <div className="grid grid-cols-1 gap-xl">
        {recipes.map(([id, title, cut, seat, check]) => (
          <section id={id} key={id} className="site-section p-6 scroll-mt-28">
            <h3 className="text-2xl font-bold mb-4">{title}</h3>
            <h4 className="font-bold mb-2">Make the cuts</h4>
            <p className="text-muted mb-4">{cut}</p>
            <h4 className="font-bold mb-2">
              {id === "cutter-sampler"
                ? "Make the profile board"
                : "Bring the pieces together"}
            </h4>
            <p className="text-muted mb-4">{seat}</p>
            <h4 className="font-bold mb-2">Check before calling it finished</h4>
            <p className="text-muted">{check}</p>
            {id === "cutter-sampler" ? (
              <>
                <div
                  className="overflow-x-auto my-6"
                  role="region"
                  aria-label="Cutter sampler machining dimensions"
                  tabIndex={0}
                >
                  <table className="w-full text-left text-sm">
                    <caption className="text-left font-bold mb-3">
                      Oak board passes — inches, coordinates from face center
                    </caption>
                    <thead>
                      <tr>
                        {[
                          "Pass / profile",
                          "Diameter",
                          "Across face",
                          "Depth",
                          "Extra dimensions",
                        ].map((label) => (
                          <th
                            key={label}
                            scope="col"
                            className="p-2 border-b border-border"
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        [
                          "Straight / Flat Bottom",
                          "1/4",
                          "−6 1/2",
                          "3/16",
                          "—",
                        ],
                        [
                          "Mortising / Flat Bottom",
                          "1/2",
                          "−5 1/2",
                          "3/16",
                          "—",
                        ],
                        [
                          "Spiral upcut / Flat Bottom",
                          "1/4",
                          "−4 1/2",
                          "3/16",
                          "—",
                        ],
                        [
                          "Spiral downcut / Flat Bottom",
                          "1/4",
                          "−3 1/2",
                          "3/16",
                          "—",
                        ],
                        [
                          "Compression / Flat Bottom",
                          "1/4",
                          "−2 1/2",
                          "3/16",
                          "—",
                        ],
                        ["Surfacing / Flat Bottom", "1", "−1 1/2", "1/16", "—"],
                        ["Core box / Round Bottom", "1/2", "−1/2", "3/16", "—"],
                        [
                          "Ball nose / Round Bottom",
                          "3/8",
                          "+1/2",
                          "3/16",
                          "—",
                        ],
                        [
                          "V bit / V-Groove",
                          "1/2",
                          "+1 1/2",
                          "3/16",
                          "90° included angle",
                        ],
                        [
                          "Engraving / V-Groove",
                          "1/8",
                          "+2 1/2",
                          "1/16",
                          "60° included angle",
                        ],
                        [
                          "Dovetail",
                          "1/2",
                          "+3 1/2",
                          "3/8",
                          "3/8 shank; 28° included angle (14° each side)",
                        ],
                        [
                          "Keyhole",
                          "1/2",
                          "+4 1/2",
                          "3/8",
                          "1/4 shank; 1/8 cutter height",
                        ],
                      ].map(([label, ...values]) => (
                        <tr key={label}>
                          <th
                            scope="row"
                            className="p-2 border-b border-border font-medium"
                          >
                            {label}
                          </th>
                          {values.map((value, index) => (
                            <td
                              key={index}
                              className="p-2 border-b border-border"
                            >
                              {value}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <figure className="my-6">
                  <a href="/screenshots/docs-cutter-sampler.png">
                    <img
                      src="/screenshots/docs-cutter-sampler.png"
                      alt="Native Carvd Studio showing twelve routed sample passes in an oak panel and six circularly arranged holes in a separate walnut edge-profile board"
                      width="3024"
                      height="1642"
                      loading="lazy"
                      className="w-full rounded-lg border border-border"
                    />
                  </a>
                  <figcaption className="text-sm text-muted mt-2">
                    Both boards were authored through the native editor and
                    saved and reopened. This view shows the top surfaces; orbit
                    beneath the walnut board to inspect its bottom profiles.
                    Select the image to enlarge it.
                  </figcaption>
                </figure>
              </>
            ) : null}
            {id === "scallop-dowel" ? (
              <figure className="my-6">
                <a href="/screenshots/docs-scallop-exploded.png">
                  <img
                    src="/screenshots/docs-scallop-exploded.png"
                    alt="Native Carvd Studio scallop corner lifted apart to show three rounded fingers, matching circular sockets and separate wooden dowel pins"
                    width="3024"
                    height="1642"
                    loading="lazy"
                    className="w-full rounded-lg border border-border"
                  />
                </a>
                <figcaption className="text-sm text-muted mt-2">
                  The side is lifted along the pin axes to expose the joint. All
                  five parts were created in the native editor; the finger
                  outlines use Circle jig and the bores use repeating patterns.
                  Select the image to enlarge it.
                </figcaption>
              </figure>
            ) : null}
            {id === "wedges" ? (
              <figure className="my-6">
                <a href="/screenshots/docs-fox-wedge-exploded.png">
                  <img
                    src="/screenshots/docs-fox-wedge-exploded.png"
                    alt="Real Carvd Studio exploded fox-wedge joint in Ghost view, exposing the blind mortise, short tenon kerfs and separate tapered wedges"
                    width="3024"
                    height="1642"
                    loading="lazy"
                    className="w-full rounded-lg border border-border"
                  />
                </a>
                <figcaption className="text-sm text-muted mt-2">
                  Native-created oak test pieces before assembly. Only the
                  narrow wedge tips enter the kerfs; the blind socket is exposed
                  in Ghost view. This is a pre-driving construction view, not a
                  simulation of the tenon spreading. Check the socket end-wall
                  angle in the fabrication instructions as well as its width and
                  depth. Select the image to enlarge it.
                </figcaption>
              </figure>
            ) : null}
            {id === "keys" ? (
              <figure className="my-6">
                <a href="/screenshots/docs-splined-mitre-tilted.jpg">
                  <img
                    src="/screenshots/docs-splined-mitre-tilted.jpg"
                    alt="Real Carvd Studio splined mitre tilted 60 degrees around Z, with Ghost view exposing the plywood spline inside both members"
                    width="3024"
                    height="1642"
                    loading="lazy"
                    className="w-full rounded-lg border border-border"
                  />
                </a>
                <figcaption className="text-sm text-muted mt-2">
                  Two mitred oak boards and a separate plywood spline, created
                  in the app and tested after rotating the assembly. Ghost view
                  exposes the insert across the seam. This verifies modeled fit;
                  the blank-referenced routes still require a separate shop
                  setup. Select the image to enlarge it.
                </figcaption>
              </figure>
            ) : null}
            {id === "pegged-tenon" ? (
              <figure className="my-6">
                <a href="/screenshots/docs-pegged-tenon-angled.jpg">
                  <img
                    src="/screenshots/docs-pegged-tenon-angled.jpg"
                    alt="Real Carvd Studio pegged mortise-and-tenon assembly tilted 30 degrees around X, with the wooden peg inserted through the leg and rail"
                    width="3024"
                    height="1642"
                    loading="lazy"
                    className="w-full rounded-lg border border-border"
                  />
                </a>
                <figcaption className="text-sm text-muted mt-2">
                  The native-created joint after rotating all three members
                  together by 30 degrees around X. The inserted wooden peg
                  blocks withdrawal of the rail. Select the image to enlarge it.
                </figcaption>
              </figure>
            ) : null}
            {id === "birdsmouth" ? (
              <figure className="my-6">
                <a href="/screenshots/docs-birdsmouth-angled.jpg">
                  <img
                    src="/screenshots/docs-birdsmouth-angled.jpg"
                    alt="Real Carvd Studio birdsmouth rafter seated on its plate, with the rafter at 45 degrees around Z and the whole pair additionally rotated 15 degrees around Y"
                    width="3024"
                    height="1642"
                    loading="lazy"
                    className="w-full rounded-lg border border-border"
                  />
                </a>
                <figcaption className="text-sm text-muted mt-2">
                  The seated pair after an additional 15-degree rotation around
                  Y, applied to both members together. The original 45-degree
                  rafter angle and seat relationship are retained. This view
                  demonstrates modeled contact, not structural suitability.
                  Select the image to enlarge it.
                </figcaption>
              </figure>
            ) : null}
            {id === "rule-joint" ? (
              <>
                <figure className="my-6">
                  <a href="/screenshots/docs-rule-joint-assembly.jpg">
                    <img
                      src="/screenshots/docs-rule-joint-assembly.jpg"
                      alt="Real Carvd Studio assembly dialog with the coved leaf moving to the rounded tabletop using the named rule-joint references, zero turn, and centered registration"
                      width="3024"
                      height="1642"
                      loading="lazy"
                      className="w-full rounded-lg border border-border"
                    />
                  </a>
                  <figcaption className="text-sm text-muted mt-2">
                    The named profiled references account for the circular
                    overlap. Orange moves; blue stays fixed. Check the curved
                    contact and the material-interference message before placing
                    the leaf. Select the image to enlarge it.
                  </figcaption>
                </figure>
                <figure className="my-6">
                  <a href="/screenshots/docs-rule-joint-tilted.jpg">
                    <img
                      src="/screenshots/docs-rule-joint-tilted.jpg"
                      alt="Real Carvd Studio rule-joint tabletop and leaf tilted together 45 degrees, with their closed seam retained and the coved leaf selected"
                      width="3024"
                      height="1642"
                      loading="lazy"
                      className="w-full rounded-lg border border-border"
                    />
                  </a>
                  <figcaption className="text-sm text-muted mt-2">
                    Both boards were tilted together as one rigid assembly. This
                    preserves the closed seam; it does not show the leaf
                    swinging on a hinge or establish hinge clearance. Select the
                    image to enlarge it.
                  </figcaption>
                </figure>
              </>
            ) : null}
            {id === "mitred-half-lap" ? (
              <figure className="my-6">
                <a href="/screenshots/docs-mitred-half-lap-tilted.jpg">
                  <img
                    src="/screenshots/docs-mitred-half-lap-tilted.jpg"
                    alt="Real Carvd Studio mitred half-lap corner tilted 45 degrees, with the stile selected and its 12 by 3 by 3/4-inch dimensions visible"
                    width="3024"
                    height="1642"
                    loading="lazy"
                    className="w-full rounded-lg border border-border"
                  />
                </a>
                <figcaption className="text-sm text-muted mt-2">
                  The assembled corner after both members were tilted together.
                  Inspect the concealed lower lap as well as this visible mitred
                  seam. The selected stile retains its original stock
                  dimensions. Select the image to enlarge it.
                </figcaption>
              </figure>
            ) : null}
            {id === "mitres" ? (
              <figure className="my-6">
                <a href="/screenshots/docs-scarf-joint.jpg">
                  <img
                    src="/screenshots/docs-scarf-joint.jpg"
                    alt="Assembled scarf joint in the Carvd joinery bench, with contrasting light and dark boards meeting along a long diagonal seam"
                    width="1415"
                    height="768"
                    loading="lazy"
                    className="w-full rounded-lg border border-border"
                  />
                </a>
                <figcaption className="text-sm text-muted mt-2">
                  The foreground scarf joins two boards along complementary
                  sloped surfaces. Follow the entire seam and inspect the
                  underside too; one closed edge alone does not establish fit.
                  Select the image to enlarge it.
                </figcaption>
              </figure>
            ) : null}
          </section>
        ))}
      </div>
      <p className="text-muted mt-xl">
        If the members will not seat, work through{" "}
        <Link
          to="/docs/joinery#troubleshooting"
          className="text-text underline underline-offset-4 decoration-primary"
        >
          joint troubleshooting
        </Link>
        . Before taking the design to the shop, review the{" "}
        <Link
          to="/docs/cut-lists#part-cut-instructions"
          className="text-text underline underline-offset-4 decoration-primary"
        >
          cut instructions
        </Link>
        .
      </p>
      <DocsPrevNext />
    </section>
  );
}
