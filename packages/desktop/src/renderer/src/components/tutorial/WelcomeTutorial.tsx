import React, { useEffect } from 'react';
import { useTutorial, TutorialStep } from '../../hooks/useTutorial';
import { TutorialOverlay } from './TutorialOverlay';
import { useCameraStore } from '../../store/cameraStore';

interface WelcomeTutorialProps {
  onComplete: () => void;
}

// Define the 3 tutorial steps (condensed from 8 for a quicker onboarding)
const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: '👋 Welcome to Carvd Studio!',
    content:
      'This is your 3D workspace with a sample desk project. Drag to orbit, right-drag to pan, scroll to zoom. Press F to focus on selections. Click Next to continue.',
    targetSelector: '.canvas-container',
    position: 'bottom',
    offset: { x: 0, y: -100 }
  },
  {
    id: 'design',
    title: '🛠️ Design & Materials',
    content:
      'Parts and stock materials are in the left sidebar. Click parts to select them, then edit dimensions, colors, and stock assignments in the Properties panel on the right. Drag stocks onto the canvas to create new parts.',
    targetSelector: '.sidebar',
    position: 'right',
    offset: { x: 20, y: 0 }
  },
  {
    id: 'get-started',
    title: "🚀 You're Ready!",
    content:
      'Click "Generate Cut List" for optimized cutting diagrams. Use keyboard shortcuts for speed: G (group), Shift+D (duplicate), X/Y/Z (rotate), Delete (remove). Check Help > Shortcuts for more. Happy building!',
    position: 'center'
  }
];

export function WelcomeTutorial({ onComplete }: WelcomeTutorialProps) {
  const tutorial = useTutorial(tutorialSteps);
  const requestCenterCamera = useCameraStore((s) => s.requestCenterCamera);

  useEffect(() => {
    // Auto-start the tutorial
    tutorial.start();
    // Frame the desk properly in the 3D view
    requestCenterCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNext = () => {
    if (tutorial.isLastStep) {
      tutorial.complete();
      onComplete();
    } else {
      tutorial.next();
    }
  };

  const handleSkip = () => {
    tutorial.skip();
    onComplete();
  };

  if (!tutorial.isActive || !tutorial.currentStep) {
    return null;
  }

  return (
    <TutorialOverlay
      step={tutorial.currentStep}
      stepNumber={tutorial.currentStepIndex + 1}
      totalSteps={tutorial.steps.length}
      progress={tutorial.progress}
      isFirstStep={tutorial.isFirstStep}
      isLastStep={tutorial.isLastStep}
      onNext={handleNext}
      onPrevious={tutorial.previous}
      onSkip={handleSkip}
    />
  );
}
