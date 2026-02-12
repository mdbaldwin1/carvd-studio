import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTutorial, TutorialStep } from './useTutorial';

describe('useTutorial', () => {
  const mockSteps: TutorialStep[] = [
    { id: 'step-1', title: 'Welcome', content: 'This is step 1' },
    { id: 'step-2', title: 'Second Step', content: 'This is step 2' },
    { id: 'step-3', title: 'Final Step', content: 'This is step 3' }
  ];

  describe('initial state', () => {
    it('initializes with inactive state', () => {
      const { result } = renderHook(() => useTutorial(mockSteps));

      expect(result.current.isActive).toBe(false);
    });

    it('initializes at step 0', () => {
      const { result } = renderHook(() => useTutorial(mockSteps));

      expect(result.current.currentStepIndex).toBe(0);
    });

    it('stores the provided steps', () => {
      const { result } = renderHook(() => useTutorial(mockSteps));

      expect(result.current.steps).toEqual(mockSteps);
    });

    it('returns current step', () => {
      const { result } = renderHook(() => useTutorial(mockSteps));

      expect(result.current.currentStep).toEqual(mockSteps[0]);
    });

    it('isFirstStep is true initially', () => {
      const { result } = renderHook(() => useTutorial(mockSteps));

      expect(result.current.isFirstStep).toBe(true);
    });

    it('isLastStep is false initially', () => {
      const { result } = renderHook(() => useTutorial(mockSteps));

      expect(result.current.isLastStep).toBe(false);
    });

    it('calculates initial progress', () => {
      const { result } = renderHook(() => useTutorial(mockSteps));

      // Step 1 of 3 = 33.33%
      expect(result.current.progress).toBeCloseTo(33.33, 1);
    });
  });

  describe('start', () => {
    it('activates the tutorial', () => {
      const { result } = renderHook(() => useTutorial(mockSteps));

      act(() => {
        result.current.start();
      });

      expect(result.current.isActive).toBe(true);
    });

    it('resets to step 0 when started', () => {
      const { result } = renderHook(() => useTutorial(mockSteps));

      // Advance to step 2
      act(() => {
        result.current.start();
        result.current.next();
        result.current.next();
      });

      // Deactivate and restart
      act(() => {
        result.current.skip();
      });

      act(() => {
        result.current.start();
      });

      expect(result.current.currentStepIndex).toBe(0);
    });
  });

  describe('next', () => {
    it('advances to the next step', () => {
      const { result } = renderHook(() => useTutorial(mockSteps));

      act(() => {
        result.current.next();
      });

      expect(result.current.currentStepIndex).toBe(1);
      expect(result.current.currentStep).toEqual(mockSteps[1]);
    });

    it('does not advance past the last step', () => {
      const { result } = renderHook(() => useTutorial(mockSteps));

      act(() => {
        result.current.next();
        result.current.next();
        result.current.next(); // Should stay at index 2
        result.current.next(); // Should still stay at index 2
      });

      expect(result.current.currentStepIndex).toBe(2);
    });

    it('updates isFirstStep after advancing', () => {
      const { result } = renderHook(() => useTutorial(mockSteps));

      act(() => {
        result.current.next();
      });

      expect(result.current.isFirstStep).toBe(false);
    });

    it('updates isLastStep when reaching end', () => {
      const { result } = renderHook(() => useTutorial(mockSteps));

      act(() => {
        result.current.next();
        result.current.next();
      });

      expect(result.current.isLastStep).toBe(true);
    });
  });

  describe('previous', () => {
    it('goes to the previous step', () => {
      const { result } = renderHook(() => useTutorial(mockSteps));

      act(() => {
        result.current.next();
        result.current.next();
        result.current.previous();
      });

      expect(result.current.currentStepIndex).toBe(1);
    });

    it('does not go before the first step', () => {
      const { result } = renderHook(() => useTutorial(mockSteps));

      act(() => {
        result.current.previous();
        result.current.previous();
      });

      expect(result.current.currentStepIndex).toBe(0);
    });
  });

  describe('skip', () => {
    it('deactivates the tutorial', () => {
      const { result } = renderHook(() => useTutorial(mockSteps));

      act(() => {
        result.current.start();
        result.current.skip();
      });

      expect(result.current.isActive).toBe(false);
    });
  });

  describe('complete', () => {
    it('deactivates the tutorial', () => {
      const { result } = renderHook(() => useTutorial(mockSteps));

      act(() => {
        result.current.start();
        result.current.complete();
      });

      expect(result.current.isActive).toBe(false);
    });
  });

  describe('goToStep', () => {
    it('jumps to a specific step', () => {
      const { result } = renderHook(() => useTutorial(mockSteps));

      act(() => {
        result.current.goToStep(2);
      });

      expect(result.current.currentStepIndex).toBe(2);
    });

    it('clamps to valid range (lower bound)', () => {
      const { result } = renderHook(() => useTutorial(mockSteps));

      act(() => {
        result.current.goToStep(-5);
      });

      expect(result.current.currentStepIndex).toBe(0);
    });

    it('clamps to valid range (upper bound)', () => {
      const { result } = renderHook(() => useTutorial(mockSteps));

      act(() => {
        result.current.goToStep(100);
      });

      expect(result.current.currentStepIndex).toBe(2); // max index is 2
    });
  });

  describe('progress calculation', () => {
    it('calculates progress for each step', () => {
      const { result } = renderHook(() => useTutorial(mockSteps));

      // Step 1 of 3 = 33.33%
      expect(result.current.progress).toBeCloseTo(33.33, 1);

      act(() => {
        result.current.next();
      });

      // Step 2 of 3 = 66.67%
      expect(result.current.progress).toBeCloseTo(66.67, 1);

      act(() => {
        result.current.next();
      });

      // Step 3 of 3 = 100%
      expect(result.current.progress).toBe(100);
    });

    it('handles empty steps array', () => {
      const { result } = renderHook(() => useTutorial([]));

      expect(result.current.progress).toBe(0);
    });
  });

  describe('single step tutorial', () => {
    it('handles single step correctly', () => {
      const singleStep: TutorialStep[] = [{ id: 'only', title: 'Only Step', content: 'The only content' }];

      const { result } = renderHook(() => useTutorial(singleStep));

      expect(result.current.isFirstStep).toBe(true);
      expect(result.current.isLastStep).toBe(true);
      expect(result.current.progress).toBe(100);
    });
  });
});
