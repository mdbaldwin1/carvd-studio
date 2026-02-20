import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuShortcut,
  MenuPanel,
  MenuItemButton,
  MenuSeparator,
  MenuLabel,
  MenuSub
} from './context-menu';

describe('context-menu ui wrappers', () => {
  it('renders Radix wrappers and applies inset styles', async () => {
    render(
      <ContextMenu modal={false}>
        <ContextMenuTrigger>Open menu</ContextMenuTrigger>
        <ContextMenuContent data-testid="context-content">
          <ContextMenuLabel inset>Label</ContextMenuLabel>
          <ContextMenuSeparator data-testid="context-separator" />
          <ContextMenuItem inset>Item</ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger inset>More</ContextMenuSubTrigger>
            <ContextMenuSubContent data-testid="context-sub-content">
              <ContextMenuItem>Sub Item</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>
    );

    fireEvent.contextMenu(screen.getByText('Open menu'));

    expect(await screen.findByTestId('context-content')).toBeInTheDocument();
    expect(screen.getByTestId('context-separator')).toBeInTheDocument();

    const label = screen.getByText('Label');
    const item = screen.getByText('Item');
    const subTrigger = screen.getByText('More');

    expect(label).toHaveClass('pl-8');
    expect(item).toHaveClass('pl-8');
    expect(subTrigger).toHaveClass('pl-8');
  });

  it('renders shortcut helper with merged classes', () => {
    render(
      <div>
        <ContextMenuShortcut className="custom-shortcut">Cmd+K</ContextMenuShortcut>
      </div>
    );

    const shortcut = screen.getByText('Cmd+K');
    expect(shortcut).toHaveClass('custom-shortcut');
    expect(shortcut).toHaveClass('tracking-widest');
  });

  it('renders standalone menu primitives and applies positioning', () => {
    render(
      <MenuPanel x={120} y={240} data-testid="menu-panel">
        <MenuLabel>Actions</MenuLabel>
        <MenuItemButton>Rename</MenuItemButton>
        <MenuItemButton variant="danger">Delete</MenuItemButton>
        <MenuSeparator />
        <MenuSub label="More">
          <MenuItemButton>Duplicate</MenuItemButton>
        </MenuSub>
      </MenuPanel>
    );

    const panel = screen.getByTestId('menu-panel');
    expect(panel).toHaveStyle({ position: 'fixed', left: '120px', top: '240px' });
    expect(panel).toHaveAttribute('role', 'menu');

    const rename = screen.getByRole('menuitem', { name: 'Rename' });
    const deleteButton = screen.getByRole('menuitem', { name: 'Delete' });

    expect(rename).toHaveClass('text-text');
    expect(deleteButton).toHaveClass('text-danger');
    expect(screen.getByRole('separator')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Duplicate' })).toBeInTheDocument();
  });

  it('renders disabled menu item button', () => {
    render(<MenuItemButton disabled>Disabled</MenuItemButton>);

    const button = screen.getByRole('menuitem', { name: 'Disabled' });
    expect(button).toBeDisabled();
  });
});
