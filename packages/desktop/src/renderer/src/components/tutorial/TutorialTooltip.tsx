interface TutorialTooltipProps {
  title: string;
  content: string;
  position: { x: number; y: number };
  stepNumber: number;
  totalSteps: number;
  progress: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}

export function TutorialTooltip({
  title,
  content,
  position,
  stepNumber,
  totalSteps,
  progress,
  isFirstStep,
  isLastStep,
  onNext,
  onPrevious,
  onSkip
}: TutorialTooltipProps) {
  return (
    <div className="tutorial-tooltip" style={{ left: position.x, top: position.y }}>
      <div className="tutorial-tooltip-card">
        {/* Progress bar */}
        <div className="tutorial-tooltip-progress">
          <div className="tutorial-tooltip-progress-bar" style={{ width: `${progress}%` }} />
        </div>

        {/* Header */}
        <div className="tutorial-tooltip-header">
          <div className="tutorial-tooltip-header-row">
            <h3 className="tutorial-tooltip-title">{title}</h3>
            <button className="tutorial-tooltip-close" onClick={onSkip} title="Skip tutorial (Esc)">
              ×
            </button>
          </div>
          <div className="tutorial-tooltip-step">
            Step {stepNumber} of {totalSteps}
          </div>
        </div>

        {/* Content */}
        <div className="tutorial-tooltip-content">
          <p>{content}</p>
        </div>

        {/* Footer with navigation */}
        <div className="tutorial-tooltip-footer">
          {isLastStep ? (
            <a
              href="#"
              className="tutorial-tooltip-docs-link"
              onClick={(e) => {
                e.preventDefault();
                window.electronAPI?.openExternal?.('https://carvd-studio.com/docs#quick-start');
              }}
            >
              View full documentation
            </a>
          ) : (
            <button className="tutorial-tooltip-skip" onClick={onSkip}>
              Skip Tutorial
            </button>
          )}

          <div className="tutorial-tooltip-nav">
            {!isFirstStep && (
              <button className="tutorial-tooltip-btn-secondary" onClick={onPrevious}>
                Previous
              </button>
            )}
            <button className="tutorial-tooltip-btn-primary" onClick={onNext}>
              {isLastStep ? 'Get Started!' : 'Next →'}
            </button>
          </div>
        </div>
      </div>

      {/* Arrow pointing to target */}
      <div className="tutorial-tooltip-arrow" />
    </div>
  );
}
