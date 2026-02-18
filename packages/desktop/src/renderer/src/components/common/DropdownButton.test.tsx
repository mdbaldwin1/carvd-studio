import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DropdownButton, DropdownItem } from './DropdownButton';

const items: DropdownItem[] = [
  { label: 'Option A', onClick: vi.fn() },
  { label: 'Option B', onClick: vi.fn() },
  { label: 'Disabled Option', onClick: vi.fn(), disabled: true }
];

describe('DropdownButton', () => {
  it('renders button with label', () => {
    render(<DropdownButton label="Actions" items={items} />);
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('renders button with icon', () => {
    render(<DropdownButton label="Actions" items={items} icon={<span data-testid="icon">+</span>} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('dropdown is closed by default', () => {
    render(<DropdownButton label="Actions" items={items} />);
    expect(screen.queryByText('Option A')).not.toBeInTheDocument();
  });

  it('opens dropdown on click', () => {
    render(<DropdownButton label="Actions" items={items} />);
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
    expect(screen.getByText('Disabled Option')).toBeInTheDocument();
  });

  it('does not open when disabled', () => {
    render(<DropdownButton label="Actions" items={items} disabled />);
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.queryByText('Option A')).not.toBeInTheDocument();
  });

  it('calls item onClick and closes menu on selection', () => {
    const onClick = vi.fn();
    const testItems: DropdownItem[] = [{ label: 'Click Me', onClick }];
    render(<DropdownButton label="Actions" items={testItems} />);
    fireEvent.click(screen.getByText('Actions'));
    fireEvent.click(screen.getByText('Click Me'));
    expect(onClick).toHaveBeenCalled();
    expect(screen.queryByText('Click Me')).not.toBeInTheDocument();
  });

  it('does not call onClick for disabled items', () => {
    const onClick = vi.fn();
    const testItems: DropdownItem[] = [{ label: 'Disabled', onClick, disabled: true }];
    render(<DropdownButton label="Actions" items={testItems} />);
    fireEvent.click(screen.getByText('Actions'));
    fireEvent.click(screen.getByText('Disabled'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('closes on Escape key', async () => {
    vi.useFakeTimers();
    render(<DropdownButton label="Actions" items={items} />);
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.getByText('Option A')).toBeInTheDocument();

    // The setTimeout needs to fire first for the event listeners
    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Option A')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('closes on click outside', async () => {
    vi.useFakeTimers();
    const outsideDiv = document.createElement('div');
    document.body.appendChild(outsideDiv);

    render(<DropdownButton label="Actions" items={items} />);
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.getByText('Option A')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    // First mousedown is ignored (justOpenedRef guard prevents immediate close)
    fireEvent.mouseDown(outsideDiv);
    // Second mousedown actually closes the dropdown
    fireEvent.mouseDown(outsideDiv);
    expect(screen.queryByText('Option A')).not.toBeInTheDocument();

    document.body.removeChild(outsideDiv);
    vi.useRealTimers();
  });

  it('toggles dropdown open and closed', () => {
    render(<DropdownButton label="Actions" items={items} />);
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.getByText('Option A')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.queryByText('Option A')).not.toBeInTheDocument();
  });

  it('renders item icons when provided', () => {
    const testItems: DropdownItem[] = [
      { label: 'With Icon', onClick: vi.fn(), icon: <span data-testid="item-icon">!</span> }
    ];
    render(<DropdownButton label="Actions" items={testItems} />);
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.getByTestId('item-icon')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<DropdownButton label="Actions" items={items} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
