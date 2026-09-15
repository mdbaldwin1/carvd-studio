# Router Profile Geometry Research

## Executive conclusion

Router-bit names are product categories, not universal geometric standards. Simple profiles—straight, roundover, cove/core-box, chamfer/V-groove, rabbet, dovetail, T-slot, and keyhole—can be modeled exactly with lines and circular arcs from a small set of dimensions. Decorative names such as ogee, Roman ogee, bead, thumbnail, classical, and table-edge describe families. Their exact radii, flats, fillets, and transitions vary by manufacturer and product number.

Carvd Studio should therefore use two levels:

1. **Generic parametric profiles** built from exact analytic primitives and clearly named parameters.
2. **Catalog profiles** identified by manufacturer and SKU, whose normalized outline is imported from a manufacturer DXF or reconstructed from a dimensioned official drawing.

The preview and CSG cutter must consume the same canonical outline. A separate illustrative SVG should never exist.

## Evidence

Amana calls a roundover a quarter-round of a specified radius and states that changing the bearing can add a second shoulder, turning it into a bead.[^1] Its beading documentation defines the result more precisely as a quarter-round bounded by fillets, with one fillet controlled by bearing size and the other by cutting depth.[^2] This means a generic bead cannot be represented accurately by only `size` and `depth`; it also needs one or two fillet/reveal dimensions.

Amana's core-box products specify diameter `D` and radius `R = D/2`, and describe the cut as a half-round groove.[^3] Its V-groove products specify an included angle and maximum diameter.[^4] These directly support exact circular and conical models.

Compound decorative profiles are not unique. Freud's official catalog lists Roman ogee, ogee, ogee fillet, classical Roman ogee, double-fillet ogee, cove-and-bead, and classical cove-and-bead as separate families, with 1:1 drawings and different radius sets.[^5] Amana likewise distinguishes ogee, reverse/Roman ogee, table-edge ogee, and plunging ogee. One Amana table-edge ogee uses two different radii, 3/8 inch and 5/16 inch.[^6] A single normalized S-curve is therefore useful as a generic style but is not an exact physical bit.

Whiteside's official catalog offers thumbnail profiles with 7/16-inch and 1-inch profile widths and 3/8-inch and 3/4-inch cutting lengths, plus separate traditional, classical ogee, French Baroque, and thumbnail-and-bead table-edge profiles.[^7] “Thumbnail” is thus a family label rather than a defined ellipse.

Official digital geometry is available for many specific products. Amana product pages advertise product-specific DXF files, 1:1 profiles, and—in many cases—Vectric or Fusion 360 tool files.[^2][^4][^8] Whiteside publishes CNC profile PDFs/DXFs and Vectric, Carveco, and Fusion 360 tool-file collections.[^7][^9] These are the best exact sources when Carvd needs SKU-level fidelity, subject to the publisher's download and reuse terms.

## Canonical coordinate system

Define every edge profile as the **remaining material boundary** in a 2D corner frame:

- `u >= 0`: distance inward along the first incident face.
- `v >= 0`: distance inward along the second incident face.
- `(0, depth)` and `(size, 0)` are the boundary endpoints for a full-width/full-depth profile.
- The removal polygon is `(0,0)` followed by the remaining boundary, then closed.

Store curves as semantic primitives (`line`, `arc`, optionally `ellipseArc`) and tessellate only for rendering/CSG. This preserves tangency, makes dimensions editable, and avoids treating sampled points as the source of truth.

## Exact generic profiles

### Straight / flat-bottom routed path

Cross-section is a rectangle of width `D` and depth `h`:

`x in [-D/2, D/2], y in [0, h]`.

Spiral upcut, downcut, compression, mortising, and ordinary straight bits create the same idealized final envelope at the same diameter and depth. They should remain manufacturing/tool identities, not separate geometric profiles.

### Roundover

For a true quarter-round radius `r`, require `size = depth = r`. The remaining boundary from `(0,r)` to `(r,0)` is the circle centered at `(r,r)`:

`(u-r)^2 + (v-r)^2 = r^2`.

A user-selected cut depth can create fillets/reveals above or below the arc, but that is a different setup and needs an explicit `reveal` or `verticalOffset` parameter. Silently stretching a circular roundover to unequal size/depth makes an ellipse that no longer represents the stated roundover bit.

### Cove edge / core-box path

A cove is a concave circular arc. For equal radius dimensions, the edge boundary is the complementary quarter-circle. A core-box routed path is a semicircular groove of radius `D/2`; for a shallow pass `h < D/2`, the exposed groove is the circular segment of that same circle, not a rescaled semicircle.[^3]

