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
    <div
      data-testid="tutorial-tooltip"
      className="fixed z-[10002] max-w-[420px] min-w-[360px]"
      style={{ left: position.x, top: position.y }}
    >
      <div className="bg-surface rounded-lg shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border-2 border-accent overflow-hidden">
        {/* Progress bar */}
        <div className="h-2 bg-bg">
          <div
            data-testid="tutorial-progress-bar"
            className="h-full bg-accent transition-[width] duration-300 ease-in-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <div className="pt-6 px-6 pb-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-xl font-bold text-text pr-4 m-0">{title}</h3>
            <button
              className="bg-transparent border-none text-text-muted text-2xl leading-none cursor-pointer p-0 -mt-1 -mr-1 transition-colors duration-200 hover:text-text"
              onClick={onSkip}
              title="Skip tutorial (Esc)"
            >
              ×
            </button>
          </div>
          <div className="text-xs font-semibold text-accent uppercase tracking-wide">
            Step {stepNumber} of {totalSteps}
          </div>
        </div>

        {/* Content */}
        <div className="mx-6 mb-6 p-5 bg-bg rounded-md border border-border [&_p]:text-text [&_p]:text-base [&_p]:leading-relaxed [&_p]:m-0">
          <p>{content}</p>
        </div>

        {/* Footer with navigation */}
        <div className="px-6 pb-6 flex items-center justify-between">
          {isLastStep ? (
            <a
              href="#"
              className="text-sm text-text-muted underline cursor-pointer font-medium transition-colors duration-200 hover:text-accent"
              onClick={(e) => {
                e.preventDefault();
                window.electronAPI?.openExternal?.('https://carvd-studio.com/docs#quick-start');
              }}
            >
              View full documentation
            </a>
          ) : (
            <button
              className="tutorial-tooltip-skip bg-transparent border-none text-sm text-text-muted cursor-pointer font-medium underline p-0 transition-colors duration-200 hover:text-accent"
              onClick={onSkip}
            >
              Skip Tutorial
            </button>
          )}

          <div className="flex gap-2">
            {!isFirstStep && (
              <button
                className="py-2 px-5 text-sm font-medium text-text bg-bg border border-border rounded-md cursor-pointer transition-colors duration-200 hover:bg-bg-hover"
                onClick={onPrevious}
              >
                Previous
              </button>
            )}
            <button
              className="py-2 px-6 text-sm font-semibold text-[var(--color-bg-dark)] bg-accent border-none rounded-md cursor-pointer shadow-[0_10px_15px_-3px_var(--color-overlay)] transition-colors duration-200 hover:bg-accent-hover"
              onClick={onNext}
            >
              {isLastStep ? 'Get Started!' : 'Next →'}
            </button>
          </div>
        </div>
      </div>

      {/* Arrow pointing to target */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-accent" />
    </div>
  );
}
