import { Layers, Lock } from "lucide-react";
import DocsPrevNext from "./DocsPrevNext";

export default function StockPage() {
  return (
    <section>
      <h2 className="text-4xl font-bold mb-xl">Stock Materials</h2>

      <p className="text-muted mb-xl">
        Stock materials represent the raw lumber, plywood, or other sheet goods
        you'll cut your parts from. Carvd Studio includes common sizes and lets
        you add your own.
      </p>

      <div className="grid gap-xl">
        <div className="accent-box">
          <h3 className="text-2xl font-bold mb-md">
            <Layers size={20} className="inline-block" /> Managing Your Stock
            Library
          </h3>
          <div className="grid gap-md text-sm">
            <div>
              <p className="font-bold mb-xs">Built-in Stock</p>
              <p className="text-muted">
                Common sizes pre-loaded: 4×8 plywood sheets, dimensional lumber
                (1×4, 1×6, 2×4, etc.) in various species
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Custom Stock</p>
              <p className="text-muted">
                Add your own stock with exact dimensions, price, and supplier
                info. Great for specialty lumber or local pricing.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Stock Types</p>
              <p className="text-muted">
                <strong>Sheet goods</strong> (plywood, MDF) — defined by width ×
                length × thickness. <strong>Dimensional lumber</strong> (boards)
                — defined by width × length × thickness.
              </p>
            </div>
          </div>
        </div>

        <div className="accent-box">
          <h3 className="text-2xl font-bold mb-md">
            <Lock size={20} className="inline-block" /> Stock Constraints
          </h3>
          <p className="text-sm text-muted mb-md">
            Control how strictly the cut list optimizer matches parts to stock:
          </p>
          <div className="grid gap-md text-sm">
            <div>
              <p className="font-bold mb-xs">Dimension Constraints</p>
              <p className="text-muted">
                Parts must fit within stock dimensions (enabled by default)
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Grain Constraints</p>
              <p className="text-muted">
                Respect grain direction when placing parts on stock
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Color Constraints</p>
              <p className="text-muted">
                Match part color to stock material color
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Overlap Constraints</p>
              <p className="text-muted">
                Prevent parts from overlapping on the same stock piece
              </p>
            </div>
          </div>
        </div>
      </div>

      <DocsPrevNext />
    </section>
  );
}
