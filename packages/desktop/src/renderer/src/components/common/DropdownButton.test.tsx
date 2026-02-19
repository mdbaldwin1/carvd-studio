import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens dropdown on click', async () => {
    const user = userEvent.setup();
    render(<DropdownButton label="Actions" items={items} />);
    await user.click(screen.getByText('Actions'));
    expect(screen.getByRole('menuitem', { name: 'Option A' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Option B' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Disabled Option' })).toBeInTheDocument();
  });

  it('does not open when disabled', async () => {
    const user = userEvent.setup();
    render(<DropdownButton label="Actions" items={items} disabled />);
    await user.click(screen.getByText('Actions'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('calls item onClick and closes menu on selection', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const testItems: DropdownItem[] = [{ label: 'Click Me', onClick }];
    render(<DropdownButton label="Actions" items={testItems} />);
    await user.click(screen.getByText('Actions'));
    await user.click(screen.getByRole('menuitem', { name: 'Click Me' }));
    expect(onClick).toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('does not call onClick for disabled items', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const testItems: DropdownItem[] = [{ label: 'Disabled', onClick, disabled: true }];
    render(<DropdownButton label="Actions" items={testItems} />);
    await user.click(screen.getByText('Actions'));
    // Disabled items are not interactive in Radix
    const disabledItem = screen.getByRole('menuitem', { name: 'Disabled' });
    await user.click(disabledItem);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('closes on Escape key', async () => {
    const user = userEvent.setup();
    render(<DropdownButton label="Actions" items={items} />);
    await user.click(screen.getByText('Actions'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('renders item icons when provided', async () => {
    const user = userEvent.setup();
    const testItems: DropdownItem[] = [
      { label: 'With Icon', onClick: vi.fn(), icon: <span data-testid="item-icon">!</span> }
    ];
    render(<DropdownButton label="Actions" items={testItems} />);
    await user.click(screen.getByText('Actions'));
    expect(screen.getByTestId('item-icon')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<DropdownButton label="Actions" items={items} className="custom-class" />);
    // The trigger button receives the className
    const button = container.querySelector('button');
    expect(button).toHaveClass('custom-class');
  });
});
