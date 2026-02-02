import { useState, useCallback } from 'react';

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  targetSelector?: string; // CSS selector for spotlight target
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  offset?: { x: number; y: number };
}

export interface TutorialState {
  isActive: boolean;
  currentStepIndex: number;
  steps: TutorialStep[];
}

export function useTutorial(steps: TutorialStep[]) {
  const [state, setState] = useState<TutorialState>({
    isActive: false,
    currentStepIndex: 0,
    steps
  });

  const start = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: true,
      currentStepIndex: 0
    }));
  }, []);

  const next = useCallback(() => {
    setState(prev => {
      if (prev.currentStepIndex < prev.steps.length - 1) {
        return {
          ...prev,
          currentStepIndex: prev.currentStepIndex + 1
        };
      }
      return prev;
    });
  }, []);

  const previous = useCallback(() => {
    setState(prev => {
      if (prev.currentStepIndex > 0) {
        return {
          ...prev,
          currentStepIndex: prev.currentStepIndex - 1
        };
      }
      return prev;
    });
  }, []);

  const skip = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: false
    }));
  }, []);

  const complete = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: false
    }));
  }, []);

  const goToStep = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      currentStepIndex: Math.max(0, Math.min(index, prev.steps.length - 1))
    }));
  }, []);

  const currentStep = state.steps[state.currentStepIndex];
  const isFirstStep = state.currentStepIndex === 0;
  const isLastStep = state.currentStepIndex === state.steps.length - 1;
  const progress = state.steps.length > 0 ? ((state.currentStepIndex + 1) / state.steps.length) * 100 : 0;

  return {
    ...state,
    currentStep,
    isFirstStep,
    isLastStep,
    progress,
    start,
    next,
    previous,
    skip,
    complete,
    goToStep
  };
}