### Chamfer / bevel

The remaining boundary is the line segment from `(0, depth)` to `(size, 0)`. Its face angle is:

`theta = atan2(depth, size)`.

The UI should accept either `size + depth` or `angle + one leg`, and derive the remaining quantity. Bosch sells both 25-degree and 45-degree chamfer bits, confirming that chamfer is not inherently 45 degrees.[^10]

### V-groove / engraving

For included angle `alpha`, cutting depth `h`, and ideal pointed tip, the groove half-width is:

`w/2 = h * tan(alpha/2)`.

Clamp `w <= D`, so maximum pointed depth is:

`h_max = D / (2 tan(alpha/2))`.

Real engraving cutters may have a flat or radiused tip. Add optional `tipDiameter` or `tipRadius`; without it the model is an ideal point. Official Amana products explicitly specify both included angle and cutter diameter.[^4]

### Rabbet

The ideal finished envelope is rectangular: width `w`, depth `h`. Bearing diameter and cutter diameter determine `w` physically, but they do not change the ideal cut once `w` is known. A generic model should use width and depth; a catalog-tool model can additionally record cutter and bearing diameters.

### Dovetail

Use a symmetric trapezoid with narrow neck diameter `d`, maximum diameter `D`, cutter height `H`, and side angle `beta` measured from the tool axis:

`D = d + 2 H tan(beta)`.

Some catalogs call `beta` the dovetail angle; it is not necessarily the full included angle. For example, Amana lists products as 8-degree dovetail bits with diameter and cutting height.[^8] Carvd's field must be labeled unambiguously as `sideAngle` or converted explicitly if retaining `includedAngle`.

### T-slot

The ideal routed cross-section is the union of:

- a neck rectangle of width `d`, from the surface to cavity top; and
- a cutter rectangle of width `D` and height `H` at the bottom.

Amana's T-slot specifications expose maximum diameter and cutting height, but its listed shank is not always the cutting neck diameter.[^11] A physically faithful generic schema therefore needs `neckDiameter` separately from `shankDiameter`.

### Keyhole

The traveled slot uses the same neck-plus-cavity cross-section as a T-slot. The plunge end additionally contains a full-diameter vertical entry pocket. Required parameters are neck diameter, cavity diameter, cavity height, total depth, and plunge-end choice. Direction matters: reversing an open path moves the entry pocket.

### Ball nose

The swept end envelope is hemispherical with radius `D/2` joined tangentially to a cylindrical body. A shallow routed pass exposes a circular segment. It is geometrically equivalent to a core-box cut along a straight path if only the finished stock is modeled; tool identity may still matter for fabrication.

## Decorative profile contracts

### Bead

Do not model generic bead as another roundover. Use a circular lobe plus explicit fillets/reveals. A useful exact contract is:

- `radius`
- `nearFilletWidth`
- `farFilletWidth`
- optional `verticalOffset`
- `variant: edge_bead | corner_bead | full_bead`

Amana explicitly says the fillets are controlled independently by bearing size and cutting depth.[^2] A preset may set symmetric fillets, but they must remain visible parameters.

### Ogee and Roman ogee

Represent these as two tangent arcs, not an arbitrary cubic Bézier. Store:

- `firstRadius`
- `secondRadius`
- `firstSense: concave | convex`
- `topFillet`, `bottomFillet`
- optional flats/reveals

An ogee and Roman/reverse ogee swap the order/sense of the concave and convex portions. Because official products use one or two radii and add different fillets, ship named generic presets and keep vendor/SKU profiles separate.[^5][^6]

For the simplest symmetric generic ogee spanning width `W` and depth `H`, two equal tangent circular arcs can meet at `(W/2,H/2)`. That is a defensible generic preset, not an “official ogee.”

### Thumbnail

Treat thumbnail as a family of broad table-edge profiles. A generic preset can use an elliptical arc with independent profile width and depth, optionally joined to a small edge fillet. Label it `Generic Thumbnail`, because Whiteside's official range shows materially different width/depth versions and adjacent, separately named table-edge shapes.[^7]

Suggested fields:

- `profileWidth`
- `cuttingHeight`
- `edgeFilletRadius`
- `curve: circular | elliptical | catalog`

## Recommended Carvd architecture

```ts
type ProfileSegment =
  | { kind: "line"; to: Point2 }
  | { kind: "arc"; to: Point2; radius: number; clockwise: boolean }
  | {
      kind: "ellipseArc";
      to: Point2;
      radiusU: number;
      radiusV: number;
      clockwise: boolean;
    };

interface RouterProfileDefinition {
  id: string;
  name: string;
  family: string;
  source: "generic" | "manufacturer";
  manufacturer?: string;
  sku?: string;
  sourceUrl?: string;
  parameters: Record<string, number | string>;
  boundary: ProfileSegment[];
}
```

