import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Toast } from './Toast';
import { useProjectStore } from '../../store/projectStore';

describe('Toast', () => {
  beforeEach(() => {
    // Reset store state before each test
    useProjectStore.setState({ toast: null });
  });

  it('renders nothing when there is no toast', () => {
    const { container } = render(<Toast />);

    expect(container.firstChild).toBeNull();
  });

  it('renders toast message when toast exists', () => {
    useProjectStore.setState({
      toast: { message: 'Item saved successfully', id: 'toast-1' }
    });

    render(<Toast />);

    expect(screen.getByText('Item saved successfully')).toBeInTheDocument();
  });

  it('renders different messages correctly', () => {
    useProjectStore.setState({
      toast: { message: 'First message', id: 'toast-1' }
    });

    const { rerender } = render(<Toast />);
    expect(screen.getByText('First message')).toBeInTheDocument();

    useProjectStore.setState({
      toast: { message: 'Second message', id: 'toast-2' }
    });

    rerender(<Toast />);
    expect(screen.getByText('Second message')).toBeInTheDocument();
    expect(screen.queryByText('First message')).not.toBeInTheDocument();
  });

  it('has toast class for styling', () => {
    useProjectStore.setState({
      toast: { message: 'Test message', id: 'toast-1' }
    });

    render(<Toast />);

    const toastElement = screen.getByText('Test message');
    expect(toastElement).toHaveClass('fixed');
  });

  it('hides when toast is cleared', () => {
    useProjectStore.setState({
      toast: { message: 'Visible message', id: 'toast-1' }
    });

    const { rerender } = render(<Toast />);
    expect(screen.getByText('Visible message')).toBeInTheDocument();

    useProjectStore.setState({ toast: null });

    rerender(<Toast />);
    expect(screen.queryByText('Visible message')).not.toBeInTheDocument();
  });
});
