import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrightnessPopup } from './BrightnessPopup';

vi.mock('@renderer/hooks/useAppSettings', () => ({
  useAppSettings: () => ({
    settings: { brightnessMultiplier: 1, lightingMode: 'default' },
    updateSettings: vi.fn()
  })
}));

describe('BrightnessPopup dismissal', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('handles Escape before the deferred outside-click listener is installed', () => {
    const onClose = vi.fn();
    render(<BrightnessPopup isOpen onClose={onClose} />);

    fireEvent.keyDown(screen.getByRole('button', { name: 'Dramatic' }), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps Escape available immediately after the parent replaces its callback', () => {
    const previousClose = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(<BrightnessPopup isOpen onClose={previousClose} />);
    vi.runOnlyPendingTimers();

    rerender(<BrightnessPopup isOpen onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Dramatic' }), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
    expect(previousClose).not.toHaveBeenCalled();
  });

  it('defers outside-click dismissal and ignores clicks within the popup', () => {
    const onClose = vi.fn();
    render(<BrightnessPopup isOpen onClose={onClose} />);
    fireEvent.mouseDown(document.body);
    expect(onClose).not.toHaveBeenCalled();

    vi.runOnlyPendingTimers();
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Dramatic' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('removes dismissal listeners when closed', () => {
    const onClose = vi.fn();
    const { rerender } = render(<BrightnessPopup isOpen onClose={onClose} />);
    vi.runOnlyPendingTimers();
    rerender(<BrightnessPopup isOpen={false} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.mouseDown(document.body);

    expect(onClose).not.toHaveBeenCalled();
  });
});
