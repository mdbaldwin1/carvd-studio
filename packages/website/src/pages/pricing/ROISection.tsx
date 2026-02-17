import { TreePine, Clock, Scissors } from "lucide-react";

export default function ROISection() {
  return (
    <div className="accent-box mb-3xl mt-3xl">
      <h2 className="text-3xl font-bold mb-md text-center">
        How It Could Pay For Itself
      </h2>
      <p className="text-lg text-muted text-center mb-xl">
        Here's a hypothetical example for a typical cabinet project:
      </p>
      <div className="grid grid-cols-3 gap-lg">
        <div className="text-center">
          <div className="text-5xl mb-md">
            <TreePine size={48} />
          </div>
          <div className="text-3xl font-bold text-highlight mb-sm">$80</div>
          <div className="text-sm text-muted">
            Potential material savings from optimized cuts
          </div>
        </div>
        <div className="text-center">
          <div className="text-5xl mb-md">
            <Clock size={48} />
          </div>
          <div className="text-3xl font-bold text-highlight mb-sm">$125</div>
          <div className="text-sm text-muted">
            Potential time savings (5 hrs at $25/hr)
          </div>
        </div>
        <div className="text-center">
          <div className="text-5xl mb-md">
            <Scissors size={48} />
          </div>
          <div className="text-3xl font-bold text-highlight mb-sm">$200</div>
          <div className="text-sm text-muted">
            Avoided cost of one mis-cut premium sheet
          </div>
        </div>
      </div>
      <div className="divider"></div>
      <div className="text-center">
        <div className="text-4xl font-bold mb-sm">
          <span className="text-muted">Potential Value:</span>{" "}
          <span className="text-highlight">$405</span>
        </div>
        <p className="text-sm text-muted">
          *Hypothetical example. Your results will vary based on project
          complexity and workflow.
        </p>
      </div>
    </div>
  );
}
