import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import { Progress } from '@renderer/components/ui/progress';

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
      <Card className="overflow-hidden border-2 border-accent bg-surface shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
        <Progress
          value={progress}
          className="h-2 rounded-none bg-bg"
          indicatorClassName="bg-accent transition-[width] duration-300 ease-in-out"
          data-testid="tutorial-progress-bar"
        />

        <CardHeader className="pb-4 pt-6">
          <div className="mb-2 flex items-start justify-between">
            <CardTitle className="pr-4 text-xl">{title}</CardTitle>
            <Button
              variant="ghost"
              size="icon-xs"
              className="-mr-1 -mt-1 text-text-muted hover:text-text"
              onClick={onSkip}
              title="Skip tutorial (Esc)"
            >
              ×
            </Button>
          </div>
          <div className="text-xs font-semibold uppercase tracking-wide text-accent">
            Step {stepNumber} of {totalSteps}
          </div>
        </CardHeader>

        <CardContent className="mx-6 mb-6 rounded-md border border-border bg-bg p-5 [&_p]:m-0 [&_p]:text-base [&_p]:leading-relaxed [&_p]:text-text">
          <p>{content}</p>
        </CardContent>

        <CardFooter className="items-center justify-between px-6 pb-6">
          {isLastStep ? (
            <Button
              variant="link"
              size="xs"
              className="h-auto p-0 text-text-muted hover:text-accent"
              onClick={(e) => {
                e.preventDefault();
                window.electronAPI?.openExternal?.('https://carvd-studio.com/docs#quick-start');
              }}
            >
              View full documentation
            </Button>
          ) : (
            <Button
              variant="link"
              size="xs"
              className="tutorial-tooltip-skip h-auto p-0 text-text-muted"
              onClick={onSkip}
            >
              Skip Tutorial
            </Button>
          )}

          <div className="flex gap-2">
            {!isFirstStep && (
              <Button variant="outline" size="sm" onClick={onPrevious}>
                Previous
              </Button>
            )}
            <Button size="sm" className="shadow-[0_10px_15px_-3px_var(--color-overlay)]" onClick={onNext}>
              {isLastStep ? 'Get Started!' : 'Next →'}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Arrow pointing to target */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-accent" />
    </div>
  );
}
