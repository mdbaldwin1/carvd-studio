import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TutorialOverlay } from './TutorialOverlay';
import { TutorialStep } from '../../hooks/useTutorial';

describe('TutorialOverlay', () => {
  const mockStep: TutorialStep = {
    id: 'test-step',
    title: 'Test Step Title',
    content: 'Test step content goes here',
    position: 'center'
  };

  const defaultProps = {
    step: mockStep,
    stepNumber: 1,
    totalSteps: 3,
    progress: 33,
    isFirstStep: true,
    isLastStep: false,
    onNext: vi.fn(),
    onPrevious: vi.fn(),
    onSkip: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window dimensions for position calculations
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
  });

  describe('rendering', () => {
    it('renders tutorial overlay', () => {
      render(<TutorialOverlay {...defaultProps} />);

      expect(screen.getByTestId('tutorial-overlay')).toBeInTheDocument();
    });

    it('renders SVG backdrop', () => {
      render(<TutorialOverlay {...defaultProps} />);

      expect(screen.getByTestId('tutorial-overlay-svg')).toBeInTheDocument();
    });

    it('renders TutorialTooltip with correct props', () => {
      render(<TutorialOverlay {...defaultProps} />);

      expect(screen.getByText('Test Step Title')).toBeInTheDocument();
      expect(screen.getByText('Test step content goes here')).toBeInTheDocument();
    });

    it('passes step number to TutorialTooltip', () => {
      render(<TutorialOverlay {...defaultProps} />);

      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    });
  });

  describe('target element highlighting', () => {
    it('highlights target element when targetSelector is provided', () => {
      // Create a mock element
      const mockElement = document.createElement('div');
      mockElement.className = 'target-element';
      document.body.appendChild(mockElement);
      mockElement.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        left: 200,
        right: 400,
        bottom: 300,
        width: 200,
        height: 200,
        x: 200,
        y: 100,
        toJSON: vi.fn()
      }));

      const stepWithTarget: TutorialStep = {
        ...mockStep,
        targetSelector: '.target-element',
        position: 'bottom'
      };

      const { container } = render(<TutorialOverlay {...defaultProps} step={stepWithTarget} />);

      // Check for spotlight mask with the step ID
      const mask = container.querySelector(`#spotlight-mask-${stepWithTarget.id}`);
      expect(mask).toBeInTheDocument();

      document.body.removeChild(mockElement);
    });

    it('centers tooltip when no target selector', () => {
      render(<TutorialOverlay {...defaultProps} />);

      // The tooltip should be rendered and positioned
      expect(screen.getByTestId('tutorial-overlay-content')).toBeInTheDocument();
    });

    it('centers tooltip when target element not found', () => {
      const stepWithMissingTarget: TutorialStep = {
        ...mockStep,
        targetSelector: '.non-existent-element'
      };

      render(<TutorialOverlay {...defaultProps} step={stepWithMissingTarget} />);

      expect(screen.getByTestId('tutorial-overlay-content')).toBeInTheDocument();
    });
  });

  describe('position calculations', () => {
    beforeEach(() => {
      // Create a mock target element for position tests
      const mockElement = document.createElement('div');
      mockElement.className = 'position-target';
      document.body.appendChild(mockElement);
      mockElement.getBoundingClientRect = vi.fn(() => ({
        top: 300,
        left: 400,
        right: 600,
        bottom: 500,
        width: 200,
        height: 200,
        x: 400,
        y: 300,
        toJSON: vi.fn()
      }));
    });

    it('handles top position', () => {
      const step: TutorialStep = {
        ...mockStep,
        targetSelector: '.position-target',
        position: 'top'
      };

      render(<TutorialOverlay {...defaultProps} step={step} />);

      // Just verify it renders without error
      expect(screen.getByText('Test Step Title')).toBeInTheDocument();
    });

    it('handles bottom position', () => {
      const step: TutorialStep = {
        ...mockStep,
        targetSelector: '.position-target',
        position: 'bottom'
      };

      render(<TutorialOverlay {...defaultProps} step={step} />);

      expect(screen.getByText('Test Step Title')).toBeInTheDocument();
    });

    it('handles left position', () => {
      const step: TutorialStep = {
        ...mockStep,
        targetSelector: '.position-target',
        position: 'left'
      };

      render(<TutorialOverlay {...defaultProps} step={step} />);

      expect(screen.getByText('Test Step Title')).toBeInTheDocument();
    });

    it('handles right position', () => {
      const step: TutorialStep = {
        ...mockStep,
        targetSelector: '.position-target',
        position: 'right'
      };

      render(<TutorialOverlay {...defaultProps} step={step} />);

      expect(screen.getByText('Test Step Title')).toBeInTheDocument();
    });

    it('applies custom offset', () => {
      const step: TutorialStep = {
        ...mockStep,
        targetSelector: '.position-target',
        position: 'bottom',
        offset: { x: 50, y: -20 }
      };

      render(<TutorialOverlay {...defaultProps} step={step} />);

      expect(screen.getByText('Test Step Title')).toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('calls onNext on ArrowRight', () => {
      const onNext = vi.fn();
      render(<TutorialOverlay {...defaultProps} onNext={onNext} />);

      fireEvent.keyDown(window, { key: 'ArrowRight' });

      expect(onNext).toHaveBeenCalledTimes(1);
    });

    it('calls onNext on Enter', () => {
      const onNext = vi.fn();
      render(<TutorialOverlay {...defaultProps} onNext={onNext} />);

      fireEvent.keyDown(window, { key: 'Enter' });

      expect(onNext).toHaveBeenCalledTimes(1);
    });

    it('calls onPrevious on ArrowLeft when not first step', () => {
      const onPrevious = vi.fn();
      render(<TutorialOverlay {...defaultProps} isFirstStep={false} onPrevious={onPrevious} />);

      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      expect(onPrevious).toHaveBeenCalledTimes(1);
    });

    it('does not call onPrevious on ArrowLeft when first step', () => {
      const onPrevious = vi.fn();
      render(<TutorialOverlay {...defaultProps} isFirstStep={true} onPrevious={onPrevious} />);

      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      expect(onPrevious).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('removes keyboard event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(<TutorialOverlay {...defaultProps} />);
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), { capture: true });

      removeEventListenerSpy.mockRestore();
    });
  });
});
