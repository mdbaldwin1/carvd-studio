import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestPart, createTestStock } from '../../../../../tests/helpers/factories';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { ProjectIssuesSummary } from './ProjectIssuesSummary';

const stock = createTestStock({ id: 'stock-1', grainDirection: 'length' });

beforeEach(() => {
  useProjectStore.setState({ parts: [], stocks: [stock] });
  useUIStore.setState({ issuesModalOpen: false, issuesModalFocusPartId: null });
});

describe('ProjectIssuesSummary', () => {
  it('renders nothing when the project is clean', () => {
    useProjectStore.setState({ parts: [createTestPart({ stockId: stock.id })] });
    const { container } = render(<ProjectIssuesSummary />);
    expect(container).toBeEmptyDOMElement();
  });

  it('counts errors and reads as an error', () => {
    // No stock assigned is an error.
    useProjectStore.setState({ parts: [createTestPart({ name: 'Side L', stockId: null })] });
    render(<ProjectIssuesSummary />);

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('1 error');
    expect(button.className).toContain('text-danger');
  });

  it('reads as a warning when nothing is an error', () => {
    useProjectStore.setState({
      parts: [
        createTestPart({
          name: 'Shelf',
          stockId: stock.id,
          grainSensitive: true,
          grainDirection: 'width'
        })
      ]
    });
    render(<ProjectIssuesSummary />);

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('1 warning');
    expect(button.className).toContain('text-warning');
    expect(button.className).not.toContain('text-danger');
  });

  it('reports both counts together', () => {
    useProjectStore.setState({
      parts: [
        createTestPart({ name: 'Side L', stockId: null }),
        createTestPart({ name: 'Shelf', stockId: stock.id, grainSensitive: true, grainDirection: 'width' })
      ]
    });
    render(<ProjectIssuesSummary />);
    expect(screen.getByRole('button')).toHaveTextContent('1 error, 1 warning');
  });

  it('opens the issues modal when clicked', () => {
    useProjectStore.setState({ parts: [createTestPart({ name: 'Side L', stockId: null })] });
    render(<ProjectIssuesSummary />);

    fireEvent.click(screen.getByRole('button'));
    expect(useUIStore.getState().issuesModalOpen).toBe(true);
  });
});