Both selector SVG and cutter geometry should sample `boundary` through one function. Tests should compare not just distinct signatures but invariant geometry: endpoints, tangent continuity, radii, extents, expected area, and mirrored application on all twelve stock edges.

## Implementation priorities

1. **Correct the generic names now.** Make roundover/cove circular, chamfer linear, rabbet rectangular, and bead a radius bounded by fillets.
2. **Replace Bézier ogee with two tangent arcs.** Offer Ogee and Roman Ogee separately.
3. **Rename Thumbnail to Generic Thumbnail** until a catalog-backed outline is selected.
4. **Decouple tool identity from cut envelope.** Upcut/downcut/compression straight bits share geometry; ball-nose/core-box share a circular swept envelope; the tool identity remains in fabrication metadata.
5. **Add a catalog-profile importer.** Parse approved DXF polylines/arcs into the canonical segment format, normalize units/origin, and preserve source/SKU metadata.
6. **Add a calibration overlay.** The bit selector should optionally show radius centers, tangent points, fillets, width, depth, and source attribution.

## Legal and fidelity limitations

Product dimensions published on official pages support independent analytic reconstruction, but manufacturer DXF artwork and catalog drawings may have copyright or download-license restrictions. Do not redistribute source DXF files without reviewing their terms. Store independently generated primitives and source citations where possible. For catalog-accurate profiles, retain manufacturer, SKU, retrieval date, units, and a checksum of the source used internally.

No source located establishes a universal dimensional standard for decorative router profiles. “Exact” should therefore mean either exact to Carvd's documented generic construction or exact to a named manufacturer/SKU—not exact to an unqualified family name.

## Sources

[^1]: Amana Tool. [49512 Corner Rounding Router Bit](https://www.amanatool.com/49512-carbide-tipped-corner-round-3-8-radius-x-1-1-4-dia-x-5-8-x-1-4-inch-shank.html). Product specifications and profile description.

[^2]: Amana Tool. [49612 Beading Router Bit](https://www.amanatool.com/49612-carbide-tipped-beading-3-8-radius-x-1-1-4-dia-x-5-8-x-1-4-inch-shank.html). Product specifications, fillet description, and 1:1 profile availability.

[^3]: Amana Tool. [45916 Core Box Router Bit](https://www.amanatool.com/45916-carbide-tipped-core-box-5-16-radius-x-5-8-dia-x-7-16-x-1-2.html). Diameter/radius specifications and half-round description.

[^4]: Amana Tool. [45756 120-degree V-Groove Router Bit](https://www.amanatool.com/45756-carbide-tipped-v-groove-120-deg-x-1-1-4-dia-x-23-64-x-1-4-inch-shank.html). Angle, diameter, height, DXF, and tool-file availability.

[^5]: Freud. [General Product Catalog](https://www.freudtools.com/public/catalog/freud-catalog/docs/Freud_GPCatalog_2020_LOWRES.pdf). Decorative Edge Bits, approximately p. 146; multiple ogee/cove/bead families and 1:1 drawings.

[^6]: Amana Tool. [49559 Table Edge Ogee](https://www.amanatool.com/49559-carbide-tipped-table-edge-ogee-3-8-x-5-16-radius-x-1-5-32-dia-x-7-8-x-1-2-inch-shank.html). Two-radius official product specification.

[^7]: Whiteside Machine Company. [Table Edge Profiles](https://www.whitesiderouterbits.com/collections/table-edge-profiles). Thumbnail and other table-edge profile dimensions.

[^8]: Amana Tool. [45827 8-degree Dovetail Router Bit](https://www.amanatool.com/45827-carbide-tipped-dovetail-8-deg-x-7-16-dia-x-650-x-1-4-inch-shank.html). Angle, diameter, cutting height, and DXF availability.

[^9]: Whiteside Machine Company. [Product Catalog and Downloads](https://www.whitesiderouterbits.com/collections/product-catalog). CNC profile and CAD/CAM tool-file collections.

[^10]: Bosch Professional. [Trim and Edging Router Bit Set](https://www.boschtools.com/us/en/trim-edging-router-bit-sets-44124-ocs-ac/). 25-degree and 45-degree chamfer specifications.

[^11]: Amana Tool. [45664 T-Slot Router Bit](https://www.amanatool.com/45664-carbide-tipped-t-slot-5-8-dia-x-3-16-x-1-2-inch-shank.html). Maximum diameter and cutting-height specification.
