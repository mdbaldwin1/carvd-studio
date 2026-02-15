import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomeTutorial } from './WelcomeTutorial';
import { useProjectStore } from '../../store/projectStore';

// Mock useTutorial hook
vi.mock('../../hooks/useTutorial', () => ({
  useTutorial: vi.fn()
}));

import { useTutorial } from '../../hooks/useTutorial';

describe('WelcomeTutorial', () => {
  const mockTutorial = {
    isActive: true,
    currentStep: {
      id: 'welcome',
      title: 'Welcome to Carvd Studio!',
      content: 'Test content',
      position: 'center' as const
    },
    currentStepIndex: 0,
    steps: [
      { id: 'welcome', title: 'Welcome', content: 'Welcome content', position: 'center' as const },
      { id: 'design', title: 'Design', content: 'Design content', position: 'right' as const },
      { id: 'get-started', title: 'Get Started', content: 'Get started content', position: 'center' as const }
    ],
    progress: 33,
    isFirstStep: true,
    isLastStep: false,
    start: vi.fn(),
    next: vi.fn(),
    previous: vi.fn(),
    skip: vi.fn(),
    complete: vi.fn(),
    goTo: vi.fn()
  };

  const defaultProps = {
    onComplete: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTutorial).mockReturnValue(mockTutorial);

    // Reset project store
    useProjectStore.setState({
      requestCenterCamera: vi.fn()
    });

    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
  });

  describe('initialization', () => {
    it('starts tutorial on mount', () => {
      render(<WelcomeTutorial {...defaultProps} />);

      expect(mockTutorial.start).toHaveBeenCalledTimes(1);
    });

    it('centers camera on mount', () => {
      render(<WelcomeTutorial {...defaultProps} />);

      expect(useProjectStore.getState().requestCenterCamera).toHaveBeenCalled();
    });
  });

  describe('rendering', () => {
    it('renders TutorialOverlay when active', () => {
      render(<WelcomeTutorial {...defaultProps} />);

      expect(screen.getByText('Welcome to Carvd Studio!')).toBeInTheDocument();
    });

    it('returns null when tutorial is not active', () => {
      vi.mocked(useTutorial).mockReturnValue({
        ...mockTutorial,
        isActive: false
      });

      const { container } = render(<WelcomeTutorial {...defaultProps} />);

      expect(container.firstChild).toBeNull();
    });

    it('returns null when currentStep is null', () => {
      vi.mocked(useTutorial).mockReturnValue({
        ...mockTutorial,
        currentStep: null
      });

      const { container } = render(<WelcomeTutorial {...defaultProps} />);

      expect(container.firstChild).toBeNull();
    });

    it('shows step progress', () => {
      render(<WelcomeTutorial {...defaultProps} />);

      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('calls next on handleNext when not last step', () => {
      render(<WelcomeTutorial {...defaultProps} />);

      // Click the Next button (has arrow suffix)
      fireEvent.click(screen.getByText(/Next/));

      expect(mockTutorial.next).toHaveBeenCalledTimes(1);
      expect(mockTutorial.complete).not.toHaveBeenCalled();
    });

    it('calls complete and onComplete on handleNext when last step', () => {
      const onComplete = vi.fn();
      vi.mocked(useTutorial).mockReturnValue({
        ...mockTutorial,
        isLastStep: true
      });

      render(<WelcomeTutorial onComplete={onComplete} />);

      // Click the "Get Started!" button (shows on last step)
      fireEvent.click(screen.getByText(/Get Started/));

      expect(mockTutorial.complete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('calls skip and onComplete on handleSkip', () => {
      const onComplete = vi.fn();
      render(<WelcomeTutorial onComplete={onComplete} />);

      // Click the Skip Tutorial button
      fireEvent.click(screen.getByText('Skip Tutorial'));

      expect(mockTutorial.skip).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('calls previous on Previous button click', () => {
      vi.mocked(useTutorial).mockReturnValue({
        ...mockTutorial,
        isFirstStep: false,
        currentStepIndex: 1
      });

      render(<WelcomeTutorial {...defaultProps} />);

      fireEvent.click(screen.getByText(/Previous/));

      expect(mockTutorial.previous).toHaveBeenCalledTimes(1);
    });
  });

  describe('tutorial steps', () => {
    it('passes correct step number to overlay', () => {
      vi.mocked(useTutorial).mockReturnValue({
        ...mockTutorial,
        currentStepIndex: 1
      });

      render(<WelcomeTutorial {...defaultProps} />);

      expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    });

    it('passes correct total steps to overlay', () => {
      render(<WelcomeTutorial {...defaultProps} />);

      expect(screen.getByText(/of 3/)).toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('advances on Enter key', () => {
      render(<WelcomeTutorial {...defaultProps} />);

      fireEvent.keyDown(window, { key: 'Enter' });

      expect(mockTutorial.next).toHaveBeenCalled();
    });

    it('advances on ArrowRight key', () => {
      render(<WelcomeTutorial {...defaultProps} />);

      fireEvent.keyDown(window, { key: 'ArrowRight' });

      expect(mockTutorial.next).toHaveBeenCalled();
    });

    it('goes back on ArrowLeft when not first step', () => {
      vi.mocked(useTutorial).mockReturnValue({
        ...mockTutorial,
        isFirstStep: false
      });

      render(<WelcomeTutorial {...defaultProps} />);

      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      expect(mockTutorial.previous).toHaveBeenCalled();
    });

    it('skips on Escape key', () => {
      const onComplete = vi.fn();
      render(<WelcomeTutorial onComplete={onComplete} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockTutorial.skip).toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalled();
    });
  });
});
