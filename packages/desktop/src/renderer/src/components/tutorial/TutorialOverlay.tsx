import React, { useEffect, useState } from 'react';
import { TutorialStep } from '../../hooks/useTutorial';
import { TutorialTooltip } from './TutorialTooltip';

interface TutorialOverlayProps {
  step: TutorialStep;
  stepNumber: number;
  totalSteps: number;
  progress: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}

export function TutorialOverlay({
  step,
  stepNumber,
  totalSteps,
  progress,
  isFirstStep,
  isLastStep,
  onNext,
  onPrevious,
  onSkip
}: TutorialOverlayProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Find target element and calculate spotlight position
  useEffect(() => {
    // Tooltip dimensions (matching CSS)
    const tooltipWidth = 420;
    const tooltipHeight = 350; // Generous estimate for content
    const padding = 20;
    const margin = 20; // Minimum distance from viewport edges

    if (step.targetSelector) {
      const element = document.querySelector(step.targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);

        // Calculate tooltip position based on step position preference
        let x = 0;
        let y = 0;

        switch (step.position) {
          case 'top':
            x = rect.left + rect.width / 2 - tooltipWidth / 2;
            y = rect.top - tooltipHeight - padding;
            break;
          case 'bottom':
            x = rect.left + rect.width / 2 - tooltipWidth / 2;
            y = rect.bottom + padding;
            break;
          case 'left':
            x = rect.left - tooltipWidth - padding;
            y = rect.top + rect.height / 2 - tooltipHeight / 2;
            break;
          case 'right':
            x = rect.right + padding;
            y = rect.top + rect.height / 2 - tooltipHeight / 2;
            break;
          case 'center':
          default:
            x = window.innerWidth / 2 - tooltipWidth / 2;
            y = window.innerHeight / 2 - tooltipHeight / 2;
        }

        // Apply custom offset if provided
        if (step.offset) {
          x += step.offset.x;
          y += step.offset.y;
        }

        // Keep tooltip within viewport bounds
        x = Math.max(margin, Math.min(x, window.innerWidth - tooltipWidth - margin));
        y = Math.max(margin, Math.min(y, window.innerHeight - tooltipHeight - margin));

        setTooltipPosition({ x, y });
      } else {
        // No target found, center the tooltip
        setTargetRect(null);
        setTooltipPosition({
          x: window.innerWidth / 2 - tooltipWidth / 2,
          y: window.innerHeight / 2 - tooltipHeight / 2
        });
      }
    } else {
      // No target selector, center the tooltip
      setTargetRect(null);
      setTooltipPosition({
        x: window.innerWidth / 2 - tooltipWidth / 2,
        y: window.innerHeight / 2 - tooltipHeight / 2
      });
    }
  }, [step]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        onNext();
      } else if (e.key === 'ArrowLeft' && !isFirstStep) {
        e.preventDefault();
        e.stopPropagation();
        onPrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isFirstStep, onNext, onPrevious]);

  return (
    <div data-testid="tutorial-overlay" className="fixed inset-0 w-screen h-screen z-[10000] pointer-events-none">
      {/* Dark backdrop with spotlight cutout */}
      <svg data-testid="tutorial-overlay-svg" className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id={`spotlight-mask-${step.id}`}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask={`url(#spotlight-mask-${step.id})`}
        />
        {targetRect && (
          <rect
            x={targetRect.left - 8}
            y={targetRect.top - 8}
            width={targetRect.width + 16}
            height={targetRect.height + 16}
            rx="8"
            fill="none"
            style={{ stroke: 'var(--color-accent)' }}
            strokeWidth="3"
            strokeDasharray="8 4"
          />
        )}
      </svg>

      {/* Tooltip - allow interaction */}
      <div data-testid="tutorial-overlay-content" className="pointer-events-auto">
        <TutorialTooltip
          title={step.title}
          content={step.content}
          position={tooltipPosition}
          stepNumber={stepNumber}
          totalSteps={totalSteps}
          progress={progress}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          onNext={onNext}
          onPrevious={onPrevious}
          onSkip={onSkip}
        />
      </div>
    </div>
  );
}
