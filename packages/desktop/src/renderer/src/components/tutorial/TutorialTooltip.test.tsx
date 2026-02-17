import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TutorialTooltip } from './TutorialTooltip';

describe('TutorialTooltip', () => {
  const defaultProps = {
    title: 'Welcome',
    content: 'This is a tutorial step',
    position: { x: 100, y: 200 },
    stepNumber: 1,
    totalSteps: 5,
    progress: 20,
    isFirstStep: true,
    isLastStep: false,
    onNext: vi.fn(),
    onPrevious: vi.fn(),
    onSkip: vi.fn()
  };

  describe('rendering', () => {
    it('renders the title', () => {
      render(<TutorialTooltip {...defaultProps} />);

      expect(screen.getByText('Welcome')).toBeInTheDocument();
    });

    it('renders the content', () => {
      render(<TutorialTooltip {...defaultProps} />);

      expect(screen.getByText('This is a tutorial step')).toBeInTheDocument();
    });

    it('renders step number and total', () => {
      render(<TutorialTooltip {...defaultProps} />);

      expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
    });

    it('positions tooltip at specified coordinates', () => {
      render(<TutorialTooltip {...defaultProps} />);

      const tooltip = screen.getByTestId('tutorial-tooltip');
      expect(tooltip.style.left).toBe('100px');
      expect(tooltip.style.top).toBe('200px');
    });

    it('sets progress bar width', () => {
      render(<TutorialTooltip {...defaultProps} progress={60} />);

      const progressBar = screen.getByTestId('tutorial-progress-bar');
      expect(progressBar.style.width).toBe('60%');
    });

    it('renders Skip Tutorial button', () => {
      render(<TutorialTooltip {...defaultProps} />);

      expect(screen.getByText('Skip Tutorial')).toBeInTheDocument();
    });

    it('renders close button with skip title', () => {
      render(<TutorialTooltip {...defaultProps} />);

      expect(screen.getByTitle('Skip tutorial (Esc)')).toBeInTheDocument();
    });
  });

  describe('navigation buttons', () => {
    it('shows "Next →" on non-last steps', () => {
      render(<TutorialTooltip {...defaultProps} isLastStep={false} />);

      expect(screen.getByText('Next →')).toBeInTheDocument();
    });

    it('shows "Get Started!" on last step', () => {
      render(<TutorialTooltip {...defaultProps} isLastStep={true} />);

      expect(screen.getByText('Get Started!')).toBeInTheDocument();
    });

    it('hides Previous button on first step', () => {
      render(<TutorialTooltip {...defaultProps} isFirstStep={true} />);

      expect(screen.queryByText('Previous')).not.toBeInTheDocument();
    });

    it('shows Previous button on non-first steps', () => {
      render(<TutorialTooltip {...defaultProps} isFirstStep={false} />);

      expect(screen.getByText('Previous')).toBeInTheDocument();
    });
  });

  describe('button interactions', () => {
    it('calls onNext when Next button is clicked', () => {
      const onNext = vi.fn();
      render(<TutorialTooltip {...defaultProps} onNext={onNext} />);

      fireEvent.click(screen.getByText('Next →'));

      expect(onNext).toHaveBeenCalledTimes(1);
    });

    it('calls onPrevious when Previous button is clicked', () => {
      const onPrevious = vi.fn();
      render(<TutorialTooltip {...defaultProps} isFirstStep={false} onPrevious={onPrevious} />);

      fireEvent.click(screen.getByText('Previous'));

      expect(onPrevious).toHaveBeenCalledTimes(1);
    });

    it('calls onSkip when Skip Tutorial button is clicked', () => {
      const onSkip = vi.fn();
      render(<TutorialTooltip {...defaultProps} onSkip={onSkip} />);

      fireEvent.click(screen.getByText('Skip Tutorial'));

      expect(onSkip).toHaveBeenCalledTimes(1);
    });

    it('calls onSkip when close button is clicked', () => {
      const onSkip = vi.fn();
      render(<TutorialTooltip {...defaultProps} onSkip={onSkip} />);

      fireEvent.click(screen.getByText('×'));

      expect(onSkip).toHaveBeenCalledTimes(1);
    });

    it('calls onNext with "Get Started!" on last step', () => {
      const onNext = vi.fn();
      render(<TutorialTooltip {...defaultProps} isLastStep={true} onNext={onNext} />);

      fireEvent.click(screen.getByText('Get Started!'));

      expect(onNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('middle step', () => {
    it('shows both Previous and Next buttons on middle step', () => {
      render(<TutorialTooltip {...defaultProps} stepNumber={3} isFirstStep={false} isLastStep={false} />);

      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next →')).toBeInTheDocument();
    });
  });
});
