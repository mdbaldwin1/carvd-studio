import React, { useEffect } from 'react';
import { useTutorial, TutorialStep } from '../hooks/useTutorial';
import { TutorialOverlay } from './TutorialOverlay';
import { useProjectStore } from '../store/projectStore';

interface WelcomeTutorialProps {
  onComplete: () => void;
}

// Define the 8 tutorial steps
const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: '👋 Welcome to Carvd Studio!',
    content: "Let's take a quick tour of this sample desk project. We've preloaded it so you can see what's possible. Click Next or press Enter to continue.",
    position: 'center'
  },
  {
    id: 'canvas',
    title: '🎨 3D Workspace',
    content: 'This is your 3D canvas where you design furniture. Orbit by dragging, pan with right-click, and zoom with your mouse wheel. Press F to focus on selection, Home to reset the view.',
    targetSelector: '.canvas-container',
    position: 'bottom',
    offset: { x: 0, y: -100 }
  },
  {
    id: 'parts',
    title: '📦 Parts List',
    content: 'All parts in your design are listed here. Click to select parts, use Shift/Ctrl for multi-select, or drag to reorder. Parts can be organized into groups for better organization.',
    targetSelector: '.sidebar',
    position: 'right',
    offset: { x: 20, y: 0 }
  },
  {
    id: 'stocks',
    title: '📐 Stock Materials',
    content: 'Stock materials define the dimensions and pricing for your project. Assign stocks to parts in the properties panel, or drag a stock onto the canvas to create a new part.',
    targetSelector: '.sidebar',
    position: 'right',
    offset: { x: 20, y: 50 }
  },
  {
    id: 'properties',
    title: '⚙️ Properties Panel',
    content: 'Change dimensions, assign stock materials, add notes, and adjust settings for selected parts here. You can edit multiple parts at once by selecting them together.',
    targetSelector: '.properties-panel',
    position: 'left',
    offset: { x: -20, y: 0 }
  },
  {
    id: 'cutlist',
    title: '📋 Generate Cut List',
    content: 'Click the "Cut List" button in the header to generate optimized cutting diagrams and a shopping list with material costs. The cut list automatically updates when you modify your design.',
    position: 'center'
  },
  {
    id: 'shortcuts',
    title: '⌨️ Keyboard Shortcuts',
    content: 'Master these shortcuts to work faster: P (add part), G (group), X/Y/Z (rotate), Delete (remove), Cmd+Z/Cmd+Shift+Z (undo/redo), Cmd+D (duplicate). Press H anytime to see all shortcuts.',
    position: 'center'
  },
  {
    id: 'get-started',
    title: '🚀 You\'re Ready!',
    content: 'Start designing by creating a new project (File > New) or continue exploring this sample. Need help? Check the documentation or hover over buttons for tooltips. Happy building!',
    position: 'center'
  }
];

export function WelcomeTutorial({ onComplete }: WelcomeTutorialProps) {
  const tutorial = useTutorial(tutorialSteps);
  const requestCenterCamera = useProjectStore((s) => s.requestCenterCamera);

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
