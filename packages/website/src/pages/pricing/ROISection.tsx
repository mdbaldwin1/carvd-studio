import { TreePine, Clock, Scissors } from "lucide-react";

const accentBoxStyle = {
  background: "rgba(74,144,226,0.10)",
  borderColor: "rgba(74,144,226,0.3)",
};

export default function ROISection() {
  return (
    <div
      className="mb-16 mt-16 rounded-lg border p-8 max-sm:p-6"
      style={accentBoxStyle}
    >
      <h2 className="mb-4 text-center text-3xl font-bold">
        How It Could Pay For Itself
      </h2>
      <p className="mb-8 text-center text-lg text-text-muted">
        Here's a hypothetical example for a typical cabinet project:
      </p>
      <div className="grid grid-cols-3 gap-6 max-md:grid-cols-1">
        <div className="text-center">
          <div className="mb-4 text-5xl">
            <TreePine size={48} className="mx-auto" />
          </div>
          <div className="mb-2 text-3xl font-bold text-highlight">$80</div>
          <div className="text-sm text-text-muted">
            Potential material savings from optimized cuts
          </div>
        </div>
        <div className="text-center">
          <div className="mb-4 text-5xl">
            <Clock size={48} className="mx-auto" />
          </div>
          <div className="mb-2 text-3xl font-bold text-highlight">$125</div>
          <div className="text-sm text-text-muted">
            Potential time savings (5 hrs at $25/hr)
          </div>
        </div>
        <div className="text-center">
          <div className="mb-4 text-5xl">
            <Scissors size={48} className="mx-auto" />
          </div>
          <div className="mb-2 text-3xl font-bold text-highlight">$200</div>
          <div className="text-sm text-text-muted">
            Avoided cost of one mis-cut premium sheet
          </div>
        </div>
      </div>
      <div className="my-16 h-px bg-border" />
      <div className="text-center">
        <div className="mb-2 text-4xl font-bold">
          <span className="text-text-muted">Potential Value:</span>{" "}
          <span className="text-highlight">$405</span>
        </div>
        <p className="text-sm text-text-muted">
          *Hypothetical example. Your results will vary based on project
          complexity and workflow.
        </p>
      </div>
    </div>
  );
}
